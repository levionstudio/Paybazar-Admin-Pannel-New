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
  CheckCircle2,
  Info,
  Edit,
  Plus,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* =====================
   TYPES
   ===================== */
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
  created_at: string;
  updated_at: string;
}

interface HierarchyLevel {
  level: "master_distributor" | "distributor" | "retailer";
  userId: string;
  userName: string;
}

const TOTAL_COMMISSION = 1.0;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SERVICES = ["AEPS", "DMT", "BBPS", "Recharge", "PAYOUT"];

/* =====================
   AUTH
   ===================== */
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

/* =====================
   COMPONENT
   ===================== */
export default function CommissionSplit() {
  const [adminId, setAdminId] = useState<string | null>(null);

  // Hierarchy data
  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);

  // Selection states
  const [selectedMD, setSelectedMD] = useState<string>("");
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");

  // Commission table data
  const [allCommissions, setAllCommissions] = useState<CommissionData[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // Edit/Create mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionData | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");

  // Commission values
  const [mdCommission, setMdCommission] = useState<string>("");
  const [distributorCommission, setDistributorCommission] = useState<string>("");
  const [retailerCommission, setRetailerCommission] = useState<string>("");
  const [adminCommission, setAdminCommission] = useState<number>(0);

  // Current hierarchy level
  const [currentHierarchyLevel, setCurrentHierarchyLevel] = useState<HierarchyLevel | null>(null);

  // Loading states
  const [loadingMDs, setLoadingMDs] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [retailerSearch, setRetailerSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  // Locking states
  const [isMDLocked, setIsMDLocked] = useState(false);
  const [isDistributorLocked, setIsDistributorLocked] = useState(false);

  /* =====================
     INIT
     ===================== */
  useEffect(() => {
    setAdminId(getAdminId());
  }, []);

  /* =====================
     FETCH MASTER DISTRIBUTORS
     ===================== */
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

  /* =====================
     FETCH DISTRIBUTORS
     ===================== */
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

  /* =====================
     FETCH RETAILERS
     ===================== */
  const fetchRetailers = async (distId: string) => {
    const token = getAuthToken();
    setLoadingRetailers(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/retailer/get/distributor/${distId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRetailers(res.data.data.retailers || []);
    } catch (error) {
      toast.error("Failed to load retailers");
    } finally {
      setLoadingRetailers(false);
    }
  };

  /* =====================
     FETCH ALL COMMISSIONS FOR USER
     ===================== */
  const fetchAllCommissions = async (userId: string) => {
    const token = getAuthToken();
    setLoadingCommissions(true);
    setAllCommissions([]);

    try {
      console.log("📥 Fetching Commissions:");
      console.log("User ID:", userId);
      console.log("URL:", `${API_BASE_URL}/commision/get/commision/${userId}`);

      const res = await axios.get(
        `${API_BASE_URL}/commision/get/commision/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📦 Full API Response:", res.data);
      console.log("📦 Response Data:", res.data.data);
      
      const commissionsData = res.data.data?.commisions || [];
      
      console.log("📊 Commissions Array:", commissionsData);
      console.log("📊 Number of Commissions:", commissionsData.length);
      
      if (commissionsData.length > 0) {
        console.log("📊 First Commission Sample:", commissionsData[0]);
        console.log("📊 Commission ID Type:", typeof commissionsData[0].commision_id);
      }

      setAllCommissions(commissionsData);

      if (commissionsData.length > 0) {
        toast.success(`Loaded ${commissionsData.length} commission(s)`);
      } else {
        toast.info("No commissions found. Create new commissions for services.");
      }
    } catch (error: any) {
      console.error("❌ Fetch Commissions Error:");
      console.error("Error Response:", error.response?.data);
      console.error("Error Status:", error.response?.status);
      
      if (error.response?.status === 404) {
        toast.info("No commissions found. Create new commissions for services.");
        setAllCommissions([]);
      } else {
        toast.error("Failed to fetch commissions");
      }
    } finally {
      setLoadingCommissions(false);
    }
  };

  /* =====================
     HANDLE MD SELECT
     ===================== */
  const handleMDSelect = async (mdId: string) => {
    setSelectedMD(mdId);
    setSelectedDistributor("");
    setSelectedRetailer("");
    setDistributors([]);
    setRetailers([]);
    setAllCommissions([]);
    setIsEditMode(false);
    setEditingCommission(null);
    setSelectedService("");

    // Reset locks
    setIsMDLocked(false);
    setIsDistributorLocked(false);

    const mdName =
      masterDistributors.find((md) => md.master_distributor_id === mdId)?.name || "";

    setCurrentHierarchyLevel({
      level: "master_distributor",
      userId: mdId,
      userName: mdName,
    });

    // Fetch all commissions for this MD
    await fetchAllCommissions(mdId);

    // Fetch distributors under this MD
    await fetchDistributors(mdId);
  };

  /* =====================
     HANDLE DISTRIBUTOR SELECT
     ===================== */
  const handleDistributorSelect = async (distId: string) => {
    setSelectedDistributor(distId);
    setSelectedRetailer("");
    setRetailers([]);
    setAllCommissions([]);
    setIsEditMode(false);
    setEditingCommission(null);
    setSelectedService("");

    // Lock MD commission when distributor is selected
    setIsMDLocked(true);
    setIsDistributorLocked(false);

    const distName =
      distributors.find((dist) => dist.distributor_id === distId)?.name || "";

    setCurrentHierarchyLevel({
      level: "distributor",
      userId: distId,
      userName: distName,
    });

    // Fetch all commissions for this distributor
    await fetchAllCommissions(distId);

    // Fetch retailers under this distributor
    await fetchRetailers(distId);
  };

  /* =====================
     HANDLE RETAILER SELECT
     ===================== */
  const handleRetailerSelect = async (retId: string) => {
    setSelectedRetailer(retId);
    setAllCommissions([]);
    setIsEditMode(false);
    setEditingCommission(null);
    setSelectedService("");

    // Lock both MD and Distributor commissions when retailer is selected
    setIsMDLocked(true);
    setIsDistributorLocked(true);

    const retName =
      retailers.find((ret) => ret.retailer_id === retId)?.name || "";

    setCurrentHierarchyLevel({
      level: "retailer",
      userId: retId,
      userName: retName,
    });

    // Fetch all commissions for this retailer
    await fetchAllCommissions(retId);
  };

  /* =====================
     HANDLE CREATE NEW COMMISSION
     ===================== */
  const handleCreateNewCommission = () => {
    if (!currentHierarchyLevel) {
      toast.error("Please select a user first");
      return;
    }

    // Check if service is already selected
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    // Check if commission already exists for this service
    const existingForService = allCommissions.find(
      (c) => c.service === selectedService
    );

    if (existingForService) {
      toast.error(`Commission for ${selectedService} already exists. Use Edit instead.`);
      return;
    }

    setIsEditMode(true);
    setEditingCommission(null);

    // Set default values
    setMdCommission("0.40");
    setDistributorCommission("0.30");
    setRetailerCommission("0.20");
  };

  /* =====================
     HANDLE EDIT COMMISSION
     ===================== */
  const handleEditCommission = (commission: CommissionData) => {
    console.log("✏️ Edit Commission Triggered:");
    console.log("Commission Object:", commission);
    console.log("Commission ID:", commission.commision_id);
    console.log("Commission ID Type:", typeof commission.commision_id);
    console.log("Service:", commission.service);
    
    setIsEditMode(true);
    setEditingCommission(commission);
    setSelectedService(commission.service);

    // Populate fields
    const mdComm = commission.master_distributor_commision.toFixed(2);
    const distComm = commission.distributor_commision.toFixed(2);
    const retComm = commission.retailer_commision.toFixed(2);
    
    console.log("Setting Commission Values:");
    console.log("MD:", mdComm);
    console.log("Distributor:", distComm);
    console.log("Retailer:", retComm);
    
    setMdCommission(mdComm);
    setDistributorCommission(distComm);
    setRetailerCommission(retComm);
  };

  /* =====================
     HANDLE CANCEL EDIT
     ===================== */
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingCommission(null);
    setSelectedService("");
    setMdCommission("");
    setDistributorCommission("");
    setRetailerCommission("");
    setValidationError("");
  };

  /* =====================
     FILTER RETAILERS
     ===================== */
  const filteredRetailers = retailers.filter((ret) => {
    if (!retailerSearch) return true;
    const search = retailerSearch.toLowerCase();
    return (
      ret.name.toLowerCase().includes(search) ||
      ret.retailer_id.toLowerCase().includes(search)
    );
  });

  /* =====================
     HANDLE COMMISSION CHANGE
     ===================== */
  const handleCommissionChange = (
    type: "md" | "distributor" | "retailer",
    value: string
  ) => {
    // Allow only numbers and single decimal point
    if (value && !/^\d*\.?\d{0,2}$/.test(value)) return;

    switch (type) {
      case "md":
        if (!isMDLocked) setMdCommission(value);
        break;
      case "distributor":
        if (!isDistributorLocked) setDistributorCommission(value);
        break;
      case "retailer":
        setRetailerCommission(value);
        break;
    }
  };

  /* =====================
     CALCULATE ADMIN COMMISSION
     ===================== */
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

  /* =====================
     HANDLE SAVE
     ===================== */
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
    if (!currentHierarchyLevel) {
      toast.error("Please select a hierarchy level");
      return;
    }
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }
    setConfirmDialogOpen(true);
  };

  /* =====================
     CONFIRM SAVE
     ===================== */
  const confirmSave = async () => {
    const token = getAuthToken();
    setSaving(true);
    setConfirmDialogOpen(false);

    if (!currentHierarchyLevel) return;

    const userId = currentHierarchyLevel.userId;

    try {
      if (!editingCommission) {
        // CREATE new commission
        const createPayload = {
          user_id: userId,
          service: selectedService,
          total_commision: TOTAL_COMMISSION,
          admin_commision: adminCommission,
          master_distributor_commision: Number(mdCommission),
          distributor_commision: Number(distributorCommission),
          retailer_commision: Number(retailerCommission),
        };

        console.log("🟢 CREATE Commission Request:");
        console.log("URL:", `${API_BASE_URL}/commision/create`);
        console.log("Payload:", createPayload);

        const createResponse = await axios.post(
          `${API_BASE_URL}/commision/create`,
          createPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("✅ CREATE Response:", createResponse.data);
        toast.success(`Commission for ${selectedService} created successfully`);
      } else {
        // UPDATE existing commission
        // IMPORTANT: Backend expects all commission fields even though they're marked as omitempty
        // The SQL query updates all fields, so we must provide all values
        const updatePayload = {
          commision_id: editingCommission.commision_id,
          total_commision: TOTAL_COMMISSION,
          admin_commision: adminCommission,
          master_distributor_commision: Number(mdCommission),
          distributor_commision: Number(distributorCommission),
          retailer_commision: Number(retailerCommission),
        };

        console.log("🔵 UPDATE Commission Request:");
        console.log("URL:", `${API_BASE_URL}/commision/update/commision`);
        console.log("Editing Commission Object:", editingCommission);
        console.log("Commission ID:", editingCommission.commision_id);
        console.log("Commission ID Type:", typeof editingCommission.commision_id);
        console.log("Update Payload:", updatePayload);
        console.log("Payload Breakdown:");
        console.log("  - commision_id:", updatePayload.commision_id);
        console.log("  - total_commision:", updatePayload.total_commision);
        console.log("  - admin_commision:", updatePayload.admin_commision);
        console.log("  - master_distributor_commision:", updatePayload.master_distributor_commision);
        console.log("  - distributor_commision:", updatePayload.distributor_commision);
        console.log("  - retailer_commision:", updatePayload.retailer_commision);

        const updateResponse = await axios.put(
          `${API_BASE_URL}/commision/update/commision`,
          updatePayload,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ UPDATE Response:", updateResponse.data);
        toast.success(`Commission for ${selectedService} updated successfully`);
      }

      // Refresh the commission data
      await fetchAllCommissions(userId);
      handleCancelEdit();
    } catch (err: any) {
      console.error("❌ Commission Save Error:");
      console.error("Error Response:", err.response?.data);
      console.error("Error Status:", err.response?.status);
      console.error("Error Message:", err.message);
      console.error("Full Error:", err);
      
      // Try to extract more detailed error info
      if (err.response?.data?.message) {
        console.error("Backend Error Message:", err.response.data.message);
      }
      if (err.response?.data?.errors) {
        console.error("Backend Validation Errors:", err.response.data.errors);
      }
      
      const errorMessage = err.response?.data?.message || err.message || "Operation failed";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /* =====================
     HANDLE RESET
     ===================== */
  const handleReset = () => {
    if (editingCommission) {
      setMdCommission(editingCommission.master_distributor_commision.toFixed(2));
      setDistributorCommission(editingCommission.distributor_commision.toFixed(2));
      setRetailerCommission(editingCommission.retailer_commision.toFixed(2));
    } else {
      // Reset to defaults
      setMdCommission("0.40");
      setDistributorCommission("0.30");
      setRetailerCommission("0.20");
    }
    toast.info("Values reset");
  };

  /* =====================
     FORMAT DATE
     ===================== */
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Percent className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Commission Configuration
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Configure commission splits for your hierarchy
          </p>
        </div>

        {/* Hierarchy Selection Card */}
        <Card className="border-2 border-blue-100 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">
                  Select Hierarchy
                </h2>
              </div>
              <p className="text-slate-600">
                Choose the level to view and configure commissions
              </p>

              {/* Master Distributor Dropdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold text-slate-700">
                    Master Distributor *
                  </Label>
                  {isMDLocked && <Lock className="w-4 h-4 text-amber-500" />}
                </div>
                <Select
                  value={selectedMD}
                  onValueChange={handleMDSelect}
                  disabled={loadingMDs || isMDLocked}
                >
                  <SelectTrigger
                    className={cn(
                      "h-14 text-lg border-2",
                      isMDLocked ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    )}
                  >
                    <SelectValue placeholder="Select Master Distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterDistributors.map((md) => (
                      <SelectItem
                        key={md.master_distributor_id}
                        value={md.master_distributor_id}
                      >
                        {md.name} ({md.master_distributor_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Distributor Dropdown */}
              {selectedMD && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold text-slate-700">
                      Distributor (Optional)
                    </Label>
                    {isDistributorLocked && (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <Select
                    value={selectedDistributor}
                    onValueChange={handleDistributorSelect}
                    disabled={loadingDistributors || isDistributorLocked}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-14 text-lg border-2",
                        isDistributorLocked
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white"
                      )}
                    >
                      <SelectValue placeholder="Select Distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors.map((dist) => (
                        <SelectItem
                          key={dist.distributor_id}
                          value={dist.distributor_id}
                        >
                          {dist.name} ({dist.distributor_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Retailer Search & Dropdown */}
              {selectedDistributor && (
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold text-slate-700">
                    Retailer (Optional)
                  </Label>

                  {/* Search field if there are many retailers */}
                  {retailers.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        value={retailerSearch}
                        onChange={(e) => setRetailerSearch(e.target.value)}
                        className="pl-12 h-12 bg-white border-2"
                        placeholder="Search retailers..."
                      />
                    </div>
                  )}

                  <Select
                    value={selectedRetailer}
                    onValueChange={handleRetailerSelect}
                    disabled={loadingRetailers}
                  >
                    <SelectTrigger className="h-14 text-lg bg-white border-2">
                      <SelectValue placeholder="Select Retailer" />
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

        {/* Commission Table - Show when user is selected */}
        {currentHierarchyLevel && !isEditMode && (
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <TableIcon className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl">
                    Commission Table - {currentHierarchyLevel.userName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    View and manage all service commissions
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => fetchAllCommissions(currentHierarchyLevel.userId)}
                  variant="outline"
                  size="sm"
                  disabled={loadingCommissions}
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-2",
                      loadingCommissions && "animate-spin"
                    )}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCommissions ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  <p className="text-slate-600 text-lg">
                    Loading commissions...
                  </p>
                </div>
              ) : allCommissions.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Service</TableHead>
                        <TableHead className="font-semibold text-center">
                          MD Commission
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Distributor
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Retailer
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Admin
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Total
                        </TableHead>
                        <TableHead className="font-semibold">
                          Last Updated
                        </TableHead>
                        <TableHead className="font-semibold text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCommissions.map((commission) => (
                        <TableRow key={commission.commision_id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{commission.commision_id}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {commission.service}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {commission.master_distributor_commision.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {commission.distributor_commision.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {commission.retailer_commision.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {commission.admin_commision.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {commission.total_commision.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(commission.updated_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              onClick={() => handleEditCommission(commission)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="p-4 bg-slate-100 rounded-full">
                    <TableIcon className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-slate-600 text-lg font-medium">
                    No commissions found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create commissions for different services
                  </p>
                </div>
              )}

              {/* Create New Button */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">
                    Select Service to Create Commission
                  </Label>
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((service) => {
                        const exists = allCommissions.some(
                          (c) => c.service === service
                        );
                        return (
                          <SelectItem
                            key={service}
                            value={service}
                            disabled={exists}
                          >
                            {service} {exists && "(Already Exists)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateNewCommission}
                  disabled={!selectedService}
                  className="h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 mt-6"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Commission
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit/Create Commission Form */}
        {currentHierarchyLevel && isEditMode && (
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardContent className="p-6 space-y-6">
              {/* Section Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Percent className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {editingCommission ? "Edit" : "Create"} Commission - {selectedService}
                      </h3>
                      <p className="text-sm text-slate-600">
                        For {currentHierarchyLevel.userName}
                      </p>
                    </div>
                  </div>
                  {editingCommission ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        Editing Existing
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <Info className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Creating New
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Commission Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Master Distributor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold text-slate-700">
                      Master Distributor Commission (%) *
                    </Label>
                    {isMDLocked && <Lock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <Input
                    type="text"
                    value={mdCommission}
                    onChange={(e) =>
                      handleCommissionChange("md", e.target.value)
                    }
                    disabled={isMDLocked}
                    className={cn(
                      "h-14 text-lg font-semibold border-2",
                      isMDLocked
                        ? "bg-gray-100 cursor-not-allowed"
                        : "bg-white"
                    )}
                    placeholder="0.00"
                  />
                </div>

                {/* Distributor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold text-slate-700">
                      Distributor Commission (%) *
                    </Label>
                    {isDistributorLocked && (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <Input
                    type="text"
                    value={distributorCommission}
                    onChange={(e) =>
                      handleCommissionChange("distributor", e.target.value)
                    }
                    disabled={isDistributorLocked}
                    className={cn(
                      "h-14 text-lg font-semibold border-2",
                      isDistributorLocked
                        ? "bg-gray-100 cursor-not-allowed"
                        : "bg-white"
                    )}
                    placeholder="0.00"
                  />
                </div>

                {/* Retailer */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-slate-700">
                    Retailer Commission (%) *
                  </Label>
                  <Input
                    type="text"
                    value={retailerCommission}
                    onChange={(e) =>
                      handleCommissionChange("retailer", e.target.value)
                    }
                    className="h-14 text-lg font-semibold bg-white border-2"
                    placeholder="0.00"
                  />
                </div>

                {/* Admin */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-slate-700">
                    Admin Commission (Auto)
                  </Label>
                  <div className="h-14 px-4 bg-slate-100 border-2 border-slate-200 rounded-lg flex items-center">
                    <span className="text-lg font-bold text-slate-700">
                      {adminCommission.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {validationError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 font-medium">{validationError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1 h-14 text-lg border-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 h-14 text-lg border-2"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !!validationError ||
                    !mdCommission ||
                    !distributorCommission ||
                    !retailerCommission
                  }
                  className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingCommission ? "Update" : "Create"} Commission
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingCommission ? "Update" : "Create"} Commission for {selectedService}
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                This will {editingCommission ? "update" : "create"} commission for{" "}
                <span className="font-semibold">{currentHierarchyLevel?.userName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-slate-700">
                  Master Distributor:
                </span>
                <span className="font-bold text-blue-600">
                  {parseFloat(mdCommission || "0").toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-slate-700">Distributor:</span>
                <span className="font-bold text-blue-600">
                  {parseFloat(distributorCommission || "0").toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-slate-700">Retailer:</span>
                <span className="font-bold text-blue-600">
                  {parseFloat(retailerCommission || "0").toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                <span className="font-medium text-slate-700">Admin (Auto):</span>
                <span className="font-bold text-slate-700">
                  {adminCommission.toFixed(2)}%
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                onClick={() => setConfirmDialogOpen(false)}
                variant="outline"
                className="border-2 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSave}
                disabled={saving}
                className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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