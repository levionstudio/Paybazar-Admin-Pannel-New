import { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, RefreshCw, Download, Search, Calendar, X } from "lucide-react";

/* -------------------- TOKEN -------------------- */

interface DecodedToken {
  admin_id: string;
  exp: number;
}

// Get today's date in YYYY-MM-DD format in local timezone
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getTodayDate();

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
    localStorage.removeItem("authToken");
    return null;
  }
}

/* -------------------- BACKEND DTO -------------------- */

interface WalletTransactionRaw {
  wallet_transaction_id: string;
  admin_id: string;
  reference_id: string;
  credit_amount?: string;
  debit_amount?: string;
  before_balance: string;
  after_balance: string;
  transaction_reason: "TOPUP" | "FUND_REQUEST";
  remarks: string;
  created_at: string;
}

/* -------------------- UI MODEL -------------------- */

interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  reason: string;
  remarks: string;
  beforeBalance: number;
  afterBalance: number;
  createdAt: string;
}

/* -------------------- DATE FILTERING HELPER -------------------- */

const isTransactionInDateRange = (
  transactionDate: string,
  startDate: string,
  endDate: string
): boolean => {
  const txDate = new Date(transactionDate);
  const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
  
  const start = new Date(startDate + "T00:00:00");
  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  
  const end = new Date(endDate + "T23:59:59");
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  return txDateOnly >= startDateOnly && txDateOnly <= endDateOnly;
};

/* -------------------- COMPONENT -------------------- */

