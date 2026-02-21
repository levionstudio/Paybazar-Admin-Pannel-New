import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2, RefreshCw, Eye, Download, Search, Calendar, Check, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_BASE_URL;

// Match this to your backend's actual records-per-page cap.
// Since the backend returns 100 per call regardless of limit, set this to 100
// so the "partial page = last page" check works correctly.
const BATCH_SIZE = 100;

interface DecodedToken { admin_id: string; exp: number; }
interface User {
  retailer_id: string; retailer_name: string;
  retailer_email?: string; retailer_phone?: string;
  [key: string]: any;
}
interface PayoutTransaction {
  payout_transaction_id: string;
  operator_transaction_id: string | null;
  partner_request_id: string;
  order_id: string | null;
  retailer_id: string;
  retailer_name: string;
  retailer_business_name: string;
  mobile_number: string;
  bank_name: string;
  beneficiary_name: string;
  account_number: string;
  ifsc_code: string;
  amount: number;
  before_balance: number;
  after_balance: number;
  transfer_type: string;
  transaction_status: string;
  admin_commision: number;
  master_distributor_commision: number;
  distributor_commision: number;
  retailer_commision: number;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getTodayDate = () => toLocalDateStr(new Date());
const extractLocalDate = (iso: string) => { try { return toLocalDateStr(new Date(iso)); } catch { return ""; } };

// ─── Core fetch-all: loops through pages until all records are fetched ────────
// Sends both `page` (1-based) and `offset` so it works regardless of which
// param the backend actually reads. Also sends `limit` on every call.
async function fetchAllPaged(
  url: string,
  token: string,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<PayoutTransaction[]> {
  const results: PayoutTransaction[] = [];
  let page = 1;
  let serverTotal: number | null = null;

  while (true) {
    const offset = (page - 1) * BATCH_SIZE;
    const sep = url.includes("?") ? "&" : "?";

    // Send limit + page + offset so backend can use whichever it supports
    const res = await axios.get(
      `${url}${sep}limit=${BATCH_SIZE}&page=${page}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = res.data?.data;
    const batch: PayoutTransaction[] =
      data?.transactions ?? data?.payout_transactions ?? [];

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

    if (batch.length === 0) break;   // backend returned nothing — we're done

    results.push(...batch);
    onProgress?.(results.length, serverTotal);

    // Done if we have all records, or backend returned a partial page (last page)
    if (serverTotal !== null && results.length >= serverTotal) break;
    if (batch.length < BATCH_SIZE) break;

    page++;
  }

  return results;
}

// ─── Component ────────────────────────────────────────────────────────────────
const PayoutTransactionPage = () => {
  const token = localStorage.getItem("authToken") ?? "";
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  // All Transactions
  const [allTransactionsRaw, setAllTransactionsRaw] = useState<PayoutTransaction[]>([]);
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<PayoutTransaction[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allStartDate, setAllStartDate] = useState(getTodayDate());
  const [allEndDate, setAllEndDate] = useState(getTodayDate());
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);
  const [allFetchProgress, setAllFetchProgress] = useState<{ loaded: number; total: number | null } | null>(null);

  // Custom Tab
  const [userTransactionsRaw, setUserTransactionsRaw] = useState<PayoutTransaction[]>([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<PayoutTransaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userStartDate, setUserStartDate] = useState(getTodayDate());
  const [userEndDate, setUserEndDate] = useState(getTodayDate());
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userRecordsPerPage, setUserRecordsPerPage] = useState(10);
  const [userFetchProgress, setUserFetchProgress] = useState<{ loaded: number; total: number | null } | null>(null);

  // Loading / Dialog
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [operatorTxnId, setOperatorTxnId] = useState("");
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ─── Date helpers ────────────────────────────────────────────────────────
  const handleAllStartDate = (val: string) => {
    if (allEndDate && val > allEndDate) { toast.error("Start date cannot be after end date."); return; }
    setAllStartDate(val);
  };
  const handleAllEndDate = (val: string) => {
    if (val > getTodayDate()) { toast.error("End date cannot be in the future."); return; }
    if (allStartDate && val < allStartDate) { toast.error("End date cannot be before start date."); return; }
    setAllEndDate(val);
  };
  const handleUserStartDate = (val: string) => {
    if (userEndDate && val > userEndDate) { toast.error("Start date cannot be after end date."); return; }
    setUserStartDate(val);
  };
  const handleUserEndDate = (val: string) => {
    if (val > getTodayDate()) { toast.error("End date cannot be in the future."); return; }
    if (userStartDate && val < userStartDate) { toast.error("End date cannot be before start date."); return; }
    setUserEndDate(val);
  };

  // ─── Utils ───────────────────────────────────────────────────────────────
  const isRefunded = (s: string) => ["REFUND", "REFUNDED"].includes(s?.toUpperCase());
  const getTransferTypeName = (t: string) => (t === "5" ? "IMPS" : t === "6" ? "NEFT" : t);
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":  return <Badge className="bg-green-50 text-green-700 border-green-300">Success</Badge>;
      case "PENDING":  return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "FAILED":   return <Badge className="bg-red-50 text-red-700 border-red-300">Failed</Badge>;
      case "REFUND":
      case "REFUNDED": return <Badge className="bg-purple-600 text-white">Refunded</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
    }
  };
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  };
  const formatAmount = (v?: number | string | null) => {
    if (v === null || v === undefined || isNaN(Number(v))) return "0.00";
    return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ─── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { toast.error("No authentication token found."); return; }
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("authToken"); return;
      }
      setAdminId(decoded.admin_id);
    } catch { toast.error("Invalid token."); }
  }, [token]);

  // ─── Fetch ALL Retailers (paginated loop for combobox) ──────────────────
  useEffect(() => {
    if (!adminId || !token) return;
    setLoadingUsers(true);

    const fetchAllRetailers = async () => {
      const allRetailers: User[] = [];
      let offset = 0;
      const batchSize = 500;

      try {
        while (true) {
          const res = await axios.get(
            `${API}/retailer/get/admin/${adminId}?limit=${batchSize}&offset=${offset}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const batch: User[] = res.data?.data?.retailers || [];
          const serverTotal: number | null = res.data?.data?.total ?? res.data?.data?.total_count ?? null;

          if (batch.length === 0) break;
          allRetailers.push(...batch);
          offset += batch.length;

          // Stop if we have all records or got less than requested (last page)
          if (serverTotal !== null && allRetailers.length >= serverTotal) break;
          if (batch.length < batchSize) break;
        }

        setUsers(allRetailers);
        if (allRetailers.length > 0) {
          toast.success(`Loaded ${allRetailers.length} retailers`);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to fetch retailers");
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAllRetailers();
  }, [adminId, token]);

  // ─── Fetch ALL payout transactions (paginated loop) ──────────────────────
  const fetchAllTransactions = useCallback(async () => {
    if (!token) { toast.error("Authentication required"); return; }
    setLoadingAllTransactions(true);
    setAllFetchProgress({ loaded: 0, total: null });
    try {
      const all = await fetchAllPaged(
        `${API}/payout/get/all`,
        token,
        (loaded, total) => setAllFetchProgress({ loaded, total })
      );
      const sorted = all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllTransactionsRaw(sorted);
      toast.success(`Loaded ${sorted.length} transactions`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch transactions");
      setAllTransactionsRaw([]);
    } finally {
      setLoadingAllTransactions(false);
      setAllFetchProgress(null);
    }
  }, [token]);

  useEffect(() => { if (token) fetchAllTransactions(); }, [token, fetchAllTransactions]);

  // ─── Fetch user-specific transactions (paginated loop) ──────────────────
  const fetchUserTransactions = useCallback(async () => {
    if (!selectedUserId || !token) return;
    setLoadingUserTransactions(true);
    setUserFetchProgress({ loaded: 0, total: null });
    try {
      const all = await fetchAllPaged(
        `${API}/payout/get/${selectedUserId}`,
        token,
        (loaded, total) => setUserFetchProgress({ loaded, total })
      );
      const sorted = all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setUserTransactionsRaw(sorted);
      toast.success(`Loaded ${sorted.length} transactions`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch transactions");
      setUserTransactionsRaw([]);
    } finally {
      setLoadingUserTransactions(false);
      setUserFetchProgress(null);
    }
  }, [selectedUserId, token]);

  useEffect(() => {
    if (selectedUserId && token) fetchUserTransactions();
    else { setUserTransactionsRaw([]); setFilteredUserTransactions([]); }
  }, [selectedUserId, token, fetchUserTransactions]);

  // ─── Frontend filtering ──────────────────────────────────────────────────
  const applyFilters = (
    raw: PayoutTransaction[], startDate: string, endDate: string,
    statusFilter: string, searchTerm: string
  ) => {
    let filtered = [...raw];
    if (startDate || endDate) {
      const start = startDate || "1900-01-01";
      const end   = endDate   || "2100-12-31";
      filtered = filtered.filter((t) => { const d = extractLocalDate(t.created_at); return d >= start && d <= end; });
    }
    if (statusFilter && statusFilter !== "ALL") {
      filtered = filtered.filter((t) => t.transaction_status?.toUpperCase() === statusFilter.toUpperCase());
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.order_id?.toLowerCase().includes(s)) ||
        t.mobile_number.includes(s) ||
        t.beneficiary_name.toLowerCase().includes(s) ||
        t.account_number.includes(s) ||
        (t.operator_transaction_id?.toLowerCase().includes(s)) ||
        t.retailer_name.toLowerCase().includes(s)
      );
    }
    return filtered;
  };

  useEffect(() => {
    setFilteredAllTransactions(applyFilters(allTransactionsRaw, allStartDate, allEndDate, allStatusFilter, allSearchTerm));
    setAllCurrentPage(1);
  }, [allTransactionsRaw, allStartDate, allEndDate, allStatusFilter, allSearchTerm]);

  useEffect(() => {
    setFilteredUserTransactions(applyFilters(userTransactionsRaw, userStartDate, userEndDate, userStatusFilter, userSearchTerm));
    setUserCurrentPage(1);
  }, [userTransactionsRaw, userStartDate, userEndDate, userStatusFilter, userSearchTerm]);

  // ─── Clear filters ───────────────────────────────────────────────────────
  const clearAllFilters = () => { setAllSearchTerm(""); setAllStatusFilter("ALL"); setAllStartDate(getTodayDate()); setAllEndDate(getTodayDate()); setAllCurrentPage(1); toast.success("Filters cleared"); };
  const clearUserFilters = () => { setUserSearchTerm(""); setUserStatusFilter("ALL"); setUserStartDate(getTodayDate()); setUserEndDate(getTodayDate()); setUserCurrentPage(1); toast.success("Filters cleared"); };

  // ─── Refund ──────────────────────────────────────────────────────────────
  const handleOpenRefund = (tx: PayoutTransaction) => {
    if (isRefunded(tx.transaction_status)) { toast.error("Already refunded"); return; }
    setSelectedTransaction(tx); setRefundConfirmOpen(true);
  };
  const handleRefund = async () => {
    if (!selectedTransaction || !token) return;
    setRefunding(true);
    try {
      await axios.put(`${API}/payout/refund/${selectedTransaction.payout_transaction_id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Payout refunded successfully");
      const updater = (prev: PayoutTransaction[]) =>
        prev.map((tx) => tx.payout_transaction_id === selectedTransaction.payout_transaction_id ? { ...tx, transaction_status: "REFUNDED" } : tx);
      setAllTransactionsRaw(updater); setUserTransactionsRaw(updater);
      setSelectedTransaction((p) => p ? { ...p, transaction_status: "REFUNDED" } : null);
      setRefundConfirmOpen(false); setDetailsOpen(false);
    } catch (err: any) { toast.error(err.response?.data?.message || "Refund failed"); }
    finally { setRefunding(false); }
  };

  // ─── Update status ───────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: "SUCCESS" | "FAILED" | "PENDING") => {
    if (!selectedTransaction || !token) return;
    setUpdatingStatus(true);
    try {
      const res = await axios.post(`${API}/admin/update/payout/request`,
        { payout_transaction_id: selectedTransaction.payout_transaction_id, status: newStatus, operator_transaction_id: operatorTxnId.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (res.status === 200 && res.data?.status === "success") {
        toast.success(`Status updated to ${newStatus}`);
        setOperatorTxnId(""); setDetailsOpen(false);
        fetchAllTransactions(); if (selectedUserId) fetchUserTransactions();
      } else { toast.error(res.data?.message || "Failed to update status"); }
    } catch (err: any) { toast.error(err.response?.data?.message || "Failed to update status"); }
    finally { setUpdatingStatus(false); }
  };

  // ─── Export ──────────────────────────────────────────────────────────────
  const exportToExcel = (isUserData: boolean) => {
    const allData = isUserData ? filteredUserTransactions : filteredAllTransactions;
    if (!allData.length) { toast.error("No transactions to export"); return; }
    const num = (v?: number | null) => (typeof v === "number" && !isNaN(v) ? v : 0);
    const data = allData.map((t, i) => ({
      "S.No": i + 1, "Date & Time": formatDate(t.created_at),
      "Order ID": t.order_id || "-", "Transaction ID": t.operator_transaction_id || "-",
      "Retailer ID": t.retailer_id, "Retailer Name": t.retailer_name, "Business": t.retailer_business_name,
      "Mobile": t.mobile_number, "Beneficiary Name": t.beneficiary_name, "Bank": t.bank_name,
      "Account Number": t.account_number, "IFSC": t.ifsc_code,
      "Amount (₹)": num(t.amount).toFixed(2), "Before Balance (₹)": num(t.before_balance).toFixed(2),
      "After Balance (₹)": num(t.after_balance).toFixed(2), "Transfer Type": getTransferTypeName(t.transfer_type),
      "Status": t.transaction_status, "Admin Commission": num(t.admin_commision).toFixed(2),
      "MD Commission": num(t.master_distributor_commision).toFixed(2),
      "Distributor Commission": num(t.distributor_commision).toFixed(2),
      "Retailer Commission": num(t.retailer_commision).toFixed(2),
    }));
    const summaryRow = {
      "S.No": "", "Date & Time": "", "Order ID": "TOTAL", "Transaction ID": "", "Retailer ID": "",
      "Retailer Name": "", "Business": "", "Mobile": "", "Beneficiary Name": "", "Bank": "",
      "Account Number": "", "IFSC": "",
      "Amount (₹)": allData.reduce((s, t) => s + num(t.amount), 0).toFixed(2),
      "Before Balance (₹)": allData.reduce((s, t) => s + num(t.before_balance), 0).toFixed(2),
      "After Balance (₹)": allData.reduce((s, t) => s + num(t.after_balance), 0).toFixed(2),
      "Transfer Type": "", "Status": "",
      "Admin Commission": allData.reduce((s, t) => s + num(t.admin_commision), 0).toFixed(2),
      "MD Commission": allData.reduce((s, t) => s + num(t.master_distributor_commision), 0).toFixed(2),
      "Distributor Commission": allData.reduce((s, t) => s + num(t.distributor_commision), 0).toFixed(2),
      "Retailer Commission": allData.reduce((s, t) => s + num(t.retailer_commision), 0).toFixed(2),
    };
    const ws = XLSX.utils.json_to_sheet([...data, summaryRow]);
    ws["!cols"] = [{wch:6},{wch:18},{wch:20},{wch:25},{wch:15},{wch:20},{wch:20},{wch:14},{wch:22},{wch:18},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:12},{wch:18},{wch:18},{wch:18},{wch:18}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, isUserData ? `Retailer_${selectedUserId}_Transactions_${getTodayDate()}.xlsx` : `All_Payout_Transactions_${getTodayDate()}.xlsx`);
    toast.success(`Exported ${allData.length} transactions`);
  };

  // ─── Fetch Progress Bar ──────────────────────────────────────────────────
  const FetchProgress = ({ progress }: { progress: { loaded: number; total: number | null } }) => {
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

  // ─── Table renderer ──────────────────────────────────────────────────────
  const renderTransactionTable = (
    transactions: PayoutTransaction[], currentPage: number, recordsPerPage: number,
    setCurrentPage: (p: number) => void, loading: boolean,
    fetchProgress: { loaded: number; total: number | null } | null
  ) => {
    if (loading) return fetchProgress ? <FetchProgress progress={fetchProgress} /> : <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!transactions.length) return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-semibold text-gray-900">No transactions found</p>
        <p className="text-sm text-gray-600">Try adjusting your filters</p>
      </div>
    );

    const totalPages = Math.ceil(transactions.length / recordsPerPage);
    const start = (currentPage - 1) * recordsPerPage;
    const paginated = transactions.slice(start, start + recordsPerPage);

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                {["Date & Time","Transaction ID","Mobile","Beneficiary","Amount (₹)","Before Balance (₹)","After Balance (₹)","Status","Actions","Refund"].map((h) => (
                  <TableHead key={h} className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((tx, idx) => (
                <TableRow key={tx.payout_transaction_id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                  <TableCell className="py-3 px-4 text-center text-sm whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs whitespace-nowrap">{tx.operator_transaction_id || "-"}</TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm">{tx.mobile_number}</TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm">{tx.beneficiary_name}</TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">₹{formatAmount(tx.amount)}</TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">₹{formatAmount(tx.before_balance)}</TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">₹{formatAmount(tx.after_balance)}</TableCell>
                  <TableCell className="py-3 px-4 text-center whitespace-nowrap">{getStatusBadge(tx.transaction_status)}</TableCell>
                  <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTransaction(tx); setOperatorTxnId(tx.operator_transaction_id || ""); setDetailsOpen(true); }}>
                      <Eye className="w-4 h-4 mr-1" /> Details
                    </Button>
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {isRefunded(tx.transaction_status) ? (
                      <Button size="sm" variant="outline" disabled className="cursor-not-allowed opacity-50">Refunded</Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => handleOpenRefund(tx)}>Refund</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
            <div className="text-sm text-gray-600">Page {currentPage} of {totalPages} ({transactions.length.toLocaleString()} total records)</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (currentPage <= 3) p = i + 1;
                  else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = currentPage - 2 + i;
                  return (
                    <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p)}>{p}</Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
          </div>
        )}
      </>
    );
  };

  // ─── Filter card ─────────────────────────────────────────────────────────
  const renderFilterCard = (
    startDate: string, setStart: (v: string) => void,
    endDate: string,   setEnd: (v: string) => void,
    statusFilter: string, setStatus: (v: string) => void,
    searchTerm: string, setSearch: (v: string) => void,
    onClear: () => void, hasActive: boolean
  ) => (
    <Card className="shadow-md">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Filters</h3>
          {hasActive && (
            <Button onClick={onClear} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Clear Filters</Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1"><Calendar className="h-4 w-4" /> Start Date</Label>
            <Input type="date" value={startDate} max={endDate || getTodayDate()} onChange={(e) => setStart(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1"><Calendar className="h-4 w-4" /> End Date</Label>
            <Input type="date" value={endDate} min={startDate} max={getTodayDate()} onChange={(e) => setEnd(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUND">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1"><Search className="h-4 w-4" /> Search</Label>
            <Input placeholder="Order ID, phone, name, account..." value={searchTerm} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
          </div>
        </div>
        {(startDate || endDate || statusFilter !== "ALL" || searchTerm) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {startDate && <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">From: {startDate}</Badge>}
            {endDate   && <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">To: {endDate}</Badge>}
            {statusFilter !== "ALL" && <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">Status: {statusFilter}</Badge>}
            {searchTerm && <Badge variant="outline" className="text-xs text-gray-700 border-gray-300">Search: "{searchTerm}"</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ─── Table card ──────────────────────────────────────────────────────────
  const renderTableCard = (
    filtered: PayoutTransaction[], currentPage: number, setPage: (p: number) => void,
    recordsPerPage: number, setRecordsPerPage: (n: number) => void,
    loading: boolean, fetchProgress: { loaded: number; total: number | null } | null,
    onRefresh: () => void, isUserData: boolean
  ) => (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Show</span>
            <Select value={recordsPerPage.toString()} onValueChange={(v) => { setRecordsPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-9 w-20 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{[10,25,50,100].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-sm font-medium text-gray-700">entries</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">
              {loading && fetchProgress
                ? `Fetching… ${fetchProgress.loaded.toLocaleString()}${fetchProgress.total ? ` / ${fetchProgress.total.toLocaleString()}` : ""}`
                : `${filtered.length.toLocaleString()} transactions`}
            </span>
            <Button onClick={() => exportToExcel(isUserData)} variant="outline" size="sm" disabled={loading || !filtered.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
        {renderTransactionTable(filtered, currentPage, recordsPerPage, setPage, loading, fetchProgress)}
      </CardContent>
    </Card>
  );

  // loadingUsers no longer blocks the whole page — the combobox button handles its own loading state

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payout Transactions</h1>
        <p className="text-gray-600 mt-1">View and manage payout transaction history</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="custom">Custom (By Retailer)</TabsTrigger>
        </TabsList>

        {/* All Transactions */}
        <TabsContent value="all" className="space-y-6">
          {renderFilterCard(
            allStartDate, handleAllStartDate, allEndDate, handleAllEndDate,
            allStatusFilter, setAllStatusFilter, allSearchTerm, setAllSearchTerm,
            clearAllFilters,
            !!(allSearchTerm || allStatusFilter !== "ALL" || allStartDate !== getTodayDate() || allEndDate !== getTodayDate())
          )}
          {renderTableCard(
            filteredAllTransactions, allCurrentPage, setAllCurrentPage,
            allRecordsPerPage, setAllRecordsPerPage,
            loadingAllTransactions, allFetchProgress,
            fetchAllTransactions, false
          )}
        </TabsContent>

        {/* By Retailer */}
        <TabsContent value="custom" className="space-y-6">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  Select Retailer
                  {loadingUsers && <span className="text-xs font-normal text-gray-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading retailers...</span>}
                  {!loadingUsers && users.length > 0 && <span className="text-xs font-normal text-gray-500">({users.length} retailers loaded)</span>}
                </Label>
                <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline" role="combobox"
                      aria-expanded={openUserCombobox}
                      disabled={loadingUsers}
                      className="w-full justify-between"
                    >
                      {loadingUsers
                        ? <span className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading all retailers...</span>
                        : selectedUserId
                          ? users.find((u) => u.retailer_id === selectedUserId)?.retailer_name
                          : "Select retailer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder={`Search among ${users.length} retailers...`} />
                      <CommandEmpty>No retailer found.</CommandEmpty>
                      <CommandGroup className="max-h-72 overflow-auto">
                        {users.map((user) => (
                          <CommandItem key={user.retailer_id} value={`${user.retailer_name} ${user.retailer_id} ${user.retailer_phone ?? ""}`}
                            onSelect={() => { setSelectedUserId(user.retailer_id); setOpenUserCombobox(false); setUserCurrentPage(1); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedUserId === user.retailer_id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{user.retailer_name}</span>
                              <span className="text-xs text-gray-500">{user.retailer_phone && `${user.retailer_phone} • `}{user.retailer_id}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {selectedUserId && (
            <>
              {renderFilterCard(
                userStartDate, handleUserStartDate, userEndDate, handleUserEndDate,
                userStatusFilter, setUserStatusFilter, userSearchTerm, setUserSearchTerm,
                clearUserFilters,
                !!(userSearchTerm || userStatusFilter !== "ALL" || userStartDate !== getTodayDate() || userEndDate !== getTodayDate())
              )}
              {renderTableCard(
                filteredUserTransactions, userCurrentPage, setUserCurrentPage,
                userRecordsPerPage, setUserRecordsPerPage,
                loadingUserTransactions, userFetchProgress,
                fetchUserTransactions, true
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label className="text-gray-600 text-xs">Payout Transaction ID</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.payout_transaction_id}</p></div>
                <div><Label className="text-gray-600 text-xs">Order ID</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.order_id || "-"}</p></div>
                <div><Label className="text-gray-600 text-xs">Partner Request ID</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.partner_request_id}</p></div>
                {selectedTransaction.operator_transaction_id && (
                  <div className="col-span-2"><Label className="text-gray-600 text-xs">Operator Transaction ID</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.operator_transaction_id}</p></div>
                )}
                <div><Label className="text-gray-600 text-xs">Retailer Name</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.retailer_name}</p></div>
                <div><Label className="text-gray-600 text-xs">Business Name</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.retailer_business_name}</p></div>
                <div><Label className="text-gray-600 text-xs">Retailer ID</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.retailer_id}</p></div>
                <div><Label className="text-gray-600 text-xs">Mobile Number</Label><p className="font-medium mt-1">{selectedTransaction.mobile_number}</p></div>
                <div><Label className="text-gray-600 text-xs">Beneficiary Name</Label><p className="font-medium mt-1">{selectedTransaction.beneficiary_name}</p></div>
                <div><Label className="text-gray-600 text-xs">Bank Name</Label><p className="font-medium mt-1">{selectedTransaction.bank_name}</p></div>
                <div><Label className="text-gray-600 text-xs">Account Number</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.account_number}</p></div>
                <div><Label className="text-gray-600 text-xs">IFSC Code</Label><p className="font-mono text-sm font-medium mt-1">{selectedTransaction.ifsc_code}</p></div>
                <div><Label className="text-gray-600 text-xs">Transfer Type</Label><p className="font-medium mt-1">{getTransferTypeName(selectedTransaction.transfer_type)}</p></div>
                <div><Label className="text-gray-600 text-xs">Amount</Label><p className="font-semibold text-lg mt-1 text-green-600">₹{formatAmount(selectedTransaction.amount)}</p></div>
                <div><Label className="text-gray-600 text-xs">Before Balance</Label><p className="font-semibold mt-1">₹{formatAmount(selectedTransaction.before_balance)}</p></div>
                <div><Label className="text-gray-600 text-xs">After Balance</Label><p className="font-semibold mt-1">₹{formatAmount(selectedTransaction.after_balance)}</p></div>
                <div><Label className="text-gray-600 text-xs">Status</Label><div className="mt-1">{getStatusBadge(selectedTransaction.transaction_status)}</div></div>
                <div><Label className="text-gray-600 text-xs">Admin Commission</Label><p className="font-medium mt-1">₹{formatAmount(selectedTransaction.admin_commision)}</p></div>
                <div><Label className="text-gray-600 text-xs">MD Commission</Label><p className="font-medium mt-1">₹{formatAmount(selectedTransaction.master_distributor_commision)}</p></div>
                <div><Label className="text-gray-600 text-xs">Distributor Commission</Label><p className="font-medium mt-1">₹{formatAmount(selectedTransaction.distributor_commision)}</p></div>
                <div><Label className="text-gray-600 text-xs">Retailer Commission</Label><p className="font-medium mt-1">₹{formatAmount(selectedTransaction.retailer_commision)}</p></div>
                <div><Label className="text-gray-600 text-xs">Created At</Label><p className="font-medium mt-1">{formatDate(selectedTransaction.created_at)}</p></div>
                <div><Label className="text-gray-600 text-xs">Updated At</Label><p className="font-medium mt-1">{formatDate(selectedTransaction.updated_at)}</p></div>
              </div>

              {/* Update Status section */}
              {!isRefunded(selectedTransaction.transaction_status) && (
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold">Update Status</Label>
                  <Input
                    placeholder="Operator Transaction ID (optional)"
                    value={operatorTxnId}
                    onChange={(e) => setOperatorTxnId(e.target.value)}
                    className="bg-white"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => handleUpdateStatus("SUCCESS")} disabled={updatingStatus} className="bg-green-600 hover:bg-green-700 text-white">
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Success"}
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateStatus("FAILED")} disabled={updatingStatus} variant="destructive">
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Failed"}
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateStatus("PENDING")} disabled={updatingStatus} variant="outline">
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Pending"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Confirm Dialog */}
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Refund</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to refund this payout?</p>
            <div className="bg-gray-50 border rounded p-3 space-y-1 text-sm">
              <div><b>Retailer:</b> {selectedTransaction?.retailer_name}</div>
              <div><b>Amount:</b> ₹{formatAmount(selectedTransaction?.amount)}</div>
              <div><b>Payout ID:</b> {selectedTransaction?.payout_transaction_id}</div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRefundConfirmOpen(false)} disabled={refunding}>Cancel</Button>
              <Button variant="destructive" onClick={handleRefund} disabled={refunding}>
                {refunding ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Refunding...</> : "Yes, Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutTransactionPage;