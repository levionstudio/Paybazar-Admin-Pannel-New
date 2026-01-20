import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2, 
  Search, 
  RefreshCw, 
  History, 
  Calendar,
  Download,
  IndianRupee,
  Filter,
  X,
  FileText,
  Users
} from "lucide-react";
import * as XLSX from "xlsx";

interface DecodedToken {
  admin_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface RevertTransaction {
  revert_transaction_id: number;
  revert_from_id: string;
  revert_on_id: string;
  revert_from_name: string;
  revert_on_name: string;
  amount: number;
  remarks: string;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RevertTransactionHistory = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [transactions, setTransactions] = useState<RevertTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [userTypeCounts, setUserTypeCounts] = useState({
    masterDistributor: 0,
    distributor: 0,
    retailer: 0,
  });

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken");
          toast.error("Session expired. Please login again.");
          return;
        }
        setAdminId(decoded.admin_id || decoded.admin_id);
      } catch (error) {
        console.error("Error decoding token:", error);
        toast.error("Invalid token. Please log in again.");
      }
    }
  }, [token]);

  useEffect(() => {
    if (adminId && searched) {
      fetchRevertTransactions();
    }
  }, [currentPage, recordsPerPage]);

  const getUserType = (id: string): string => {
    if (!id) return "Unknown";
    if (id.startsWith("M")) return "Master Distributor";
    if (id.startsWith("D")) return "Distributor";
    if (id.startsWith("R")) return "Retailer";
    if (id.startsWith("A")) return "Admin";
    return "Unknown";
  };

  const fetchRevertTransactions = async () => {
    if (!adminId) {
      toast.error("Admin ID not found. Please login again.");
      return;
    }

    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const offset = (currentPage - 1) * recordsPerPage;
      const limit = recordsPerPage;
      
      // Build POST body payload
      const payload: any = {
        id: adminId,
      };

      if (startDate) {
        payload.start_date = new Date(startDate).toISOString();
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        payload.end_date = endDateTime.toISOString();
      }

      // Add filters to payload
      if (statusFilter !== "all") {
        let userTypePrefix = "";
        if (statusFilter === "master") userTypePrefix = "M";
        else if (statusFilter === "distributor") userTypePrefix = "D";
        else if (statusFilter === "retailer") userTypePrefix = "R";
        
        if (userTypePrefix) {
          payload.user_type_filter = userTypePrefix;
        }
      }

      if (searchQuery.trim()) {
        payload.search_query = searchQuery.trim();
      }

      console.log("Fetching with payload:", payload);
      console.log("Query params - limit:", limit, "offset:", offset);

      // Use query parameters for limit and offset
      const response = await axios.post(
        `${API_BASE_URL}/revert/get/revert/from?limit=${limit}&offset=${offset}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data && response.data.status === "success") {
        const transactionList = response.data.data || [];
        const total = response.data.total_records || 0;
        const amount = response.data.total_amount || 0;
        const counts = response.data.user_type_counts || {
          masterDistributor: 0,
          distributor: 0,
          retailer: 0,
        };

        setTransactions(transactionList);
        setTotalRecords(total);
        setTotalAmount(amount);
        setUserTypeCounts(counts);
        
        if (transactionList.length > 0) {
          toast.success(`Loaded ${transactionList.length} of ${total} records`);
        } else {
          toast.info("No revert transactions found");
        }
      } else {
        setTransactions([]);
        setTotalRecords(0);
        setTotalAmount(0);
        setUserTypeCounts({
          masterDistributor: 0,
          distributor: 0,
          retailer: 0,
        });
        toast.info("No revert transactions found");
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setTransactions([]);
      setTotalRecords(0);
      
      if (error.response?.status === 404) {
        toast.info("No revert transactions found");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to fetch revert transactions"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchRevertTransactions();
  };

  const handleClearFilters = () => {
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
    setSearched(false);
    setTransactions([]);
    setTotalRecords(0);
    setTotalAmount(0);
    setUserTypeCounts({
      masterDistributor: 0,
      distributor: 0,
      retailer: 0,
    });
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      
      // Build POST body payload
      const payload: any = {
        id: adminId,
      };

      if (startDate) {
        payload.start_date = new Date(startDate).toISOString();
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        payload.end_date = endDateTime.toISOString();
      }

      if (statusFilter !== "all") {
        let userTypePrefix = "";
        if (statusFilter === "master") userTypePrefix = "M";
        else if (statusFilter === "distributor") userTypePrefix = "D";
        else if (statusFilter === "retailer") userTypePrefix = "R";
        
        if (userTypePrefix) {
          payload.user_type_filter = userTypePrefix;
        }
      }

      if (searchQuery.trim()) {
        payload.search_query = searchQuery.trim();
      }

      // Fetch all records for export using query params
      const response = await axios.post(
        `${API_BASE_URL}/revert/get/revert/from?limit=${totalRecords}&offset=0`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const allTransactions = response.data?.data || [];

      const exportData = allTransactions.map((record: RevertTransaction, index: number) => ({
        "S.No": index + 1,
        "Transaction ID": record.revert_transaction_id,
        "From ID": record.revert_from_id,
        "From Name": record.revert_from_name,
        "To ID": record.revert_on_id,
        "To Name": record.revert_on_name,
        "User Type": getUserType(record.revert_on_id),
        "Amount (₹)": record.amount.toFixed(2),
        "Remarks": record.remarks,
        "Date & Time": formatDate(record.created_at),
      }));

      const summaryRow = {
        "S.No": "",
        "Transaction ID": "",
        "From ID": "",
        "From Name": "TOTAL",
        "To ID": "",
        "To Name": "",
        "User Type": "",
        "Amount (₹)": totalAmount.toFixed(2),
        "Remarks": `Total Records: ${totalRecords}`,
        "Date & Time": "",
      };

      const finalData = [...exportData, summaryRow];
      const worksheet = XLSX.utils.json_to_sheet(finalData);

      const columnWidths = [
        { wch: 8 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 30 },
        { wch: 20 },
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Revert Transactions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Revert_Transactions_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);

      toast.success("Revert transactions exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
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
        hour12: true,
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

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Revert Transaction History</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all revert transactions
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setCurrentPage(1);
              fetchRevertTransactions();
            }} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

     

      {/* Filters Section */}
      <Card className="max-w-7xl mx-auto shadow-card">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Filters</h2>
                <p className="text-sm text-muted-foreground">Filter transactions by date range and user type</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium text-foreground">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  max={getTodayDate()}
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium text-foreground">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={getTodayDate()}
                  className="h-11"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium text-foreground">
                  User Type
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="master">Master Distributor</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-foreground">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Apply Filters
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClearFilters}
                className="h-11"
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="max-w-7xl mx-auto shadow-card overflow-hidden">
        <CardContent className="p-0">
          {/* Table Controls - Fixed visibility condition */}
          {searched && transactions.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/30 px-4 md:px-6 py-4 gap-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Show</span>
                <Select
                  value={recordsPerPage.toString()}
                  onValueChange={(value) => {
                    setRecordsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm font-medium text-foreground">entries</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Showing {indexOfFirstRecord + 1} to{" "}
                  {Math.min(indexOfFirstRecord + recordsPerPage, totalRecords)} of{" "}
                  {totalRecords} entries
                </span>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  disabled={totalRecords === 0 || loading}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                  <History className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground">No transactions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searched 
                    ? "Try adjusting your filters or search query" 
                    : "Click 'Apply Filters' to load transactions"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      S.No
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      Transaction ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      From
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      To
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      User Type
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      Amount (₹)
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      Remarks
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap px-4">
                      Date & Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, idx) => {
                    const userType = getUserType(txn.revert_on_id);

                    return (
                      <TableRow
                        key={txn.revert_transaction_id}
                        className="border-b hover:bg-muted/20"
                      >
                        <TableCell className="py-4 px-4 text-center text-sm font-medium text-foreground">
                          {indexOfFirstRecord + idx + 1}
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                            #{txn.revert_transaction_id}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-sm text-foreground">
                              {txn.revert_from_name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {txn.revert_from_id}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-sm text-foreground">
                              {txn.revert_on_name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {txn.revert_on_id}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <Badge className="bg-accent/10 text-accent border-accent/20 font-medium text-xs">
                            {userType}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <span className="font-bold text-base text-foreground">
                            ₹{formatAmount(txn.amount)}
                          </span>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">
                              {txn.remarks}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(txn.created_at)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalRecords > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/30 border-t px-4 md:px-6 py-4 gap-3">
              <div className="text-sm font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                        variant={currentPage === pageNum ? "default" : "outline"}
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

      {/* Info Note */}
      <Card className="max-w-7xl mx-auto bg-muted/30 shadow-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Important Notes:
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>All revert transactions are tracked and logged for audit purposes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use filters to narrow down transactions by date range and user type</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Export to Excel for detailed analysis and record keeping</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Transaction amounts are displayed in Indian Rupees (₹)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Data is loaded efficiently using server-side pagination for better performance</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevertTransactionHistory;