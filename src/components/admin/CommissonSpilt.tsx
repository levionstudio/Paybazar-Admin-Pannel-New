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
import { Card, CardContent } from "@/components/ui/card";
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

/* ===================== TYPES ===================== */

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface MasterDistributor {
  master_distributor_id: string;
  name: string;
}

interface Distributor {
  distributor_id: string;
  name: string;
  master_distributor_id: string;
}

interface Retailer {
  retailer_id: string;
  name: string;
  distributor_id: string;
}

interface CommissionData {
  commision_id: number;
  user_id: string;
  service: string;
  total_commision: number;
  admin_commision: number;
  master_distributor_commision: number;
  distributor_commision: number;
  retailer_commision: number;
}

const TOTAL_COMMISSION = 1.0;
const SERVICE_TYPE = "PAYOUT";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ===================== AUTH ===================== */

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

function getAdminId(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded.admin_id;
  } catch {
    return null;
  }
}

/* ===================== COMPONENT ===================== */

export default function CommissionSplit() {
  const [adminId, setAdminId] = useState<string | null>(null);

  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const [selectedMD, setSelectedMD] = useState("");
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState("");

  const [mdCommission, setMdCommission] = useState("");
  const [distributorCommission, setDistributorCommission] = useState("");
  const [retailerCommission, setRetailerCommission] = useState("");
  const [adminCommission, setAdminCommission] = useState(0);

  const [existingCommission, setExistingCommission] = useState<CommissionData | null>(null);
  const [loadingMDs, setLoadingMDs] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasCommissionConfigured, setHasCommissionConfigured] = useState(false);

  const [retailerSearch, setRetailerSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  // Locking states
  const [isMDLocked, setIsMDLocked] = useState(false);
  const [isDistributorLocked, setIsDistributorLocked] = useState(false);
  const [isInheritedData, setIsInheritedData] = useState(false);

  /* ===================== INIT ===================== */

  useEffect(() => {
    setAdminId(getAdminId());
  }, []);

  /* ===================== FETCH MD ===================== */

  useEffect(() => {
    if (!adminId) return;
    
    setLoadingMDs(true);
    const token = getAuthToken();

    axios
      .get(`${API_BASE_URL}/md/get/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMasterDistributors(res.data.data.master_distributors || []);
      })
      .catch(() => toast.error("Failed to load Master Distributors"))
      .finally(() => setLoadingMDs(false));
  }, [adminId]);

  /* ===================== FETCH DISTRIBUTORS ===================== */

  const fetchDistributors = async (mdId: string) => {
    const token = getAuthToken();
    setLoadingDistributors(true);
    setDistributors([]);
    setRetailers([]);

    try {
      const res = await axios.get(`${API_BASE_URL}/distributor/get/md/${mdId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDistributors(res.data.data.distributors || []);
    } catch (error) {
      toast.error("Failed to load distributors");
    } finally {
      setLoadingDistributors(false);
    }
  };

  /* ===================== FETCH RETAILERS ===================== */

  const fetchRetailers = async (distId: string) => {
    const token = getAuthToken();
    setLoadingRetailers(true);
    
    try {
      const res = await axios.get(`${API_BASE_URL}/retailer/get/distributor/${distId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRetailers(res.data.data.retailers || []);
    } catch (error) {
      toast.error("Failed to load retailers");
    } finally {
      setLoadingRetailers(false);
    }
  };

  /* ===================== FETCH EXISTING COMMISSION ===================== */

  const fetchCommission = async (userId: string) => {
    const token = getAuthToken();
    setLoadingCommission(true);
    
    try {
      // Updated endpoint to match the route: /get/commision/:user_id/:service
      const res = await axios.get(`${API_BASE_URL}/commision/get/commision/${userId}/${SERVICE_TYPE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const c = res.data.data;
      setExistingCommission(c);
      setHasCommissionConfigured(true);

      // Populate fields with existing data
      setMdCommission(c.master_distributor_commision.toFixed(2));
      setDistributorCommission(c.distributor_commision.toFixed(2));
      setRetailerCommission(c.retailer_commision.toFixed(2));
      
      // Determine if this is inherited data or direct assignment
      const isDirectAssignment = c.user_id === userId;
      setIsInheritedData(!isDirectAssignment);
      
    } catch (error: any) {
      // No commission found - this is expected for new configurations
      if (error.response?.status === 404) {
        setExistingCommission(null);
        setHasCommissionConfigured(false);
        setIsInheritedData(false);
        
        // Reset commission fields
        setMdCommission("");
        setDistributorCommission("");
        setRetailerCommission("");
      } else {
        toast.error("Failed to load commission data");
      }
    } finally {
      setLoadingCommission(false);
    }
  };

  /* ===================== HANDLE MD SELECT ===================== */

  const handleMDSelect = async (mdId: string) => {
    setSelectedMD(mdId);
    setSelectedDistributor("");
    setSelectedRetailer("");
    setDistributors([]);
    setRetailers([]);
    
    // Reset locks
    setIsMDLocked(false);
    setIsDistributorLocked(false);
    
    // Fetch commission for MD
    await fetchCommission(mdId);
    
    // Fetch distributors under this MD
    await fetchDistributors(mdId);
  };

  /* ===================== HANDLE DISTRIBUTOR SELECT ===================== */

  const handleDistributorSelect = async (distId: string) => {
    setSelectedDistributor(distId);
    setSelectedRetailer("");
    setRetailers([]);
    
    // Lock MD commission when distributor is selected
    setIsMDLocked(true);
    setIsDistributorLocked(false);
    
    // Fetch commission for distributor
    await fetchCommission(distId);
    
    // Fetch retailers under this distributor
    await fetchRetailers(distId);
  };

  /* ===================== HANDLE RETAILER SELECT ===================== */

  const handleRetailerSelect = async (retId: string) => {
    setSelectedRetailer(retId);
    
    // Lock both MD and Distributor commissions when retailer is selected
    setIsMDLocked(true);
    setIsDistributorLocked(true);
    
    // Fetch commission for retailer
    await fetchCommission(retId);
  };

  /* ===================== FILTER RETAILERS ===================== */

  const filteredRetailers = retailers.filter((ret) => {
    if (!retailerSearch) return true;
    const search = retailerSearch.toLowerCase();
    return (
      ret.name.toLowerCase().includes(search) ||
      ret.retailer_id.toLowerCase().includes(search)
    );
  });

  /* ===================== HANDLE COMMISSION CHANGE ===================== */

  const handleCommissionChange = (type: "md" | "distributor" | "retailer", value: string) => {
    // Allow only numbers and single decimal point
    if (value && !/^\d*\.?\d{0,2}$/.test(value)) return;

    switch (type) {
      case "md":
        setMdCommission(value);
        break;
      case "distributor":
        setDistributorCommission(value);
        break;
      case "retailer":
        setRetailerCommission(value);
        break;
    }
  };

  /* ===================== CALCULATE ADMIN COMMISSION ===================== */

  useEffect(() => {
    const md = Number(mdCommission || 0);
    const dist = Number(distributorCommission || 0);
    const ret = Number(retailerCommission || 0);
    const total = md + dist + ret;

    const calculatedAdmin = Number((TOTAL_COMMISSION - total).toFixed(2));
    setAdminCommission(calculatedAdmin);

    // Validation
    if (total > TOTAL_COMMISSION) {
      setValidationError("Total commission cannot exceed 1.00%");
    } else if (calculatedAdmin < 0) {
      setValidationError("Admin commission cannot be negative");
    } else if (md < 0 || dist < 0 || ret < 0) {
      setValidationError("Commission values cannot be negative");
    } else {
      setValidationError("");
    }
  }, [mdCommission, distributorCommission, retailerCommission]);

  /* ===================== HANDLE SAVE ===================== */

  const handleSave = () => {
    // Final validation before opening confirm dialog
    if (!mdCommission || !distributorCommission || !retailerCommission) {
      toast.error("Please fill in all commission fields");
      return;
    }

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setConfirmDialogOpen(true);
  };

  /* ===================== CONFIRM SAVE ===================== */

  const confirmSave = async () => {
    const token = getAuthToken();
    setSaving(true);
    setConfirmDialogOpen(false);

    // Determine which user_id to use based on selection
    let userId = selectedMD;
    if (selectedDistributor) userId = selectedDistributor;
    if (selectedRetailer) userId = selectedRetailer;

    const payload = {
      user_id: userId,
      service: SERVICE_TYPE,
      total_commision: TOTAL_COMMISSION,
      admin_commision: adminCommission,
      master_distributor_commision: Number(mdCommission),
      distributor_commision: Number(distributorCommission),
      retailer_commision: Number(retailerCommission),
    };

    try {
      if (existingCommission && !isInheritedData) {
        // Update existing commission
        await axios.put(
          `${API_BASE_URL}/commision/update/commision`,
          {
            commision_id: existingCommission.commision_id,
            total_commision: TOTAL_COMMISSION,
            admin_commision: adminCommission,
            master_distributor_commision: Number(mdCommission),
            distributor_commision: Number(distributorCommission),
            retailer_commision: Number(retailerCommission),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Commission updated successfully");
      } else {
        // Create new commission
        await axios.post(`${API_BASE_URL}/commision/create`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Commission created successfully");
      }

      // Refresh commission data
      await fetchCommission(userId);
      
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to save commission";
      toast.error(errorMsg);
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== HANDLE RESET ===================== */

  const handleReset = () => {
    if (existingCommission && !isInheritedData) {
      // Reset to existing values
      setMdCommission(existingCommission.master_distributor_commision.toFixed(2));
      setDistributorCommission(existingCommission.distributor_commision.toFixed(2));
      setRetailerCommission(existingCommission.retailer_commision.toFixed(2));
    } else {
      // Clear all fields
      setMdCommission("");
      setDistributorCommission("");
      setRetailerCommission("");
      setHasCommissionConfigured(false);
    }
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
                    <SelectValue placeholder="Select category" />
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
                    <SelectValue placeholder="Select subcategory" />
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
                          {existingCommission && !isInheritedData && (
                            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              Editing Existing
                            </span>
                          )}
                          {isInheritedData && (
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
                disabled={saving}
                className="paybazaar-button h-12"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Confirm & Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}