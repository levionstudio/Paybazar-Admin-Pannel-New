import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import {
  Percent,
  Building2,
  AlertCircle,
  RefreshCw,
  Search,
  Lock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DecodedToken {
  user_id: string;
  exp: number;
}

interface MasterDistributor {
  master_distributor_id: string;
  name: string;
  email: string;
  phone: string;
  business_name?: string;
}

interface Distributor {
  distributor_id: string;
  name: string;
  email: string;
  phone: string;
  business_name?: string;
  master_distributor_id: string;
}

interface Retailer {
  retailer_id: string;
  name: string;
  email: string;
  phone: string;
  business_name?: string;
  distributor_id: string;
}

interface CommissionData {
  commision_id?: number;
  user_id: string;
  total_commision: number;
  admin_commision: number;
  master_distributor_commision: number;
  distributor_commision: number;
  retailer_commision: number;
}

const TOTAL_COMMISSION = 1.0;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/* -------------------- AUTH HELPER -------------------- */
function getAdminIdFromToken(): string | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }
    return decoded.user_id;
  } catch {
    return null;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

/* -------------------- HELPER FUNCTIONS -------------------- */
function formatCommissionInput(value: string): string {
  // Remove non-numeric characters except decimal point
  let cleaned = value.replace(/[^\d.]/g, "");
  
  // Only allow one decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  
  // Limit to 2 decimal places
  if (parts.length === 2) {
    cleaned = parts[0] + "." + parts[1].substring(0, 2);
  }
  
  // Allow values up to 1.00 (total can be validated separately)
  const numValue = parseFloat(cleaned);
  if (numValue > 1) {
    cleaned = "1.00";
  }
  
  return cleaned;
}

export default function CommissionSplit() {
  const [adminId, setAdminId] = useState<string | null>(null);

  // Category & Subcategory
  const [selectedCategory, setSelectedCategory] = useState<string>("financials");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("settlement");

  // Dropdown data
  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);

  // Search
  const [retailerSearch, setRetailerSearch] = useState<string>("");

  // Selected values
  const [selectedMD, setSelectedMD] = useState<string>("");
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");

  // Commission values
  const [mdCommission, setMdCommission] = useState<string>("");
  const [distributorCommission, setDistributorCommission] = useState<string>("");
  const [retailerCommission, setRetailerCommission] = useState<string>("");
  const [adminCommission, setAdminCommission] = useState<number>(0);

  // Loading states
  const [loadingMDs, setLoadingMDs] = useState(true);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [existingCommission, setExistingCommission] = useState<CommissionData | null>(null);
  const [hasCommissionConfigured, setHasCommissionConfigured] = useState<boolean>(false);
  const [isInheritedData, setIsInheritedData] = useState<boolean>(false);

  // Get admin ID on mount
  useEffect(() => {
    const id = getAdminIdFromToken();
    setAdminId(id);
  }, []);

  // Fetch Master Distributors
  useEffect(() => {
    const fetchMasterDistributors = async () => {
      if (!adminId) {
        setLoadingMDs(false);
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setLoadingMDs(false);
        return;
      }

      setLoadingMDs(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/md/get/admin/${adminId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.data?.status === "success" && res.data?.data) {
          const list = res.data.data.master_distributors || [];
          setMasterDistributors(list);
        } else {
          toast.error("Failed to load master distributors");
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load master distributors");
      } finally {
        setLoadingMDs(false);
      }
    };

    fetchMasterDistributors();
  }, [adminId]);

  // Fetch Distributors when MD is selected
  const fetchDistributors = async (mdId: string) => {
    if (!mdId) {
      setDistributors([]);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoadingDistributors(true);
    setDistributors([]);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/distributor/get/md/${mdId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const list = res.data.data.distributors || [];
        setDistributors(list);
      }
    } catch (error: any) {
      console.error("Error fetching distributors:", error);
    } finally {
      setLoadingDistributors(false);
    }
  };

  // Fetch Retailers when Distributor is selected
  const fetchRetailers = async (distributorId: string) => {
    if (!distributorId) {
      setRetailers([]);
      setFilteredRetailers([]);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoadingRetailers(true);
    setRetailers([]);
    setFilteredRetailers([]);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/retailer/get/distributor/${distributorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const list = res.data.data.retailers || [];
        setRetailers(list);
        setFilteredRetailers(list);
      }
    } catch (error: any) {
      console.error("Error fetching retailers:", error);
    } finally {
      setLoadingRetailers(false);
    }
  };

  // Filter retailers based on search
  useEffect(() => {
    if (!retailerSearch.trim()) {
      setFilteredRetailers(retailers);
      return;
    }

    const searchLower = retailerSearch.toLowerCase();
    const filtered = retailers.filter(
      (r) =>
        r.name.toLowerCase().includes(searchLower) ||
        r.retailer_id.toLowerCase().includes(searchLower) ||
        r.email?.toLowerCase().includes(searchLower) ||
        r.phone?.toLowerCase().includes(searchLower)
    );
    setFilteredRetailers(filtered);
  }, [retailerSearch, retailers]);

  // Fetch parent commission to inherit values
  const fetchParentCommission = async (currentUserId: string, currentLevel: 'md' | 'distributor' | 'retailer', parentId?: string) => {
    const token = getAuthToken();
    if (!token) {
      setHasCommissionConfigured(false);
      return;
    }

    setExistingCommission(null);

    try {
      let parentUserId: string | null = null;

      // Determine parent based on current level
      if (currentLevel === 'retailer' && parentId) {
        // Retailer's parent is the distributor
        parentUserId = parentId;
        console.log("Fetching parent commission for retailer from distributor:", parentUserId);
      } else if (currentLevel === 'distributor' && parentId) {
        // Distributor's parent is the MD
        parentUserId = parentId;
        console.log("Fetching parent commission for distributor from MD:", parentUserId);
      } else {
        console.log("At MD level, no parent to fetch from");
      }

      // If no parent (MD level), show appropriate state
      if (!parentUserId) {
        setHasCommissionConfigured(false);
        setMdCommission("");
        setDistributorCommission("");
        setRetailerCommission("");
        setIsInheritedData(false);
        return;
      }

      // Try to fetch parent's commission
      console.log("Attempting to fetch commission for parent user:", parentUserId);
      const res = await axios.get(
        `${API_BASE_URL}/commision/get/user/${parentUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Parent commission response:", res.data);

      if (res.data?.status === "success" && res.data?.data) {
        const parentCommission = res.data.data;
        
        // Show form with inherited values
        setHasCommissionConfigured(true);
        setMdCommission(parentCommission.master_distributor_commision.toFixed(2));
        setDistributorCommission(parentCommission.distributor_commision.toFixed(2));
        setRetailerCommission(parentCommission.retailer_commision.toFixed(2));
        setIsInheritedData(true);
        
        toast.info("Showing inherited commission from parent - you can edit and save custom values");
      } else {
        // Parent also has no commission - show empty form for D/R
        console.log("Parent has no commission configured");
        if (currentLevel !== 'md') {
          setHasCommissionConfigured(true);
        } else {
          setHasCommissionConfigured(false);
        }
        setMdCommission("");
        setDistributorCommission("");
        setRetailerCommission("");
        setIsInheritedData(false);
        toast.info("No commission configured in hierarchy - please set commission values");
      }
    } catch (error: any) {
      // Parent has no commission either
      console.log("Error fetching parent commission:", error);
      
      // Show empty form for D/R, no form for MD
      if (currentLevel !== 'md') {
        setHasCommissionConfigured(true);
        toast.info("No commission configured in hierarchy - please set commission values");
      } else {
        setHasCommissionConfigured(false);
      }
      setMdCommission("");
      setDistributorCommission("");
      setRetailerCommission("");
      setIsInheritedData(false);
    }
  };

  // Fetch existing commission for selected user
  const fetchExistingCommission = async (userId: string, level: 'md' | 'distributor' | 'retailer', parentId?: string) => {
    const token = getAuthToken();
    if (!token || !userId) return;

    setLoadingCommission(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/commision/get/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const commission = res.data.data;
        setExistingCommission(commission);
        setHasCommissionConfigured(true);
        setIsInheritedData(false);

        // Pre-fill values with 2 decimal places
        setMdCommission(commission.master_distributor_commision.toFixed(2));
        setDistributorCommission(commission.distributor_commision.toFixed(2));
        setRetailerCommission(commission.retailer_commision.toFixed(2));
        
        toast.success("Loaded existing commission configuration");
        setLoadingCommission(false);
      } else {
        // No existing commission found - try to fetch from parent
        await fetchParentCommission(userId, level, parentId);
        setLoadingCommission(false);
      }
    } catch (error: any) {
      // No commission found - try to fetch from parent
      console.log("No existing commission found for user:", userId);
      await fetchParentCommission(userId, level, parentId);
      setLoadingCommission(false);
    }
  };

  // Handle MD selection
  const handleMDSelect = (mdId: string) => {
    setSelectedMD(mdId);
    setSelectedDistributor("");
    setSelectedRetailer("");
    setDistributors([]);
    setRetailers([]);
    setFilteredRetailers([]);
    setRetailerSearch("");
    fetchDistributors(mdId);
    fetchExistingCommission(mdId, 'md'); // MD has no parent
  };

  // Handle Distributor selection
  const handleDistributorSelect = (distId: string) => {
    setSelectedDistributor(distId);
    setSelectedRetailer("");
    setRetailers([]);
    setFilteredRetailers([]);
    setRetailerSearch("");
    fetchRetailers(distId);
    fetchExistingCommission(distId, 'distributor', selectedMD); // Parent is the selected MD
  };

  // Handle Retailer selection
  const handleRetailerSelect = (retailerId: string) => {
    setSelectedRetailer(retailerId);
    fetchExistingCommission(retailerId, 'retailer', selectedDistributor); // Parent is the selected distributor
  };

  // Handle commission input changes with formatting
  const handleCommissionChange = (
    field: "md" | "distributor" | "retailer",
    value: string
  ) => {
    const formatted = formatCommissionInput(value);
    
    if (field === "md") {
      setMdCommission(formatted);
    } else if (field === "distributor") {
      setDistributorCommission(formatted);
    } else {
      setRetailerCommission(formatted);
    }
  };

  // Calculate admin commission whenever values change
  useEffect(() => {
    const md = parseFloat(mdCommission) || 0;
    const dist = parseFloat(distributorCommission) || 0;
    const ret = parseFloat(retailerCommission) || 0;
    const total = md + dist + ret;
    const admin = TOTAL_COMMISSION - total;
    
    setAdminCommission(admin);

    // Only validate if total exceeds 1.00%
    if (total > TOTAL_COMMISSION) {
      setValidationError("Total commission cannot exceed 1.00%");
    } else {
      setValidationError("");
    }
  }, [mdCommission, distributorCommission, retailerCommission]);

  // Determine if fields should be locked
  const isMDLocked = selectedDistributor !== "" || selectedRetailer !== "";
  const isDistributorLocked = selectedRetailer !== "";

  // Handle Save
  const handleSave = async () => {
    if (!selectedMD) {
      toast.error("Please select a Master Distributor");
      return;
    }

    if (!mdCommission || !distributorCommission || !retailerCommission) {
      toast.error("Please enter all commission values");
      return;
    }

    // Only check if total exceeds 1.00%
    const total = parseFloat(mdCommission) + parseFloat(distributorCommission) + parseFloat(retailerCommission);
    if (total > TOTAL_COMMISSION) {
      toast.error("Total commission cannot exceed 1.00%. Admin gets the remainder.");
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmSave = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setSaving(true);
    setConfirmDialogOpen(false);

    try {
      // Determine user_id based on selection
      let userId = selectedMD;
      if (selectedRetailer) {
        userId = selectedRetailer;
      } else if (selectedDistributor) {
        userId = selectedDistributor;
      }

      const payload = {
        user_id: userId,
        total_commision: parseFloat(TOTAL_COMMISSION.toFixed(2)),
        master_distributor_commision: parseFloat(parseFloat(mdCommission).toFixed(2)),
        distributor_commision: parseFloat(parseFloat(distributorCommission).toFixed(2)),
        retailer_commision: parseFloat(parseFloat(retailerCommission).toFixed(2)),
      };

      let response;
      if (existingCommission) {
        // Update existing
        response = await axios.put(
          `${API_BASE_URL}/commision/update/${existingCommission.commision_id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        // Create new
        response = await axios.post(
          `${API_BASE_URL}/commision/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (response.data?.status === "success") {
        const action = existingCommission ? "updated" : "created";
        toast.success(`Commission configuration ${action} successfully`);
        fetchExistingCommission(userId);
      } else {
        toast.error(response.data?.message || "Failed to save commission");
      }
    } catch (error: any) {
      console.error("Error saving commission:", error);
      toast.error(error.response?.data?.message || "Failed to save commission");
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedMD("");
    setSelectedDistributor("");
    setSelectedRetailer("");
    setDistributors([]);
    setRetailers([]);
    setFilteredRetailers([]);
    setRetailerSearch("");
    setMdCommission("");
    setDistributorCommission("");
    setRetailerCommission("");
    setExistingCommission(null);
    setHasCommissionConfigured(false);
    setValidationError("");
    setIsInheritedData(false);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Commission Configuration
              </h1>
              <p className="text-gray-600 mt-1">
                Configure commission splits for your hierarchy
              </p>
            </div>
          </div>
        </div>

        {/* Category & Subcategory Selection */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financials">Financials</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Subcategory</Label>
                <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="settlement">Settlement</SelectItem>
                    <SelectItem value="payouts">Payouts</SelectItem>
                    <SelectItem value="reconciliation">Reconciliation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchy Selection Card */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Select Hierarchy</h2>
                  <p className="text-sm text-gray-600">Choose the level to configure commission</p>
                </div>
              </div>

              {/* Master Distributor Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Master Distributor <span className="text-red-500">*</span>
                  {isMDLocked && <Lock className="h-3 w-3 text-gray-400 ml-auto" />}
                </Label>
                <Select
                  value={selectedMD}
                  onValueChange={handleMDSelect}
                  disabled={loadingMDs || isMDLocked}
                >
                  <SelectTrigger className={cn("h-12 bg-white", isMDLocked && "bg-gray-100 cursor-not-allowed")}>
                    <SelectValue placeholder={loadingMDs ? "Loading..." : "Select Master Distributor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {masterDistributors.map((md) => (
                      <SelectItem key={md.master_distributor_id} value={md.master_distributor_id}>
                        {md.name} ({md.master_distributor_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Distributor Dropdown */}
              {selectedMD && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Distributor (Optional)
                    {isDistributorLocked && <Lock className="h-3 w-3 text-gray-400 ml-auto" />}
                  </Label>
                  <Select
                    value={selectedDistributor}
                    onValueChange={handleDistributorSelect}
                    disabled={loadingDistributors || isDistributorLocked}
                  >
                    <SelectTrigger className={cn("h-12 bg-white", isDistributorLocked && "bg-gray-100 cursor-not-allowed")}>
                      <SelectValue
                        placeholder={
                          loadingDistributors
                            ? "Loading..."
                            : distributors.length === 0
                            ? "No distributors available"
                            : "Select Distributor"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors.map((dist) => (
                        <SelectItem key={dist.distributor_id} value={dist.distributor_id}>
                          {dist.name} ({dist.distributor_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Retailer Search & Dropdown */}
              {selectedDistributor && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Retailer (Optional)
                  </Label>
                  
                  {/* Search field if there are many retailers */}
                  {retailers.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name, ID, email or phone..."
                        value={retailerSearch}
                        onChange={(e) => setRetailerSearch(e.target.value)}
                        className="pl-10 h-12 bg-white"
                      />
                    </div>
                  )}

                  <Select
                    value={selectedRetailer}
                    onValueChange={handleRetailerSelect}
                    disabled={loadingRetailers}
                  >
                    <SelectTrigger className="h-12 bg-white">
                      <SelectValue
                        placeholder={
                          loadingRetailers
                            ? "Loading..."
                            : filteredRetailers.length === 0
                            ? "No retailers found"
                            : "Select Retailer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRetailers.map((ret) => (
                        <SelectItem key={ret.retailer_id} value={ret.retailer_id}>
                          {ret.name} ({ret.retailer_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commission Configuration - Only show if hierarchy is selected */}
        {selectedMD && (
          <>
            {loadingCommission ? (
              <Card className="shadow-md">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Loading commission configuration...</p>
                  </div>
                </CardContent>
              </Card>
            ) : !hasCommissionConfigured && !mdCommission && !distributorCommission && !retailerCommission && !selectedDistributor && !selectedRetailer ? (
              /* No Commission Configured State - ONLY for Master Distributor level */
              <Card className="shadow-md border-2 border-dashed border-gray-300">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                      <AlertCircle className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No commission configured yet
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                      Configure commission splits for this Master Distributor to get started
                    </p>
                    <Button
                      onClick={() => {
                        setHasCommissionConfigured(true);
                      }}
                      className="paybazaar-button h-12"
                    >
                      <Percent className="h-4 w-4 mr-2" />
                      Configure Commission
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Commission Split Form */
              <Card className="shadow-md">
                <CardContent className="p-0">
                  <div className="p-6 md:p-8 space-y-8">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <Percent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-semibold text-gray-900">Commission Split</h2>
                          {existingCommission && (
                            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              Editing Existing
                            </span>
                          )}
                          {isInheritedData && !existingCommission && (
                            <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded">
                              Inherited from Parent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Configure commission distribution (Total must equal 1.00%)</p>
                      </div>
                    </div>

                    {/* Commission Inputs */}
                    <div className="space-y-6">
                      {/* Master Distributor Commission */}
                      <div className="space-y-2">
                        <Label htmlFor="md_commission" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          Master Distributor Commission (%) <span className="text-red-500">*</span>
                          {isMDLocked && <Lock className="h-3 w-3 text-gray-400 ml-auto" />}
                        </Label>
                        <Input
                          id="md_commission"
                          type="text"
                          inputMode="decimal"
                          value={mdCommission}
                          onChange={(e) => handleCommissionChange("md", e.target.value)}
                          disabled={isMDLocked}
                          className={cn(
                            "h-12 text-lg font-semibold",
                            isMDLocked ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                          )}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Distributor Commission */}
                      <div className="space-y-2">
                        <Label htmlFor="dist_commission" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          Distributor Commission (%) <span className="text-red-500">*</span>
                          {isDistributorLocked && <Lock className="h-3 w-3 text-gray-400 ml-auto" />}
                        </Label>
                        <Input
                          id="dist_commission"
                          type="text"
                          inputMode="decimal"
                          value={distributorCommission}
                          onChange={(e) => handleCommissionChange("distributor", e.target.value)}
                          disabled={isDistributorLocked}
                          className={cn(
                            "h-12 text-lg font-semibold",
                            isDistributorLocked ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                          )}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Retailer Commission */}
                      <div className="space-y-2">
                        <Label htmlFor="retailer_commission" className="text-sm font-medium text-gray-700">
                          Retailer Commission (%) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="retailer_commission"
                          type="text"
                          inputMode="decimal"
                          value={retailerCommission}
                          onChange={(e) => handleCommissionChange("retailer", e.target.value)}
                          className="h-12 text-lg font-semibold bg-white"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Admin Commission Display */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Admin Commission (Remainder):
                          </span>
                          <span className={cn(
                            "text-xl font-bold",
                            adminCommission < 0 ? "text-red-600" : "text-blue-900"
                          )}>
                            {adminCommission.toFixed(2)}%
                          </span>
                        </div>
                        {validationError && (
                          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {validationError}
                          </p>
                        )}
                        {!validationError && (mdCommission || distributorCommission || retailerCommission) && (
                          <p className="text-sm text-gray-600 mt-2">
                            Admin automatically receives the remaining commission
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={saving}
                        className="flex-1 h-12 border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !!validationError || !mdCommission || !distributorCommission || !retailerCommission}
                        className="flex-1 h-12 paybazaar-button"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save Configuration
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Confirm Commission Configuration</DialogTitle>
              <DialogDescription className="text-gray-600">
                {selectedRetailer
                  ? "This will set commission for the selected retailer only."
                  : selectedDistributor
                  ? "This will set commission for the selected distributor and cascade to all retailers below."
                  : "This will set default commission for the Master Distributor and cascade to all levels below."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Master Distributor:</span>
                <span className="font-semibold text-gray-900">{parseFloat(mdCommission || "0").toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Distributor:</span>
                <span className="font-semibold text-gray-900">{parseFloat(distributorCommission || "0").toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Retailer:</span>
                <span className="font-semibold text-gray-900">{parseFloat(retailerCommission || "0").toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-blue-200">
                <span className="text-blue-700 font-semibold">Admin (Auto):</span>
                <span className="font-bold text-blue-900">{adminCommission.toFixed(2)}%</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
                className="border-gray-300 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSave}
                className="paybazaar-button h-12"
              >
                Confirm & Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}