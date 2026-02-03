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
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, RefreshCw, Eye, CheckCircle, XCircle, Download, Search, Calendar, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface User {
  retailer_id: string;
  retailer_name: string;
  retailer_email?: string;
  retailer_phone?: string;
  [key: string]: any;
}

// ✅ CORRECTED: Matches Go backend GetAllPayoutTransactionsResponseModel
interface PayoutTransaction {
  payout_transaction_id: string;
  operator_transaction_id: string | null;
  partner_request_id: string;
  order_id: string | null;
  retailer_id: string;
  retailer_name: string;
  retailer_business_name: string;
  mobile_number: string;
  bank_name: string;  // ✅ Changed from beneficiary_bank_name
  beneficiary_name: string;
  account_number: string;  // ✅ Changed from beneficiary_account_number
  ifsc_code: string;  // ✅ Changed from beneficiary_ifsc_code
  amount: number;
  before_balance: number;
  after_balance: number;
  transfer_type: string;
  transaction_status: string;  // ✅ Changed from payout_transaction_status
  admin_commision: number;
  master_distributor_commision: number;
  distributor_commision: number;
  retailer_commision: number;
  created_at: string;
  updated_at: string;
}

const PayoutTransactionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  // All Transactions - Raw data from API
  const [allTransactionsRaw, setAllTransactionsRaw] = useState<PayoutTransaction[]>([]);
  // All Transactions - Filtered data
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<PayoutTransaction[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allStartDate, setAllStartDate] = useState(getTodayDate());
  const [allEndDate, setAllEndDate] = useState(getTodayDate());
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);
  
  // Custom Tab - Raw data from API
  const [userTransactionsRaw, setUserTransactionsRaw] = useState<PayoutTransaction[]>([]);
  // Custom Tab - Filtered data
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<PayoutTransaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userStartDate, setUserStartDate] = useState(getTodayDate());
  const [userEndDate, setUserEndDate] = useState(getTodayDate());
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userRecordsPerPage, setUserRecordsPerPage] = useState(10);
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [operatorTxnId, setOperatorTxnId] = useState("");

  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
