import { useState, useEffect } from "react";
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
import { Loader2, RefreshCw, Eye, CheckCircle, XCircle, Download, Search } from "lucide-react";

interface DecodedToken {
  data: {
    admin_id: string;
    [key: string]: any;
  };
  exp: number;
}

interface User {
  user_id: string;
  user_name: string;
  user_email?: string;
  user_phone?: string;
  [key: string]: any;
}

interface ServiceTransaction {
  payout_transaction_id: string;
  transaction_id: string;
  user_id: string;
  distributor_id: string;
  phone_number: string;
  bank_name: string;
  beneficiary_name: string;
  account_number: string;
  amount: string;
  commission: string;
  transfer_type: string;
  transaction_status: string;
  transaction_date_and_time: string;
  operator_transaction_id?: string;
}

const ServiceTransactionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  
  // All Transactions Tab States
  const [allTransactions, setAllTransactions] = useState<ServiceTransaction[]>([]);
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<ServiceTransaction[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);
  
  // Custom Tab States
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userTransactions, setUserTransactions] = useState<ServiceTransaction[]>([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<ServiceTransaction[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userRecordsPerPage, setUserRecordsPerPage] = useState(10);
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ServiceTransaction | null>(null);
  const [operatorTxnId, setOperatorTxnId] = useState("");

  // Decode token
  useEffect(() => {
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setAdminId(decoded?.data?.admin_id || "");
      } catch (error) {
        toast.error("Invalid token. Please log in again.");
      }
    }
  }, [token]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminId || !token) return;

      setLoadingUsers(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/admin/get/user/${adminId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.status === "success" && response.data.data) {
          const usersList = Array.isArray(response.data.data)
            ? response.data.data
            : response.data.data.users || [];
          setUsers(usersList);
        } else {
          setUsers([]);
        }
      } catch (error: any) {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [adminId, token]);

  // Fetch all transactions
  const fetchAllTransactions = async () => {
    if (!adminId || !token) return;

    setLoadingAllTransactions(true);
    try {
      // This endpoint should return all transactions for admin
      // You may need to adjust based on your actual API endpoint
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/admin/payout/get/all/transactions/${adminId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success" && response.data.data) {
        const transactionsList = response.data.data.transactions || response.data.data || [];
        const sortedTransactions = transactionsList.sort(
          (a: ServiceTransaction, b: ServiceTransaction) => {
            const dateA = new Date(a.transaction_date_and_time).getTime();
            const dateB = new Date(b.transaction_date_and_time).getTime();
            return dateB - dateA;
          }
        );
        setAllTransactions(sortedTransactions);
        setFilteredAllTransactions(sortedTransactions);
        toast.success(`Loaded ${sortedTransactions.length} transactions`);
      } else {
        setAllTransactions([]);
        setFilteredAllTransactions([]);
      }
    } catch (error: any) {
      console.error("Error fetching all transactions:", error);
      setAllTransactions([]);
      setFilteredAllTransactions([]);
    } finally {
      setLoadingAllTransactions(false);
    }
  };

  // Fetch transactions for selected user
  const fetchUserTransactions = async () => {
    if (!selectedUserId || !token) return;

    setLoadingUserTransactions(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/user/payout/get/transactions/${selectedUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success" && response.data.data) {
        const transactionsList = response.data.data.transactions || [];
        const sortedTransactions = transactionsList.sort(
          (a: ServiceTransaction, b: ServiceTransaction) => {
            const dateA = new Date(a.transaction_date_and_time).getTime();
            const dateB = new Date(b.transaction_date_and_time).getTime();
            return dateB - dateA;
          }
        );
        setUserTransactions(sortedTransactions);
        setFilteredUserTransactions(sortedTransactions);
        toast.success(`Loaded ${sortedTransactions.length} transactions`);
      } else {
        setUserTransactions([]);
        setFilteredUserTransactions([]);
      }
    } catch (error: any) {
      console.error("Error fetching user transactions:", error);
      setUserTransactions([]);
      setFilteredUserTransactions([]);
    } finally {
      setLoadingUserTransactions(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchUserTransactions();
      setUserCurrentPage(1);
    } else {
      setUserTransactions([]);
      setFilteredUserTransactions([]);
    }
  }, [selectedUserId]);

  // Apply filters for All Transactions
  useEffect(() => {
    let filtered = [...allTransactions];

    // Status filter
    if (allStatusFilter !== "ALL") {
      filtered = filtered.filter((txn) => 
        txn.transaction_status.toUpperCase() === allStatusFilter
      );
    }

    // Search filter
    if (allSearchTerm.trim()) {
      const searchLower = allSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (txn) =>
          txn.transaction_id?.toLowerCase().includes(searchLower) ||
          txn.phone_number?.toLowerCase().includes(searchLower) ||
          txn.beneficiary_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAllTransactions(filtered);
    setAllCurrentPage(1);
  }, [allSearchTerm, allStatusFilter, allTransactions]);

  // Apply filters for User Transactions
  useEffect(() => {
    let filtered = [...userTransactions];

    // Status filter
    if (userStatusFilter !== "ALL") {
      filtered = filtered.filter((txn) => 
        txn.transaction_status.toUpperCase() === userStatusFilter
      );
    }

    // Search filter
    if (userSearchTerm.trim()) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (txn) =>
          txn.transaction_id?.toLowerCase().includes(searchLower) ||
          txn.phone_number?.toLowerCase().includes(searchLower) ||
          txn.beneficiary_name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUserTransactions(filtered);
    setUserCurrentPage(1);
  }, [userSearchTerm, userStatusFilter, userTransactions]);

  // Export to Excel
  const exportToExcel = (transactions: ServiceTransaction[], filename: string) => {
    try {
      const exportData = transactions.map((txn, index) => ({
        "S.No": index + 1,
        "Date & Time": formatDate(txn.transaction_date_and_time),
        "Transaction ID": txn.transaction_id || "N/A",
        "Phone Number": txn.phone_number || "N/A",
        "Bank Name": txn.bank_name || "N/A",
        "Beneficiary Name": txn.beneficiary_name || "N/A",
        "Account Number": txn.account_number || "N/A",
        "Amount (₹)": parseFloat(txn.amount || "0").toFixed(2),
        "Transfer Type": txn.transfer_type || "N/A",
        "Status": txn.transaction_status || "N/A",
        "Operator TXN ID": txn.operator_transaction_id || "N/A",
      }));

      // Add summary row
      const totalAmount = transactions.reduce(
        (sum, txn) => sum + parseFloat(txn.amount || "0"),
        0
      );

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "Transaction ID": "TOTAL",
        "Phone Number": "",
        "Bank Name": "",
        "Beneficiary Name": "",
        "Account Number": "",
        "Amount (₹)": totalAmount.toFixed(2),
        "Transfer Type": "",
        "Status": "",
        "Operator TXN ID": "",
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No
        { wch: 20 }, // Date & Time
        { wch: 25 }, // Transaction ID
        { wch: 15 }, // Phone
        { wch: 20 }, // Bank
        { wch: 25 }, // Beneficiary
        { wch: 20 }, // Account
        { wch: 15 }, // Amount
        { wch: 15 }, // Transfer Type
        { wch: 12 }, // Status
        { wch: 25 }, // Operator TXN ID
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);

      toast.success("Transactions exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    }
  };

  // Update transaction status
  const handleUpdateStatus = async (newStatus: "SUCCESS" | "FAILED" | "PENDING") => {
    if (!selectedTransaction || !token || !adminId) {
      toast.error("Missing required data. Please refresh and try again.");
      return;
    }

    const requestPayload = {
      payout_transaction_id: selectedTransaction.payout_transaction_id,
      status: newStatus,
      operator_transaction_id: operatorTxnId.trim(),
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

      const isSuccess = response.status === 200 && response.data?.status;

      if (isSuccess) {
        toast.success(`Transaction status updated to ${response.data.status.toUpperCase()} successfully`);
        
        setOperatorTxnId("");
        setDetailsOpen(false);
        
        // Refresh both lists
        fetchAllTransactions();
        if (selectedUserId) {
          fetchUserTransactions();
        }
      } else {
        toast.error(response.data.message || "Failed to update transaction status");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message 
        || error.message 
        || "Failed to update transaction status. Please try again.";
      
      toast.error(errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return <Badge className="bg-green-50 text-green-700 border-green-300">Success</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-50 text-red-700 border-red-300">Failed</Badge>;
      case "REFUND":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-300">Refunded</Badge>;
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

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleViewDetails = (transaction: ServiceTransaction) => {
    setSelectedTransaction(transaction);
    setOperatorTxnId(transaction.operator_transaction_id || "");
    setDetailsOpen(true);
  };

  // Render transaction table
  const renderTransactionTable = (
    transactions: ServiceTransaction[],
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

    if (paginatedTransactions.length === 0) {
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
                  Phone Number
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
                    {formatDate(tx.transaction_date_and_time)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900 whitespace-nowrap">
                    {tx.transaction_id}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                    {tx.phone_number}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
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
          <h1 className="text-3xl font-bold text-gray-900">Service Transactions</h1>
          <p className="text-gray-600 mt-1">
            View and manage service transaction history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" onClick={() => fetchAllTransactions()}>
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="custom">Custom (By Retailer)</TabsTrigger>
        </TabsList>

        {/* All Transactions Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Search className="h-4 w-4" />
                    Search
                  </Label>
                  <Input
                    placeholder="Search by TXN ID, phone..."
                    value={allSearchTerm}
                    onChange={(e) => setAllSearchTerm(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Select value={allStatusFilter} onValueChange={setAllStatusFilter}>
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

                <div className="flex items-end">
                  <Button
                    onClick={fetchAllTransactions}
                    disabled={loadingAllTransactions}
                    variant="outline"
                    className="w-full"
                  >
                    {loadingAllTransactions ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
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
                    onClick={() => exportToExcel(filteredAllTransactions, "All_Service_Transactions")}
                    variant="outline"
                    size="sm"
                    disabled={filteredAllTransactions.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
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
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="user-select" className="w-full bg-white">
                    <SelectValue placeholder="Choose a retailer to view transactions" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUsers ? (
                      <div className="p-2 text-center text-sm text-gray-600">
                        Loading retailers...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="p-2 text-center text-sm text-gray-600">
                        No retailers found
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.user_name}
                          {user.user_phone && ` - ${user.user_phone}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedUserId && (
            <>
              {/* Filters */}
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Search className="h-4 w-4" />
                        Search
                      </Label>
                      <Input
                        placeholder="Search by TXN ID, phone..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Status</Label>
                      <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
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

                    <div className="flex items-end">
                      <Button
                        onClick={fetchUserTransactions}
                        disabled={loadingUserTransactions}
                        variant="outline"
                        className="w-full"
                      >
                        {loadingUserTransactions ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </Button>
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
                        onClick={() => exportToExcel(filteredUserTransactions, `Retailer_Transactions_${selectedUserId}`)}
                        variant="outline"
                        size="sm"
                        disabled={filteredUserTransactions.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
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
                    <input
                      id="operator-txn-id"
                      type="text"
                      value={operatorTxnId}
                      onChange={(e) => setOperatorTxnId(e.target.value)}
                      placeholder="Enter operator transaction ID"
                      className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
                <div>
                  <Label className="text-gray-600 text-xs">Transaction ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.transaction_id}
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
                  <Label className="text-gray-600 text-xs">Phone Number</Label>
                  <p className="font-medium mt-1">{selectedTransaction.phone_number}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Bank Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.bank_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Beneficiary Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.beneficiary_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Account Number</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.account_number}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Amount</Label>
                  <p className="font-semibold text-lg mt-1">
                    ₹{formatAmount(selectedTransaction.amount)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Transfer Type</Label>
                  <p className="font-medium mt-1">{selectedTransaction.transfer_type}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.transaction_status)}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Date & Time</Label>
                  <p className="font-medium mt-1">
                    {formatDate(selectedTransaction.transaction_date_and_time)}
                  </p>
                </div> 
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceTransactionPage;