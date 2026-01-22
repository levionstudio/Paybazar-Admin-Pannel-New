import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, Edit, RefreshCw, User, Building, MapPin, 
  CheckCircle, Ban, Download, ChevronsLeft, ChevronLeft, 
  ChevronRight, ChevronsRight, Search, Filter, X 
} from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";

interface MasterDistributor {
  master_distributor_id: string;
  admin_id: string;
  master_distributor_name: string;
  master_distributor_phone: string;
  master_distributor_email: string;
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
  kyc_status: boolean;
  documents_url: string | null;
  gst_number: string;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface EditFormData {
  master_distributor_name: string;
  master_distributor_phone: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  kyc_status: boolean;
  is_blocked: boolean;
  wallet_balance: number;
}

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
    return decoded.admin_id;
  } catch {
    return null;
  }
}

export default function GetAllMD() {
  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMD, setSelectedMD] = useState<MasterDistributor | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tempSearchQuery, setTempSearchQuery] = useState<string>("");
  
  const [editFormData, setEditFormData] = useState<EditFormData>({
    master_distributor_name: "",
    master_distributor_phone: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    business_name: "",
    business_type: "",
    gst_number: "",
    kyc_status: false,
    is_blocked: false,
    wallet_balance: 0,
  });

  const fetchMasterDistributors = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      
      // Calculate offset based on current page
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });
      
      // Add optional filters
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (searchQuery) params.append("search", searchQuery);
      
      console.log("📥 Fetching MDs with params:", {
        limit: itemsPerPage,
        offset: offset,
        start_date: startDate || 'none',
        end_date: endDate || 'none',
        search: searchQuery || 'none',
        currentPage: currentPage,
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

      if (res.data.status === "success" && res.data.data) {
        console.log("📦 Response data:", res.data.data);
        
        const distributors = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data.master_distributors || [];

        // Get total count from response (backend should provide this)
        const total = res.data.data.total_count || res.data.data.total || distributors.length;
        
        console.log("📊 Loaded:", {
          distributors: distributors.length,
          total: total,
          page: currentPage,
        });

        setMasterDistributors(distributors);
        setTotalCount(total);
      } else {
        toast.error("Failed to load master distributors");
        setMasterDistributors([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error("❌ Fetch error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load master distributors"
      );
      setMasterDistributors([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = getAdminIdFromToken();
    setAdminId(id);
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchMasterDistributors();
    }
  }, [adminId, currentPage, itemsPerPage, startDate, endDate, searchQuery]);

  const handleEditClick = async (md: MasterDistributor) => {
    setEditDialogOpen(true);
    setIsFetchingProfile(true);

    try {
      const token = localStorage.getItem("authToken");
      const url = `${import.meta.env.VITE_API_BASE_URL}/md/get/md/${md.master_distributor_id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const mdData =
        response.data?.data?.master_distributor || response.data?.data;

      if (!mdData) {
        toast.error("Invalid profile data");
        return;
      }

      setSelectedMD(mdData);

      setEditFormData({
        master_distributor_name: mdData.master_distributor_name ?? "",
        master_distributor_phone: mdData.master_distributor_phone ?? "",
        city: mdData.city ?? "",
        state: mdData.state ?? "",
        address: mdData.address ?? "",
        pincode: mdData.pincode ?? "",
        business_name: mdData.business_name ?? "",
        business_type: mdData.business_type ?? "",
        gst_number: mdData.gst_number ?? "",
        kyc_status: Boolean(mdData.kyc_status),
        is_blocked: Boolean(mdData.is_blocked),
        wallet_balance: Number(mdData.wallet_balance ?? 0),
      });

      toast.success("Profile loaded");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to load profile"
      );
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateMD = async () => {
    if (!selectedMD?.master_distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }

    if (!editFormData.master_distributor_name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!/^[1-9]\d{9}$/.test(editFormData.master_distributor_phone)) {
      toast.error("Invalid phone number");
      return;
    }

    const token = localStorage.getItem("authToken");
    const url = `${import.meta.env.VITE_API_BASE_URL}/md/update/details`;

    const payload: any = {
      master_distributor_id: selectedMD.master_distributor_id,
    };

    const allowedKeys = [
      "master_distributor_name",
      "master_distributor_phone",
      "city",
      "state",
      "address",
      "pincode",
      "business_name",
      "business_type",
      "gst_number",
    ];

    allowedKeys.forEach((key) => {
      if ((editFormData as any)[key] !== (selectedMD as any)[key]) {
        payload[key] = (editFormData as any)[key];
      }
    });

    if (Object.keys(payload).length === 1) {
      toast.info("No changes detected");
      return;
    }

    try {
      setIsUpdating(true);

      await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Master Distributor updated");

      setEditDialogOpen(false);
      setSelectedMD(null);
      fetchMasterDistributors();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Update failed"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBlockStatus = async (blockStatus: boolean) => {
    if (!selectedMD?.master_distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }

    const token = localStorage.getItem("authToken");

    const payload = {
      master_distributor_id: selectedMD.master_distributor_id,
      block_status: blockStatus,
    };

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/md/update/block`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Block status updated successfully");
      setEditDialogOpen(false);
      fetchMasterDistributors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update block status");
    }
  };

  const handleUpdateKYCStatus = async (kycStatus: boolean) => {
    if (!selectedMD?.master_distributor_id) {
      toast.error("Invalid distributor selected");
      return;
    }

    const token = localStorage.getItem("authToken");

    const payload = {
      master_distributor_id: selectedMD.master_distributor_id,
      kyc_status: kycStatus,
    };

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/md/update/kyc`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("KYC status updated successfully");
      setEditDialogOpen(false);
      fetchMasterDistributors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update KYC status");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      if (masterDistributors.length === 0) {
        toast.error("No data to export");
        return;
      }

      const data = masterDistributors.map((md, index) => ({
        "S.No": index + 1,
        "MD ID": md.master_distributor_id,
        "Name": md.master_distributor_name,
        "Email": md.master_distributor_email,
        "Phone": md.master_distributor_phone,
        "Business Name": md.business_name || "N/A",
        "Business Type": md.business_type || "N/A",
        "GST Number": md.gst_number || "N/A",
        "Aadhar Number": md.aadhar_number,
        "PAN Number": md.pan_number,
        "Date of Birth": formatDate(md.date_of_birth),
        "Gender": md.gender,
        "Address": md.address || "N/A",
        "City": md.city || "N/A",
        "State": md.state || "N/A",
        "Pincode": md.pincode || "N/A",
        "Wallet Balance (₹)": md.wallet_balance?.toFixed(2) || "0.00",
        "KYC Status": md.kyc_status ? "Verified" : "Pending",
        "Account Status": md.is_blocked ? "Blocked" : "Active",
        "Created At": formatDate(md.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      ws["!cols"] = [
        { wch: 6 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
        { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Distributors");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Master_Distributors_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${masterDistributors.length} master distributors successfully`);
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  // Format date for display
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

  // Pagination calculations (server-side)
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + masterDistributors.length, totalCount);

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Handle search
  const handleSearch = () => {
    setSearchQuery(tempSearchQuery);
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setTempSearchQuery("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Master Distributors
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all master distributors ({totalCount} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={masterDistributors.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchMasterDistributors} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Name, Email, Phone..."
                    value={tempSearchQuery}
                    onChange={(e) => setTempSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2 flex items-end">
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MD Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Sl No</TableHead>
                  <TableHead className="text-center">MD ID</TableHead>
                  <TableHead className="text-center">Name</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">Phone</TableHead>
                  <TableHead className="text-center">Business</TableHead>
                  <TableHead className="text-center">Wallet Balance</TableHead>
                  <TableHead className="text-center">KYC Status</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masterDistributors.length > 0 ? (
                  masterDistributors.map((md, index) => (
                    <TableRow key={md.master_distributor_id}>
                      <TableCell className="text-center">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {md.master_distributor_id}
                      </TableCell>
                      <TableCell className="font-medium text-center">
                        {md.master_distributor_name || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {md.master_distributor_email || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {md.master_distributor_phone || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {md.business_name || "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold text-center text-green-600">
                        ₹{md.wallet_balance?.toLocaleString("en-IN") || "0"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            md.kyc_status
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {md.kyc_status ? "Verified" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            md.is_blocked
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {md.is_blocked ? "Blocked" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(md)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No master distributors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Enhanced Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </Label>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger id="items-per-page" className="h-9 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Showing info */}
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {endIndex} of {totalCount} entries
            </p>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="h-9 w-9"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum as number)}
                      className="h-9 w-9"
                    >
                      {pageNum}
                    </Button>
                  )
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="h-9 w-9"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit MD Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit Master Distributor Profile
            </DialogTitle>
          </DialogHeader>
          {isFetchingProfile ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading profile...
              </span>
            </div>
          ) : (
            selectedMD && (
              <div className="space-y-6">
                {/* Non-editable fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      MD ID
                    </Label>
                    <p className="font-mono text-sm font-semibold">
                      {selectedMD.master_distributor_id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-sm">{selectedMD.master_distributor_email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Created At
                    </Label>
                    <p className="text-sm">{formatDate(selectedMD.created_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Aadhar Number
                    </Label>
                    <p className="font-mono text-sm">{selectedMD.aadhar_number}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      PAN Number
                    </Label>
                    <p className="font-mono text-sm uppercase">
                      {selectedMD.pan_number}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </Label>
                    <p className="text-sm">{formatDate(selectedMD.date_of_birth)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </Label>
                    <p className="text-sm">{selectedMD.gender}</p>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Personal Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Update basic details
                      </p>
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
                        value={editFormData.master_distributor_name}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            master_distributor_name: e.target.value,
                          })
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
                        value={editFormData.master_distributor_phone}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            master_distributor_phone: e.target.value.replace(/\D/g, ""),
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
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Business Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Company and business details
                      </p>
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
                        GST Number{" "}
                        <span className="text-muted-foreground font-normal">
                          (Optional)
                        </span>
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

                {/* Address Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Address Details</h3>
                      <p className="text-sm text-muted-foreground">
                        Location information
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Full Address</Label>
                      <Textarea
                        id="edit-address"
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            address: e.target.value,
                          })
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
                            setEditFormData({
                              ...editFormData,
                              city: e.target.value,
                            })
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
                            setEditFormData({
                              ...editFormData,
                              state: e.target.value,
                            })
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
                setSelectedMD(null);
              }}
              disabled={isUpdating || isFetchingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMD}
              disabled={isUpdating || isFetchingProfile}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Master Distributor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}