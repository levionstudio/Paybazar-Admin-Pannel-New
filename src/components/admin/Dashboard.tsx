import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp,
  AlertTriangle,
  Activity,
  FileText,
  Loader2,
  Wallet,
  Building2,
  UserCog,
  ShoppingCart
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
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
  
  // Stats
  const [totalMDs, setTotalMDs] = useState(0);
  const [totalDistributors, setTotalDistributors] = useState(0);
  const [totalRetailers, setTotalRetailers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [rechargeKitBalance, setRechargeKitBalance] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  // Transaction trends (last 6 months)
  const [transactionTrends, setTransactionTrends] = useState<any[]>([]);
  
  // Recent activities
  const [recentActivities, setRecentActivities] = useState<Transaction[]>([]);

  const [walletBalance, setWalletBalance] = useState<number>(0);

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

  // Initialize adminId from toke
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

        const balance =
          response.data?.data?.balance ??
          response.data?.data?.wallet_balance ??
          response.data?.balance ??
          0;

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

        // Fetch Master Distributors
        const mdResponse = await axios.get(
          `${API_BASE_URL}/admin/get/md/${adminId}`,
          { headers }
        );

        let masterDistributors: any[] = [];
        if (mdResponse.data.status === "success" && mdResponse.data.data) {
          masterDistributors = Array.isArray(mdResponse.data.data)
            ? mdResponse.data.data
            : mdResponse.data.data.master_distributors || [];
        }

        // Fetch all Distributors
        const distributorPromises = masterDistributors.map((md) =>
          axios.get(
            `${API_BASE_URL}/admin/get/distributors/${md.master_distributor_id}`,
            { headers }
          ).catch(() => ({ data: { data: [] } }))
        );

        const distributorResponses = await Promise.all(distributorPromises);
        let allDistributors: any[] = [];
        distributorResponses.forEach((response) => {
          if (response.data.status === "success" && response.data.data) {
            const dists = Array.isArray(response.data.data)
              ? response.data.data
              : response.data.data.distributors || [];
            allDistributors = [...allDistributors, ...dists];
          }
        });

        // Fetch Users (Retailers)
        const userResponse = await axios.get(
          `${API_BASE_URL}/admin/get/user/${adminId}`,
          { headers }
        );

        let users: any[] = [];
        if (userResponse.data.status === "success" && userResponse.data.data) {
          users = Array.isArray(userResponse.data.data)
            ? userResponse.data.data
            : userResponse.data.data.users || [];
        }

        // Calculate wallet balances
        const mdBalance = masterDistributors.reduce(
          (sum, md) => sum + parseFloat(md.master_distributor_wallet_balance || "0"),
          0
        );
        const distBalance = allDistributors.reduce(
          (sum, d) => sum + parseFloat(d.distributor_wallet_balance || "0"),
          0
        );
        const userBalance = users.reduce(
          (sum, u) => sum + parseFloat(u.user_wallet_balance || "0"),
          0
        );

        setTotalMDs(masterDistributors.length);
        setTotalDistributors(allDistributors.length);
        setTotalRetailers(users.length);
        setTotalUsers(masterDistributors.length + allDistributors.length + users.length);
        setTotalBalance(mdBalance + distBalance + userBalance);

        // Fetch recharge kit balance
        const rechargeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6MTkyLCJpYXQiOjE3NjE5ODg5MzV9.vES6PQZ2oIKecI6ZYwMZbL3QsvuZu4HZL8ma9WREFug";
        const rechargeResponse = await axios.get(
          "https://v2bapi.rechargkit.biz/recharge/balanceCheck",
          { 
            headers: { 
              Authorization: `Bearer ${rechargeToken}` 
            } 
          }
        ).catch(() => ({ data: { error: 1, wallet_amount: 0 } }));

        if (rechargeResponse.data.error === 0) {
          setRechargeKitBalance(parseFloat(rechargeResponse.data.wallet_amount || "0"));
        }

        // Fetch admin wallet transactions
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
        
        // Sort and get latest 4 transactions
        const sortedTxn = allTransactionsList.sort((a: Transaction, b: Transaction) => {
          const getTimestamp = (tx: Transaction) => {
            const dateField = tx.transaction_date_and_time || tx.transaction_date || tx.created_at || tx.timestamp;
            if (dateField) {
              return new Date(dateField).getTime();
            }
            return parseInt(tx.transaction_id) || 0;
          };
          return getTimestamp(b) - getTimestamp(a);
        }).slice(0, 4);
        
        setRecentActivities(sortedTxn);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [adminId]);

  // Process transaction trends for last 6 months
  const processTransactionTrends = (transactions: Transaction[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      
      const monthTxns = transactions.filter(tx => {
        const txDate = new Date(tx.transaction_date_and_time || tx.transaction_date || tx.created_at || tx.timestamp || 0);
        return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
    if (statusUpper === 'SUCCESS') {
      return { variant: 'default' as const, className: 'bg-success text-success-foreground' };
    } else if (statusUpper === 'PENDING') {
      return { variant: 'secondary' as const, className: 'bg-warning text-warning-foreground' };
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
    {
      title: 'Total Network Balance',
      value: formatCurrency(totalBalance),
      icon: DollarSign,
      description: 'All users combined',
      color: 'text-primary',
      onClick: () => navigate('/admin/logs')
    },
    {
      title: 'Recharge Kit Balance',
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening with your platform.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Export Report</Button>
          <Button 
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => navigate('/admin/logs')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-poppins text-foreground">{stat.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats - Network Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Master Distributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-poppins text-foreground">{totalMDs}</div>
            <p className="text-xs text-muted-foreground mt-1">Total MDs in network</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              Distributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-poppins text-foreground">{totalDistributors}</div>
            <p className="text-xs text-muted-foreground mt-1">Active distributors</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Retailers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-poppins text-foreground">{totalRetailers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total retailers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transaction Trends */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="font-poppins">Transaction Trends</CardTitle>
            <CardDescription>Credit vs Debit over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={transactionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="credit" 
                  stackId="1" 
                  stroke="hsl(142 76% 36%)" 
                  fill="hsl(142 76% 36% / 0.8)" 
                  name="Credit"
                />
                <Area 
                  type="monotone" 
                  dataKey="debit" 
                  stackId="1" 
                  stroke="hsl(0 84% 60%)" 
                  fill="hsl(0 84% 60% / 0.8)" 
                  name="Debit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Commission Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-poppins">Commission Distribution</CardTitle>
            <CardDescription>Revenue share by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={commissionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {commissionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                  formatter={(value: number) => `${value}%`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="font-poppins flex items-center">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest transactions and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent transactions
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const badge = getStatusBadge(activity.transaction_status);
                  const displayName = activity.phone_number || activity.transactor_name || activity.receiver_name || 'N/A';
                  return (
                    <div 
                      key={activity.transaction_id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium text-foreground font-mono text-sm">
                            {displayName}
                          </div>
                          <Badge 
                            variant={badge.variant}
                            className={badge.className}
                          >
                            {activity.transaction_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.transfer_type || activity.transaction_type || 'Transaction'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          ₹{parseFloat(activity.amount || '0').toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(
                            activity.transaction_date_and_time || 
                            activity.transaction_date || 
                            activity.created_at || 
                            ''
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/admin/logs')}
            >
              <FileText className="mr-2 h-4 w-4" />
              View All Logs
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-poppins flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-warning" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Master Distributors</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">View and manage MDs</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 w-full"
                  onClick={() => navigate('/admin/info/md')}
                >
                  View MDs
                </Button>
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">User Management</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Manage retailer & distributor access</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 w-full"
                  onClick={() => navigate('/admin/info/md')}
                >
                  Manage Users
                </Button>
              </div>

              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Wallet Transactions</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">View wallet transaction history</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 w-full"
                  onClick={() => navigate('/admin/logs')}
                >
                  View Transactions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}