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
import {
  Loader2,
  RefreshCw,
  Eye,
  Download,
  Search,
  Calendar,
  Check,
  ChevronsUpDown,
  Smartphone
} from "lucide-react";
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

interface MobileRechargeTransaction {
  mobile_recharge_transaction_id: number;
  retailer_id: string;
  business_name: string;
  retailer_name: string;
  mobile_number: string;  // ✅ Changed from number to string
  operator_code: number;
  operator_name: string;
  amount: number;
  before_balance: number;  // ✅ Added
  after_balance: number;   // ✅ Added
  circle_code: number;
  circle_name: string;
  recharge_type: string;
  partner_request_id: string;
  created_at: string;
  commision: number;
  status: string;
}

const updateTransactionInList = (
  transactions: MobileRechargeTransaction[],
  transactionId: number,
  updates: Partial<MobileRechargeTransaction>
): MobileRechargeTransaction[] => {
  return transactions.map((tx) =>
    tx.mobile_recharge_transaction_id === transactionId
      ? { ...tx, ...updates }
      : tx
  );
};

const MobileRechargeTransactionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [allTransactionsRaw, setAllTransactionsRaw] = useState<MobileRechargeTransaction[]>([]);
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<MobileRechargeTransaction[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allStartDate, setAllStartDate] = useState(getTodayDate());
  const [allEndDate, setAllEndDate] = useState(getTodayDate());
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);

  const [userTransactionsRaw, setUserTransactionsRaw] = useState<MobileRechargeTransaction[]>([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<MobileRechargeTransaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userStartDate, setUserStartDate] = useState(getTodayDate());
  const [userEndDate, setUserEndDate] = useState(getTodayDate());
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userRecordsPerPage, setUserRecordsPerPage] = useState(10);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MobileRechargeTransaction | null>(null);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
const isRefunded = (status: string) =>
  ["REFUND", "REFUNDED"].includes(status?.toUpperCase());



  const getRechargeTypeName = (rechargeType: string) => {
    switch (rechargeType) {
      case "1":
        return "Prepaid";
      case "2":
        return "Postpaid";
      case "3":
        return "DTH";
      default:
        return rechargeType;
    }
  };

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

  const fetchAllTransactions = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setLoadingAllTransactions(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/mobile_recharge/get/admin`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("API Status Code:", response.status);
      console.log("API Response Body:", response.data);

      const list: MobileRechargeTransaction[] = response.data?.data?.recharges ?? [];
      const sorted = list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllTransactionsRaw(sorted);
      toast.success(`Loaded ${sorted.length} transactions`);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      console.log("Error status:", error.response?.status);
      toast.error(
        error.response?.data?.message || "Failed to fetch transactions"
      );
      setAllTransactionsRaw([]);
    } finally {
      setLoadingAllTransactions(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllTransactions();
    }
  }, [token, fetchAllTransactions]);

  const handleOpenRefund = (tx: MobileRechargeTransaction) => {
  if (isRefunded(tx.status)) {
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

  const transactionId = selectedTransaction.mobile_recharge_transaction_id;
  
if (isRefunded(selectedTransaction.status)) {
  toast.error("This transaction is already refunded");
  setRefundConfirmOpen(false);
  return;
}



  setRefunding(true);

  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}/mobile_recharge/refund/${transactionId}`;
    console.log("🔄 Refunding transaction:", transactionId);

    const response = await axios.put(
      url,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Refund successful:", response.data);
    
    const newStatus = response.data?.data?.status || "REFUNDED";
    
    toast.success(`Transaction ${transactionId} refunded successfully`);

    // ✅ Update only this transaction - NO FULL REFRESH
    setAllTransactionsRaw((prev) =>
      updateTransactionInList(prev, transactionId, { status: newStatus })
    );

    if (selectedUserId === selectedTransaction.retailer_id) {
      setUserTransactionsRaw((prev) =>
        updateTransactionInList(prev, transactionId, { status: newStatus })
      );
    }

    setSelectedTransaction((prev) =>
      prev ? { ...prev, status: newStatus } : null
    );

    setRefundConfirmOpen(false);

  } catch (error: any) {
    console.error("❌ Refund failed:", error);
    
    let errorMessage = "Refund failed";
    
    if (error.response) {
      errorMessage = error.response?.data?.message || 
                    error.response?.data?.error ||
                    `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = "No response from server. Please check your connection.";
    } else {
      errorMessage = error.message || "An unexpected error occurred";
    }

    toast.error(errorMessage, {
      description: `Transaction ID: ${transactionId}`,
      duration: 5000,
    });
  } finally {
    setRefunding(false);
  }
};
  const fetchUserTransactions = useCallback(async () => {
    if (!selectedUserId || !token) {
      return;
    }

    setLoadingUserTransactions(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/mobile_recharge/get/${selectedUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("User transactions API Response:", response.data);

      const list: MobileRechargeTransaction[] = response.data?.data?.recharges || [];
      console.log("Parsed user recharges list:", list);
      console.log("First user transaction (if exists):", list[0]);

      const sorted = list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUserTransactionsRaw(sorted);
      toast.success(`Loaded ${sorted.length} transactions`);
    } catch (error: any) {
      console.error("Error fetching user transactions:", error);
      toast.error(error.response?.data?.message || "Failed to fetch transactions");
      setUserTransactionsRaw([]);
    } finally {
      setLoadingUserTransactions(false);
    }
  }, [selectedUserId, token]);

  useEffect(() => {
    if (selectedUserId && token) {
      fetchUserTransactions();
    } else {
      setUserTransactionsRaw([]);
      setFilteredUserTransactions([]);
    }
  }, [selectedUserId, token, fetchUserTransactions]);

  useEffect(() => {
    let filtered = [...allTransactionsRaw];

    if (allStartDate || allEndDate) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.created_at);
        const txDateStr = txDate.toISOString().split('T')[0];
        const start = allStartDate || "1900-01-01";
        const end = allEndDate || "2100-12-31";
        return txDateStr >= start && txDateStr <= end;
      });
    }

    if (allStatusFilter && allStatusFilter !== "ALL") {
      filtered = filtered.filter((t) =>
        t.status.toUpperCase() === allStatusFilter.toUpperCase()
      );
    }

    if (allSearchTerm.trim()) {
      const s = allSearchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        t.partner_request_id.toLowerCase().includes(s) ||
        t.mobile_number.includes(s) ||
        t.operator_name.toLowerCase().includes(s) ||
        t.circle_name.toLowerCase().includes(s) ||
        t.retailer_id.toLowerCase().includes(s)
      );
    }

    setFilteredAllTransactions(filtered);
    setAllCurrentPage(1);
  }, [allTransactionsRaw, allStartDate, allEndDate, allStatusFilter, allSearchTerm]);

  useEffect(() => {
    let filtered = [...userTransactionsRaw];

    if (userStartDate || userEndDate) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.created_at);
        const txDateStr = txDate.toISOString().split('T')[0];
        const start = userStartDate || "1900-01-01";
        const end = userEndDate || "2100-12-31";
        return txDateStr >= start && txDateStr <= end;
      });
    }

    if (userStatusFilter && userStatusFilter !== "ALL") {
      filtered = filtered.filter((t) =>
        t.status.toUpperCase() === userStatusFilter.toUpperCase()
      );
    }

    if (userSearchTerm.trim()) {
      const s = userSearchTerm.toLowerCase();
      filtered = filtered.filter((t) =>
        t.partner_request_id.toLowerCase().includes(s) ||
        t.mobile_number.includes(s) ||
        t.operator_name.toLowerCase().includes(s) ||
        t.circle_name.toLowerCase().includes(s)
      );
    }

    setFilteredUserTransactions(filtered);
    setUserCurrentPage(1);
  }, [userTransactionsRaw, userStartDate, userEndDate, userStatusFilter, userSearchTerm]);

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

const exportToExcel = async (isUserData: boolean) => {
  try {
    const allData = isUserData ? filteredUserTransactions : filteredAllTransactions;

    if (!allData || allData.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const num = (v?: number | null) => typeof v === "number" && !isNaN(v) ? v : 0;

    const data = allData.map((t, i) => ({
      "S.No": i + 1,
      "Date & Time": formatDate(t.created_at),
      "Transaction ID": t.mobile_recharge_transaction_id || "-",
      "Partner Request ID": t.partner_request_id || "-",
      "Retailer ID": t.retailer_id || "-",
      "Retailer Name": t.retailer_name || "-",
      "Business": t.business_name || "-",
      "Mobile Number": `'${t.mobile_number || ""}`,
      "Operator": t.operator_name || "-",
      "Circle": t.circle_name || "-",
      "Before Balance (₹)": num(t.before_balance).toFixed(2),  // ✅ Added
      "After Balance (₹)": num(t.after_balance).toFixed(2),    // ✅ Added
      "Amount (₹)": num(t.amount).toFixed(2),
      "Recharge Type": getRechargeTypeName(t.recharge_type),
      "Commission (₹)": num(t.commision).toFixed(2),
      "Status": t.status || "-",
    }));

    const totalAmount = allData.reduce((s, t) => s + num(t.amount), 0);
    const totalBeforeBalance = allData.reduce((s, t) => s + num(t.before_balance), 0);
    const totalAfterBalance = allData.reduce((s, t) => s + num(t.after_balance), 0);
    const totalCommission = allData.reduce((s, t) => s + num(t.commision), 0);

    const summaryRow = {
      "S.No": "",
      "Date & Time": "",
      "Transaction ID": "",
      "Partner Request ID": "TOTAL",
      "Retailer ID": "",
      "Retailer Name": "",
      "Business": "",
      "Mobile Number": "",
      "Operator": "",
      "Circle": "",
      "Before Balance (₹)": totalBeforeBalance.toFixed(2),
      "After Balance (₹)": totalAfterBalance.toFixed(2),
      "Amount (₹)": totalAmount.toFixed(2),
      "Recharge Type": "",
      "Commission (₹)": totalCommission.toFixed(2),
      "Status": "",
    };

    const finalData = [...data, summaryRow];
    const ws = XLSX.utils.json_to_sheet(finalData);
    ws["!cols"] = [
      { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 36 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mobile Recharge");

    const date = new Date().toISOString().slice(0, 10);
    const filename = isUserData
      ? `Retailer_${selectedUserId}_Mobile_Recharge_${date}.xlsx`
      : `All_Mobile_Recharge_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${allData.length} transactions successfully`);
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export data");
  }
};