const AdminWalletTransactions = () => {
  const { toast } = useToast();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  /* -------------------- AUTH -------------------- */

  useEffect(() => {
    const id = getAdminIdFromToken();

    if (!id) {
      toast({
        title: "Session expired",
        description: "Please login again.",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    setAdminId(id);
  }, [toast]);

  /* -------------------- FETCH WITH PAGINATION -------------------- */

  const fetchTransactions = async (page: number = currentPage, limit: number = recordsPerPage) => {
    if (!adminId) return;

    const token = localStorage.getItem("authToken");
    setLoading(true);

    try {
      const offset = (page - 1) * limit;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      // Add filters to params
      if (typeFilter !== "ALL") {
        params.append("type", typeFilter);
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/get/transactions/admin/${adminId}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const raw: WalletTransactionRaw[] = res.data?.data?.transactions || [];
      const total = res.data?.data?.total_count || res.data?.data?.total || 0;


      // Client-side date filtering for accuracy
      let filtered = raw;
      
      if (startDate && endDate) {
        filtered = raw.filter((tx) =>
          isTransactionInDateRange(tx.created_at, startDate, endDate)
        );
      }

      const mapped: WalletTransaction[] = filtered.map((tx) => {
        const isCredit = !!tx.credit_amount;

        return {
          id: tx.wallet_transaction_id,
          type: isCredit ? "CREDIT" : "DEBIT",
          amount: parseFloat(tx.credit_amount || tx.debit_amount || "0"),
          reason: tx.transaction_reason,
          remarks: tx.remarks,
          beforeBalance: parseFloat(tx.before_balance),
          afterBalance: parseFloat(tx.after_balance),
          createdAt: tx.created_at,
        };
      });

      setTransactions(mapped);
      
      // Set total count - use filtered length if we have data, otherwise use backend total
      const actualCount = mapped.length > 0 ? mapped.length : total;
      setTotalCount(actualCount);

    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to fetch wallet transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (adminId) {
      fetchTransactions(1, recordsPerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  // Refetch when filters or pagination changes
  useEffect(() => {
    if (adminId) {
      fetchTransactions(currentPage, recordsPerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, recordsPerPage, typeFilter, searchTerm, startDate, endDate]);

  /* -------------------- CLEAR FILTERS -------------------- */

  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm || 
    typeFilter !== "ALL" || 
    startDate !== today || 
    endDate !== today;

  /* -------------------- EXPORT FILTERED DATA -------------------- */

  const exportToExcel = async () => {
    if (!adminId) return;

    // Check if we have any transactions to export
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Exporting...",
        description: "Preparing Excel file with current view",
      });

      // Export only the currently displayed/filtered transactions
      const data = transactions.map((tx, i) => {
        return {
          "S.No": indexOfFirstRecord + i + 1,
          "Date & Time": new Date(tx.createdAt).toLocaleString("en-IN", {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          "Transaction ID": tx.id,
          Type: tx.type,
          Reason: tx.reason,
          "Amount (₹)": tx.amount.toFixed(2),
          "Before Balance (₹)": tx.beforeBalance.toFixed(2),
          "After Balance (₹)": tx.afterBalance.toFixed(2),
          Remarks: tx.remarks || "-",
        };
      });


      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 6 },  // S.No
        { wch: 20 }, // Date & Time
        { wch: 30 }, // Transaction ID
        { wch: 10 }, // Type
        { wch: 15 }, // Reason
        { wch: 15 }, // Amount
        { wch: 18 }, // Before Balance
        { wch: 18 }, // After Balance
        { wch: 30 }, // Remarks
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Wallet Transactions");

      // Create filename with page info
      const filename = `Admin_Wallet_Transactions_Page${currentPage}_${getTodayDate()}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast({
        title: "Success",
        description: `Exported ${data.length} transaction${data.length !== 1 ? 's' : ''} from current page`,
      });
    } catch (err: any) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: "Failed to export transactions",
        variant: "destructive",
      });
    }
  };

  /* -------------------- EXPORT ALL FILTERED DATA -------------------- */

  const exportAllToExcel = async () => {
    if (!adminId) return;

    const token = localStorage.getItem("authToken");
    
    try {
      toast({
        title: "Exporting All...",
        description: "Fetching all filtered transactions",
      });

      // Fetch ALL transactions with current filters (no pagination)
      const params = new URLSearchParams({
        limit: "999999",
        offset: "0",
      });

      if (typeFilter !== "ALL") {
        params.append("type", typeFilter);
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (startDate) {
        params.append("start_date", startDate);
      }
      if (endDate) {
        params.append("end_date", endDate);
      }
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/get/transactions/admin/${adminId}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      let raw: WalletTransactionRaw[] = res.data?.data?.transactions || [];
      // Apply client-side date filtering if needed
      if (startDate && endDate) {
        const beforeFilter = raw.length;
        raw = raw.filter((tx) =>
          isTransactionInDateRange(tx.created_at, startDate, endDate)
        );
      }

      if (raw.length === 0) {
        toast({
          title: "No Data",
          description: "No transactions found to export",
          variant: "destructive",
        });
        return;
      }

      const data = raw.map((tx, i) => {
        const isCredit = !!tx.credit_amount;
        const amount = parseFloat(tx.credit_amount || tx.debit_amount || "0");
        const beforeBalance = parseFloat(tx.before_balance || "0");
        const afterBalance = parseFloat(tx.after_balance || "0");

        return {
          "S.No": i + 1,
          "Date & Time": new Date(tx.created_at).toLocaleString("en-IN", {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          "Transaction ID": tx.wallet_transaction_id,
          Type: isCredit ? "CREDIT" : "DEBIT",
          Reason: tx.transaction_reason,
          "Amount (₹)": amount.toFixed(2),
          "Before Balance (₹)": beforeBalance.toFixed(2),
          "After Balance (₹)": afterBalance.toFixed(2),
          Remarks: tx.remarks || "-",
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 6 },  // S.No
        { wch: 20 }, // Date & Time
        { wch: 30 }, // Transaction ID
        { wch: 10 }, // Type
        { wch: 15 }, // Reason
        { wch: 15 }, // Amount
        { wch: 18 }, // Before Balance
        { wch: 18 }, // After Balance
        { wch: 30 }, // Remarks
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Wallet Transactions");

      // Create filename with filter info
      let filterSuffix = "";
      if (typeFilter !== "ALL") filterSuffix += `_${typeFilter}`;
      if (startDate && endDate && (startDate !== today || endDate !== today)) {
        filterSuffix += `_${startDate}_to_${endDate}`;
      }
      
      const filename = `Admin_Wallet_Transactions_All${filterSuffix}_${getTodayDate()}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast({
        title: "Success",
        description: `Exported all ${data.length} filtered transaction${data.length !== 1 ? 's' : ''} to Excel`,
      });
    } catch (err: any) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: err.response?.data?.message || "Failed to export transactions",
        variant: "destructive",
      });
    }
  };

  /* -------------------- HELPERS -------------------- */

  const formatDateTime = (d: string) => new Date(d).toLocaleString("en-IN");

  const typeBadge = (type: "CREDIT" | "DEBIT") =>
    type === "CREDIT" ? (
      <Badge className="bg-green-50 text-green-700 border-green-300">
        Credit
      </Badge>
    ) : (
      <Badge className="bg-red-50 text-red-700 border-red-300">Debit</Badge>
    );

  /* -------------------- PAGINATION -------------------- */

  const totalPages = Math.ceil(totalCount / recordsPerPage);
  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;
  const indexOfLastRecord = Math.min(indexOfFirstRecord + recordsPerPage, totalCount);

  /* -------------------- UI -------------------- */

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Wallet Transactions
          </h1>
          <p className="text-gray-600 mt-1">
            View your wallet transaction history
          </p>
        </div>
        <Button onClick={() => fetchTransactions(currentPage, recordsPerPage)} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters Section */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  Search
                </Label>
                <Input
                  placeholder="Search by ID, reason, remarks..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white"
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Type
                </Label>
                <Select 
                  value={typeFilter} 
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  From Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white"
                  max={endDate || undefined}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  To Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white"
                  min={startDate || undefined}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
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
              <span className="text-sm font-medium text-gray-700">
                entries
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                Showing {totalCount > 0 ? indexOfFirstRecord + 1 : 0} to{" "}
                {indexOfLastRecord} of{" "}
                {totalCount} entries
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  disabled={totalCount === 0 && transactions.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Page
                </Button>
                {totalPages > 1 && (
                  <Button
                    onClick={exportAllToExcel}
                    variant="default"
                    size="sm"
                    disabled={totalCount === 0 && transactions.length === 0}
                    className="paybazaar-button"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-lg font-semibold text-gray-900">
                  No transactions found
                </p>
                <p className="text-sm text-gray-600">
                  {hasActiveFilters
                    ? "Try adjusting your filters"
                    : "No transactions available"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      S.No
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Date & Time
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Transaction ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Type
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Reason
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Amount (₹)
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Before Balance
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      After Balance
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                      Remarks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => (
                    <TableRow
                      key={tx.id}
                      className={`border-b hover:bg-gray-50 ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                      }`}
                    >
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        {indexOfFirstRecord + idx + 1}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-sm text-gray-900 whitespace-nowrap">
                        {tx.id}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        {typeBadge(tx.type)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        {tx.reason}
                      </TableCell>
                      <TableCell
                        className={`py-3 px-4 text-center font-semibold text-sm whitespace-nowrap ${
                          tx.type === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.type === "CREDIT" ? "+" : "-"}₹
                        {tx.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        ₹
                        {tx.beforeBalance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        ₹
                        {tx.afterBalance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-600">
                        {tx.remarks}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || loading}
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
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
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
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletTransactions;