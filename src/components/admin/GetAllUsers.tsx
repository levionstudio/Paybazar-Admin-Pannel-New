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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Edit,
  RefreshCw,
  Download,
  Search,
  X,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EditRetailerDialog from "./EditRetailerDialog";
import LimitManagementDialog from "./LimitCreateService";

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_email?: string;
  distributor_phone?: string;
  business_name?: string;
}

interface Retailer {
  retailer_id: string;
  retailer_password: string;
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
  const [filteredDistributors, setFilteredDistributors] = useState<
    Distributor[]
  >([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(
    null
  );

  const itemsPerPage = 10;

  // Filter distributors based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDistributors(distributors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = distributors.filter((dist) => {
      const matchesId = dist.distributor_id.toLowerCase().includes(query);
      const matchesName = dist.distributor_name?.toLowerCase().includes(query);
      const matchesEmail = dist.distributor_email
        ?.toLowerCase()
        .includes(query);
      const matchesPhone = dist.distributor_phone?.includes(query);
      const matchesBusiness = dist.business_name?.toLowerCase().includes(query);

      return (
        matchesId ||
        matchesName ||
        matchesEmail ||
        matchesPhone ||
        matchesBusiness
      );
    });

    setFilteredDistributors(filtered);
  }, [searchQuery, distributors]);

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

        const params = new URLSearchParams({
          limit: "10000",
          page_size: "10000",
          per_page: "10000",
          all: "true",
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

          setDistributors(normalized);
          setFilteredDistributors(normalized);

          if (normalized.length > 0) {
            setSelectedDistributor(normalized[0].distributor_id);
          }
        } else {
          toast.error("Failed to load distributors");
        }
      } catch (error: any) {
        console.error("Error fetching distributors:", error);
        toast.error(
          error.response?.data?.message || "Failed to load distributors"
        );
      } finally {
        setLoadingDistributors(false);
      }
    };

    fetchAllDistributors();
  }, []);

  // Fetch retailers with pagination
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
        const count =
          res.data.data.total_count || res.data.data.count || list.length;
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

  // Fetch all retailers for export
  const fetchAllRetailersForExport = async (
    distributorId: string
  ): Promise<Retailer[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            limit: 100000,
            offset: 0,
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const allData = res.data.data.retailers || [];
        return allData;
      }
      return [];
    } catch (error) {
      console.error("Error fetching all retailers for export:", error);
      return [];
    }
  };

  useEffect(() => {
    if (selectedDistributor) {
      fetchRetailers(selectedDistributor, currentPage);
    }
  }, [selectedDistributor, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDistributor]);

  const handleEditClick = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setEditDialogOpen(true);
  };

  const handleManageLimits = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setLimitDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Refresh the current page
    if (selectedDistributor) {
      fetchRetailers(selectedDistributor, currentPage);
    }
  };

  const exportToExcel = async () => {
    try {
      if (!selectedDistributor) {
        toast.error("Please select a distributor");
        return;
      }

      toast.info("Fetching all data for export...");

      const allRetailers = await fetchAllRetailersForExport(
        selectedDistributor
      );

      if (allRetailers.length === 0) {
        toast.error("No data to export");
        return;
      }

      const data = allRetailers.map((r, index) => ({
        "S.No": index + 1,
        "Distributor ID": r.distributor_id,
        "Retailer ID": r.retailer_id,
        "Retailer Password": r.retailer_password,
        Name: r.retailer_name,
        Email: r.retailer_email,
        Phone: r.retailer_phone,
        "Business Name": r.business_name || "N/A",
        "Business Type": r.business_type || "N/A",
        "GST Number": r.gst_number || "N/A",
        "Aadhar Number": r.aadhar_number,
        "PAN Number": r.pan_number,
        "Date of Birth": formatDate(r.date_of_birth),
        Gender: r.gender,
        Address: r.address || "N/A",
        City: r.city || "N/A",
        State: r.state || "N/A",
        Pincode: r.pincode || "N/A",
        "Wallet Balance (₹)": r.wallet_balance?.toFixed(2) || "0.00",
        "KYC Status": r.kyc_status ? "Verified" : "Pending",
        "Account Status": r.is_blocked ? "Blocked" : "Active",
        "Created At": formatDate(r.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      ws["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 10 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Retailers");

      const distName =
        distributors.find((d) => d.distributor_id === selectedDistributor)
          ?.distributor_name || selectedDistributor;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Retailers_${distName.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${allRetailers.length} retailers successfully`);
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const getStatusBadge = (isBlocked: boolean) => {
    if (isBlocked) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-300">
          Blocked
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-50 text-green-700 border-green-300">
        Active
      </Badge>
    );
  };

  const getKYCBadge = (kycStatus: boolean) => {
    if (kycStatus) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-300">
          Verified
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">
        Pending
      </Badge>
    );
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
            Manage and view all retailers{" "}
            {totalCount > 0 && `(${totalCount} total)`}
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
            onClick={() =>
              selectedDistributor &&
              fetchRetailers(selectedDistributor, currentPage)
            }
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
                <Select
                  value={selectedDistributor}
                  onValueChange={setSelectedDistributor}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="Select distributor">
                      {selectedDistributor &&
                        distributors.find(
                          (d) => d.distributor_id === selectedDistributor
                        )?.distributor_name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-md">
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
                          Found {filteredDistributors.length} result(s)
                        </p>
                      )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredDistributors.length === 0 && !searchQuery ? (
                        <div className="px-2 py-1.5 text-sm text-gray-600 text-center">
                          No distributors found
                        </div>
                      ) : filteredDistributors.length === 0 && searchQuery ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-medium">No results found</p>
                          <p className="text-xs mt-1">
                            Try a different search term
                          </p>
                        </div>
                      ) : (
                        filteredDistributors.map((d) => (
                          <SelectItem
                            key={d.distributor_id}
                            value={d.distributor_id}
                            className="cursor-pointer hover:bg-gray-100"
                          >
                            <div className="flex flex-col py-1.5 w-full">
                              <span className="font-semibold text-sm text-gray-900">
                                {d.distributor_name || "Unnamed"}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="font-mono">
                                  {d.distributor_id}
                                </span>
                                {d.distributor_email && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>{d.distributor_email}</span>
                                  </>
                                )}
                                {d.distributor_phone && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>{d.distributor_phone}</span>
                                  </>
                                )}
                                {d.business_name && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="truncate max-w-[150px]">
                                      {d.business_name}
                                    </span>
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
                {distributors.length > 0 && (
                  <p className="text-xs text-gray-500 pl-1">
                    {filteredDistributors.length} of {distributors.length}{" "}
                    distributor{distributors.length !== 1 ? "s" : ""}{" "}
                    {searchQuery ? "matching search" : "available"}
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
              <p className="text-gray-600">
                Please select a distributor to view retailers
              </p>
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
                      <TableHead className="text-center font-semibold">
                        Sl No
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Dist ID
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Retailer ID
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Password
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Name
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Email
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Phone
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Business
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Wallet Balance
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        KYC
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {retailers.length > 0 ? (
                      retailers.map((r, idx) => (
                        <TableRow
                          key={r.retailer_id}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="text-center">
                            {startIndex + idx + 1}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {r.distributor_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {r.retailer_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {r.retailer_password || "N/A"}
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {r.retailer_name || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.retailer_email || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.retailer_phone || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.business_name || "N/A"}
                          </TableCell>
                          <TableCell className="font-semibold text-center text-green-600">
                            ₹
                            {r.wallet_balance?.toLocaleString("en-IN") || "0"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getKYCBadge(r.kyc_status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(r.is_blocked)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(r)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManageLimits(r)}
                                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Limits
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="text-center py-20 text-gray-600"
                        >
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
                    Showing {startIndex + 1} to{" "}
                    {Math.min(startIndex + itemsPerPage, totalCount)} of{" "}
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
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
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

      {/* Edit Retailer Dialog */}
      <EditRetailerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        retailer={selectedRetailer}
        authToken={getAuthToken()}
        onSuccess={handleDialogSuccess}
      />

      {/* Limit Management Dialog */}
      <LimitManagementDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        retailer={selectedRetailer}
        authToken={getAuthToken()}
      />
    </div>
  );
}