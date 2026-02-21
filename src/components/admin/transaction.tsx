import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
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

/* -------------------- TYPES -------------------- */

interface WalletTransactionRaw {
  wallet_transaction_id: string;
  admin_id: string;
  reference_id: string;
  credit_amount?: string;
  debit_amount?: string;
  before_balance: string;
  after_balance: string;
  transaction_reason: string;
  remarks: string;
  created_at: string;
}

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

/* -------------------- BATCH SIZE -------------------- */

// ✅ Same pattern as payout: request large pages, only break on empty batch
const BATCH_SIZE = 1000;

/* -------------------- FETCH ALL PAGED -------------------- */

async function fetchAllWalletPaged(
  url: string,
  token: string,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<WalletTransactionRaw[]> {
  const results: WalletTransactionRaw[] = [];
  let page = 1;
  let serverTotal: number | null = null;

  while (true) {
    const offset = (page - 1) * BATCH_SIZE;
    const sep = url.includes("?") ? "&" : "?";

    const res = await axios.get(
      `${url}${sep}limit=${BATCH_SIZE}&page=${page}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = res.data?.data;
    const batch: WalletTransactionRaw[] = data?.transactions ?? [];

    // Capture total from first response
    if (serverTotal === null) {
      serverTotal =
        data?.total ??
        data?.total_count ??
        data?.totalCount ??
        data?.count ??
        res.data?.total ??
        null;
    }

    // ✅ Only break on empty batch — NOT on partial batch
    // A backend that always returns exactly 100 records would wrongly
    // stop on the first page if we used `batch.length < BATCH_SIZE`
    if (batch.length === 0) break;

    results.push(...batch);
    onProgress?.(results.length, serverTotal);

    // Stop if server told us the total and we've reached it
    if (serverTotal !== null && results.length >= serverTotal) break;

    page++;
  }

  return results;
}

/* -------------------- COMPONENT -------------------- */

const AdminWalletTransactions = () => {
  const { toast } = useToast();

  const [adminId, setAdminId] = useState<string | null>(null);

  // ✅ All transactions fetched via paginated loop
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchProgress, setFetchProgress] = useState<{ loaded: number; total: number | null } | null>(null);

  // Filters (all frontend)
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Pagination (all frontend)
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  /* ── Auth ─────────────────────────────────────── */
  useEffect(() => {
    const id = getAdminIdFromToken();
    if (!id) {
      toast({ title: "Session expired", description: "Please login again.", variant: "destructive" });
      window.location.href = "/login";
      return;
    }
    setAdminId(id);
  }, [toast]);

  /* ── Fetch ALL transactions via paginated loop ── */
  const fetchTransactions = useCallback(async () => {
    if (!adminId) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setLoading(true);
    setFetchProgress({ loaded: 0, total: null });

    try {
      const raw = await fetchAllWalletPaged(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/get/transactions/admin/${adminId}`,
        token,
        (loaded, total) => setFetchProgress({ loaded, total })
      );

      const mapped: WalletTransaction[] = raw.map((tx) => {
        const isCredit = !!tx.credit_amount && parseFloat(tx.credit_amount) > 0;
        return {
          id: tx.wallet_transaction_id,
          type: isCredit ? "CREDIT" : "DEBIT",
          amount: parseFloat(tx.credit_amount || tx.debit_amount || "0"),
          reason: tx.transaction_reason,
          remarks: tx.remarks || "-",
          beforeBalance: parseFloat(tx.before_balance || "0"),
          afterBalance: parseFloat(tx.after_balance || "0"),
          createdAt: tx.created_at,
        };
      });

      // Sort newest first
      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`✅ Fetched ${mapped.length} total wallet transactions`);
      setAllTransactions(mapped);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to fetch wallet transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setFetchProgress(null);
    }
  }, [adminId, toast]);

  useEffect(() => {
    if (adminId) fetchTransactions();
  }, [adminId, fetchTransactions]);

  /* ── Frontend filtering ──────────────────────── */
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((tx) => {
        const d = new Date(tx.createdAt);
        return d >= start && d <= end;
      });
    }

    // Type
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) =>
        typeFilter === "credit" ? tx.type === "CREDIT" : tx.type === "DEBIT"
      );
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.id.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q) ||
        tx.remarks.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      );
    }

    return filtered;
  }, [allTransactions, startDate, endDate, typeFilter, searchTerm]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, typeFilter, searchTerm]);

  /* ── Pagination calc ──────────────────────────── */
  const totalCount = filteredTransactions.length;
  const totalPages = Math.ceil(totalCount / recordsPerPage);
  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;
  const indexOfLastRecord = Math.min(indexOfFirstRecord + recordsPerPage, totalCount);
  const currentRecords = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);

  /* ── Clear filters ───────────────────────────── */
  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    typeFilter !== "all" ||
    startDate !== today ||
    endDate !== today;

  /* ── Export current page ─────────────────────── */
  const exportToExcel = () => {
    if (currentRecords.length === 0) {
      toast({ title: "No Data", description: "No transactions to export", variant: "destructive" });
      return;
    }
    const data = currentRecords.map((tx, i) => ({
      "S.No": indexOfFirstRecord + i + 1,
      "Date & Time": new Date(tx.createdAt).toLocaleString("en-IN"),
      "Transaction ID": tx.id,
      Type: tx.type,
      Reason: tx.reason,
      "Amount (₹)": tx.amount.toFixed(2),
      "Before Balance (₹)": tx.beforeBalance.toFixed(2),
      "After Balance (₹)": tx.afterBalance.toFixed(2),
      Remarks: tx.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Admin_Wallet_Transactions_Page${currentPage}_${getTodayDate()}.xlsx`);
    toast({ title: "Exported", description: `${data.length} transaction(s) exported` });
  };

  /* ── Export all filtered ──────────────────────── */
  const exportAllToExcel = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: "No Data", description: "No transactions to export", variant: "destructive" });
      return;
    }
    const data = filteredTransactions.map((tx, i) => ({
      "S.No": i + 1,
      "Date & Time": new Date(tx.createdAt).toLocaleString("en-IN"),
      "Transaction ID": tx.id,
      Type: tx.type,
      Reason: tx.reason,
      "Amount (₹)": tx.amount.toFixed(2),
      "Before Balance (₹)": tx.beforeBalance.toFixed(2),
      "After Balance (₹)": tx.afterBalance.toFixed(2),
      Remarks: tx.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    let suffix = typeFilter !== "all" ? `_${typeFilter.toUpperCase()}` : "";
    if (startDate !== today || endDate !== today) suffix += `_${startDate}_to_${endDate}`;
    XLSX.writeFile(wb, `Admin_Wallet_Transactions_All${suffix}_${getTodayDate()}.xlsx`);
    toast({ title: "Exported", description: `All ${data.length} filtered transaction(s) exported` });
  };

  /* ── Helpers ──────────────────────────────────── */
  const formatDateTime = (d: string) => new Date(d).toLocaleString("en-IN");

  const typeBadge = (type: "CREDIT" | "DEBIT") =>
    type === "CREDIT" ? (
      <Badge className="bg-green-50 text-green-700 border-green-300">Credit</Badge>
    ) : (
      <Badge className="bg-red-50 text-red-700 border-red-300">Debit</Badge>
    );

  /* ── Fetch Progress Bar (same as payout) ────────── */
  const FetchProgressBar = ({ progress }: { progress: { loaded: number; total: number | null } }) => {
    const pct = progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="w-80 space-y-2">
          {pct !== null ? (
            <>
              <Progress value={pct} className="h-2" />
              <p className="text-sm text-center text-gray-600">
                Loading {progress.loaded.toLocaleString()} of {progress.total?.toLocaleString()} records ({pct}%)
              </p>
            </>
          ) : (
            <p className="text-sm text-center text-gray-600">
              Loading... {progress.loaded.toLocaleString()} records fetched
            </p>
          )}
        </div>
      </div>
    );
  };

  /* ── UI ───────────────────────────────────────── */
  // Initial full-page loader (before any data arrives)
  if (loading && allTransactions.length === 0 && !fetchProgress) {
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Wallet Transactions</h1>
          <p className="text-gray-600 mt-1">
            View your wallet transaction history
            {allTransactions.length > 0 && (
              <span className="ml-2 text-sm font-medium text-primary">
                ({allTransactions.length} total loaded)
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Filters
                {totalCount !== allTransactions.length && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    — showing {totalCount} of {allTransactions.length} transactions
                  </span>
                )}
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <X className="h-4 w-4 mr-1" />Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Search className="h-4 w-4" />Search
                </Label>
                <Input
                  placeholder="Search by ID, reason, remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />From Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />To Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  max={getTodayDate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Show</span>
              <Select
                value={recordsPerPage.toString()}
                onValueChange={(value) => { setRecordsPerPage(Number(value)); setCurrentPage(1); }}
              >
                <SelectTrigger className="h-9 w-20 bg-white"><SelectValue /></SelectTrigger>
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
              <span className="text-sm text-gray-700 font-medium">
                {loading && fetchProgress
                  ? `Fetching… ${fetchProgress.loaded.toLocaleString()}${fetchProgress.total ? ` / ${fetchProgress.total.toLocaleString()}` : ""}`
                  : `Showing ${totalCount > 0 ? indexOfFirstRecord + 1 : 0} to ${indexOfLastRecord} of ${totalCount} entries`}
              </span>
              <div className="flex gap-2">
                <Button onClick={exportToExcel} variant="outline" size="sm" disabled={totalCount === 0 || loading}>
                  <Download className="mr-2 h-4 w-4" />Export Page
                </Button>
                <Button onClick={exportAllToExcel} variant="default" size="sm" disabled={totalCount === 0 || loading} className="paybazaar-gradient text-white">
                  <Download className="mr-2 h-4 w-4" />Export All ({totalCount})
                </Button>
              </div>
            </div>
          </div>

          {/* Table body */}
          <div className="overflow-x-auto">
            {loading && fetchProgress ? (
              // ✅ Show paginated progress bar (same as payout)
              <FetchProgressBar progress={fetchProgress} />
            ) : loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : currentRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-lg font-semibold text-gray-900">No transactions found</p>
                <p className="text-sm text-gray-600">
                  {hasActiveFilters ? "Try adjusting your filters" : "No transactions available"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    {["S.No", "Date & Time", "Transaction ID", "Type", "Reason", "Amount (₹)", "Before Balance", "After Balance", "Remarks"].map((h) => (
                      <TableHead key={h} className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((tx, idx) => (
                    <TableRow
                      key={tx.id}
                      className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
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
                      <TableCell className={`py-3 px-4 text-center font-semibold text-sm whitespace-nowrap ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        ₹{tx.beforeBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                        ₹{tx.afterBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <div className="text-sm text-gray-600">Page {currentPage} of {totalPages} ({totalCount.toLocaleString()} total records)</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={currentPage === pageNum ? "paybazaar-gradient text-white" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}>
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