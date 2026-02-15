import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Edit,
  CheckCircle,
  Wallet,
  Trash2,
  Plus,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Retailer {
  retailer_id: string;
  retailer_name: string;
}

interface TransactionLimit {
  limit_id: number;
  retailer_id: string;
  limit_amount: number;
  service: string;
  created_at: string;
  updated_at: string;
}

interface LimitManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailer: Retailer | null;
  authToken: string | null;
}

// Service options for dropdown
const serviceOptions = [
  { value: "PAYOUT", label: "Payout" },
  // Add more services as needed
];

// Helper function to get service label
const getServiceLabel = (service: string) => {
  const option = serviceOptions.find((opt) => opt.value === service);
  return option ? option.label : service;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LimitManagementDialog({
  open,
  onOpenChange,
  retailer,
  authToken,
}: LimitManagementDialogProps) {
  const [currentLimits, setCurrentLimits] = useState<TransactionLimit[]>([]);
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);
  const [newLimitAmount, setNewLimitAmount] = useState<string>("");
  const [editingLimitId, setEditingLimitId] = useState<number | null>(null);
  const [editLimitAmount, setEditLimitAmount] = useState<string>("");
  const [isCreatingLimit, setIsCreatingLimit] = useState(false);
  const [newLimitService, setNewLimitService] = useState<string>("PAYOUT");
  const [editLimitService, setEditLimitService] = useState<string>("PAYOUT");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [limitToDelete, setLimitToDelete] = useState<number | null>(null);
  const [isDeletingLimit, setIsDeletingLimit] = useState(false);

  // Fetch limits when dialog opens with a retailer
  useEffect(() => {
    if (open && retailer && authToken) {
      fetchRetailerLimits(retailer.retailer_id);
    }
  }, [open, retailer, authToken]);

  // Fetch limits for a retailer
  const fetchRetailerLimits = async (retailerId: string) => {
    if (!authToken) return;

    setIsLoadingLimits(true);
    console.log("========== FETCHING LIMITS ==========");
    console.log("Retailer ID to filter:", retailerId);

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/limit/get/all`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log("Full API Response:", JSON.stringify(res.data, null, 2));

      if (res.data?.status === "success" && res.data?.data) {
        const allLimits = res.data.data.limits || [];
        console.log("Total limits from API:", allLimits.length);

        // Filter limits for this specific retailer
        const retailerLimits = allLimits.filter((limit: TransactionLimit) => {
          const match = limit.retailer_id === retailerId;
          console.log(
            `Limit ${limit.limit_id}: "${limit.retailer_id}" === "${retailerId}" => ${match}`
          );
          return match;
        });

        console.log("========== FILTER RESULTS ==========");
        console.log("Filtered limits count:", retailerLimits.length);
        console.log("===================================");

        setCurrentLimits(retailerLimits);

        if (retailerLimits.length > 0) {
          toast.success(`Found ${retailerLimits.length} limit(s)`);
        }
      } else {
        console.warn("API response structure unexpected:", res.data);
        setCurrentLimits([]);
      }
    } catch (error: any) {
      console.error("Error fetching limits:", error);
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || "Failed to load limits");
      }
      setCurrentLimits([]);
    } finally {
      setIsLoadingLimits(false);
    }
  };

  // Handle dialog open - reset state when closing
  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    
    if (!isOpen) {
      // Reset state when closing
      setCurrentLimits([]);
      setNewLimitAmount("");
      setNewLimitService("PAYOUT");
      setEditingLimitId(null);
      setEditLimitAmount("");
      setEditLimitService("PAYOUT");
    }
  };

  // Create new limit
  const handleCreateLimit = async () => {
    if (!retailer || !authToken) return;

    const amount = parseFloat(newLimitAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid limit amount");
      return;
    }

    if (!newLimitService) {
      toast.error("Please select a service");
      return;
    }

    // Check if limit already exists for this service
    const existingLimit = currentLimits.find(
      (limit) => limit.service === newLimitService
    );
    
    if (existingLimit) {
      toast.error(
        `A limit for ${getServiceLabel(newLimitService)} already exists. Please edit the existing limit instead.`,
        { duration: 5000 }
      );
      return;
    }

    setIsCreatingLimit(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/limit/create`,
        {
          retailer_id: retailer.retailer_id,
          limit_amount: amount,
          service: newLimitService,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Create limit response:", response.data);
      toast.success("Limit created successfully");
      setNewLimitAmount("");
      setNewLimitService("PAYOUT");
      await fetchRetailerLimits(retailer.retailer_id);
    } catch (error: any) {
      console.error("Create limit error:", error);
      
      // Handle specific error messages
      const errorMessage = error.response?.data?.message || "";
      
      if (errorMessage.includes("duplicate") || errorMessage.includes("unique constraint")) {
        toast.error(
          `A limit for ${getServiceLabel(newLimitService)} already exists. Please edit the existing limit instead.`,
          { duration: 5000 }
        );
      } else if (errorMessage.includes("SQLSTATE 23505")) {
        toast.error(
          `A limit for this service already exists. Please edit the existing limit instead.`,
          { duration: 5000 }
        );
      } else {
        toast.error(errorMessage || "Failed to create limit");
      }
    } finally {
      setIsCreatingLimit(false);
    }
  };

  // Update existing limit
  const handleUpdateLimit = async (limitId: number) => {
    if (!retailer || !authToken) return;

    const amount = parseFloat(editLimitAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid limit amount");
      return;
    }

    if (!editLimitService) {
      toast.error("Please select a service");
      return;
    }

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/limit/update`,
        {
          limit_id: limitId,
          limit_amount: amount,
          service: editLimitService,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Limit updated successfully");
      setEditingLimitId(null);
      setEditLimitAmount("");
      setEditLimitService("PAYOUT");
      await fetchRetailerLimits(retailer.retailer_id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update limit");
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (limitId: number) => {
    setLimitToDelete(limitId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete limit
  const confirmDeleteLimit = async () => {
    if (!limitToDelete || !retailer || !authToken) return;

    setIsDeletingLimit(true);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/limit/delete/${limitToDelete}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      toast.success("Limit deleted successfully");
      setDeleteDialogOpen(false);
      setLimitToDelete(null);
      await fetchRetailerLimits(retailer.retailer_id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete limit");
    } finally {
      setIsDeletingLimit(false);
    }
  };

  // Start editing a limit
  const startEditingLimit = (limit: TransactionLimit) => {
    setEditingLimitId(limit.limit_id);
    setEditLimitAmount(limit.limit_amount.toString());
    setEditLimitService(limit.service);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLimitId(null);
    setEditLimitAmount("");
    setEditLimitService("PAYOUT");
  };

  return (
    <>
      {/* Main Limit Management Dialog */}
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-green-600" />
              Manage Transaction Limits
            </DialogTitle>
            <DialogDescription>
              Retailer:{" "}
              <span className="font-semibold">{retailer?.retailer_name}</span> (
              {retailer?.retailer_id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create New Limit Section */}
            <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                <Plus className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg text-blue-900">
                  Create New Limit
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="new-service"
                    className="text-sm font-medium mb-2 block"
                  >
                    Service Type
                  </Label>
                  <Select
                    value={newLimitService}
                    onValueChange={setNewLimitService}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((service) => {
                        const hasLimit = currentLimits.some(
                          (limit) => limit.service === service.value
                        );
                        return (
                          <SelectItem
                            key={service.value}
                            value={service.value}
                            disabled={hasLimit}
                          >
                            {service.label}
                            {hasLimit && " (Already exists)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {currentLimits.some((limit) => limit.service === newLimitService) && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ A limit for this service already exists. Edit it below.
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="new-limit"
                    className="text-sm font-medium mb-2 block"
                  >
                    Limit Amount (₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      ₹
                    </span>
                    <Input
                      id="new-limit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newLimitAmount}
                      onChange={(e) => setNewLimitAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-11 pl-8 font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateLimit}
                disabled={
                  isCreatingLimit || !newLimitAmount || !newLimitService
                }
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              >
                {isCreatingLimit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Limit
                  </>
                )}
              </Button>
            </div>

            {/* Existing Limits Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Settings className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">Existing Limits</h3>
              </div>

              {isLoadingLimits ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-gray-600">Loading limits...</span>
                </div>
              ) : currentLimits.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Wallet className="h-16 w-16 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-lg">No limits set</p>
                  <p className="text-sm mt-2">
                    Create your first transaction limit above
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentLimits.map((limit) => (
                    <div
                      key={limit.limit_id}
                      className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      {editingLimitId === limit.limit_id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">
                                Service Type
                              </Label>
                              <Select
                                value={editLimitService}
                                onValueChange={setEditLimitService}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {serviceOptions.map((service) => (
                                    <SelectItem
                                      key={service.value}
                                      value={service.value}
                                    >
                                      {service.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm font-medium mb-2 block">
                                Amount (₹)
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                  ₹
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editLimitAmount}
                                  onChange={(e) =>
                                    setEditLimitAmount(e.target.value)
                                  }
                                  className="h-10 pl-8 font-mono"
                                  autoFocus
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateLimit(limit.limit_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600">
                                Service:
                              </span>
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {getServiceLabel(limit.service)}
                              </Badge>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-gray-600">
                                Limit Amount:
                              </span>
                              <span className="text-2xl font-bold text-green-600">
                                ₹
                                {limit.limit_amount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Created:</span>
                                <span>{formatDate(limit.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Updated:</span>
                                <span>{formatDate(limit.updated_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingLimit(limit)}
                              className="hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(limit.limit_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction limit? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> Deleting this limit will immediately
                affect the retailer's transaction capabilities.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setLimitToDelete(null);
              }}
              disabled={isDeletingLimit}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLimit}
              disabled={isDeletingLimit}
            >
              {isDeletingLimit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Limit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}