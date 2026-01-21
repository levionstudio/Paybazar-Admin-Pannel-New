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
import { Loader2, RefreshCw, Eye, Download, Search, Calendar, Check, ChevronsUpDown } from "lucide-react";
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

interface TDSCommission {
  tds_commision_id: number;
  transaction_id: string;
  user_id: string;
  user_name: string;
  commision: number;
  tds: number;
  paid_commision: number;
  pan_number: string;
  status: string;
  created_at: string;
}

const TDSCommissionPage = () => {
  const token = localStorage.getItem("authToken");
  const [adminId, setAdminId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  // All Transactions Tab States
  const [allTransactions, setAllTransactions] = useState<TDSCommission[]>([]);
  const [filteredAllTransactions, setFilteredAllTransactions] = useState<TDSCommission[]>([]);
  const [allSearchTerm, setAllSearchTerm] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("ALL");
  const [allStartDate, setAllStartDate] = useState(getTodayDate());
  const [allEndDate, setAllEndDate] = useState(getTodayDate());
  const [allCurrentPage, setAllCurrentPage] = useState(1);
  const [allRecordsPerPage, setAllRecordsPerPage] = useState(10);
  const [allTotalRecords, setAllTotalRecords] = useState(0);
  
  // Custom Tab States
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [userTransactions, setUserTransactions] = useState<TDSCommission[]>([]);
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<TDSCommission[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userStartDate, setUserStartDate] = useState(getTodayDate());
  const [userEndDate, setUserEndDate] = useState(getTodayDate());
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userRecordsPerPage, setUserRecordsPerPage] = useState(10);
  const [userTotalRecords, setUserTotalRecords] = useState(0);
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);
  
  // Dialog states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TDSCommission | null>(null);

  // Decode token
  useEffect(() => {
    console.log("🔐 Checking authentication token...");
    
    if (!token) {
      console.error("❌ No authentication token found");
      toast.error("No authentication token found. Please login.");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      console.log("✅ Token decoded successfully:", { admin_id: decoded.admin_id });
      
      if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
        console.error("❌ Token has expired");
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("authToken");
        return;
      }
      
      setAdminId(decoded.admin_id);
      console.log("✅ Admin ID set:", decoded.admin_id);
    } catch (error) {
      console.error("❌ Error decoding token:", error);
      toast.error("Invalid token. Please login again.");
    }
  }, [token]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!adminId || !token) {
        console.log("⏸️ Skipping user fetch - waiting for admin ID and token");
        return;
      }

      console.log(`🔄 Fetching users for admin: ${adminId}`);
      setLoadingUsers(true);
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/retailer/get/admin/${adminId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("📦 Users API response:", response.data);

        if (response.data.status === "success" && response.data.data) {
          const usersList = response.data.data.retailers || [];
          
          console.log(`✅ Loaded ${usersList.length} users`);
          setUsers(usersList);
        } else {
          console.warn("⚠️ Unexpected response format or no data");
          setUsers([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching users:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        toast.error(error.response?.data?.message || "Failed to fetch retailers");
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [adminId, token]);

  // Build query params helper
  const buildQueryParams = (params: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.status && params.status !== 'ALL') queryParams.append('status', params.status);
    
    return queryParams.toString();
  };

  // Fetch all TDS commissions with query params
  const fetchAllTransactions = useCallback(async (applyFilters = false) => {
    if (!token) {
      console.error("❌ fetchAllTransactions: No token available");
      toast.error("Authentication required");
      return;
    }

    console.log("🔄 Fetching all TDS commissions...");
    setLoadingAllTransactions(true);
    
    try {
      const offset = (allCurrentPage - 1) * allRecordsPerPage;
      const queryString = buildQueryParams({
        limit: allRecordsPerPage,
        offset: offset,
        start_date: allStartDate,
        end_date: allEndDate,
        status: allStatusFilter,
      });

      console.log("📋 Query params:", queryString);

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/commision/get/tds?${queryString}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📦 All TDS commissions API response:", response.data);
      
      const list: TDSCommission[] = response.data?.data?.tds_commisions || [];
      
      console.log(`✅ Processing ${list.length} TDS commissions`);
      
      const sorted = list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllTransactions(sorted);
      setAllTotalRecords(response.data?.data?.total || sorted.length);
      
      // Apply client-side search filter if needed
      if (applyFilters && allSearchTerm.trim()) {
        const filtered = sorted.filter((t) =>
          t.transaction_id.toLowerCase().includes(allSearchTerm.toLowerCase()) ||
          t.user_id.toLowerCase().includes(allSearchTerm.toLowerCase()) ||
          t.user_name.toLowerCase().includes(allSearchTerm.toLowerCase()) ||
          t.pan_number.toLowerCase().includes(allSearchTerm.toLowerCase())
        );
        setFilteredAllTransactions(filtered);
      } else {
        setFilteredAllTransactions(sorted);
      }
      
      toast.success(`Loaded ${sorted.length} TDS commissions`);
    } catch (error: any) {
      console.error("❌ Error fetching all TDS commissions:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || "Failed to fetch TDS commissions");
      setAllTransactions([]);
      setFilteredAllTransactions([]);
    } finally {
      setLoadingAllTransactions(false);
    }
  }, [token, allCurrentPage, allRecordsPerPage, allStartDate, allEndDate, allStatusFilter, allSearchTerm]);

  // Fetch TDS commissions for selected user with query params
  const fetchUserTransactions = useCallback(async (applyFilters = false) => {
    if (!selectedUserId || !token) {
      console.log("⏸️ Skipping user TDS commissions fetch - missing user ID or token");
      return;
    }

    console.log(`🔄 Fetching TDS commissions for user: ${selectedUserId}`);
    setLoadingUserTransactions(true);
    
    try {
      const offset = (userCurrentPage - 1) * userRecordsPerPage;
      const queryString = buildQueryParams({
        limit: userRecordsPerPage,
        offset: offset,
        start_date: userStartDate,
        end_date: userEndDate,
        status: userStatusFilter,
      });

      console.log("📋 Query params:", queryString);

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/commision/get/tds/${selectedUserId}?${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("📦 User TDS commissions API response:", response.data);
      
      const list: TDSCommission[] = response.data?.data?.tds_commisions || [];
      
      console.log(`✅ Processing ${list.length} user TDS commissions`);

      const sorted = list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUserTransactions(sorted);
      setUserTotalRecords(response.data?.data?.total || sorted.length);
      
      // Apply client-side search filter if needed
      if (applyFilters && userSearchTerm.trim()) {
        const filtered = sorted.filter((t) =>
          t.transaction_id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          t.user_id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          t.user_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          t.pan_number.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
        setFilteredUserTransactions(filtered);
      } else {
        setFilteredUserTransactions(sorted);
      }
      
      toast.success(`Loaded ${sorted.length} TDS commissions`);
    } catch (error: any) {
      console.error("❌ Error fetching user TDS commissions:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || "Failed to fetch TDS commissions");
      setUserTransactions([]);
      setFilteredUserTransactions([]);
    } finally {
      setLoadingUserTransactions(false);
    }
  }, [selectedUserId, token, userCurrentPage, userRecordsPerPage, userStartDate, userEndDate, userStatusFilter, userSearchTerm]);

  // Effect for fetching user transactions when filters change
  useEffect(() => {
    if (selectedUserId && token) {
      fetchUserTransactions(true);
    } else {
      setUserTransactions([]);
      setFilteredUserTransactions([]);
    }
  }, [selectedUserId, token, userCurrentPage, userRecordsPerPage, userStartDate, userEndDate, userStatusFilter]);

  // Apply client-side search for all transactions
  useEffect(() => {
    if (!allSearchTerm.trim()) {
      setFilteredAllTransactions(allTransactions);
      return;
    }

    const s = allSearchTerm.toLowerCase();
    const filtered = allTransactions.filter((t) =>
      t.transaction_id.toLowerCase().includes(s) ||
      t.user_id.toLowerCase().includes(s) ||
      t.user_name.toLowerCase().includes(s) ||
      t.pan_number.toLowerCase().includes(s)
    );
    
    setFilteredAllTransactions(filtered);
  }, [allSearchTerm, allTransactions]);

  // Apply client-side search for user transactions
  useEffect(() => {
    if (!userSearchTerm.trim()) {
      setFilteredUserTransactions(userTransactions);
      return;
    }

    const s = userSearchTerm.toLowerCase();
    const filtered = userTransactions.filter((t) =>
      t.transaction_id.toLowerCase().includes(s) ||
      t.user_id.toLowerCase().includes(s) ||
      t.user_name.toLowerCase().includes(s) ||
      t.pan_number.toLowerCase().includes(s)
    );
    
    setFilteredUserTransactions(filtered);
  }, [userSearchTerm, userTransactions]);

  // Fetch all transactions on filter change
  useEffect(() => {
    if (token) {
      fetchAllTransactions(false);
    }
  }, [allCurrentPage, allRecordsPerPage, allStartDate, allEndDate, allStatusFilter]);

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

  // Export to Excel - fetch all data without pagination
  const exportToExcel = async (isUserData: boolean) => {
    try {
      toast.info("Fetching all data for export...");
      
      let allData: TDSCommission[] = [];
      
      if (isUserData && selectedUserId) {
        // Fetch all user TDS commissions without pagination
        const queryString = buildQueryParams({
          limit: 10000, // Large number to get all records
          offset: 0,
          start_date: userStartDate,
          end_date: userEndDate,
          status: userStatusFilter,
        });

        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/commision/get/tds/${selectedUserId}?${queryString}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        allData = response.data?.data?.tds_commisions || [];
      } else {
        // Fetch all TDS commissions without pagination
        const queryString = buildQueryParams({
          limit: 10000, // Large number to get all records
          offset: 0,
          start_date: allStartDate,
          end_date: allEndDate,
          status: allStatusFilter,
        });

        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/commision/get/tds?${queryString}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        allData = response.data?.data?.tds_commisions || [];
      }

      // Apply search filter if present
      const searchTerm = isUserData ? userSearchTerm : allSearchTerm;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        allData = allData.filter((t) =>
          t.transaction_id.toLowerCase().includes(s) ||
          t.user_id.toLowerCase().includes(s) ||
          t.user_name.toLowerCase().includes(s) ||
          t.pan_number.toLowerCase().includes(s)
        );
      }

      if (allData.length === 0) {
        toast.error("No TDS commissions to export");
        return;
      }

      const data = allData.map((t, i) => ({
        "S.No": i + 1,
        "Date & Time": formatDate(t.created_at),
        "TDS Commission ID": t.tds_commision_id,
        "Transaction ID": t.transaction_id,
        "User ID": t.user_id,
        "User Name": t.user_name,
        "PAN Number": t.pan_number,
        "Commission (₹)": t.commision.toFixed(2),
        "TDS (₹)": t.tds.toFixed(2),
        "Paid Commission (₹)": t.paid_commision.toFixed(2),
        "Status": t.status,
      }));

      // Calculate totals
      const totalCommission = allData.reduce((sum, t) => sum + t.commision, 0);
      const totalTDS = allData.reduce((sum, t) => sum + t.tds, 0);
      const totalPaidCommission = allData.reduce((sum, t) => sum + t.paid_commision, 0);

      const summaryRow = {
        "S.No": "",
        "Date & Time": "",
        "TDS Commission ID": "",
        "Transaction ID": "TOTAL",
        "User ID": "",
        "User Name": "",
        "PAN Number": "",
        "Commission (₹)": totalCommission.toFixed(2),
        "TDS (₹)": totalTDS.toFixed(2),
        "Paid Commission (₹)": totalPaidCommission.toFixed(2),
        "Status": "",
      };

      const finalData = [...data, summaryRow];
      const ws = XLSX.utils.json_to_sheet(finalData);

      // Set column widths
      ws["!cols"] = [
        { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 38 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 18 }, { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TDS Commissions");

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = isUserData 
        ? `Retailer_${selectedUserId}_TDS_Commissions_${timestamp}.xlsx`
        : `All_TDS_Commissions_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${allData.length} TDS commissions successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
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
      case "DEDUCTED":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-300">Deducted</Badge>;
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

  const handleViewDetails = (transaction: TDSCommission) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  // Render transaction table
  const renderTransactionTable = (
    transactions: TDSCommission[],
    currentPage: number,
    totalRecords: number,
    recordsPerPage: number,
    setCurrentPage: (page: number) => void,
    loading: boolean
  ) => {
    const totalPages = Math.ceil(totalRecords / recordsPerPage);

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
          <p className="text-lg font-semibold text-gray-900">No TDS commissions found</p>
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
                  User ID
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  User Name
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  PAN Number
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Commission (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  TDS (₹)
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-gray-700 whitespace-nowrap px-4">
                  Paid (₹)
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
              {transactions.map((tx, idx) => (
                <TableRow
                  key={tx.tds_commision_id}
                  className={`border-b hover:bg-gray-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  }`}
                >
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900 whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900 whitespace-nowrap">
                    {tx.user_id}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-900">
                    {tx.user_name}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-mono text-xs text-gray-900">
                    {tx.pan_number}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-blue-600 whitespace-nowrap">
                    ₹{formatAmount(tx.commision)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-red-600 whitespace-nowrap">
                    ₹{formatAmount(tx.tds)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center font-semibold text-sm text-green-600 whitespace-nowrap">
                    ₹{formatAmount(tx.paid_commision)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(tx.status)}
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
              Page {currentPage} of {totalPages} ({totalRecords} total records)
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
          <h1 className="text-3xl font-bold text-gray-900">TDS Commissions</h1>
          <p className="text-gray-600 mt-1">
            View and manage TDS commission records
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" onClick={() => fetchAllTransactions(true)}>
            All Commissions
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
                      onChange={(e) => {
                        setAllStartDate(e.target.value);
                        setAllCurrentPage(1);
                      }}
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
                      onChange={(e) => {
                        setAllEndDate(e.target.value);
                        setAllCurrentPage(1);
                      }}
                      min={allStartDate}
                      max={getTodayDate()}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select 
                      value={allStatusFilter} 
                      onValueChange={(value) => {
                        setAllStatusFilter(value);
                        setAllCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="DEDUCTED">Deducted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      Search
                    </Label>
                    <Input
                      placeholder="Search by user ID, name, PAN..."
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
                    {filteredAllTransactions.length} commissions
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
                    onClick={() => fetchAllTransactions(true)}
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
                allTotalRecords,
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
                          onChange={(e) => {
                            setUserStartDate(e.target.value);
                            setUserCurrentPage(1);
                          }}
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
                          onChange={(e) => {
                            setUserEndDate(e.target.value);
                            setUserCurrentPage(1);
                          }}
                          min={userStartDate}
                          max={getTodayDate()}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                        <Select 
                          value={userStatusFilter} 
                          onValueChange={(value) => {
                            setUserStatusFilter(value);
                            setUserCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="SUCCESS">Success</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                            <SelectItem value="DEDUCTED">Deducted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Search className="h-4 w-4" />
                          Search
                        </Label>
                        <Input
                          placeholder="Search by user ID, name, PAN..."
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
                        {filteredUserTransactions.length} commissions
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
                        onClick={() => fetchUserTransactions(true)}
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
                    userTotalRecords,
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
            <DialogTitle>TDS Commission Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">TDS Commission ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.tds_commision_id}
                  </p>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Transaction ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.transaction_id}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">User ID</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.user_id}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">User Name</Label>
                  <p className="font-medium mt-1">{selectedTransaction.user_name}</p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">PAN Number</Label>
                  <p className="font-mono text-sm font-medium mt-1">
                    {selectedTransaction.pan_number}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">Commission Amount</Label>
                  <p className="font-semibold text-lg mt-1 text-blue-600">
                    ₹{formatAmount(selectedTransaction.commision)}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600 text-xs">TDS Deducted</Label>
                  <p className="font-semibold text-lg mt-1 text-red-600">
                    ₹{formatAmount(selectedTransaction.tds)}
                  </p>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Paid Commission (After TDS)</Label>
                  <p className="font-semibold text-xl mt-1 text-green-600">
                    ₹{formatAmount(selectedTransaction.paid_commision)}
                  </p>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-600 text-xs">Created At</Label>
                  <p className="font-medium mt-1">
                    {formatDate(selectedTransaction.created_at)}
                  </p>
                </div>
              </div>

              {/* TDS Calculation Breakdown */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-sm mb-3 text-gray-700">TDS Calculation Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Original Commission:</span>
                      <span className="font-medium text-blue-600">₹{formatAmount(selectedTransaction.commision)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">TDS Deducted (2%):</span>
                      <span className="font-medium text-red-600">- ₹{formatAmount(selectedTransaction.tds)}</span>
                    </div>
                    <div className="h-px bg-gray-300 my-2"></div>
                    <div className="flex justify-between text-base">
                      <span className="font-semibold text-gray-700">Net Paid Commission:</span>
                      <span className="font-bold text-green-600">₹{formatAmount(selectedTransaction.paid_commision)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TDSCommissionPage;