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
import { Loader2, RefreshCw, Eye, Download, Search, Calendar, Check, ChevronsUpDown, Zap } from "lucide-react";
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

interface ElectricityBillTransaction {
  electricity_bill_transaction_id: number;
  operator_transaction_id: string | null;
  order_id: string | null;
  partner_request_id: string;
  retailer_id: string;
  retailer_name: string;
  retailer_business_name: string;
  customer_id: string;
  customer_email: string;
  operator_name: string;
  operator_id: number;
  amount: number;
  commision: number;
  before_balance: number;
  after_balance: number;
  transaction_status: string;
  created_at: string;
}

const ElectricityBillTransactionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // All Transactions
  const [allTransactionsRaw, setAllTransactionsRaw] = useState<ElectricityBillTransaction[]>([]);
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<ElectricityBillTransaction[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allStartDate, setAllStartDate] = useState(getTodayDate());
  const [allEndDate, setAllEndDate] = useState(getTodayDate());
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);

  // Custom Tab
  const [userTransactionsRaw, setUserTransactionsRaw] = useState<ElectricityBillTransaction[]>([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<ElectricityBillTransaction[]>([]);
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

  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ElectricityBillTransaction | null>(null);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const isRefunded = (status: string) =>
    ["REFUND", "REFUNDED"].includes(status?.toUpperCase());

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
      console.error("Token decode error:", error);
      toast.error("Invalid token. Please login again.");
    }
  }, [token]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminId || !token) return;
      setLoadingUsers(true);
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/admin/${adminId}?limit=10000&page=1`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.data.status === "success" && response.data.data) {
          setUsers(response.data.data.retailers || []);
        } else {
          setUsers([]);
        }
      } catch (error: any) {
        console.error("Error fetching retailers:", error);
        toast.error(error.response?.data?.message || "Failed to fetch retailers");
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [adminId, token]);

  // Fetch all transactions
  const fetchAllTransactions = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    setLoadingAllTransactions(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/bbps/get/all/electricity/transactions`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list: ElectricityBillTransaction[] =
        response.data?.data?.transactions ?? [];

      const sorted = list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAllTransactionsRaw(sorted);
      console.log(sorted);
      toast.success(`Loaded ${sorted.length} transactions`);
    } catch (error: any) {
      console.error("Error fetching all transactions:", error);
      toast.error(error.response?.data?.message || "Failed to fetch transactions");
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

  // Fetch transactions for selected user
  const fetchUserTransactions = useCallback(async () => {
    if (!selectedUserId || !token) return;
    setLoadingUserTransactions(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/bbps/get/electricity/transactions/${selectedUserId}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list: ElectricityBillTransaction[] =
        response.data?.data?.transactions || [];

      const sorted = list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

  // Apply filters for All Transactions
  useEffect(() => {
    let filtered = [...allTransactionsRaw];

    if (allStartDate || allEndDate) {
      filtered = filtered.filter((t) => {
        const txDateStr = new Date(t.created_at).toISOString().split("T")[0];
        const start = allStartDate || "1900-01-01";
        const end = allEndDate || "2100-12-31";
        return txDateStr >= start && txDateStr <= end;
      });
    }

    if (allStatusFilter && allStatusFilter !== "ALL") {
      filtered = filtered.filter(
        (t) => t.transaction_status.toUpperCase() === allStatusFilter.toUpperCase()
      );
    }

    if (allSearchTerm.trim()) {
      const s = allSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.partner_request_id.toLowerCase().includes(s) ||
          t.customer_id.toLowerCase().includes(s) ||
          t.customer_email.toLowerCase().includes(s) ||
          t.operator_name.toLowerCase().includes(s) ||
          t.retailer_id.toLowerCase().includes(s) ||
          t.retailer_name.toLowerCase().includes(s)
      );
    }

    setFilteredAllTransactions(filtered);
    setAllCurrentPage(1);
  }, [allTransactionsRaw, allStartDate, allEndDate, allStatusFilter, allSearchTerm]);

  // Apply filters for User Transactions
  useEffect(() => {
    let filtered = [...userTransactionsRaw];

    if (userStartDate || userEndDate) {
      filtered = filtered.filter((t) => {
        const txDateStr = new Date(t.created_at).toISOString().split("T")[0];
        const start = userStartDate || "1900-01-01";
        const end = userEndDate || "2100-12-31";
        return txDateStr >= start && txDateStr <= end;
      });
    }

    if (userStatusFilter && userStatusFilter !== "ALL") {
      filtered = filtered.filter(
        (t) => t.transaction_status.toUpperCase() === userStatusFilter.toUpperCase()
      );
    }

    if (userSearchTerm.trim()) {
      const s = userSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.partner_request_id.toLowerCase().includes(s) ||
          t.customer_id.toLowerCase().includes(s) ||
          t.customer_email.toLowerCase().includes(s) ||
          t.operator_name.toLowerCase().includes(s)
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
      const allData = isUserData ? filteredUserTransactions : filteredAllTransactions;
      if (allData.length === 0) {
        toast.error("No transactions to export");
        return;
      }

      const data = allData.map((t, i) => ({
        "S.No": i + 1,
        "Date & Time": formatDate(t.created_at),
        "Transaction ID": t.electricity_bill_transaction_id,
        "Partner Request ID": t.partner_request_id,
        "Order ID": t.order_id || "",
        "Operator Txn ID": t.operator_transaction_id || "",
        "Retailer ID": t.retailer_id,
        "Retailer Name": t.retailer_name,
        "Business Name": t.retailer_business_name,
        "Customer ID": `'${t.customer_id}`,
        "Operator": t.operator_name,
        "Customer Email": t.customer_email,
        "Before Balance (₹)": t.before_balance.toFixed(2),
        "After Balance (₹)": t.after_balance.toFixed(2),
        "Amount (₹)": t.amount.toFixed(2),
        "Commission (₹)": t.commision.toFixed(2),
        "Status": t.transaction_status,
      }));

      const totalAmount = allData.reduce((sum, t) => sum + t.amount, 0);
      const totalCommission = allData.reduce((sum, t) => sum + t.commision, 0);

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "Transaction ID": "",
        "Partner Request ID": "TOTAL",
        "Order ID": "",
        "Operator Txn ID": "",
        "Retailer ID": "",
        "Retailer Name": "",
        "Business Name": "",
        "Customer ID": "",
        "Operator": "",
        "Customer Email": "",
        "Before Balance (₹)": "",
        "After Balance (₹)": "",
        "Amount (₹)": totalAmount.toFixed(2),
        "Commission (₹)": totalCommission.toFixed(2),
        "Status": "",
      };

      const finalData = [...data, summaryRow];
      const ws = XLSX.utils.json_to_sheet(finalData);

      ws["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 15 },
        { wch: 38 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Electricity Bill Transactions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = isUserData
        ? `Retailer_${selectedUserId}_Electricity_Bill_Transactions_${timestamp}.xlsx`
        : `All_Electricity_Bill_Transactions_${timestamp}.xlsx`;

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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleOpenRefund = (tx: ElectricityBillTransaction) => {
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

    const transactionId = selectedTransaction.electricity_bill_transaction_id;

    if (isRefunded(selectedTransaction.transaction_status)) {
      toast.error("This transaction is already refunded");
      return;
    }

    setRefunding(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/bbps/electricity/transaction/refund/${transactionId}`;
      const response = await axios.put(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Refund response:", response.data);
      toast.success(`Transaction ${transactionId} refunded`);

      setAllTransactionsRaw((prev) =>
        prev.map((tx) =>
          tx.electricity_bill_transaction_id === transactionId
            ? { ...tx, transaction_status: "REFUNDED" }
            : tx
        )
      );

      setUserTransactionsRaw((prev) =>
        prev.map((tx) =>
          tx.electricity_bill_transaction_id === transactionId
            ? { ...tx, transaction_status: "REFUNDED" }
            : tx
        )
      );

      setSelectedTransaction((prev) =>
        prev ? { ...prev, transaction_status: "REFUNDED" } : null
      );

      setRefundConfirmOpen(false);
      setDetailsOpen(false);
    } catch (error: any) {
      console.error("Refund failed:", error.response);
      toast.error(error.response?.data?.message || "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  const handleViewDetails = (transaction: ElectricityBillTransaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  // Render transaction table
  const renderTransactionTable = (
    transactions: ElectricityBillTransaction[],
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
          <Zap className="w-16 h-16 text-gray-400 mb-4" />
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
                  Customer ID
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Operator
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Before Bal (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  After Bal (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Amount (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Status
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Actions
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase">
                  Refund
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx, idx) => (
                <TableRow
                  key={tx.electricity_bill_transaction_id}
                  className={`border-b hover:bg-gray-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  }`}
                >
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900 whitespace-nowrap">
                    {tx.electricity_bill_transaction_id}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900 font-medium">
                    {tx.customer_id}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                    {tx.operator_name}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-blue-600 whitespace-nowrap">
                    ₹{formatAmount(tx.before_balance)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-blue-600 whitespace-nowrap">
                    ₹{formatAmount(tx.after_balance)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">
                    ₹{formatAmount(tx.amount)}
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
          <h1 className="text-3xl font-bold text-gray-900">Electricity Bill Transactions</h1>
          <p className="text-gray-600 mt-1">
            View and manage electricity bill payment transaction history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Transactions</TabsTrigger>
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
                    <Select value={allStatusFilter} onValueChange={(value) => setAllStatusFilter(value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      Search
                    </Label>
                    <Input
                      placeholder="Search by customer ID, email, operator..."
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
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingAllTransactions ? "animate-spin" : ""}`} />
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
                        <Select value={userStatusFilter} onValueChange={(value) => setUserStatusFilter(value)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="SUCCESS">Success</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Search className="h-4 w-4" />
                          Search
                        </Label>
                        <Input
                          placeholder="Search by customer ID, email, operator..."
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
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingUserTransactions ? "animate-spin" : ""}`} />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Transaction ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.electricity_bill_transaction_id}
                  </p>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Partner Request ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.partner_request_id}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Order ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.order_id || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Operator Txn ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.operator_transaction_id || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Retailer ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.retailer_id}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Retailer Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.retailer_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Business Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.retailer_business_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Customer ID</Label>
                  <p className="font-medium text-lg mt-1">{selectedTransaction.customer_id}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Customer Email</Label>
                  <p className="font-medium mt-1">{selectedTransaction.customer_email}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Operator</Label>
                  <p className="font-medium mt-1">{selectedTransaction.operator_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Operator ID</Label>
                  <p className="font-medium mt-1">{selectedTransaction.operator_id}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Before Balance</Label>
                  <p className="font-semibold text-lg mt-1 text-blue-600">
                    ₹{formatAmount(selectedTransaction.before_balance)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">After Balance</Label>
                  <p className="font-semibold text-lg mt-1 text-blue-600">
                    ₹{formatAmount(selectedTransaction.after_balance)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Amount</Label>
                  <p className="font-semibold text-lg mt-1 text-green-600">
                    ₹{formatAmount(selectedTransaction.amount)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Commission</Label>
                  <p className="font-semibold text-lg mt-1 text-purple-600">
                    ₹{formatAmount(selectedTransaction.commision)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.transaction_status)}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Created At</Label>
                  <p className="font-medium mt-1">
                    {formatDate(selectedTransaction.created_at)}
                  </p>
                </div>
              </div>
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
              Are you sure you want to refund this electricity bill payment?
            </p>
            <div className="bg-gray-50 border rounded p-3 space-y-1 text-sm">
              <div><b>Retailer:</b> {selectedTransaction?.retailer_name}</div>
              <div><b>Customer ID:</b> {selectedTransaction?.customer_id}</div>
              <div><b>Operator:</b> {selectedTransaction?.operator_name}</div>
              <div><b>Amount:</b> ₹{formatAmount(selectedTransaction?.amount || 0)}</div>
              <div><b>Transaction ID:</b> {selectedTransaction?.electricity_bill_transaction_id}</div>
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

export default ElectricityBillTransactionPage;