const [refunding, setRefunding] = useState(false);

  const isRefunded = (status: string) =>
  ["REFUND", "REFUNDED"].includes(status?.toUpperCase());


  // Helper function to format transfer type
  const getTransferTypeName = (transferType: string) => {
    switch (transferType) {
      case "5":
        return "IMPS";
      case "6":
        return "NEFT";
      default:
        return transferType;
    }
  };

  // Decode token
  useEffect(() => {
    if (!token) {
      toast.error("No authentication token found. Please login.");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      
      if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("authToken");
        return;
      }
      
      setAdminId(decoded.admin_id);
    } catch (error) {
      toast.error("Invalid token. Please login again.");
    }
  }, [token]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminId || !token) {
        return;
      }

      setLoadingUsers(true);
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/retailer/get/admin/${adminId}?limit=10000&page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "success" && response.data.data) {
          const usersList = response.data.data.retailers || [];
          setUsers(usersList);
        } else {
          setUsers([]);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to fetch retailers");
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [adminId, token]);


  const handleOpenRefund = (tx: PayoutTransaction) => {
  if (isRefunded(tx.transaction_status)) {
    toast.error("This transaction is already refunded");
    return;
  }

  setSelectedTransaction(tx);
  setRefundConfirmOpen(true);
};
const handleRefund = async () => {
  if (!selectedTransaction || !token) {
    toast.error("Missing transaction data");
    return;
  }

  if (isRefunded(selectedTransaction.transaction_status)) {
    toast.error("This transaction is already refunded");
    return;
  }

  setRefunding(true);

  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}/payout/refund/${selectedTransaction.payout_transaction_id}`;

    console.log("🔄 Refunding payout:", selectedTransaction.payout_transaction_id);

    await axios.put(
      url,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    toast.success("Payout refunded successfully");

    // 🔥 Update UI instantly
    setAllTransactionsRaw(prev =>
      prev.map(tx =>
        tx.payout_transaction_id === selectedTransaction.payout_transaction_id
          ? { ...tx, transaction_status: "REFUNDED" }
          : tx
      )
    );

    setUserTransactionsRaw(prev =>
      prev.map(tx =>
        tx.payout_transaction_id === selectedTransaction.payout_transaction_id
          ? { ...tx, transaction_status: "REFUNDED" }
          : tx
      )
    );

    setSelectedTransaction(prev =>
      prev ? { ...prev, transaction_status: "REFUNDED" } : null
    );

    setRefundConfirmOpen(false);
    setDetailsOpen(false);
  } catch (error: any) {
    console.error("❌ Payout refund failed", error);
    toast.error(error.response?.data?.message || "Refund failed");
  } finally {
    setRefunding(false);
  }
};

  // Fetch all transactions (no filters in API)
const fetchAllTransactions = useCallback(async () => {
  if (!token) {
    console.warn("⚠️ fetchAllTransactions skipped: missing token");
    toast.error("Authentication required");
    return;
  }

  setLoadingAllTransactions(true);

  console.log("➡️ Fetching ALL payout transactions", {
    url: `${import.meta.env.VITE_API_BASE_URL}/payout/get/all`,
  });

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/payout/get/all`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("📦 ALL TRANSACTIONS RAW RESPONSE:", response.data);

    // Backend returns "transactions"
    const list: PayoutTransaction[] =
      response.data?.data?.transactions || [];

    console.log("📄 ALL TRANSACTIONS LIST:", list);

    const sorted = list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    console.log("📊 ALL TRANSACTIONS SORTED:", sorted);

    // 🔍 Validate balances & commissions
    sorted.forEach((tx, index) => {
      if (
        tx.before_balance === undefined ||
        tx.after_balance === undefined
      ) {
        console.warn("⚠️ Missing balance fields", {
          index,
          payout_transaction_id: tx.payout_transaction_id,
          before_balance: tx.before_balance,
          after_balance: tx.after_balance,
        });
      }

      if (
        tx.admin_commision === undefined ||
        tx.retailer_commision === undefined
      ) {
        console.warn("⚠️ Missing commission fields", {
          index,
          payout_transaction_id: tx.payout_transaction_id,
          admin_commision: tx.admin_commision,
          retailer_commision: tx.retailer_commision,
        });
      }
    });

    setAllTransactionsRaw(sorted);
    toast.success(`Loaded ${sorted.length} transactions`);
  } catch (error: any) {
    console.error("❌ ERROR FETCHING ALL TRANSACTIONS:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch transactions"
    );
    setAllTransactionsRaw([]);
  } finally {
    setLoadingAllTransactions(false);
    console.log("✅ fetchAllTransactions completed");
  }
}, [token]);


  // ✅ FETCH ALL TRANSACTIONS ON PAGE LOAD
  useEffect(() => {
    if (token) {
      fetchAllTransactions();
    }
  }, [token, fetchAllTransactions]);

  // Fetch transactions for selected user (no filters in API)
const fetchUserTransactions = useCallback(async () => {
  if (!selectedUserId || !token) {
    console.warn("⚠️ fetchUserTransactions skipped", {
      selectedUserId,
      hasToken: !!token,
    });
    return;
  }

  setLoadingUserTransactions(true);

  console.log("➡️ Fetching USER transactions", {
    selectedUserId,
    url: `${import.meta.env.VITE_API_BASE_URL}/payout/get/${selectedUserId}`,
  });

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/payout/get/${selectedUserId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("📦 USER TRANSACTIONS RAW RESPONSE:", response.data);

    const list: PayoutTransaction[] =
      response.data?.data?.transactions || [];

    console.log("📄 USER TRANSACTIONS LIST:", list);

    const sorted = list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    console.log("📊 USER TRANSACTIONS SORTED:", sorted);

    // Optional: detect missing balances / commissions
    sorted.forEach((tx, index) => {
      if (
        tx.before_balance === undefined ||
        tx.after_balance === undefined
      ) {
        console.warn("⚠️ Missing balance fields", {
          index,
          payout_transaction_id: tx.payout_transaction_id,
          before_balance: tx.before_balance,
          after_balance: tx.after_balance,
        });
      }

      if (
        tx.admin_commision === undefined ||
        tx.retailer_commision === undefined
      ) {
        console.warn("⚠️ Missing commission fields", {
          index,
          payout_transaction_id: tx.payout_transaction_id,
          admin_commision: tx.admin_commision,
          retailer_commision: tx.retailer_commision,
        });
      }
    });

    setUserTransactionsRaw(sorted);
    toast.success(`Loaded ${sorted.length} transactions`);
  } catch (error: any) {
    console.error("❌ ERROR FETCHING USER TRANSACTIONS:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch transactions"
    );
    setUserTransactionsRaw([]);
  } finally {
    setLoadingUserTransactions(false);
    console.log("✅ fetchUserTransactions completed");
  }
}, [selectedUserId, token]);


  // Effect for fetching user transactions when user changes
  useEffect(() => {
    if (selectedUserId && token) {
      fetchUserTransactions();
    } else {
      setUserTransactionsRaw([]);
      setFilteredUserTransactions([]);
    }
  }, [selectedUserId, token, fetchUserTransactions]);

  // Apply ALL filters for All Transactions (date, status, search)
  useEffect(() => {
    let filtered = [...allTransactionsRaw];

    // Date range filter
    if (allStartDate || allEndDate) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.created_at);
        const txDateStr = txDate.toISOString().split('T')[0];
        
        const start = allStartDate || "1900-01-01";
        const end = allEndDate || "2100-12-31";
        
        return txDateStr >= start && txDateStr <= end;
      });
    }

    // Status filter - ✅ Changed to transaction_status
    if (allStatusFilter && allStatusFilter !== "ALL") {
      filtered = filtered.filter((t) => 
        t.transaction_status.toUpperCase() === allStatusFilter.toUpperCase()
      );
    }

    // Search filter
    if (allSearchTerm.trim()) {
      const s = allSearchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.order_id && t.order_id.toLowerCase().includes(s)) ||
        t.mobile_number.includes(s) ||
        t.beneficiary_name.toLowerCase().includes(s) ||
        t.account_number.includes(s) ||
        (t.operator_transaction_id && t.operator_transaction_id.toLowerCase().includes(s))
      );
    }

    setFilteredAllTransactions(filtered);
    setAllCurrentPage(1);
  }, [allTransactionsRaw, allStartDate, allEndDate, allStatusFilter, allSearchTerm]);

  // Apply ALL filters for User Transactions (date, status, search)
  useEffect(() => {
    let filtered = [...userTransactionsRaw];

    // Date range filter
    if (userStartDate || userEndDate) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.created_at);
        const txDateStr = txDate.toISOString().split('T')[0];
        
        const start = userStartDate || "1900-01-01";
        const end = userEndDate || "2100-12-31";
        
        return txDateStr >= start && txDateStr <= end;
      });
    }

    // Status filter - ✅ Changed to transaction_status
    if (userStatusFilter && userStatusFilter !== "ALL") {
      filtered = filtered.filter((t) => 
        t.transaction_status.toUpperCase() === userStatusFilter.toUpperCase()
      );
    }

    // Search filter
    if (userSearchTerm.trim()) {
      const s = userSearchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        (t.order_id && t.order_id.toLowerCase().includes(s)) ||
        t.mobile_number.includes(s) ||
        t.beneficiary_name.toLowerCase().includes(s) ||
        t.account_number.includes(s) ||
        (t.operator_transaction_id && t.operator_transaction_id.toLowerCase().includes(s))
      );
    }

    setFilteredUserTransactions(filtered);
    setUserCurrentPage(1);
  }, [userTransactionsRaw, userStartDate, userEndDate, userStatusFilter, userSearchTerm]);

  // Clear filters
  const clearAllFilters = () => {
    setAllSearchTerm("");
    setAllStatusFilter("ALL");
    setAllStartDate(getTodayDate());
    setAllEndDate(getTodayDate());
    setAllCurrentPage(1);
    toast.success("All filters cleared");
  };

  const clearUserFilters = () => {
    setUserSearchTerm("");
    setUserStatusFilter("ALL");
    setUserStartDate(getTodayDate());
    setUserEndDate(getTodayDate());
    setUserCurrentPage(1);
    toast.success("All filters cleared");
  };

  // Export to Excel
