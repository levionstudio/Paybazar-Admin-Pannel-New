import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import {
  Percent,
  Building2,
  AlertCircle,
  RefreshCw,
  Search,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Info,
  Edit,
  Plus,
  Table as TableIcon,
  X,
  IndianRupee,
  TrendingUp,
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
  master_distributor_name: string;
  master_distributor_email: string;
}

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_email: string;
  master_distributor_id: string;
}

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_email: string;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SERVICES = ["PAYOUT"];
const REFERENCE_AMOUNT = 1000; // ₹1000 reference for calculations

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

  // Commission values - TOTAL FIRST
  const [totalCommission, setTotalCommission] = useState<string>("");
  const [mdCommission, setMdCommission] = useState<string>("");
  const [distributorCommission, setDistributorCommission] = useState<string>("");
  const [retailerCommission, setRetailerCommission] = useState<string>("");
  const [adminCommission, setAdminCommission] = useState<number>(0);

  // Rupee amounts for ₹1000 reference
  const [totalRupees, setTotalRupees] = useState<number>(0);
  const [mdRupees, setMdRupees] = useState<number>(0);
  const [distributorRupees, setDistributorRupees] = useState<number>(0);
  const [retailerRupees, setRetailerRupees] = useState<number>(0);
  const [adminRupees, setAdminRupees] = useState<number>(0);

  // Current hierarchy level
  const [currentHierarchyLevel, setCurrentHierarchyLevel] = useState<HierarchyLevel | null>(null);

  // Loading states
  const [loadingMDs, setLoadingMDs] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [masterDistributorSearch, setMasterDistributorSearch] = useState("");
  const [distributorSearch, setDistributorSearch] = useState("");
  const [retailerSearch, setRetailerSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  /* =====================
     INIT
     ===================== */
  useEffect(() => {
    setAdminId(getAdminId());
  }, []);

  /* =====================
     FETCH ALL MASTER DISTRIBUTORS
     ===================== */
  useEffect(() => {
    if (!adminId) return;
    
    const fetchAllMasterDistributors = async () => {
      setLoadingMDs(true);
      const token = getAuthToken();
      
      try {
        const params = new URLSearchParams({
          limit: '10000',
          page_size: '10000',
          per_page: '10000',
          all: 'true'
        });

        const res = await axios.get(
          `${API_BASE_URL}/md/get/admin/${adminId}?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const mdList = res.data.data.master_distributors || [];
        setMasterDistributors(mdList);
      } catch (error) {
        console.error("Error fetching master distributors:", error);
        toast.error("Failed to load Master Distributors");
      } finally {
        setLoadingMDs(false);
      }
    };

    fetchAllMasterDistributors();
  }, [adminId]);

  /* =====================
     FETCH ALL DISTRIBUTORS FOR SELECTED MD
     ===================== */
  const fetchAllDistributors = async (mdId: string) => {
    const token = getAuthToken();
    setLoadingDistributors(true);
    setDistributors([]);
    setRetailers([]);
    
    try {
      const params = new URLSearchParams({
        limit: '10000',
        page_size: '10000',
        per_page: '10000',
        all: 'true'
      });

      const res = await axios.get(
        `${API_BASE_URL}/distributor/get/md/${mdId}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const distList = res.data.data.distributors || [];
      setDistributors(distList);
    } catch (error) {
      console.error("Error fetching distributors:", error);
      toast.error("Failed to load distributors");
    } finally {
      setLoadingDistributors(false);
    }
  };

  /* =====================
     FETCH ALL RETAILERS FOR SELECTED DISTRIBUTOR
     ===================== */
  const fetchAllRetailers = async (distId: string) => {
    const token = getAuthToken();
    setLoadingRetailers(true);
    
    try {
      const params = new URLSearchParams({
        limit: '10000',
        page_size: '10000',
        per_page: '10000',
        all: 'true'
      });

      const res = await axios.get(
        `${API_BASE_URL}/retailer/get/distributor/${distId}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const retList = res.data.data.retailers || [];
      setRetailers(retList);
    } catch (error) {
      console.error("Error fetching retailers:", error);
      toast.error("Failed to load retailers");
    } finally {
      setLoadingRetailers(false);
    }
  };

  /* =====================
     FETCH ALL COMMISSIONS FOR USER
     ===================== */
  const fetchAllCommissions = async (userId: string) => {
    console.log("========== FETCH COMMISSIONS START ==========");
    console.log("👤 User ID:", userId);
    
    const token = getAuthToken();
    setLoadingCommissions(true);
    setAllCommissions([]);

    try {
      console.log("🌐 API URL:", `${API_BASE_URL}/commision/get/commision/${userId}`);
      console.log("🔑 Token exists:", !!token);

      const res = await axios.get(
        `${API_BASE_URL}/commision/get/commision/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("✅ FETCH SUCCESS - Response:");
      console.log("Response status:", res.status);
      console.log("Response data:", JSON.stringify(res.data, null, 2));
      
      const commissionsData = res.data.data?.commisions || [];
      console.log("📊 Commissions count:", commissionsData.length);
      console.log("📋 Commissions data:", commissionsData);
      
      setAllCommissions(commissionsData);

      if (commissionsData.length > 0) {
        toast.success(`Loaded ${commissionsData.length} commission(s)`);
      } else {
        toast.info("No commissions found. Create new commissions for services.");
      }
      
      console.log("========== FETCH COMMISSIONS SUCCESS ==========");
    } catch (error: any) {
      console.error("========== ❌ FETCH COMMISSIONS ERROR ==========");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);
      console.error("Response status:", error.response?.status);
      console.error("Response data:", error.response?.data);
      
      if (error.response?.status === 404) {
        console.log("ℹ️ 404 - No commissions found (expected for new users)");
        toast.info("No commissions found. Create new commissions for services.");
        setAllCommissions([]);
      } else {
        console.error("🚨 Unexpected error fetching commissions");
        toast.error("Failed to fetch commissions");
      }
    } finally {
      setLoadingCommissions(false);
      console.log("========== FETCH COMMISSIONS END ==========");
    }
  };

  /* =====================
     FILTER FUNCTIONS
     ===================== */
  const filteredMasterDistributors = masterDistributors.filter((md) => {
    if (!masterDistributorSearch) return true;
    const search = masterDistributorSearch.toLowerCase();
    return (
      md.master_distributor_name.toLowerCase().includes(search) ||
      md.master_distributor_id.toLowerCase().includes(search) ||
      md.master_distributor_email.toLowerCase().includes(search)
    );
  });

  const filteredDistributors = distributors.filter((dist) => {
    if (!distributorSearch) return true;
    const search = distributorSearch.toLowerCase();
    return (
      dist.distributor_name.toLowerCase().includes(search) ||
      dist.distributor_id.toLowerCase().includes(search) ||
      dist.distributor_email.toLowerCase().includes(search)
    );
  });

  const filteredRetailers = retailers.filter((ret) => {
    if (!retailerSearch) return true;
    const search = retailerSearch.toLowerCase();
    return (
      ret.retailer_name.toLowerCase().includes(search) ||
      ret.retailer_id.toLowerCase().includes(search) ||
      ret.retailer_email.toLowerCase().includes(search)
    );
  });

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

    const mdData = masterDistributors.find((md) => md.master_distributor_id === mdId);
    const mdName = mdData?.master_distributor_name || mdData?.master_distributor_email || "";

    setCurrentHierarchyLevel({
      level: "master_distributor",
      userId: mdId,
      userName: mdName,
    });

    await fetchAllCommissions(mdId);
    await fetchAllDistributors(mdId);
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

    const distData = distributors.find((dist) => dist.distributor_id === distId);
    const distName = distData?.distributor_name || distData?.distributor_email || "";

    setCurrentHierarchyLevel({
      level: "distributor",
      userId: distId,
      userName: distName,
    });

    await fetchAllCommissions(distId);
    await fetchAllRetailers(distId);
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

    const retData = retailers.find((ret) => ret.retailer_id === retId);
    const retName = retData?.retailer_name || retData?.retailer_email || "";

    setCurrentHierarchyLevel({
      level: "retailer",
      userId: retId,
      userName: retName,
    });

    await fetchAllCommissions(retId);
  };

  /* =====================
     HANDLE CREATE NEW COMMISSION
     ===================== */
  const handleCreateNewCommission = () => {
    console.log("========== CREATE NEW COMMISSION ==========");
    console.log("Current hierarchy level:", currentHierarchyLevel);
    console.log("Selected service:", selectedService);
    console.log("Existing commissions:", allCommissions);
    
    if (!currentHierarchyLevel) {
      console.error("❌ No hierarchy level selected");
      toast.error("Please select a user first");
      return;
    }

    if (!selectedService) {
      console.error("❌ No service selected");
      toast.error("Please select a service");
      return;
    }

    const existingForService = allCommissions.find(
      (c) => c.service === selectedService
    );

    if (existingForService) {
      console.error("❌ Commission already exists for service:", selectedService);
      toast.error(`Commission for ${selectedService} already exists. Use Edit instead.`);
      return;
    }

    console.log("✅ Creating new commission for service:", selectedService);
    setIsEditMode(true);
    setEditingCommission(null);

    // Set default values - these are percentages of the total commission
    setTotalCommission("1.20");
    setMdCommission("0.40");
    setDistributorCommission("0.30");
    setRetailerCommission("0.20");
    console.log("✅ Default values set - Total: 1.20, MD: 0.40, Dist: 0.30, Ret: 0.20");
  };

  /* =====================
     HANDLE EDIT COMMISSION
     ===================== */
  const handleEditCommission = (commission: CommissionData) => {
    setIsEditMode(true);
    setEditingCommission(commission);
    setSelectedService(commission.service);
    
    setTotalCommission(commission.total_commision.toFixed(2));
    setMdCommission(commission.master_distributor_commision.toFixed(2));
    setDistributorCommission(commission.distributor_commision.toFixed(2));
    setRetailerCommission(commission.retailer_commision.toFixed(2));
  };

  /* =====================
     HANDLE CANCEL EDIT
     ===================== */
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingCommission(null);
    setSelectedService("");
    setTotalCommission("");
    setMdCommission("");
    setDistributorCommission("");
    setRetailerCommission("");
    setValidationError("");
  };

  /* =====================
     HANDLE COMMISSION CHANGE
     ===================== */
  const handleCommissionChange = (
    type: "total" | "md" | "distributor" | "retailer",
    value: string
  ) => {
    // Allow only numbers and single decimal point
    if (value && !/^\d*\.?\d{0,2}$/.test(value)) return;

    switch (type) {
      case "total":
        setTotalCommission(value);
        break;
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

  /* =====================
     CALCULATE ADMIN COMMISSION & RUPEE AMOUNTS
     ===================== */
  useEffect(() => {
    const total = Number(totalCommission || 0);
    const md = Number(mdCommission || 0);
    const dist = Number(distributorCommission || 0);
    const ret = Number(retailerCommission || 0);
    
    const sumOfParts = md + dist + ret;
    const calculatedAdmin = Number((1.0 - sumOfParts).toFixed(2));
    setAdminCommission(calculatedAdmin);

    // First calculate total commission amount in rupees for ₹1000 transaction
    const totalCommissionAmount = Number(((total / 100) * REFERENCE_AMOUNT).toFixed(2));
    setTotalRupees(totalCommissionAmount);

    // Now calculate each party's share as percentage of the total commission amount
    // MD gets md% of the total commission (where md is like 0.40 = 40%)
    setMdRupees(Number(((md * 100 / 100) * totalCommissionAmount).toFixed(2)));
    setDistributorRupees(Number(((dist * 100 / 100) * totalCommissionAmount).toFixed(2)));
    setRetailerRupees(Number(((ret * 100 / 100) * totalCommissionAmount).toFixed(2)));
    setAdminRupees(Number(((calculatedAdmin * 100 / 100) * totalCommissionAmount).toFixed(2)));

    // Validation
    if (sumOfParts > 1.0) {
      setValidationError("Sum of MD, Distributor & Retailer percentages cannot exceed 100%");
    } else if (calculatedAdmin < 0) {
      setValidationError("Admin commission cannot be negative");
    } else if (total < 0 || md < 0 || dist < 0 || ret < 0) {
      setValidationError("Commission values cannot be negative");
    } else if (total > 100) {
      setValidationError("Total commission cannot exceed 100%");
    } else {
      setValidationError("");
    }
  }, [totalCommission, mdCommission, distributorCommission, retailerCommission]);

  /* =====================
     HANDLE SAVE
     ===================== */
  const handleSave = () => {
    console.log("========== HANDLE SAVE VALIDATION ==========");
    console.log("📝 Form Values:");
    console.log("  - Total Commission:", totalCommission);
    console.log("  - MD Commission:", mdCommission);
    console.log("  - Distributor Commission:", distributorCommission);
    console.log("  - Retailer Commission:", retailerCommission);
    console.log("  - Admin Commission (auto):", adminCommission);
    console.log("  - Service:", selectedService);
    console.log("  - Current Hierarchy:", currentHierarchyLevel);
    console.log("  - Validation Error:", validationError);
    
    if (!totalCommission || !mdCommission || !distributorCommission || !retailerCommission) {
      console.error("❌ Validation failed: Missing commission fields");
      toast.error("Please fill in all commission fields");
      return;
    }
    if (validationError) {
      console.error("❌ Validation failed:", validationError);
      toast.error(validationError);
      return;
    }
    if (!currentHierarchyLevel) {
      console.error("❌ Validation failed: No hierarchy level selected");
      toast.error("Please select a hierarchy level");
      return;
    }
    if (!selectedService) {
      console.error("❌ Validation failed: No service selected");
      toast.error("Please select a service");
      return;
    }
    
    console.log("✅ All validations passed - Opening confirmation dialog");
    setConfirmDialogOpen(true);
  };

  /* =====================
     CONFIRM SAVE
     ===================== */
  const confirmSave = async () => {
    console.log("========== CONFIRM SAVE START ==========");
    const token = getAuthToken();
    setSaving(true);
    setConfirmDialogOpen(false);

    if (!currentHierarchyLevel) {
      console.error("❌ No hierarchy level selected");
      return;
    }

    const userId = currentHierarchyLevel.userId;
    console.log("📍 Current Hierarchy Level:", currentHierarchyLevel);
    console.log("👤 User ID:", userId);
    console.log("🔧 Service:", selectedService);
    console.log("📝 Editing Commission:", editingCommission);

    try {
      if (!editingCommission) {
        // CREATE new commission
        console.log("🆕 CREATE MODE");
        
        const createPayload = {
          user_id: userId,
          service: selectedService,
          total_commision: Number(totalCommission),
          admin_commision: adminCommission,
          master_distributor_commision: Number(mdCommission),
          distributor_commision: Number(distributorCommission),
          retailer_commision: Number(retailerCommission),
        };

        console.log("📤 CREATE PAYLOAD:");
        console.log(JSON.stringify(createPayload, null, 2));
        console.log("📊 Payload Details:");
        console.log("  - Total Commission:", Number(totalCommission), typeof Number(totalCommission));
        console.log("  - Admin Commission:", adminCommission, typeof adminCommission);
        console.log("  - MD Commission:", Number(mdCommission), typeof Number(mdCommission));
        console.log("  - Distributor Commission:", Number(distributorCommission), typeof Number(distributorCommission));
        console.log("  - Retailer Commission:", Number(retailerCommission), typeof Number(retailerCommission));
        console.log("🌐 API URL:", `${API_BASE_URL}/commision/create`);
        console.log("🔑 Token exists:", !!token);
        console.log("🔑 Token preview:", token?.substring(0, 20) + "...");

        console.log("🚀 Sending POST request...");
        const createResponse = await axios.post(
          `${API_BASE_URL}/commision/create`,
          createPayload,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        ).catch((error) => {
          console.error("🔴 AXIOS CATCH - Raw error:", error);
          console.error("🔴 AXIOS CATCH - Error response:", error.response);
          console.error("🔴 AXIOS CATCH - Response data:", error.response?.data);
          console.error("🔴 AXIOS CATCH - Response status:", error.response?.status);
          console.error("🔴 AXIOS CATCH - Response headers:", error.response?.headers);
          throw error;
        });
        
        console.log("✅ CREATE SUCCESS - Response:");
        console.log("Response status:", createResponse.status);
        console.log("Response data:", JSON.stringify(createResponse.data, null, 2));
        toast.success(`Commission for ${selectedService} created successfully`);
      } else {
        // UPDATE existing commission
        console.log("✏️ UPDATE MODE");
        
        const updatePayload = {
          commision_id: editingCommission.commision_id,
          total_commision: Number(totalCommission),
          admin_commision: adminCommission,
          master_distributor_commision: Number(mdCommission),
          distributor_commision: Number(distributorCommission),
          retailer_commision: Number(retailerCommission),
        };

        console.log("📤 UPDATE PAYLOAD:");
        console.log(JSON.stringify(updatePayload, null, 2));
        console.log("📊 Payload Details:");
        console.log("  - Commission ID:", editingCommission.commision_id);
        console.log("  - Total Commission:", Number(totalCommission), typeof Number(totalCommission));
        console.log("  - Admin Commission:", adminCommission, typeof adminCommission);
        console.log("  - MD Commission:", Number(mdCommission), typeof Number(mdCommission));
        console.log("  - Distributor Commission:", Number(distributorCommission), typeof Number(distributorCommission));
        console.log("  - Retailer Commission:", Number(retailerCommission), typeof Number(retailerCommission));
        console.log("🌐 API URL:", `${API_BASE_URL}/commision/update/commision`);
        console.log("🔑 Token exists:", !!token);

        console.log("🚀 Sending PUT request...");
        const updateResponse = await axios.put(
          `${API_BASE_URL}/commision/update/commision`,
          updatePayload,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        ).catch((error) => {
          console.error("🔴 AXIOS CATCH - Raw error:", error);
          console.error("🔴 AXIOS CATCH - Error response:", error.response);
          console.error("🔴 AXIOS CATCH - Response data:", error.response?.data);
          console.error("🔴 AXIOS CATCH - Response status:", error.response?.status);
          throw error;
        });
        
        console.log("✅ UPDATE SUCCESS - Response:");
        console.log("Response status:", updateResponse.status);
        console.log("Response data:", JSON.stringify(updateResponse.data, null, 2));
        toast.success(`Commission for ${selectedService} updated successfully`);
      }

      console.log("🔄 Fetching updated commissions...");
      await fetchAllCommissions(userId);
      console.log("🧹 Cleaning up edit mode...");
      handleCancelEdit();
      console.log("========== CONFIRM SAVE COMPLETE ==========");
    } catch (err: any) {
      console.error("========== ❌ SAVE ERROR (OUTER CATCH) ==========");
      console.error("Error object:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("Error response:", err.response);
      console.error("Response status:", err.response?.status);
      console.error("Response statusText:", err.response?.statusText);
      console.error("Response data:", err.response?.data);
      console.error("Response headers:", err.response?.headers);
      console.error("Request config:", err.config);
      console.error("Request data:", err.config?.data);
      console.error("Request headers:", err.config?.headers);
      
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Operation failed";
      console.error("🚨 Error message to user:", errorMessage);
      
      // Show detailed error in console
      if (err.response?.data) {
        console.error("📋 Full error response data:", JSON.stringify(err.response.data, null, 2));
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      console.log("========== CONFIRM SAVE END ==========");
    }
  };

  /* =====================
     HANDLE RESET
     ===================== */
  const handleReset = () => {
    if (editingCommission) {
      setTotalCommission(editingCommission.total_commision.toFixed(2));
      setMdCommission(editingCommission.master_distributor_commision.toFixed(2));
      setDistributorCommission(editingCommission.distributor_commision.toFixed(2));
      setRetailerCommission(editingCommission.retailer_commision.toFixed(2));
    } else {
      setTotalCommission("1.20");
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
    <div className="space-y-6 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Percent className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commission Configuration</h1>
              <p className="text-gray-600 mt-1">
                Configure commission splits for your hierarchy (All levels editable)
              </p>
            </div>
          </div>
        </div>

        {/* Hierarchy Selection Card */}
        <Card className="max-w-7xl mx-auto shadow-md">
          <CardContent className="p-0">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Select Hierarchy
                  </h2>
                  <p className="text-sm text-gray-600">
                    Choose the level to view and configure commissions
                  </p>
                </div>
              </div>

              {/* Master Distributor Dropdown */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Master Distributor <span className="text-red-500">*</span>
                </Label>

                <Select
                  value={selectedMD}
                  onValueChange={handleMDSelect}
                  disabled={loadingMDs}
                >
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue placeholder="Select Master Distributor">
                      {selectedMD && masterDistributors.find(md => md.master_distributor_id === selectedMD)?.master_distributor_name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-md">
                    <div className="sticky top-0 z-10 bg-white p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          value={masterDistributorSearch}
                          onChange={(e) => setMasterDistributorSearch(e.target.value)}
                          placeholder="Search by name, ID, email..."
                          className="h-9 pl-9 pr-9 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        {masterDistributorSearch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMasterDistributorSearch("");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {masterDistributorSearch && (
                        <p className="text-xs text-gray-500 mt-1.5 px-1">
                          Found {filteredMasterDistributors.length} result(s)
                        </p>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredMasterDistributors.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-medium">No results found</p>
                        </div>
                      ) : (
                        filteredMasterDistributors.map((md) => (
                          <SelectItem
                            key={md.master_distributor_id}
                            value={md.master_distributor_id}
                            className="cursor-pointer hover:bg-gray-100"
                          >
                            <div className="flex flex-col py-1.5 w-full">
                              <span className="font-semibold text-sm text-gray-900">
                                {md.master_distributor_name}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="font-mono">{md.master_distributor_id}</span>
                                <span className="text-gray-400">•</span>
                                <span>{md.master_distributor_email}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
                {masterDistributors.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {filteredMasterDistributors.length} of {masterDistributors.length} master distributor{masterDistributors.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>

              {/* Distributor Dropdown */}
              {selectedMD && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium text-gray-700">
                    Distributor (Optional)
                  </Label>
                  {loadingDistributors ? (
                    <div className="flex items-center gap-2 h-12 px-3 border rounded-md bg-white">
                      <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Loading distributors...</span>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={selectedDistributor}
                        onValueChange={handleDistributorSelect}
                      >
                        <SelectTrigger className="h-12 bg-white">
                          <SelectValue placeholder="Select Distributor">
                            {selectedDistributor && distributors.find(d => d.distributor_id === selectedDistributor)?.distributor_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-md">
                          <div className="sticky top-0 z-10 bg-white p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                type="text"
                                value={distributorSearch}
                                onChange={(e) => setDistributorSearch(e.target.value)}
                                placeholder="Search by name, ID, email..."
                                className="h-9 pl-9 pr-9 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              {distributorSearch && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDistributorSearch("");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredDistributors.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">
                                No distributors found
                              </div>
                            ) : (
                              filteredDistributors.map((dist) => (
                                <SelectItem
                                  key={dist.distributor_id}
                                  value={dist.distributor_id}
                                  className="cursor-pointer hover:bg-gray-100"
                                >
                                  <div className="flex flex-col py-1.5 w-full">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {dist.distributor_name}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <span className="font-mono">{dist.distributor_id}</span>
                                      <span className="text-gray-400">•</span>
                                      <span>{dist.distributor_email}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                      {distributors.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {filteredDistributors.length} of {distributors.length} distributor{distributors.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Retailer Dropdown */}
              {selectedDistributor && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium text-gray-700">
                    Retailer (Optional)
                  </Label>

                  {loadingRetailers ? (
                    <div className="flex items-center gap-2 h-12 px-3 border rounded-md bg-white">
                      <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Loading retailers...</span>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={selectedRetailer}
                        onValueChange={handleRetailerSelect}
                      >
                        <SelectTrigger className="h-12 bg-white">
                          <SelectValue placeholder="Select Retailer">
                            {selectedRetailer && retailers.find(r => r.retailer_id === selectedRetailer)?.retailer_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-md">
                          <div className="sticky top-0 z-10 bg-white p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                type="text"
                                value={retailerSearch}
                                onChange={(e) => setRetailerSearch(e.target.value)}
                                placeholder="Search by name, ID, email..."
                                className="h-9 pl-9 pr-9 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              {retailerSearch && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRetailerSearch("");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredRetailers.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">
                                No retailers found
                              </div>
                            ) : (
                              filteredRetailers.map((ret) => (
                                <SelectItem
                                  key={ret.retailer_id}
                                  value={ret.retailer_id}
                                  className="cursor-pointer hover:bg-gray-100"
                                >
                                  <div className="flex flex-col py-1.5 w-full">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {ret.retailer_name}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <span className="font-mono">{ret.retailer_id}</span>
                                      <span className="text-gray-400">•</span>
                                      <span>{ret.retailer_email}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                      {retailers.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {filteredRetailers.length} of {retailers.length} retailer{retailers.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commission Table */}
        {currentHierarchyLevel && !isEditMode && (
          <Card className="max-w-7xl mx-auto shadow-md">
            <CardContent className="p-0">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <TableIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Commission Table - {currentHierarchyLevel.userName}
                      </h2>
                      <p className="text-sm text-gray-600">
                        View and manage all service commissions
                      </p>
                    </div>
                  </div>
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

                {loadingCommissions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-600">Loading commissions...</p>
                  </div>
                ) : allCommissions.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-900">Service</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Total %</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Total ₹</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">MD % Share</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">MD ₹</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Dist % Share</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Dist ₹</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Ret % Share</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Ret ₹</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Admin % Share</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Admin ₹</TableHead>
                          <TableHead className="font-semibold text-gray-900">Updated</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allCommissions.map((commission) => {
                          const totalCommAmt = (commission.total_commision / 100) * REFERENCE_AMOUNT;
                          return (
                          <TableRow key={commission.commision_id}>
                            <TableCell className="font-semibold">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                {commission.service}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600">
                              {commission.total_commision.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center font-mono text-green-600">
                              ₹{totalCommAmt.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(commission.master_distributor_commision * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center font-mono text-green-600">
                              ₹{((commission.master_distributor_commision * 100 / 100) * totalCommAmt).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(commission.distributor_commision * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center font-mono text-green-600">
                              ₹{((commission.distributor_commision * 100 / 100) * totalCommAmt).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(commission.retailer_commision * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center font-mono text-green-600">
                              ₹{((commission.retailer_commision * 100 / 100) * totalCommAmt).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(commission.admin_commision * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center font-mono text-green-600">
                              ₹{((commission.admin_commision * 100 / 100) * totalCommAmt).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
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
                        );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <TableIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No commissions found</p>
                    <p className="text-sm text-gray-600">Create commissions for different services</p>
                  </div>
                )}

                {/* Create New Button */}
                <div className="mt-6 flex items-center gap-4 pt-6 border-t">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Select Service to Create Commission
                    </Label>
                    <Select
                      value={selectedService}
                      onValueChange={setSelectedService}
                    >
                      <SelectTrigger className="h-12 bg-white">
                        <SelectValue placeholder="Select Service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((service) => {
                          const exists = allCommissions.some((c) => c.service === service);
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
                    className="h-12 bg-blue-600 hover:bg-blue-700 mt-6"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Commission
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit/Create Commission Form */}
        {currentHierarchyLevel && isEditMode && (
          <Card className="max-w-7xl mx-auto shadow-md">
            <CardContent className="p-0">
              <div className="p-6 md:p-8 space-y-8">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Percent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {editingCommission ? "Edit" : "Create"} Commission - {selectedService}
                      </h2>
                      <p className="text-sm text-gray-600">
                        For {currentHierarchyLevel.userName}
                      </p>
                    </div>
                  </div>
                  {editingCommission ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Editing Existing</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <Info className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Creating New</span>
                    </div>
                  )}
                </div>

                {/* Reference Info */}
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Commission Reference: ₹{REFERENCE_AMOUNT} Transaction
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Step 1: Total commission (e.g., 1.2%) of ₹{REFERENCE_AMOUNT} = ₹12
                    </p>
                    <p className="text-xs text-amber-700">
                      Step 2: Each party gets their % share of that ₹12 (MD 40% = ₹4.80, Dist 30% = ₹3.60, etc.)
                    </p>
                  </div>
                </div>

                {/* Commission Inputs */}
                <div className="space-y-6">
                  {/* TOTAL COMMISSION - FIRST */}
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-3">
                    <Label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Total Commission (%) <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="text"
                          value={totalCommission}
                          onChange={(e) => handleCommissionChange("total", e.target.value)}
                          className="h-14 font-bold text-lg bg-white border-2 border-blue-400"
                          placeholder="1.20"
                        />
                        <p className="text-xs text-blue-700 mt-1">Enter total commission percentage</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-14 px-4 bg-white border-2 border-blue-400 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">For ₹{REFERENCE_AMOUNT}:</span>
                          <span className="font-bold text-xl text-green-600">₹{totalRupees.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GRID FOR MD, DISTRIBUTOR, RETAILER */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Master Distributor */}
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium text-gray-700">
                        Master Distributor (% of Total Commission) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={mdCommission}
                        onChange={(e) => handleCommissionChange("md", e.target.value)}
                        className="h-12 font-semibold bg-white"
                        placeholder="0.40"
                      />
                      <div className="flex items-center justify-between px-3 py-2 bg-white border rounded">
                        <span className="text-xs text-gray-600">Amount:</span>
                        <span className="font-bold text-green-600">₹{mdRupees.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Share of ₹{totalRupees.toFixed(2)} commission</p>
                    </div>

                    {/* Distributor */}
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium text-gray-700">
                        Distributor (% of Total Commission) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={distributorCommission}
                        onChange={(e) => handleCommissionChange("distributor", e.target.value)}
                        className="h-12 font-semibold bg-white"
                        placeholder="0.30"
                      />
                      <div className="flex items-center justify-between px-3 py-2 bg-white border rounded">
                        <span className="text-xs text-gray-600">Amount:</span>
                        <span className="font-bold text-green-600">₹{distributorRupees.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Share of ₹{totalRupees.toFixed(2)} commission</p>
                    </div>

                    {/* Retailer */}
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium text-gray-700">
                        Retailer (% of Total Commission) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={retailerCommission}
                        onChange={(e) => handleCommissionChange("retailer", e.target.value)}
                        className="h-12 font-semibold bg-white"
                        placeholder="0.20"
                      />
                      <div className="flex items-center justify-between px-3 py-2 bg-white border rounded">
                        <span className="text-xs text-gray-600">Amount:</span>
                        <span className="font-bold text-green-600">₹{retailerRupees.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Share of ₹{totalRupees.toFixed(2)} commission</p>
                    </div>
                  </div>

                  {/* ADMIN COMMISSION - AUTO CALCULATED */}
                  <div className="p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                    <Label className="text-sm font-bold text-gray-700 mb-3 block">
                      Admin Commission (Auto-Calculated)
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="h-14 px-4 bg-white border-2 border-gray-400 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Percentage:</span>
                          <span className="font-bold text-xl text-gray-700">{(adminCommission * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-14 px-4 bg-white border-2 border-gray-400 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">For ₹{REFERENCE_AMOUNT}:</span>
                          <span className="font-bold text-xl text-green-600">₹{adminRupees.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Formula: 1.00 - (MD + Distributor + Retailer) = 1.00 - ({mdCommission || 0} + {distributorCommission || 0} + {retailerCommission || 0}) = {adminCommission.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Admin gets {(adminCommission * 100).toFixed(2)}% of ₹{totalRupees.toFixed(2)} = ₹{adminRupees.toFixed(2)}
                    </p>
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-700 font-medium">{validationError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      saving ||
                      !!validationError ||
                      !totalCommission ||
                      !mdCommission ||
                      !distributorCommission ||
                      !retailerCommission
                    }
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingCommission ? "Update" : "Create"} Commission for {selectedService}
              </DialogTitle>
              <DialogDescription className="text-sm pt-2">
                This will {editingCommission ? "update" : "create"} commission for{" "}
                <span className="font-semibold">{currentHierarchyLevel?.userName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                <span className="font-bold text-gray-900">Total Commission:</span>
                <div className="text-right">
                  <span className="font-bold text-xl text-blue-600">{parseFloat(totalCommission || "0").toFixed(2)}%</span>
                  <span className="block text-sm text-green-600 font-semibold">₹{totalRupees.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">MD:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{(parseFloat(mdCommission || "0") * 100).toFixed(2)}%</span>
                    <span className="block text-xs text-green-600">₹{mdRupees.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Distributor:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{(parseFloat(distributorCommission || "0") * 100).toFixed(2)}%</span>
                    <span className="block text-xs text-green-600">₹{distributorRupees.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Retailer:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{(parseFloat(retailerCommission || "0") * 100).toFixed(2)}%</span>
                    <span className="block text-xs text-green-600">₹{retailerRupees.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border border-gray-300">
                  <span className="font-medium text-gray-700">Admin:</span>
                  <div className="text-right">
                    <span className="font-bold text-gray-700">{(adminCommission * 100).toFixed(2)}%</span>
                    <span className="block text-xs text-green-600">₹{adminRupees.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                onClick={() => setConfirmDialogOpen(false)}
                variant="outline"
                className="h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSave}
                disabled={saving}
                className="h-12 bg-blue-600 hover:bg-blue-700"
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