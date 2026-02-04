import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Wallet, 
  Download,
  Search,
  FileText,
  Calendar,
  AlertCircle
} from "lucide-react";

interface FundRequest {
  fund_request_id: number;
  requester_id: string;
  request_to_id: string;
  business_name: string;
  amount: number;
  bank_name: string | null;
  request_date: string;
  utr_number: string | null;
  request_type: string;
  request_status: string;
  remarks: string;
  reject_remarks: string;
  created_at: string;
  updated_at: string;
}

interface DecodedToken {
  admin_id: string;
  exp: number;
}

const today = new Date().toISOString().split("T")[0];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export function FundRequest() {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<FundRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<{
    requestId: number;
    action: "accept" | "reject";
  } | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<number | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  
  // Remarks view dialog
  const [showRemarksDialog, setShowRemarksDialog] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState<{
    type: 'request' | 'rejection';
    text: string;
  } | null>(null);

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

  const fetchWalletBalance = async () => {
    const userId = getAdminIdFromToken();
    if (!userId) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/wallet/get/balance/admin/${userId}`,
        getAuthHeaders()
      );

      const balance =
        response.data?.data?.balance ??
        response.data?.data?.wallet_balance ??
        response.data?.balance ??
        0;

      setWalletBalance(Number(balance));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch wallet balance",
        variant: "destructive",
      });
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    const userId = getAdminIdFromToken();
    
    if (!userId) {
      setLoading(false);
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build payload for POST body
      const payload: {
        id: string;
        status?: string;
        start_date?: string;
        end_date?: string;
      } = {
        id: userId,
      };

      // Add optional filters
      if (statusFilter !== "ALL") {
        payload.status = statusFilter;
      }
      if (startDate) {
        payload.start_date = new Date(`${startDate}T00:00:00`).toISOString();
      }
      if (endDate) {
        payload.end_date = new Date(`${endDate}T23:59:59`).toISOString();
      }

      const response = await axios.post(
        `${API_BASE_URL}/fund_request/get/request_to`,
        payload,
        getAuthHeaders()
      );

      const data = response.data.data;
      const requestsList = Array.isArray(data.fund_requests) ? data.fund_requests : [];
      
      const totalCount = data.total || requestsList.length;

      // Sort by created_at (latest first)
      const sortedRequests = [...requestsList].sort((a: FundRequest, b: FundRequest) => {
        try {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
          return timeB - timeA;
        } catch {
          return 0;
        }
      });

      setRequests(sortedRequests);
      setFilteredRequests(sortedRequests);
      setTotalRecords(totalCount);
    } catch (error: any) {
      setRequests([]);
      setFilteredRequests([]);
      setTotalRecords(0);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch fund requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, startDate, endDate]);

  // Apply search filter and pagination (client-side)
  useEffect(() => {
    let filtered = [...requests];

    // Global search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.utr_number?.toLowerCase().includes(searchLower) ||
          req.requester_id?.toLowerCase().includes(searchLower) ||
          req.request_to_id?.toLowerCase().includes(searchLower) ||
          req.fund_request_id?.toString().includes(searchLower) ||
          req.amount?.toString().includes(searchLower) ||
          req.bank_name?.toLowerCase().includes(searchLower) ||
          req.business_name?.toLowerCase().includes(searchLower) ||
          req.request_type?.toLowerCase().includes(searchLower)
      );
    }

    // Client-side pagination
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    setFilteredRequests(paginatedData);
    setTotalRecords(filtered.length);
  }, [searchTerm, requests, currentPage, recordsPerPage]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Export all filtered data (not just current page)
      let allFilteredData = [...requests];
      
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        allFilteredData = allFilteredData.filter(
          (req) =>
            req.utr_number?.toLowerCase().includes(searchLower) ||
            req.requester_id?.toLowerCase().includes(searchLower) ||
            req.request_to_id?.toLowerCase().includes(searchLower) ||
            req.fund_request_id?.toString().includes(searchLower) ||
            req.amount?.toString().includes(searchLower) ||
            req.bank_name?.toLowerCase().includes(searchLower) ||
            req.business_name?.toLowerCase().includes(searchLower) ||
            req.request_type?.toLowerCase().includes(searchLower)
        );
      }

      const exportData = allFilteredData.map((req, index) => ({
        "S.No": index + 1,
        "Request Date": formatDate(req.request_date),
        "Request ID": req.fund_request_id || "N/A",
        "Requester ID": req.requester_id || "N/A",
        "Request To ID": req.request_to_id || "N/A",
        "Business Name": req.business_name || "N/A",
        "Request Type": req.request_type || "N/A",
        "Amount (₹)": req.amount?.toFixed(2) || "0.00",
        "Bank Name": req.bank_name || "-",
        "UTR Number": req.utr_number || "-",
        "Remarks": req.remarks || "N/A",
        "Status": req.request_status || "N/A",
        "Rejection Reason": req.reject_remarks || "-",
        "Created At": formatDateTime(req.created_at),
        "Updated At": formatDateTime(req.updated_at),
      }));

      // Add summary row
      const totalAmount = allFilteredData.reduce(
        (sum, req) => sum + (req.amount || 0),
        0
      );

      const summaryRow = {
        "S.No": "",
        "Request Date": "",
        "Request ID": "TOTAL",
        "Requester ID": "",
        "Request To ID": "",
        "Business Name": "",
        "Request Type": "",
        "Amount (₹)": totalAmount.toFixed(2),
        "Bank Name": "",
        "UTR Number": "",
        "Remarks": "",
        "Status": "",
        "Rejection Reason": "",
        "Created At": "",
        "Updated At": "",
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No
        { wch: 15 }, // Request Date
        { wch: 15 }, // Request ID
        { wch: 20 }, // Requester ID
        { wch: 20 }, // Request To ID
        { wch: 25 }, // Business Name
        { wch: 12 }, // Request Type
        { wch: 15 }, // Amount
        { wch: 25 }, // Bank Name
        { wch: 25 }, // UTR
        { wch: 35 }, // Remarks
        { wch: 12 }, // Status
        { wch: 35 }, // Rejection Reason
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fund Requests");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Fund_Requests_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${allFilteredData.length} fund requests successfully`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAccept = async (requestId: number) => {
    setProcessingAction({ requestId, action: "accept" });

    try {
      await axios.put(
        `${API_BASE_URL}/fund_request/accept/${requestId}`,
        {},
        getAuthHeaders()
      );

      toast({
        title: "Success",
        description: "Fund request accepted successfully",
      });
      fetchWalletBalance();
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to accept fund request",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const openRejectDialog = (requestId: number) => {
    setSelectedRequestForReject(requestId);
    setRejectionRemarks("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedRequestForReject) return;
    
    if (!rejectionRemarks.trim()) {
      toast({
        title: "Error",
        description: "Please provide rejection remarks",
        variant: "destructive",
      });
      return;
    }

    setProcessingAction({ requestId: selectedRequestForReject, action: "reject" });

    try {
      await axios.put(
        `${API_BASE_URL}/fund_request/reject/${selectedRequestForReject}`,
        {
          reject_remarks: rejectionRemarks.trim(),
        },
        getAuthHeaders()
      );

      toast({
        title: "Success",
        description: "Fund request rejected successfully",
      });
      setShowRejectDialog(false);
      setSelectedRequestForReject(null);
      setRejectionRemarks("");
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to reject fund request",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const viewRemarks = (text: string, type: 'request' | 'rejection') => {
    setSelectedRemarks({ type, text });
    setShowRemarksDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Pending
          </Badge>
        );
      case "ACCEPTED":
      case "APPROVED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-300">
            Accepted
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-300">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    const typeUpper = type?.toUpperCase();
    switch (typeUpper) {
      case "NORMAL":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-300">
            Normal
          </Badge>
        );
      case "ADVANCE":
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-300">
            Advance
          </Badge>
        );
      default:
        return <Badge variant="outline">{type || "-"}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return "-";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  // Pagination logic
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const isProcessing = (requestId: number, action: "accept" | "reject") => {
    return processingAction?.requestId === requestId && processingAction?.action === action;
  };

  const isAnyProcessing = (requestId: number) => {
    return processingAction?.requestId === requestId;
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
      {/* Wallet Balance Card */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Wallet className="h-7 w-7 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Admin Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{walletBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
            <Button onClick={fetchRequests} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Global Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Global Search
              </Label>
              <Input
                placeholder="Search by UTR, ID, Amount..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white"
              />
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="bg-white"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fund Requests Table */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          {/* Table Controls */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Show</span>
              <Select
                value={recordsPerPage.toString()}
                onValueChange={(value) => {
                  setRecordsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-20 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm font-medium text-gray-700">entries</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                Showing {totalRecords > 0 ? ((currentPage - 1) * recordsPerPage) + 1 : 0} to{" "}
                {Math.min(currentPage * recordsPerPage, totalRecords)} of{" "}
                {totalRecords} entries
              </span>
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                disabled={requests.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Wallet className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-semibold text-gray-900">
                  No fund requests found
                </p>
                <p className="text-sm text-gray-600">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Request Date
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Request ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Requester ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Request To
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Business Name
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Request Type
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Amount (₹)
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Bank Name
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      UTR Number
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Remarks
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.fund_request_id} className="border-b hover:bg-gray-50">
                      <TableCell className="py-3 text-center text-sm text-gray-900">
                        {formatDate(request.request_date)}
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-sm text-gray-900">
                        #{request.fund_request_id}
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-sm text-gray-900">
                        {request.requester_id}
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-sm text-blue-600">
                        {request.request_to_id}
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-semibold">
                        {request.business_name || "N/A"}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {getRequestTypeBadge(request.request_type)}
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm font-semibold text-green-600">
                        ₹{request.amount?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-3 text-center text-sm text-gray-900">
                        {request.bank_name || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-sm text-gray-900">
                        {request.utr_number || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {request.remarks ? (
                          <button
                            onClick={() => viewRemarks(request.remarks, 'request')}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                          >
                            <FileText className="h-3 w-3" />
                            {truncateText(request.remarks, 20)}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(request.request_status)}
                          {request.request_status.toUpperCase() === "REJECTED" && request.reject_remarks && (
                            <button
                              onClick={() => viewRemarks(request.reject_remarks!, 'rejection')}
                              className="text-xs text-red-600 hover:underline flex items-center gap-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              View Reason
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {request.request_status.toUpperCase() === "PENDING" ? (
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleAccept(request.fund_request_id)}
                              disabled={isAnyProcessing(request.fund_request_id)}
                              className="min-w-[70px] h-8 text-xs bg-green-600 hover:bg-green-700"
                            >
                              {isProcessing(request.fund_request_id, "accept") ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(request.fund_request_id)}
                              disabled={isAnyProcessing(request.fund_request_id)}
                              className="min-w-[70px] h-8 text-xs"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalRecords > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Fund Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this fund request. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-remarks">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-remarks"
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionRemarks("");
                setSelectedRequestForReject(null);
              }}
              disabled={processingAction !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingAction !== null || !rejectionRemarks.trim()}
            >
              {processingAction?.action === "reject" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remarks View Dialog */}
      <Dialog open={showRemarksDialog} onOpenChange={setShowRemarksDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRemarks?.type === 'rejection' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Rejection Reason
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-blue-600" />
                  Request Remarks
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className={`rounded-lg border-2 p-4 ${
              selectedRemarks?.type === 'rejection' 
                ? 'border-red-200 bg-red-50' 
                : 'border-blue-200 bg-blue-50'
            }`}>
              <p className="text-sm whitespace-pre-wrap break-words">
                {selectedRemarks?.text || 'No remarks provided'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemarksDialog(false);
                setSelectedRemarks(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}