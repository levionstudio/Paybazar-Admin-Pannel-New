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
import { Loader2, Edit, RefreshCw, User, MapPin, CreditCard, Ban, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_email?: string;
  distributor_phone?: string;
  business_name?: string;
}

interface Retailer {
  retailer_id: string;
  distributor_id: string;
  retailer_name: string;
  retailer_phone: string;
  retailer_email: string;
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
  kyc_status: boolean;
  documents_url: string | null;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  mpin: string;
}

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface EditFormData {
  retailer_id: string;
  retailer_name: string;
  retailer_phone: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  is_blocked: boolean;
  kyc_status: boolean;
}

/* -------------------- AUTH HELPER -------------------- */
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

export default function GetAllRetailers() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    retailer_id: "",
    retailer_name: "",
    retailer_phone: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    business_name: "",
    business_type: "",
    gst_number: "",
    is_blocked: false,
    kyc_status: false,
  });

  const itemsPerPage = 10;

  // Fetch ALL Distributors on mount (no pagination for dropdown)
  useEffect(() => {
    const fetchAllDistributors = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingDistributors(false);
        return;
      }

      setLoadingDistributors(true);
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const adminId = decoded.admin_id;

        // Add parameters to fetch ALL distributors
        const params = new URLSearchParams({
          limit: '10000',      // Very high limit to get all records
          page_size: '10000',  // Alternative parameter name
          per_page: '10000',   // Another alternative
          all: 'true'          // Some APIs use this flag
        });

        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/distributor/get/admin/${adminId}?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.data?.status === "success" && res.data?.data) {
          const list = res.data.data.distributors || [];
          
          const normalized = list.map((d: any) => ({
            distributor_id: d.distributor_id,
            distributor_name: d.distributor_name,
            distributor_email: d.distributor_email,
            distributor_phone: d.distributor_phone,
            business_name: d.business_name,
          }));

          console.log(`✅ Loaded ${normalized.length} distributors for dropdown`);
          setDistributors(normalized);
          
          // Auto-select first distributor if available
          if (normalized.length > 0) {
            setSelectedDistributor(normalized[0].distributor_id);
          }
        } else {
          toast.error("Failed to load distributors");
        }
      } catch (error: any) {
        console.error("Error fetching distributors:", error);
        toast.error(error.response?.data?.message || "Failed to load distributors");
      } finally {
        setLoadingDistributors(false);
      }
    };

    fetchAllDistributors();
  }, []);

  // Fetch retailers with pagination (10 per page)
  const fetchRetailers = async (distributorId: string, page: number = 1) => {
    if (!distributorId) {
      setRetailers([]);
      setTotalCount(0);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoadingRetailers(true);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      
      console.log(`📄 Fetching page ${page} (offset: ${offset}, limit: ${itemsPerPage}) for Distributor: ${distributorId}`);
      
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}`,
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
        const list = res.data.data.retailers || [];
        const count = res.data.data.total_count || res.data.data.count || list.length;
        
        console.log(`✅ Loaded ${list.length} retailers (Total: ${count})`);
        
        setRetailers(list);
        setTotalCount(count);
      } else {
        toast.error("Failed to load retailers");
        setRetailers([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching retailers:", error);
      toast.error(error.response?.data?.message || "Failed to load retailers");
      setRetailers([]);
      setTotalCount(0);
    } finally {
      setLoadingRetailers(false);
    }
  };

  // Fetch all retailers for export (without pagination)
  const fetchAllRetailersForExport = async (distributorId: string): Promise<Retailer[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      console.log("📥 Fetching ALL retailers for export...");
      
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}`,
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
        const allData = res.data.data.retailers || [];
        console.log(`✅ Fetched ${allData.length} retailers for export`);
        return allData;
      }
      return [];
    } catch (error) {
      console.error("Error fetching all retailers for export:", error);
      return [];
    }
  };

  // Fetch retailers when distributor changes or page changes
  useEffect(() => {
    if (selectedDistributor) {
      fetchRetailers(selectedDistributor, currentPage);
    }
  }, [selectedDistributor, currentPage]);

  // Reset to page 1 when distributor changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDistributor]);

  const handleEditClick = async (retailer: Retailer) => {
    setEditDialogOpen(true);
    setIsFetchingProfile(true);

    const token = getAuthToken();
    if (!token) {
      setIsFetchingProfile(false);
      setEditDialogOpen(false);
      return;
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${retailer.retailer_id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const retData = response.data?.data?.retailer || response.data?.data;

      if (!retData) {
        toast.error("Invalid profile data");
        setEditDialogOpen(false);
        return;
      }

      setSelectedRetailer(retData);

      setEditFormData({
        retailer_id: retData.retailer_id,
        retailer_name: retData.retailer_name ?? "",
        retailer_phone: retData.retailer_phone ?? "",
        city: retData.city ?? "",
        state: retData.state ?? "",
        address: retData.address ?? "",
        pincode: retData.pincode ?? "",
        business_name: retData.business_name ?? "",
        business_type: retData.business_type ?? "",
        gst_number: retData.gst_number ?? "",
        is_blocked: Boolean(retData.is_blocked),
        kyc_status: Boolean(retData.kyc_status),
      });

      toast.success("Profile loaded successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load profile");
      setEditDialogOpen(false);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateRetailer = async () => {
    if (!selectedRetailer?.retailer_id) {
      toast.error("Invalid retailer selected");
      return;
    }

    if (!editFormData.retailer_name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!/^[1-9]\d{9}$/.test(editFormData.retailer_phone)) {
      toast.error("Invalid phone number");
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/update/details`;

    const payload: any = {
      retailer_id: selectedRetailer.retailer_id,
    };

    const allowedKeys = [
      "retailer_name",
      "retailer_phone",
      "city",
      "state",
      "address",
      "pincode",
      "business_name",
      "business_type",
      "gst_number",
    ];

    allowedKeys.forEach((key) => {
      const formValue = (editFormData as any)[key];
      const originalValue = (selectedRetailer as any)[key];
      
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

      toast.success(response.data?.message || "Retailer updated successfully");

      setEditDialogOpen(false);
      setSelectedRetailer(null);
      
      fetchRetailers(selectedDistributor, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRetailerBlockStatus = async (blockStatus: boolean) => {
    if (!selectedRetailer?.retailer_id) {
      toast.error("Invalid retailer selected");
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/update/block`,
        {
          retailer_id: selectedRetailer.retailer_id,
          block_status: blockStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Retailer block status updated");

      // Update UI instantly
      setEditFormData((prev) => ({
        ...prev,
        is_blocked: blockStatus,
      }));

      fetchRetailers(selectedDistributor, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update block status");
    }
  };

  const handleUpdateRetailerKYCStatus = async (kycStatus: boolean) => {
    if (!selectedRetailer?.retailer_id) {
      toast.error("Invalid retailer selected");
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/update/kyc`,
        {
          retailer_id: selectedRetailer.retailer_id,
          kyc_status: kycStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Retailer KYC status updated");

      setEditFormData((prev) => ({
        ...prev,
        kyc_status: kycStatus,
      }));

      fetchRetailers(selectedDistributor, currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update KYC status");
    }
  };

  // Export to Excel - fetches all data
  const exportToExcel = async () => {
    try {
      if (!selectedDistributor) {
        toast.error("Please select a distributor");
        return;
      }

      toast.info("Fetching all data for export...");
      
      const allRetailers = await fetchAllRetailersForExport(selectedDistributor);
      
      if (allRetailers.length === 0) {
        toast.error("No data to export");
        return;
      }

      const data = allRetailers.map((r, index) => ({
        "S.No": index + 1,
        "Distributor ID": r.distributor_id,
        "Retailer ID": r.retailer_id,
        "Name": r.retailer_name,
        "Email": r.retailer_email,
        "Phone": r.retailer_phone,
        "Business Name": r.business_name || "N/A",
        "Business Type": r.business_type || "N/A",
        "GST Number": r.gst_number || "N/A",
        "Aadhar Number": r.aadhar_number,
        "PAN Number": r.pan_number,
        "Date of Birth": formatDate(r.date_of_birth),
        "Gender": r.gender,
        "Address": r.address || "N/A",
        "City": r.city || "N/A",
        "State": r.state || "N/A",
        "Pincode": r.pincode || "N/A",
        "Wallet Balance (₹)": r.wallet_balance?.toFixed(2) || "0.00",
        "KYC Status": r.kyc_status ? "Verified" : "Pending",
        "Account Status": r.is_blocked ? "Blocked" : "Active",
        "Created At": formatDate(r.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      ws["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 25 }, // Distributor ID
        { wch: 25 }, // Retailer ID
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
      XLSX.utils.book_append_sheet(wb, ws, "Retailers");

      const distName = distributors.find(d => d.distributor_id === selectedDistributor)?.distributor_name || selectedDistributor;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Retailers_${distName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${allRetailers.length} retailers successfully`);
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

  const getKYCBadge = (kycStatus: boolean) => {
    if (kycStatus) {
      return <Badge className="bg-green-50 text-green-700 border-green-300">Verified</Badge>;
    }
    return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
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
          <h1 className="text-3xl font-bold text-gray-900">Retailers</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all retailers {totalCount > 0 && `(${totalCount} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={!selectedDistributor || totalCount === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button 
            onClick={() => selectedDistributor && fetchRetailers(selectedDistributor, currentPage)} 
            variant="outline" 
            size="sm"
            disabled={!selectedDistributor}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Distributor Selection Card */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[140px]">
              Select Distributor:
            </Label>
            {loadingDistributors ? (
              <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-white flex-1">
                <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-600">
                        No distributors found
                      </div>
                    ) : (
                      distributors.map((d) => (
                        <SelectItem
                          key={d.distributor_id}
                          value={d.distributor_id}
                        >
                          {d.distributor_name || d.distributor_email || d.distributor_id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {distributors.length > 0 && (
                  <p className="text-xs text-gray-500 pl-1">
                    {distributors.length} distributor{distributors.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retailers Table */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          {!selectedDistributor ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-gray-600">Please select a distributor to view retailers</p>
            </div>
          ) : loadingRetailers ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="ml-2 text-gray-600">Loading retailers...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-center font-semibold">Sl No</TableHead>
                      <TableHead className="text-center font-semibold">Dist ID</TableHead>
                      <TableHead className="text-center font-semibold">Retailer ID</TableHead>
                      <TableHead className="text-center font-semibold">Name</TableHead>
                      <TableHead className="text-center font-semibold">Email</TableHead>
                      <TableHead className="text-center font-semibold">Phone</TableHead>
                      <TableHead className="text-center font-semibold">Business</TableHead>
                      <TableHead className="text-center font-semibold">Wallet Balance</TableHead>
                      <TableHead className="text-center font-semibold">KYC</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {retailers.length > 0 ? (
                      retailers.map((r, idx) => (
                        <TableRow key={r.retailer_id} className="hover:bg-gray-50">
                          <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {r.distributor_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {r.retailer_id}
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {r.retailer_name || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">{r.retailer_email || "N/A"}</TableCell>
                          <TableCell className="text-center">{r.retailer_phone || "N/A"}</TableCell>
                          <TableCell className="text-center">{r.business_name || "N/A"}</TableCell>
                          <TableCell className="font-semibold text-center text-green-600">
                            ₹{r.wallet_balance?.toLocaleString("en-IN") || "0"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getKYCBadge(r.kyc_status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(r.is_blocked)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(r)}
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
                        <TableCell colSpan={11} className="text-center py-20 text-gray-600">
                          No retailers found for the selected distributor
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
                    {totalCount} retailers
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

      {/* Edit Retailer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Retailer Profile</DialogTitle>
          </DialogHeader>
          
          {isFetchingProfile ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="ml-2 text-muted-foreground">Loading profile...</span>
            </div>
          ) : (
            selectedRetailer && (
              <div className="space-y-6">
                {/* Non-editable Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Retailer ID</Label>
                    <p className="font-mono text-sm font-semibold">{selectedRetailer.retailer_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm">{selectedRetailer.retailer_email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{formatDate(selectedRetailer.created_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Aadhar Number</Label>
                    <p className="font-mono text-sm">{selectedRetailer.aadhar_number}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
                    <p className="font-mono text-sm uppercase">{selectedRetailer.pan_number}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                    <p className="text-sm">{formatDate(selectedRetailer.date_of_birth)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                    <p className="text-sm">{selectedRetailer.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Wallet Balance</Label>
                    <p className="font-semibold text-sm text-green-600">
                      ₹{selectedRetailer.wallet_balance?.toLocaleString("en-IN") || "0"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">KYC Status</Label>
                    {getKYCBadge(selectedRetailer.kyc_status)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                    {getStatusBadge(selectedRetailer.is_blocked)}
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
                        value={editFormData.retailer_name}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, retailer_name: e.target.value })
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
                        value={editFormData.retailer_phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            retailer_phone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Business Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <CreditCard className="h-5 w-5 text-blue-600" />
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
                        placeholder="e.g., Retail Shop"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit-gst">
                        GST Number{" "}
                        <span className="text-muted-foreground font-normal">(Optional)</span>
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
                        onValueChange={(value) =>
                          handleUpdateRetailerBlockStatus(value === "blocked")
                        }
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
                        onValueChange={(value) =>
                          handleUpdateRetailerKYCStatus(value === "verified")
                        }
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
                setSelectedRetailer(null);
              }}
              disabled={isUpdating || isFetchingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRetailer}
              disabled={isUpdating || isFetchingProfile}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Retailer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}