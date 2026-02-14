import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, RefreshCw, User, MapPin, Building, Ban, CheckCircle, Download, CreditCard, Wallet, Search, X } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MasterDistributor {
  master_distributor_id: string;
  master_distributor_name: string;
  master_distributor_email: string;
  master_distributor_phone: string;
}

interface Distributor {
  distributor_id: string;
  distributor_password: string;
  master_distributor_id: string;
  distributor_name: string;
  distributor_email: string;
  distributor_phone: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string;
  gender: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  wallet_balance: number;
  kyc_status: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface EditFormData {
  distributor_id: string;
  distributor_password: string;
  distributor_name: string;
  distributor_phone: string;
  pan_number: string;
  aadhar_number: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  wallet_balance: number;
  is_blocked: boolean;
  kyc_status: boolean;
}

function getAuthToken(): string | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export default function GetAllDistributor() {
  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [filteredMasterDistributors, setFilteredMasterDistributors] = useState<MasterDistributor[]>([]);
  const [selectedMD, setSelectedMD] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loadingMDs, setLoadingMDs] = useState(true);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    distributor_id: "",
    distributor_password: "",
    distributor_name: "",
    distributor_phone: "",
    pan_number: "",
    aadhar_number: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    business_name: "",
    business_type: "",
    gst_number: "",
    wallet_balance: 0,
    is_blocked: false,
    kyc_status: false,
  });
  const itemsPerPage = 10;

  // Filter master distributors based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMasterDistributors(masterDistributors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = masterDistributors.filter((md) => {
      const matchesId = md.master_distributor_id.toLowerCase().includes(query);
      const matchesName = md.master_distributor_name?.toLowerCase().includes(query);
      const matchesEmail = md.master_distributor_email?.toLowerCase().includes(query);
      const matchesPhone = md.master_distributor_phone?.includes(query);
      
      return matchesId || matchesName || matchesEmail || matchesPhone;
    });

    setFilteredMasterDistributors(filtered);
  }, [searchQuery, masterDistributors]);

  // Fetch ALL Master Distributors on mount (no pagination for dropdown)
  useEffect(() => {
    const fetchAllMasterDistributors = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingMDs(false);
        return;
      }

      setLoadingMDs(true);
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const adminId = decoded.admin_id;

        // Add parameters to fetch ALL master distributors
        const params = new URLSearchParams({
          limit: '10000',      // Very high limit to get all records
          page_size: '10000',  // Alternative parameter name
          per_page: '10000',   // Another alternative
          all: 'true'          // Some APIs use this flag
        });

        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/md/get/admin/${adminId}?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.data?.status === "success" && res.data?.data) {
          const list = res.data.data.master_distributors || [];
          
          const normalized = list.map((md: any) => ({
            master_distributor_id: md.master_distributor_id,
            master_distributor_name: md.master_distributor_name,
            master_distributor_email: md.master_distributor_email,
            master_distributor_phone: md.master_distributor_phone,
          }));
          setMasterDistributors(normalized);
          setFilteredMasterDistributors(normalized);
          
          // Auto-select first MD if available
          if (normalized.length > 0) {
            setSelectedMD(normalized[0].master_distributor_id);
          }
        } else {
          toast.error("Failed to load master distributors");
        }
      } catch (error: any) {
        console.error("Error fetching master distributors:", error);
        toast.error(error.response?.data?.message || "Failed to load master distributors");
      } finally {
        setLoadingMDs(false);
      }
    };

    fetchAllMasterDistributors();
  }, []);

  // Fetch distributors with pagination (10 per page)
  const fetchDistributors = async (mdId: string, page: number = 1) => {
    if (!mdId) {
      setDistributors([]);
      setTotalCount(0);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoadingDistributors(true);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${mdId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            limit: itemsPerPage,
            offset: offset,
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const list = res.data.data.distributors || [];
        const count = res.data.data.total_count || res.data.data.count || list.length;        
        setDistributors(list);
        setTotalCount(count);
      } else {
        toast.error("Failed to load distributors");
        setDistributors([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching distributors:", error);
      toast.error(error.response?.data?.message || "Failed to load distributors");
      setDistributors([]);
      setTotalCount(0);
    } finally {
      setLoadingDistributors(false);
    }
  };

  // Fetch all distributors for export (without pagination)
  const fetchAllDistributorsForExport = async (mdId: string): Promise<Distributor[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/distributor/get/md/${mdId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            limit: 100000, // Very large number to get all records
            offset: 0,
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const allData = res.data.data.distributors || [];
        return allData;
      }
      return [];
    } catch (error) {
      console.error("Error fetching all distributors for export:", error);
      return [];
    }
  };

  // Fetch distributors when MD changes or page changes
  useEffect(() => {
    if (selectedMD) {
      fetchDistributors(selectedMD, currentPage);
    }
  }, [selectedMD, currentPage]);

  // Reset to page 1 when MD changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMD]);

  const handleEditClick = async (distributor: Distributor) => {
    setEditDialogOpen(true);
    setIsFetchingProfile(true);

    const token = getAuthToken();
    if (!token) {
      setIsFetchingProfile(false);
      setEditDialogOpen(false);
      return;
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/distributor/${distributor.distributor_id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const distData = response.data?.data?.distributor || response.data?.data;

      if (!distData) {
        toast.error("Invalid profile data");
        setEditDialogOpen(false);
        return;
      }

      setSelectedDistributor(distData);

      setEditFormData({
        distributor_id: distData.distributor_id,
        distributor_password: distData.distributor_password ?? "",
        distributor_name: distData.distributor_name ?? "",
        distributor_phone: distData.distributor_phone ?? "",
        pan_number: distData.pan_number ?? "",
        aadhar_number: distData.aadhar_number ?? "",
        city: distData.city ?? "",
        state: distData.state ?? "",
        address: distData.address ?? "",
        pincode: distData.pincode ?? "",
        business_name: distData.business_name ?? "",
        business_type: distData.business_type ?? "",
        gst_number: distData.gst_number ?? "",
        wallet_balance: Number(distData.wallet_balance ?? 0),
        is_blocked: Boolean(distData.is_blocked),
        kyc_status: Boolean(distData.kyc_status),
      });

      toast.success("Profile loaded successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load profile");
      setEditDialogOpen(false);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateDistributor = async () => {
    if (!selectedDistributor?.distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }

    if (!editFormData.distributor_name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!/^[1-9]\d{9}$/.test(editFormData.distributor_phone)) {
      toast.error("Invalid phone number");
      return;
    }

    // Validate PAN number format (if changed)
    if (editFormData.pan_number && editFormData.pan_number !== selectedDistributor.pan_number) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editFormData.pan_number)) {
        toast.error("Invalid PAN number format. Should be like: ABCDE1234F");
        return;
      }
    }

    // Validate Aadhar number format (if changed)
    if (editFormData.aadhar_number && editFormData.aadhar_number !== selectedDistributor.aadhar_number) {
      if (!/^\d{12}$/.test(editFormData.aadhar_number)) {
        toast.error("Invalid Aadhar number. Should be 12 digits");
        return;
      }
    }

    // Validate wallet balance
    if (editFormData.wallet_balance < 0) {
      toast.error("Wallet balance cannot be negative");
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const url = `${import.meta.env.VITE_API_BASE_URL}/distributor/update/details`;

    const payload: any = {
      distributor_id: selectedDistributor.distributor_id,
    };

    const allowedKeys = [
      "distributor_name",
      "distributor_password",
      "distributor_phone",
      "city",
      "state",
      "address",
      "pincode",
      "business_name",
      "business_type",
      "gst_number",
      "pan_number",
      "aadhar_number",
      "wallet_balance",
    ];

    allowedKeys.forEach((key) => {
      const formValue = (editFormData as any)[key];
      const originalValue = (selectedDistributor as any)[key];
      
      if (formValue !== originalValue) {
        payload[key] = formValue;
      }
    });

    if (Object.keys(payload).length === 1) {
      toast.info("No changes detected");
      return;
    }

    try {
      setIsUpdating(true);

      const response = await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success(response.data?.message || "Distributor updated successfully");

      setEditDialogOpen(false);
      setSelectedDistributor(null);
      fetchDistributors(selectedMD, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBlockStatus = async (blockStatus: boolean) => {
    if (!selectedDistributor?.distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }
  
    const token = localStorage.getItem("authToken");
  
    const payload = {
      distributor_id: selectedDistributor.distributor_id,
      block_status: blockStatus,
    };
  
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/distributor/update/block`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      toast.success("Block status updated successfully");
      setEditDialogOpen(false);
      fetchDistributors(selectedMD, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update block status");
    }
  };
  
  const handleUpdateKYCStatus = async (kycStatus: boolean) => {
    if (!selectedDistributor?.distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }
  
    const token = localStorage.getItem("authToken");
  
    const payload = {
      distributor_id: selectedDistributor.distributor_id,
      kyc_status: kycStatus,
    };
  
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/distributor/update/kyc`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      toast.success("KYC status updated successfully");
      setEditDialogOpen(false);
      fetchDistributors(selectedMD, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update KYC status");
    }
  };

  // Export to Excel - fetches all data
  const exportToExcel = async () => {
    try {
      if (!selectedMD) {
        toast.error("Please select a master distributor");
        return;
      }

      toast.info("Fetching all data for export...");
      
      const allDistributors = await fetchAllDistributorsForExport(selectedMD);
      
      if (allDistributors.length === 0) {
        toast.error("No data to export");
        return;
      }

      const selectedMDInfo = masterDistributors.find(md => md.master_distributor_id === selectedMD);

      const data = allDistributors.map((dist, index) => ({
        "S.No": index + 1,
        "Distributor ID": dist.distributor_id,
        "Distributor Password": dist.distributor_password,
        "Master Distributor ID": dist.master_distributor_id,
        "MD Name": selectedMDInfo?.master_distributor_name || "N/A",
        "Name": dist.distributor_name,
        "Email": dist.distributor_email,
        "Phone": dist.distributor_phone,
        "Business Name": dist.business_name || "N/A",
        "Business Type": dist.business_type || "N/A",
        "GST Number": dist.gst_number || "N/A",
        "Aadhar Number": dist.aadhar_number,
        "PAN Number": dist.pan_number,
        "Date of Birth": formatDate(dist.date_of_birth),
        "Gender": dist.gender,
        "Address": dist.address || "N/A",
        "City": dist.city || "N/A",
        "State": dist.state || "N/A",
        "Pincode": dist.pincode || "N/A",
        "Wallet Balance (₹)": dist.wallet_balance?.toFixed(2) || "0.00",
        "KYC Status": dist.kyc_status ? "Verified" : "Pending",
        "Account Status": dist.is_blocked ? "Blocked" : "Active",
        "Created At": formatDate(dist.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      ws["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 25 }, // Distributor ID
        { wch: 25 }, // Distributor Password
        { wch: 25 }, // MD ID
        { wch: 25 }, // MD Name
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 25 }, // Business Name
        { wch: 20 }, // Business Type
        { wch: 18 }, // GST Number
        { wch: 15 }, // Aadhar
        { wch: 12 }, // PAN
        { wch: 15 }, // DOB
        { wch: 10 }, // Gender
        { wch: 40 }, // Address
        { wch: 15 }, // City
        { wch: 15 }, // State
        { wch: 10 }, // Pincode
        { wch: 18 }, // Wallet Balance
        { wch: 15 }, // KYC Status
        { wch: 15 }, // Account Status
        { wch: 20 }, // Created At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Distributors");

      const timestamp = new Date().toISOString().slice(0, 10);
      const mdName = selectedMDInfo?.master_distributor_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'MD';
      const filename = `Distributors_${mdName}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${allDistributors.length} distributors successfully`);
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const getStatusBadge = (isBlocked: boolean) => {
    if (isBlocked) {
      return <Badge className="bg-red-50 text-red-700 border-red-300">Blocked</Badge>;
    }
    return <Badge className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
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

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Distributors</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all distributors {totalCount > 0 && `(${totalCount} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={!selectedMD || totalCount === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button 
            onClick={() => selectedMD && fetchDistributors(selectedMD, currentPage)} 
            variant="outline" 
            size="sm"
            disabled={!selectedMD}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Master Distributor Selection Card */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[160px]">
              Select Master Distributor:
            </Label>
            {loadingMDs ? (
              <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-white flex-1">
                <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                <Select value={selectedMD} onValueChange={setSelectedMD}>
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="Select master distributor">
                      {selectedMD && masterDistributors.find(md => md.master_distributor_id === selectedMD)?.master_distributor_name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-md">
                    {/* Search Bar Inside Dropdown */}
                    <div className="sticky top-0 z-10 bg-white p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name, ID, email, phone..."
                          className="h-9 pl-9 pr-9 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery("");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {searchQuery && (
                        <p className="text-xs text-gray-500 mt-1.5 px-1">
                          Found {filteredMasterDistributors.length} result(s)
                        </p>
                      )}
                    </div>

                    {/* Master Distributor List */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredMasterDistributors.length === 0 && !searchQuery ? (
                        <div className="px-2 py-1.5 text-sm text-gray-600 text-center">
                          No master distributors found
                        </div>
                      ) : filteredMasterDistributors.length === 0 && searchQuery ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-medium">No results found</p>
                          <p className="text-xs mt-1">Try a different search term</p>
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
                                {md.master_distributor_name || "Unnamed"}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="font-mono">{md.master_distributor_id}</span>
                                {md.master_distributor_email && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>{md.master_distributor_email}</span>
                                  </>
                                )}
                                {md.master_distributor_phone && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>{md.master_distributor_phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
                {masterDistributors.length > 0 && (
                  <p className="text-xs text-gray-500 pl-1">
                    {filteredMasterDistributors.length} of {masterDistributors.length} master distributor{masterDistributors.length !== 1 ? 's' : ''} {searchQuery ? 'matching search' : 'available'}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distributors Table */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          {!selectedMD ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-gray-600">Please select a master distributor to view distributors</p>
            </div>
          ) : loadingDistributors ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="ml-2 text-gray-600">Loading distributors...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-center font-semibold">Sl No</TableHead>
                      <TableHead className="text-center font-semibold">MD ID</TableHead>
                      <TableHead className="text-center font-semibold">Distributor ID</TableHead>
                      <TableHead className="text-center font-semibold">Distributor Password</TableHead>
                      <TableHead className="text-center font-semibold">Name</TableHead>
                      <TableHead className="text-center font-semibold">Email</TableHead>
                      <TableHead className="text-center font-semibold">Phone</TableHead>
                      <TableHead className="text-center font-semibold">Business</TableHead>
                      <TableHead className="text-center font-semibold">Wallet Balance</TableHead>
                      <TableHead className="text-center font-semibold">KYC Status</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {distributors.length > 0 ? (
                      distributors.map((d, idx) => (
                        <TableRow key={d.distributor_id} className="hover:bg-gray-50">
                          <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {d.master_distributor_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {d.distributor_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {d.distributor_password || "N/A"}
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {d.distributor_name || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">{d.distributor_email || "N/A"}</TableCell>
                          <TableCell className="text-center">{d.distributor_phone || "N/A"}</TableCell>
                          <TableCell className="text-center">{d.business_name || "N/A"}</TableCell>
                          <TableCell className="font-semibold text-center text-green-600">
                            ₹{d.wallet_balance?.toLocaleString("en-IN") || "0"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                d.kyc_status
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {d.kyc_status ? "Verified" : "Pending"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(d.is_blocked)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(d)}
                              disabled={isFetchingProfile}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-20 text-gray-600">
                          No distributors found for the selected master distributor
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalCount > itemsPerPage && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalCount)} of{" "}
                    {totalCount} distributors
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isFetchingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading profile data...</p>
          </div>
        </div>
      )}

      {/* Edit Distributor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Distributor Profile</DialogTitle>
          </DialogHeader>
          
          {isFetchingProfile ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="ml-2 text-muted-foreground">Loading profile...</span>
            </div>
          ) : (
            selectedDistributor && (
              <div className="space-y-6">
                {/* Non-editable Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Distributor ID</Label>
                    <p className="font-mono text-sm font-semibold">{selectedDistributor.distributor_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm">{selectedDistributor.distributor_email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{formatDate(selectedDistributor.created_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                    <p className="text-sm">{formatDate(selectedDistributor.date_of_birth)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                    <p className="text-sm">{selectedDistributor.gender}</p>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Personal Information</h3>
                      <p className="text-sm text-muted-foreground">Update basic details</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-name"
                        type="text"
                        value={editFormData.distributor_name}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, distributor_name: e.target.value })
                        }
                        placeholder="Enter name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        inputMode="numeric"
                        value={editFormData.distributor_phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            distributor_phone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* KYC Documents Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        KYC Documents
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Update identity verification documents
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-aadhar">
                        Aadhar Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-aadhar"
                        type="tel"
                        inputMode="numeric"
                        value={editFormData.aadhar_number}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            aadhar_number: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="Enter 12-digit Aadhar number"
                        maxLength={12}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: 123456789012
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-pan">
                        PAN Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-pan"
                        type="text"
                        value={editFormData.pan_number}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            pan_number: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="Enter PAN number"
                        maxLength={10}
                        className="font-mono uppercase"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: ABCDE1234F
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Business Information</h3>
                      <p className="text-sm text-muted-foreground">Company details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-business-name">Business Name</Label>
                      <Input
                        id="edit-business-name"
                        type="text"
                        value={editFormData.business_name}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            business_name: e.target.value,
                          })
                        }
                        placeholder="Enter business name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-business-type">Business Type</Label>
                      <Input
                        id="edit-business-type"
                        type="text"
                        value={editFormData.business_type}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            business_type: e.target.value,
                          })
                        }
                        placeholder="e.g., Sole Proprietorship"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit-gst">
                        GST Number <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="edit-gst"
                        type="text"
                        value={editFormData.gst_number}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            gst_number: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Address Details</h3>
                      <p className="text-sm text-muted-foreground">Location information</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Full Address</Label>
                      <Textarea
                        id="edit-address"
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, address: e.target.value })
                        }
                        placeholder="Enter complete address"
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-city">City</Label>
                        <Input
                          id="edit-city"
                          type="text"
                          value={editFormData.city}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, city: e.target.value })
                          }
                          placeholder="Enter city"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-state">State</Label>
                        <Input
                          id="edit-state"
                          type="text"
                          value={editFormData.state}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, state: e.target.value })
                          }
                          placeholder="Enter state"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-pincode">Pincode</Label>
                        <Input
                          id="edit-pincode"
                          type="tel"
                          inputMode="numeric"
                          value={editFormData.pincode}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              pincode: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          placeholder="400001"
                          maxLength={6}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Balance Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Wallet Balance</h3>
                      <p className="text-sm text-muted-foreground">
                        Set exact wallet balance (not added to existing)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-wallet-balance">
                      Wallet Balance (₹) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-wallet-balance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.wallet_balance}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          wallet_balance: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter wallet balance"
                      className="font-mono text-lg"
                    />
                    <p className="text-xs text-yellow-600 font-medium">
                      ⚠️ Note: This will set the balance to exactly this amount, not add to existing balance
                    </p>
                  </div>
                </div>

                {/* Account Status Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <h3 className="font-semibold text-lg">Account Status</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-block-status">Block Status</Label>
                      <Select
                        value={editFormData.is_blocked ? "blocked" : "active"}
                        onValueChange={(value) => {
                          setEditFormData({
                            ...editFormData,
                            is_blocked: value === "blocked",
                          });
                          handleUpdateBlockStatus(value === "blocked");
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Active</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="blocked">
                            <div className="flex items-center gap-2">
                              <Ban className="h-4 w-4 text-red-600" />
                              <span>Blocked</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-kyc-status">KYC Status</Label>
                      <Select
                        value={editFormData.kyc_status ? "verified" : "pending"}
                        onValueChange={(value) => {
                          setEditFormData({
                            ...editFormData,
                            kyc_status: value === "verified",
                          });
                          handleUpdateKYCStatus(value === "verified");
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Verified</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Ban className="h-4 w-4 text-yellow-600" />
                              <span>Pending</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedDistributor(null);
              }}
              disabled={isUpdating || isFetchingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDistributor}
              disabled={isUpdating || isFetchingProfile}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Distributor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}