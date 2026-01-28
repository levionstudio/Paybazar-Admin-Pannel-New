import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  RefreshCw, 
  Eye, 
  RotateCcw,
  User,
  Phone,
  Calendar,
  CreditCard,
  Building,
  DollarSign,
  Receipt,
  Download,
  File
} from "lucide-react";
import * as XLSX from "xlsx";


interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_email?: string;
  retailer_phone?: string;
  is_blocked: boolean;
  wallet_balance: number;
}

interface PayoutTransaction {
  transaction_id: string;
  payout_transaction_id: string;
  phone_number: string;
  bank_name: string;
  beneficiary_name: string;
  account_number: string;
  amount: string;
  commission: string;
  transfer_type: string;
  transaction_status: string;
  transaction_date_and_time: string;
}

const PayoutTransactionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<Retailer[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<PayoutTransaction[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PayoutTransaction | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState<PayoutTransaction | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Decode token
  useEffect(() => {
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setAdminId(decoded?.admin_id || "");
      } catch (error) {
        toast.error("Invalid token. Please log in again.");
      }
    }
  }, [token]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminId || !token) return;

      setLoadingUsers(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/retailer/get/admin/${adminId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

       if (response.data.status === "success") {
  const retailers: User[] = response.data.data?.retailers ?? [];
  setUsers(retailers);
}

        
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [adminId, token]);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!selectedUserId || !token) return;

    setLoadingTransactions(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/user/payout/get/transactions/${selectedUserId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status === "success" && response.data.data) {
        const transactionsList = response.data.data.transactions || [];
        
        // Sort by date (latest first)
        const sorted = [...transactionsList].sort((a, b) => {
          const dateA = new Date(a.transaction_date_and_time).getTime();
          const dateB = new Date(b.transaction_date_and_time).getTime();
          return dateB - dateA;
        });
        
        setTransactions(sorted);
        setFilteredTransactions(sorted);
        toast.success(`Loaded ${sorted.length} transactions`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load transactions");
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchTransactions();
      setCurrentPage(1);
    } else {
      setTransactions([]);
      setFilteredTransactions([]);
    }
  }, [selectedUserId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.transaction_id?.toLowerCase().includes(search) ||
          tx.phone_number?.includes(search) ||
          tx.beneficiary_name?.toLowerCase().includes(search) ||
          tx.bank_name?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (tx) => tx.transaction_status?.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, transactions]);

  const exportToExcel = () => {
    try {
      const exportData = filteredTransactions.map((tx, idx) => ({
        "S.No": idx + 1,
        "Transaction ID": tx.transaction_id,
        "Payout ID": tx.payout_transaction_id,
        "Phone Number": tx.phone_number,
        "Beneficiary Name": tx.beneficiary_name,
        "Bank Name": tx.bank_name,
        "Account Number": tx.account_number,
        "Amount (₹)": parseFloat(tx.amount).toFixed(2),
        "Commission (₹)": parseFloat(tx.commission).toFixed(2),
        "Transfer Type": tx.transfer_type,
        "Status": tx.transaction_status,
        "Date & Time": formatDate(tx.transaction_date_and_time),
      }));

      const totalAmount = filteredTransactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount || "0"),
        0
      );

      exportData.push({
        "S.No": "",
        "Transaction ID": "",
        "Payout ID": "",
        "Phone Number": "",
        "Beneficiary Name": "",
        "Bank Name": "",
        "Account Number": "TOTAL",
        "Amount (₹)": totalAmount.toFixed(2),
        "Commission (₹)": "",
        "Transfer Type": "",
        "Status": "",
        "Date & Time": "",
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [
        { wch: 8 }, { wch: 35 }, { wch: 35 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payout Transactions");

      const selectedUser = users.find(u => u.retailer_id === selectedUserId);
      const userName = selectedUser?.retailer_name || "User";
      const timestamp = new Date().toISOString().slice(0, 10);
      
      XLSX.writeFile(workbook, `Payout_Transactions_${userName}_${timestamp}.xlsx`);
      toast.success("Transactions exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handleRefund = async () => {
    if (!transactionToRefund || !token) return;

    setIsRefunding(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/user/payout/refund/${transactionToRefund.payout_transaction_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.status === "success") {
        toast.success("Refund processed successfully");
        setRefundDialogOpen(false);
        setTransactionToRefund(null);
        fetchTransactions();
      } else {
        toast.error(response.data.message || "Failed to process refund");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase();
    const badges = {
      SUCCESS: "bg-green-50 text-green-700 border-green-300",
      PENDING: "bg-yellow-50 text-yellow-700 border-yellow-300",
      FAILED: "bg-red-50 text-red-700 border-red-300",
      REFUND: "bg-blue-50 text-blue-700 border-blue-300",
    };
    return (
      <Badge className={badges[statusUpper] || "bg-gray-50 text-gray-700 border-gray-300"}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
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

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate total
  const totalAmount = filteredTransactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amount || "0"),
    0
  );

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedTransactions = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        {selectedUserId && (
          <Button onClick={fetchTransactions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* User Selection */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
              <User className="h-5 w-5 text-paybazaar-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select User</h2>
              <p className="text-sm text-gray-600">Choose a user to view their transactions</p>
            </div>
          </div>

          <div className="mt-6 space-y-2 max-w-md">
            <Label htmlFor="user-select" className="text-sm font-medium text-gray-700">
              User <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select" className="h-11 bg-white">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-600">
                    No users found
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.retailer_id} value={user.retailer_id}>
                      {user.retailer_name}
                      {user.retailer_email && ` (${user.retailer_email})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats & Filters */}
      {selectedUserId && filteredTransactions.length > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paybazaar-blue/10">
                    <Receipt className="h-6 w-6 text-paybazaar-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{formatAmount(totalAmount.toString())}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Latest Transaction</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(filteredTransactions[0]?.transaction_date_and_time)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Search</Label>
                  <Input
                    placeholder="Search by ID, phone, name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refund">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Records Per Page</Label>
                  <Select
                    value={recordsPerPage.toString()}
                    onValueChange={(value) => {
                      setRecordsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Transactions Table */}
      {selectedUserId && (
        <Card className="shadow-md overflow-hidden">
          <CardContent className="p-0">
            {/* Table Controls */}
            {filteredTransactions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstRecord + 1} to{" "}
                  {Math.min(indexOfLastRecord, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length} transactions
                </span>
                <Button onClick={exportToExcel} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <File className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-semibold text-gray-900">No transactions found</p>
                  <p className="text-sm text-gray-600">
                    {selectedUserId ? "Try adjusting your filters" : "Select a user to view transactions"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">S.No</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Transaction ID</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Phone</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Beneficiary</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Amount</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Status</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Date & Time</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx, idx) => (
                      <TableRow
                        key={tx.transaction_id}
                        className={`border-b hover:bg-gray-50 ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                        }`}
                      >
                        <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                          {indexOfFirstRecord + idx + 1}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900">
                          {tx.transaction_id}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-sm text-gray-900">{tx.phone_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                          {tx.beneficiary_name}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600">
                          ₹{formatAmount(tx.amount)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          {getStatusBadge(tx.transaction_status)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(tx.transaction_date_and_time)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setTransactionToRefund(tx);
                                setRefundDialogOpen(true);
                              }}
                              disabled={tx.transaction_status.toUpperCase() === "REFUND"}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 md:px-6 py-4 gap-3">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
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
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                    <CreditCard className="h-5 w-5 text-paybazaar-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Transaction Information</h3>
                    <p className="text-sm text-gray-600">Complete transaction details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Transaction ID</Label>
                    <p className="font-mono text-sm text-gray-900">{selectedTransaction.transaction_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Payout ID</Label>
                    <p className="font-mono text-sm text-gray-900">{selectedTransaction.payout_transaction_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="font-mono text-sm text-gray-900">{selectedTransaction.phone_number}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Transfer Type</Label>
                    <p className="text-sm text-gray-900">{selectedTransaction.transfer_type}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    {getStatusBadge(selectedTransaction.transaction_status)}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Date & Time</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTransaction.transaction_date_and_time)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                    <Building className="h-5 w-5 text-paybazaar-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
                    <p className="text-sm text-gray-600">Beneficiary and bank information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Beneficiary Name</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedTransaction.beneficiary_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Bank Name</Label>
                    <p className="text-sm text-gray-900">{selectedTransaction.bank_name}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-sm font-medium text-gray-600">Account Number</Label>
                    <p className="font-mono text-sm text-gray-900">{selectedTransaction.account_number}</p>
                  </div>
                </div>
              </div>

              {/* Amount Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Amount Details</h3>
                    <p className="text-sm text-gray-600">Transaction and commission breakdown</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-700 mb-1">Transaction Amount</p>
                    <p className="text-2xl font-bold text-green-900">
                      ₹{formatAmount(selectedTransaction.amount)}
                    </p>
                  </div>
                  <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                    <p className="text-sm text-purple-700 mb-1">Total Commission</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ₹{formatAmount(selectedTransaction.commission)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Admin (29.17%)</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{formatAmount((parseFloat(selectedTransaction.commission) * 0.2917).toString())}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">MD (4.17%)</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{formatAmount((parseFloat(selectedTransaction.commission) * 0.0417).toString())}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Distributor (16.67%)</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{formatAmount((parseFloat(selectedTransaction.commission) * 0.1667).toString())}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Retailer (50%)</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{formatAmount((parseFloat(selectedTransaction.commission) * 0.50).toString())}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-600" />
              Confirm Refund
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base">
                Are you sure you want to refund this transaction? This action cannot be undone.
              </p>
              {transactionToRefund && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono font-medium text-gray-900">
                      {transactionToRefund.transaction_id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-base text-gray-900">
                      ₹{formatAmount(transactionToRefund.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Beneficiary:</span>
                    <span className="font-medium text-gray-900">
                      {transactionToRefund.beneficiary_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(transactionToRefund.transaction_status)}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={isRefunding}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Yes, Refund
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PayoutTransactionPage;