const exportToExcel = async (isUserData: boolean) => {
  try {
    const allData = isUserData
      ? filteredUserTransactions
      : filteredAllTransactions;

    console.log("📤 EXPORT INIT", {
      isUserData,
      records: allData.length,
    });

    if (allData.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    // Helper for safe numbers
    const num = (v?: number | null) =>
      typeof v === "number" && !isNaN(v) ? v : 0;

    const data = allData.map((t, i) => ({
      "S.No": i + 1,
      "Date & Time": formatDate(t.created_at),
      "Order ID": t.order_id || "-",
      "Transaction ID": t.operator_transaction_id || "-",
      "Retailer ID": t.retailer_id || "-",
      "Retailer Name": t.retailer_name || "-",
      "Business": t.retailer_business_name || "-",
      "Mobile": t.mobile_number || "-",
      "Beneficiary Name": t.beneficiary_name || "-",
      "Bank": t.bank_name || "-",
      "Account Number": t.account_number || "-",
      "IFSC": t.ifsc_code || "-",
      "Amount (₹)": num(t.amount).toFixed(2),
      "Before Balance (₹)": num(t.before_balance).toFixed(2),
      "After Balance (₹)": num(t.after_balance).toFixed(2),
      "Transfer Type": getTransferTypeName(t.transfer_type),
      "Status": t.transaction_status,
      "Admin Commission": num(t.admin_commision).toFixed(2),
      "MD Commission": num(t.master_distributor_commision).toFixed(2),
      "Distributor Commission": num(t.distributor_commision).toFixed(2),
      "Retailer Commission": num(t.retailer_commision).toFixed(2),
    }));

    console.log("📄 EXPORT ROW SAMPLE", data[0]);

    // Totals
    const totalAmount = allData.reduce((s, t) => s + num(t.amount), 0);
    const totalBeforeBal = allData.reduce((s, t) => s + num(t.before_balance), 0);
    const totalAfterBal = allData.reduce((s, t) => s + num(t.after_balance), 0);
    const totalAdminComm = allData.reduce((s, t) => s + num(t.admin_commision), 0);
    const totalMDComm = allData.reduce((s, t) => s + num(t.master_distributor_commision), 0);
    const totalDistComm = allData.reduce((s, t) => s + num(t.distributor_commision), 0);
    const totalRetailerComm = allData.reduce((s, t) => s + num(t.retailer_commision), 0);

    const summaryRow = {
      "S.No": "",
      "Date & Time": "",
      "Order ID": "TOTAL",
      "Transaction ID": "",
      "Retailer ID": "",
      "Retailer Name": "",
      "Business": "",
      "Mobile": "",
      "Beneficiary Name": "",
      "Bank": "",
      "Account Number": "",
      "IFSC": "",
      "Amount (₹)": totalAmount.toFixed(2),
      "Before Balance (₹)": totalBeforeBal.toFixed(2),
      "After Balance (₹)": totalAfterBal.toFixed(2),
      "Transfer Type": "",
      "Status": "",
      "Admin Commission": totalAdminComm.toFixed(2),
      "MD Commission": totalMDComm.toFixed(2),
      "Distributor Commission": totalDistComm.toFixed(2),
      "Retailer Commission": totalRetailerComm.toFixed(2),
    };

    const finalData = [...data, summaryRow];

    const ws = XLSX.utils.json_to_sheet(finalData);

    ws["!cols"] = [
      { wch: 6 },  { wch: 18 }, { wch: 20 }, { wch: 25 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
      { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    const date = new Date().toISOString().slice(0, 10);
    const filename = isUserData
      ? `Retailer_${selectedUserId}_Transactions_${date}.xlsx`
      : `All_Payout_Transactions_${date}.xlsx`;

    XLSX.writeFile(wb, filename);

    console.log("✅ EXPORT COMPLETE", {
      filename,
      rows: finalData.length,
    });

    toast.success(`Exported ${allData.length} transactions successfully`);
  } catch (error) {
    console.error("❌ EXPORT FAILED", error);
    toast.error("Failed to export data");
  }
};


  // Update transaction status
  const handleUpdateStatus = async (newStatus: "SUCCESS" | "FAILED" | "PENDING") => {
    if (!selectedTransaction || !token) {
      toast.error("Missing required data");
      return;
    }

    const requestPayload = {
      payout_transaction_id: selectedTransaction.payout_transaction_id,
      status: newStatus,
      operator_transaction_id: operatorTxnId.trim() || undefined,
    };

    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/admin/update/payout/request`;
    
    setUpdatingStatus(true);
    
    try {
      const response = await axios.post(apiUrl, requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data?.status === "success") {
        toast.success(`Transaction status updated to ${newStatus}`);
        setOperatorTxnId("");
        setDetailsOpen(false);
        
        // Refresh both lists
        fetchAllTransactions();
        if (selectedUserId) {
          fetchUserTransactions();
        }
      } else {
        toast.error(response.data?.message || "Failed to update transaction status");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to update transaction status";
      toast.error(errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case "SUCCESS":
        return <Badge className="bg-green-50 text-green-700 border-green-300">Success</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-50 text-red-700 border-red-300">Failed</Badge>;
   case "REFUND":
case "REFUNDED":
  return <Badge className="bg-purple-600 text-white">Refunded</Badge>;

      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
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

const formatAmount = (amount?: number | string | null) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0.00";
  }

  const num = Number(amount);

  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

  const handleViewDetails = (transaction: PayoutTransaction) => {
    setSelectedTransaction(transaction);
    setOperatorTxnId(transaction.operator_transaction_id || "");
    setDetailsOpen(true);
  };

  // Render transaction table
  const renderTransactionTable = (
    transactions: PayoutTransaction[],
    currentPage: number,
    recordsPerPage: number,
    setCurrentPage: (page: number) => void,
    loading: boolean
  ) => {
    const totalPages = Math.ceil(transactions.length / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const paginatedTransactions = transactions.slice(indexOfFirstRecord, indexOfLastRecord);

    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-semibold text-gray-900">No transactions found</p>
          <p className="text-sm text-gray-600">Try adjusting your filters</p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Date & Time
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Transaction ID
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Mobile
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Beneficiary
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Amount (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Before Balance (₹)
                </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                    After Balance (₹)
                  </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Actions
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase px-4">
  Refund
</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx, idx) => (
                <TableRow
                  key={tx.payout_transaction_id}
                  className={`border-b hover:bg-gray-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  }`}
                >
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900 whitespace-nowrap">
                    {tx.operator_transaction_id || "-"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                    {tx.mobile_number}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                    {tx.beneficiary_name}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">
                    ₹{formatAmount(tx.amount)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">
                    ₹{formatAmount(tx.before_balance)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">
                    ₹{formatAmount(tx.after_balance)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(tx.transaction_status)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(tx)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
  {isRefunded(tx.transaction_status) ? (
    <Button
      size="sm"
      variant="outline"
      disabled
      className="cursor-not-allowed opacity-50"
    >
      Refunded
    </Button>
  ) : (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => handleOpenRefund(tx)}
    >
      Refund
    </Button>
  )}
</TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({transactions.length} total records)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout Transactions</h1>
          <p className="text-gray-600 mt-1">
            View and manage payout transaction history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="custom">Custom (By Retailer)</TabsTrigger>
        </TabsList>

        {/* All Transactions Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                  {(allSearchTerm || allStatusFilter !== "ALL" || allStartDate !== getTodayDate() || allEndDate !== getTodayDate()) && (
                    <Button
                      onClick={clearAllFilters}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={allStartDate}
                      onChange={(e) => setAllStartDate(e.target.value)}
                      max={allEndDate || getTodayDate()}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      End Date
                    </Label>
                    <Input
                      type="date"
                      value={allEndDate}
                      onChange={(e) => setAllEndDate(e.target.value)}
                      min={allStartDate}
                      max={getTodayDate()}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select 
                      value={allStatusFilter} 
                      onValueChange={(value) => setAllStatusFilter(value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      Search
                    </Label>
                    <Input
                      placeholder="Search by order ID, phone, name..."
                      value={allSearchTerm}
                      onChange={(e) => setAllSearchTerm(e.target.value)}
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
                    value={allRecordsPerPage.toString()}
                    onValueChange={(value) => {
                      setAllRecordsPerPage(Number(value));
                      setAllCurrentPage(1);
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
                    {filteredAllTransactions.length} transactions
                  </span>
                  <Button
                    onClick={() => exportToExcel(false)}
                    variant="outline"
                    size="sm"
                    disabled={filteredAllTransactions.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    onClick={() => fetchAllTransactions()}
                    disabled={loadingAllTransactions}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingAllTransactions ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {renderTransactionTable(
                filteredAllTransactions,
                allCurrentPage,
                allRecordsPerPage,
                setAllCurrentPage,
                loadingAllTransactions
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom (By Retailer) Tab */}
        <TabsContent value="custom" className="space-y-6">
          {/* User Selection */}
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="user-select" className="text-base font-semibold">
                  Select Retailer
                </Label>
                <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openUserCombobox}
                      className="w-full justify-between"
                    >
                      {selectedUserId
                        ? users.find((user) => user.retailer_id === selectedUserId)?.retailer_name
                        : "Select retailer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search retailer..." />
                      <CommandEmpty>No retailer found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {users.map((user) => (
                          <CommandItem
                            key={user.retailer_id}
                            value={user.retailer_name}
                            onSelect={() => {
                              setSelectedUserId(user.retailer_id);
                              setSelectedUserName(user.retailer_name);
                              setOpenUserCombobox(false);
                              setUserCurrentPage(1);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.retailer_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{user.retailer_name}</span>
                              <span className="text-xs text-gray-500">
                                {user.retailer_phone && `${user.retailer_phone} • `}
                                {user.retailer_id}
                              </span>
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
              {/* Filters */}
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                      {(userSearchTerm || userStatusFilter !== "ALL" || userStartDate !== getTodayDate() || userEndDate !== getTodayDate()) && (
                        <Button
                          onClick={clearUserFilters}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={userStartDate}
                          onChange={(e) => setUserStartDate(e.target.value)}
                          max={userEndDate || getTodayDate()}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          End Date
                        </Label>
                        <Input
                          type="date"
                          value={userEndDate}
                          onChange={(e) => setUserEndDate(e.target.value)}
                          min={userStartDate}
                          max={getTodayDate()}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                        <Select 
                          value={userStatusFilter} 
                          onValueChange={(value) => setUserStatusFilter(value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
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
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Search className="h-4 w-4" />
                          Search
                        </Label>
                        <Input
                          placeholder="Search by order ID, phone, name..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
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
                        value={userRecordsPerPage.toString()}
                        onValueChange={(value) => {
                          setUserRecordsPerPage(Number(value));
                          setUserCurrentPage(1);
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
                        {filteredUserTransactions.length} transactions
                      </span>
                      <Button
                        onClick={() => exportToExcel(true)}
                        variant="outline"
                        size="sm"
                        disabled={filteredUserTransactions.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        onClick={() => fetchUserTransactions()}
                        disabled={loadingUserTransactions}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingUserTransactions ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {renderTransactionTable(
                    filteredUserTransactions,
                    userCurrentPage,
                    userRecordsPerPage,
                    setUserCurrentPage,
                    loadingUserTransactions
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Status Update Section */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Update Transaction Status</h3>
                    <div className="text-sm">
                      Current: {getStatusBadge(selectedTransaction.transaction_status)}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="operator-txn-id">
                      Operator Transaction ID
                      <span className="text-gray-600 ml-1">(Optional)</span>
                    </Label>
                    <Input
                      id="operator-txn-id"
                      type="text"
                      value={operatorTxnId}
                      onChange={(e) => setOperatorTxnId(e.target.value)}
                      placeholder="Enter operator transaction ID"
                      className="w-full mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleUpdateStatus("PENDING")}
                      disabled={updatingStatus || selectedTransaction.transaction_status.toUpperCase() === "PENDING"}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      PENDING
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus("SUCCESS")}
                      disabled={updatingStatus || selectedTransaction.transaction_status.toUpperCase() === "SUCCESS"}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      SUCCESS
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus("FAILED")}
                      disabled={updatingStatus || selectedTransaction.transaction_status.toUpperCase() === "FAILED"}
                      variant="destructive"
                    >
                      {updatingStatus ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      FAILED
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Payout Transaction ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.payout_transaction_id}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Order ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.order_id || "-"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Partner Request ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.partner_request_id}
                  </p>
                </div>

                {selectedTransaction.operator_transaction_id && (
                  <div className="col-span-2">
                    <Label className="text-gray-600 text-xs">Operator Transaction ID</Label>
                    <p className="font-mono text-sm font-medium mt-1">
                      {selectedTransaction.operator_transaction_id}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-gray-600 text-xs">Retailer Name</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.retailer_name}
                  </p>  
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Retailer Business Name</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.retailer_business_name}
                  </p>  
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Retailer ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.retailer_id}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Mobile Number</Label>
                  <p className="font-medium mt-1">{selectedTransaction.mobile_number}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Beneficiary Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.beneficiary_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Bank Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.bank_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Account Number</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.account_number}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">IFSC Code</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.ifsc_code}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Transfer Type</Label>
                  <p className="font-medium mt-1">{getTransferTypeName(selectedTransaction.transfer_type)}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Amount</Label>
                  <p className="font-semibold text-lg mt-1 text-green-600">
                    ₹{formatAmount(selectedTransaction.amount)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.transaction_status)}
                  </div>
                </div>

                {/* Commission Fields */}
                {selectedTransaction.admin_commision !== undefined && (
                  <div>
                    <Label className="text-gray-600 text-xs">Admin Commission</Label>
                    <p className="font-medium mt-1">₹{selectedTransaction.admin_commision}</p>
                  </div>
                )}

                {selectedTransaction.master_distributor_commision !== undefined && (
                  <div>
                    <Label className="text-gray-600 text-xs">Master Distributor Commission</Label>
                    <p className="font-medium mt-1">₹{selectedTransaction.master_distributor_commision}</p>
                  </div>
                )}

                {selectedTransaction.distributor_commision !== undefined && (
                  <div>
                    <Label className="text-gray-600 text-xs">Distributor Commission</Label>
                    <p className="font-medium mt-1">₹{selectedTransaction.distributor_commision}</p>
                  </div>
                )}

                {selectedTransaction.retailer_commision !== undefined && (
                  <div>
                    <Label className="text-gray-600 text-xs">Retailer Commission</Label>
                    <p className="font-medium mt-1">₹{selectedTransaction.retailer_commision}</p>
                  </div>
                )}

                <div>
                  <Label className="text-gray-600 text-xs">Created At</Label>
                  <p className="font-medium mt-1">
                    {formatDate(selectedTransaction.created_at)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Updated At</Label>
                  <p className="font-medium mt-1">
                    {formatDate(selectedTransaction.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Refund</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Are you sure you want to refund this payout?
      </p>

      <div className="bg-gray-50 border rounded p-3 space-y-1 text-sm">
        <div><b>Retailer:</b> {selectedTransaction?.retailer_name}</div>
        <div><b>Amount:</b> ₹{formatAmount(selectedTransaction?.amount)}</div>
        <div><b>Payout ID:</b> {selectedTransaction?.payout_transaction_id}</div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setRefundConfirmOpen(false)}
          disabled={refunding}
        >
          Cancel
        </Button>

        <Button
          variant="destructive"
          onClick={handleRefund}
          disabled={refunding}
        >
          {refunding ? "Refunding..." : "Yes, Refund"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

    </div>
  );
};

export default PayoutTransactionPage;