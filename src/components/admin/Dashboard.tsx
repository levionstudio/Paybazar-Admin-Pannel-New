import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, CreditCard, TrendingUp, AlertTriangle, Activity, FileText, Loader2, Wallet, Building2, UserCog, ShoppingCart, Download } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DecodedToken {
  admin_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface FundRequest {
  fund_request_id: number;
  requester_id: string;
  request_to_id: string;
  amount: number;
  utr_number: string;
  bank_name: string;
  business_name: string;
  remarks: string;
  reject_remarks: string;
  request_status: string;
  request_type: string;
  request_date: string;
  created_at: string;
  updated_at: string;
  afterBalance?: number;
}

interface Transaction {
  transaction_id: string;
  transaction_date?: string;
  transaction_date_and_time?: string;
  created_at?: string;
  phone_number?: string;
  transactor_name?: string;
  receiver_name?: string;
  amount: string;
  transaction_status: string;
  transaction_type?: string;
  transfer_type?: string;
  timestamp?: string;
}

interface MasterDistributor {
  master_distributor_id: string;
  admin_id: string;
  master_distributor_name: string;
  master_distributor_phone: string;
  master_distributor_email: string;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface Distributor {
  distributor_id: string;
  master_distributor_id: string;
  distributor_name: string;
  distributor_phone: string;
  distributor_email: string;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface Retailer {
  retailer_id: string;
  distributor_id: string;
  retailer_name: string;
  retailer_phone: string;
  retailer_email: string;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

const commissionData = [
  { name: 'Admin', value: 29.17, color: 'hsl(205 85% 15%)' },
  { name: 'MD', value: 4.17, color: 'hsl(205 85% 25%)' },
  { name: 'Distributor', value: 16.67, color: 'hsl(205 85% 35%)' },
  { name: 'Retailer', value: 50, color: 'hsl(205 85% 45%)' },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Auth headers helper
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState("");
  const [exportingReport, setExportingReport] = useState(false);

  // Stats
  const [totalMDs, setTotalMDs] = useState(0);
  const [totalDistributors, setTotalDistributors] = useState(0);
  const [totalRetailers, setTotalRetailers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [rechargeKitBalance, setRechargeKitBalance] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

  // Transaction trends (last 6 months)
  const [transactionTrends, setTransactionTrends] = useState([]);

  // Recent fund requests (today's latest 3)
  const [recentFundRequests, setRecentFundRequests] = useState<FundRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

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
      return null;
    }
  }

  // Initialize adminId from token
  useEffect(() => {
    const id = getAdminIdFromToken();
    if (id) {
      setAdminId(id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      const adminId = getAdminIdFromToken();
      if (!adminId) return;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/wallet/get/balance/admin/${adminId}`,
          getAuthHeaders()
        );

        const balance = response.data?.data?.balance ?? 
                       response.data?.data?.wallet_balance ?? 
                       response.data?.balance ?? 0;
        setWalletBalance(Number(balance));
      } catch (error) {
        console.error("Wallet fetch failed", error);
        toast.error("Failed to fetch wallet balance");
      }
    };

    fetchWalletBalance();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!adminId) return;

      setLoading(true);
      try {
        const headers = getAuthHeaders().headers;

        // Fetch Master Distributors directly from admin endpoint
        const mdResponse = await axios.get(
          `${API_BASE_URL}/md/get/admin/${adminId}`,
          { headers }
        );

        let masterDistributors: MasterDistributor[] = [];
        if (mdResponse.data.status === "success" && mdResponse.data.data) {
          masterDistributors = Array.isArray(mdResponse.data.data) 
            ? mdResponse.data.data 
            : mdResponse.data.data.master_distributors || [];
        }

        // Fetch all Distributors directly from admin endpoint
        const distributorResponse = await axios.get(
          `${API_BASE_URL}/distributor/get/admin/${adminId}`,
          { headers }
        );

        let allDistributors: Distributor[] = [];
        if (distributorResponse.data.status === "success" && distributorResponse.data.data) {
          allDistributors = Array.isArray(distributorResponse.data.data)
            ? distributorResponse.data.data
            : distributorResponse.data.data.distributors || [];
        }

        // Fetch Retailers directly from admin endpoint
        const retailerResponse = await axios.get(
          `${API_BASE_URL}/retailer/get/admin/${adminId}`,
          { headers }
        );

        let retailers: Retailer[] = [];
        if (retailerResponse.data.status === "success" && retailerResponse.data.data) {
          retailers = Array.isArray(retailerResponse.data.data)
            ? retailerResponse.data.data
            : retailerResponse.data.data.retailers || [];
        }

        // Calculate wallet balances
        const mdBalance = masterDistributors.reduce(
          (sum, md) => sum + (md.wallet_balance || 0),
          0
        );

        const distBalance = allDistributors.reduce(
          (sum, d) => sum + (d.wallet_balance || 0),
          0
        );

        const retailerBalance = retailers.reduce(
          (sum, r) => sum + (r.wallet_balance || 0),
          0
        );

        setTotalMDs(masterDistributors.length);
        setTotalDistributors(allDistributors.length);
        setTotalRetailers(retailers.length);
        setTotalUsers(masterDistributors.length + allDistributors.length + retailers.length);
        setTotalBalance(mdBalance + distBalance + retailerBalance);

        // Fetch recharge kit balance
        try {
          const rechargeResponse = await axios.get(
            `https://testing.paybazaar.in/admin/get/rechargekit/wallet/balance`,
            { headers }
          );

          if (rechargeResponse.data.status === "success" && rechargeResponse.data.data?.response) {
            const walletAmount = rechargeResponse.data.data.response.wallet_amount || 0;
            setRechargeKitBalance(parseFloat(walletAmount.toString()));
          }
        } catch (error) {
          console.error("Failed to fetch recharge kit balance:", error);
          setRechargeKitBalance(0);
        }

        // Fetch fund requests - Latest 3 from today
        await fetchTodaysFundRequests(adminId);

        // Fetch admin wallet transactions for graph
        const walletTxnResponse = await axios.get(
          `${API_BASE_URL}/admin/wallet/get/transactions/${adminId}`,
          { headers }
        ).catch(() => ({ data: { status: 'failed', data: [] } }));

        let allTransactionsList: Transaction[] = [];
        if (walletTxnResponse.data.status === "success" && walletTxnResponse.data.data) {
          const walletTxns = Array.isArray(walletTxnResponse.data.data)
            ? walletTxnResponse.data.data
            : [];
          allTransactionsList = [...walletTxns];
        }

        // Fetch payout transactions
        const payoutTxnResponse = await axios.get(
          `${API_BASE_URL}/admin/payout/get/all/transactions/${adminId}`,
          { headers }
        ).catch(() => ({ data: { status: 'failed', data: [] } }));

        if (payoutTxnResponse.data.status === "success" && payoutTxnResponse.data.data) {
          const payoutTxns = Array.isArray(payoutTxnResponse.data.data)
            ? payoutTxnResponse.data.data
            : payoutTxnResponse.data.data.transactions || [];
          allTransactionsList = [...allTransactionsList, ...payoutTxns];
        }

        setTotalTransactions(allTransactionsList.length);

        // Process transaction trends (last 6 months)
        const monthlyData = processTransactionTrends(allTransactionsList);
        setTransactionTrends(monthlyData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [adminId]);

  // Fetch today's latest 3 fund requests
  const fetchTodaysFundRequests = async (userId: string) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const payload = {
        id: userId,
        start_date: startOfDay,
        end_date: endOfDay,
      };

      const response = await axios.post(
        `${API_BASE_URL}/fund_request/get/request_to`,
        payload,
        getAuthHeaders()
      );

      const data = response.data.data;
      const requestsList = Array.isArray(data?.fund_requests) ? data.fund_requests : [];

      // Sort by created_at (latest first) and take top 3
      const sortedRequests = [...requestsList].sort((a: FundRequest, b: FundRequest) => {
        try {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
          return timeB - timeA;
        } catch {
          return 0;
        }
      }).slice(0, 3);

      setRecentFundRequests(sortedRequests);
    } catch (error) {
      console.error("Failed to fetch today's fund requests:", error);
      setRecentFundRequests([]);
    }
  };

  // Process transaction trends for last 6 months
  const processTransactionTrends = (transactions: Transaction[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];

      const monthTxns = transactions.filter(tx => {
        const txDate = new Date(
          tx.transaction_date_and_time || 
          tx.transaction_date || 
          tx.created_at || 
          tx.timestamp || 
          0
        );
        return txDate.getMonth() === date.getMonth() && 
               txDate.getFullYear() === date.getFullYear();
      });

      const creditTotal = monthTxns
        .filter(tx => tx.transaction_type?.toUpperCase() === 'CREDIT')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

      const debitTotal = monthTxns
        .filter(tx => tx.transaction_type?.toUpperCase() === 'DEBIT')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

      last6Months.push({
        month: monthName,
        credit: Math.round(creditTotal),
        debit: Math.round(debitTotal),
      });
    }

    return last6Months;
  };
const csvEscape = (value: any) => {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

const csvNumber = (value: any) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

  // Export Report Function
const handleExportReport = async () => {
  setExportingReport(true);
  try {
    let csv = "";

    // ================= HEADER =================
    csv += "Dashboard Report\n";
    csv += `Generated At,${csvEscape(new Date().toLocaleString())}\n\n`;

    // ================= SUMMARY =================
    csv += "SUMMARY\n";
    csv += "Metric,Value\n";
    csv += `Admin Wallet Balance,${csvNumber(walletBalance)}\n`;
    csv += `Total Network Balance,${csvNumber(totalBalance)}\n`;
    csv += `Recharge Kit Balance,${csvNumber(rechargeKitBalance)}\n`;
    csv += `Total Users,${totalUsers}\n`;
    csv += `Master Distributors,${totalMDs}\n`;
    csv += `Distributors,${totalDistributors}\n`;
    csv += `Retailers,${totalRetailers}\n`;

 

    // ================= FUND REQUESTS =================
    csv += "RECENT FUND REQUESTS (Today)\n";
    csv += "Request ID,Requester ID,Amount,Status,Bank,Business,UTR,Remarks,Created At\n";

    recentFundRequests.forEach((r) => {
      csv += [
        r.fund_request_id,
        csvEscape(r.requester_id),
        csvNumber(r.amount),
        csvEscape(r.request_status),
        csvEscape(r.bank_name),
        csvEscape(r.business_name),
        csvEscape(r.utr_number),
        csvEscape(r.remarks),
        csvEscape(new Date(r.created_at).toLocaleString()),
      ].join(",") + "\n";
    });

    // ================= DOWNLOAD =================
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard_report_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Report exported successfully");
  } catch (err) {
    console.error(err);
    toast.error("Failed to export report");
  } finally {
    setExportingReport(false);
  }
};


  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} mins ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase();
    if (statusUpper === 'SUCCESS' || statusUpper === 'APPROVED') {
      return { variant: 'default' as const, className: 'bg-green-500 text-white' };
    } else if (statusUpper === 'PENDING') {
      return { variant: 'secondary' as const, className: 'bg-yellow-500 text-white' };
    } else if (statusUpper === 'REJECTED') {
      return { variant: 'destructive' as const, className: 'bg-red-500 text-white' };
    }
    return { variant: 'outline' as const, className: 'border-primary text-primary' };
  };

  const stats = [
    {
      title: 'Admin Wallet Balance',
      value: formatCurrency(walletBalance),
      icon: Wallet,
      description: 'Your wallet balance',
      color: 'text-success',
      onClick: () => navigate('/admin/logs')
    },
    // {
    //   title: 'Total Network Balance',
    //   value: formatCurrency(totalBalance),
    //   icon: DollarSign,
    //   description: 'All users combined',
    //   color: 'text-primary',
    //   onClick: () => navigate('/admin/logs')
    // },
    {
      title: 'RechargeKit Balance \n(Recharge)',
      value: formatCurrency(rechargeKitBalance),
      icon: ShoppingCart,
      description: 'Available balance',
      color: 'text-accent',
      onClick: () => {}
    },
     {
      title: 'RechargeKit Balance \n(Settlement)',
      value: formatCurrency(rechargeKitBalance),
      icon: ShoppingCart,
      description: 'Available balance',
      color: 'text-accent',
      onClick: () => {}
    },
   

    {
      title: 'Active Users',
      value: totalUsers.toString(),
      icon: Users,
      description: 'MDs, Distributors & Retailers',
      color: 'text-warning',
      onClick: () => navigate('/admin/info/md')
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportReport}
            disabled={exportingReport}
          >
            {exportingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/admin/logs')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats - Network Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Distributors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMDs}</div>
            <p className="text-xs text-muted-foreground">Total MDs in network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distributors</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDistributors}</div>
            <p className="text-xs text-muted-foreground">Active distributors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retailers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRetailers}</div>
            <p className="text-xs text-muted-foreground">Total retailers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-1">
        {/* Transaction Trends */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Transaction Trends</CardTitle>
            <CardDescription>Credit vs Debit over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transactionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="credit" 
                  stackId="1" 
                  stroke="hsl(142 76% 36%)" 
                  fill="hsl(142 76% 36%)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="debit" 
                  stackId="2" 
                  stroke="hsl(0 84% 60%)" 
                  fill="hsl(0 84% 60%)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}

        {/* Commission Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Distribution</CardTitle>
            <CardDescription>Revenue share by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={commissionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {commissionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Fund Requests (Today's Latest 3) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Fund Requests</CardTitle>
            <CardDescription>Today's latest requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFundRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No fund requests today</p>
                </div>
              ) : (
                recentFundRequests.map((request) => {
                  const badge = getStatusBadge(request.request_status);

                  return (
                    <div 
                      key={request.fund_request_id} 
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{request.business_name}</p>
                          <Badge {...badge}>
                            {request.request_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {request.bank_name} • UTR: {request.utr_number}
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          "{request.remarks}"
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold">
                          ₹{request.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(request.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/admin/fund-requests')}
            >
              View All Requests
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Master Distributors</CardTitle>
                </div>
                <CardDescription>View and manage MDs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/admin/info/md')}
                >
                  View MDs
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">User Management</CardTitle>
                </div>
                <CardDescription>Manage retailer & distributor access</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/admin/info/md')}
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Wallet Transactions</CardTitle>
                </div>
                <CardDescription>View wallet transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/admin/logs')}
                >
                  View Transactions
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}