const getStatusBadge = (status: string) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;

  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "SUCCESS":
      return <Badge className="bg-green-600 text-white">Success</Badge>;
    case "PENDING":
      return <Badge className="bg-yellow-600 text-white">Pending</Badge>;
    case "FAILED":
      return <Badge className="bg-red-600 text-white">Failed</Badge>;
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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleViewDetails = (transaction: MobileRechargeTransaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  const renderTransactionTable = (
    transactions: MobileRechargeTransaction[],
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
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      );
    }

    return (
      <>
        <div className="rounded-md border">
          <Table>
         
               <TableHeader>
  <TableRow className="bg-gray-50 hover:bg-gray-50">
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Date & Time
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Transaction ID
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Mobile Number
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Operator
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Before Bal (₹)
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      After Bal (₹)
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Amount (₹)
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
      Status
    </TableHead>
    <TableHead className="text-center text-xs font-semibold uppercase px-4">
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
  key={tx.mobile_recharge_transaction_id}
  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
>
  <TableCell className="text-center">
    {formatDate(tx.created_at)}
  </TableCell>

  <TableCell className="text-center font-mono text-xs">
    {tx.mobile_recharge_transaction_id}
  </TableCell>

  <TableCell className="text-center font-medium">
    {tx.mobile_number}
  </TableCell>

  <TableCell className="text-center">
    {tx.operator_name}
  </TableCell>

  <TableCell className="text-center text-blue-600">
    ₹{formatAmount(tx.before_balance)}
  </TableCell>

  <TableCell className="text-center text-blue-600">
    ₹{formatAmount(tx.after_balance)}
  </TableCell>

  <TableCell className="text-center font-semibold text-green-600">
    ₹{formatAmount(tx.amount)}
  </TableCell>

  <TableCell className="text-center">
    {getStatusBadge(tx.status)}
  </TableCell>

  {/* DETAILS */}
  <TableCell className="text-center">
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleViewDetails(tx)}
    >
      <Eye className="w-4 h-4 mr-1" />
      Details
    </Button>
  </TableCell>

  {/* REFUND */}
  <TableCell className="text-center">
    {isRefunded(tx.status) ? (
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({transactions.length} total records)
            </div>
            <div className="flex items-center space-x-2">
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
                      key={i}
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mobile Recharge Transactions</h1>
        <p className="text-muted-foreground">
          View and manage mobile recharge transaction history
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="custom">Custom (By Retailer)</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                {(allSearchTerm ||
                  allStatusFilter !== "ALL" ||
                  allStartDate !== getTodayDate() ||
                  allEndDate !== getTodayDate()) && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={allStartDate}
                    onChange={(e) => setAllStartDate(e.target.value)}
                    max={allEndDate || getTodayDate()}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
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
                  <Label>Status</Label>
                  <Select value={allStatusFilter} onValueChange={setAllStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search</Label>
                  <Input
                    placeholder="Search by ID, mobile, operator..."
                    value={allSearchTerm}
                    onChange={(e) => setAllSearchTerm(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Label>Show</Label>
                  <Select
                    value={allRecordsPerPage.toString()}
                    onValueChange={(value) => {
                      setAllRecordsPerPage(Number(value));
                      setAllCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{filteredAllTransactions.length} transactions</Badge>
                  <Button
                    onClick={() => exportToExcel(false)}
                    variant="outline"
                    size="sm"
                    disabled={filteredAllTransactions.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    onClick={fetchAllTransactions}
                    disabled={loadingAllTransactions}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1", loadingAllTransactions && "animate-spin")} />
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

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Select Retailer</Label>
                <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
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
                              <span>{user.retailer_name}</span>
                              <span className="text-xs text-muted-foreground">
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
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    {(userSearchTerm ||
                      userStatusFilter !== "ALL" ||
                      userStartDate !== getTodayDate() ||
                      userEndDate !== getTodayDate()) && (
                      <Button variant="outline" size="sm" onClick={clearUserFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={userStartDate}
                        onChange={(e) => setUserStartDate(e.target.value)}
                        max={userEndDate || getTodayDate()}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
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
                      <Label>Status</Label>
                      <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="SUCCESS">Success</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                          <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Search</Label>
                      <Input
                        placeholder="Search by ID, mobile, operator..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Label>Show</Label>
                      <Select
                        value={userRecordsPerPage.toString()}
                        onValueChange={(value) => {
                          setUserRecordsPerPage(Number(value));
                          setUserCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">entries</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{filteredUserTransactions.length} transactions</Badge>
                      <Button
                        onClick={() => exportToExcel(true)}
                        variant="outline"
                        size="sm"
                        disabled={filteredUserTransactions.length === 0}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button
                        onClick={fetchUserTransactions}
                        disabled={loadingUserTransactions}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-1", loadingUserTransactions && "animate-spin")} />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                  <p className="text-sm">{selectedTransaction.mobile_recharge_transaction_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Partner Request ID</p>
                  <p className="text-sm">{selectedTransaction.partner_request_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Retailer ID</p>
                  <p className="text-sm">{selectedTransaction.retailer_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Retailer Name</p>
                  <p className="text-sm">{selectedTransaction.retailer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Business</p>
                  <p className="text-sm">{selectedTransaction.business_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mobile Number</p>
                  <p className="text-sm">{selectedTransaction.mobile_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Operator</p>
                  <p className="text-sm">{selectedTransaction.operator_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Operator Code</p>
                  <p className="text-sm">{selectedTransaction.operator_code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Circle</p>
                  <p className="text-sm">{selectedTransaction.circle_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Circle Code</p>
                  <p className="text-sm">{selectedTransaction.circle_code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recharge Type</p>
                  <p className="text-sm">{getRechargeTypeName(selectedTransaction.recharge_type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">₹{formatAmount(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Commission</p>
                  <p className="text-sm">₹{formatAmount(selectedTransaction.commision)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm">{formatDate(selectedTransaction.created_at)}</p>
                </div>
              </div>

              {/* ✅ UPDATED: Refund button now checks for SUCCESS or lowercase success */}
{/* Refund button */}
{!isRefunded(selectedTransaction.status) && (
  <div className="pt-4 border-t">
    <Button
      variant="destructive"
      className="w-full"
      onClick={() => setRefundConfirmOpen(true)}
    >
      Refund
    </Button>
  </div>
)}



              {/* ✅ NEW: Show message if already refunded */}
              {isRefunded(selectedTransaction.status) && (

                <div className="pt-4 border-t">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-purple-800">
                      This transaction has already been refunded
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Refund</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to refund this recharge?
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Retailer:</span> {selectedTransaction?.retailer_name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Retailer ID:</span> {selectedTransaction?.retailer_id}
              </p>
              <p className="text-sm">
                <span className="font-medium">Amount:</span> ₹
                {formatAmount(selectedTransaction?.amount || 0)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Transaction ID:</span>{" "}
                {selectedTransaction?.mobile_recharge_transaction_id}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRefundConfirmOpen(false)}
                disabled={refunding}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
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

export default MobileRechargeTransactionPage;