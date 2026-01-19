import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  Settings, 
  Download,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Banknote,
  Percent,
  Calculator
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface CommissionRate {
  id: string;
  serviceType: 'DMT' | 'AEPS' | 'BILL_PAYMENT' | 'RECHARGE';
  userType: 'retailer' | 'distributor';
  rate: number; // percentage
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
}

interface CommissionLog {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  serviceType: string;
  transactionAmount: number;
  commissionAmount: number;
  commissionRate: number;
  transferStatus: 'completed' | 'pending' | 'failed';
  transferDate: string;
  bankAccount: string;
}

const mockRates: CommissionRate[] = [
  {
    id: 'CR001',
    serviceType: 'DMT',
    userType: 'retailer',
    rate: 0.50,
    minAmount: 100,
    maxAmount: 200000,
    isActive: true
  },
  {
    id: 'CR002',
    serviceType: 'DMT',
    userType: 'distributor',
    rate: 0.75,
    minAmount: 100,
    maxAmount: 500000,
    isActive: true
  },
  {
    id: 'CR003',
    serviceType: 'AEPS',
    userType: 'retailer',
    rate: 0.30,
    minAmount: 100,
    maxAmount: 50000,
    isActive: true
  },
  {
    id: 'CR004',
    serviceType: 'BILL_PAYMENT',
    userType: 'retailer',
    rate: 0.50,
    minAmount: 10,
    maxAmount: 100000,
    isActive: true
  }
];

const mockLogs: CommissionLog[] = [
  {
    id: 'CL001',
    transactionId: 'TXN001',
    userId: 'RT001',
    userName: 'Rajesh Kumar',
    serviceType: 'DMT',
    transactionAmount: 25000,
    commissionAmount: 125,
    commissionRate: 0.50,
    transferStatus: 'completed',
    transferDate: '2024-01-15T10:35:00Z',
    bankAccount: '****1234'
  },
  {
    id: 'CL002',
    transactionId: 'TXN002',
    userId: 'DT005',
    userName: 'Amit Patel',
    serviceType: 'AEPS',
    transactionAmount: 10000,
    commissionAmount: 30,
    commissionRate: 0.30,
    transferStatus: 'completed',
    transferDate: '2024-01-15T11:20:00Z',
    bankAccount: '****5678'
  },
  {
    id: 'CL003',
    transactionId: 'TXN003',
    userId: 'RT003',
    userName: 'Sunita Gupta',
    serviceType: 'BILL_PAYMENT',
    transactionAmount: 5500,
    commissionAmount: 27.5,
    commissionRate: 0.50,
    transferStatus: 'pending',
    transferDate: '2024-01-15T12:05:00Z',
    bankAccount: '****9012'
  }
];

const commissionTrends = [
  { month: 'Jan', dmt: 45000, aeps: 12000, bills: 8500, recharge: 3200 },
  { month: 'Feb', dmt: 52000, aeps: 15000, bills: 9800, recharge: 3800 },
  { month: 'Mar', dmt: 48000, aeps: 13500, bills: 11200, recharge: 4100 },
  { month: 'Apr', dmt: 61000, aeps: 18000, bills: 12500, recharge: 4500 },
  { month: 'May', dmt: 55000, aeps: 16500, bills: 13800, recharge: 4800 },
  { month: 'Jun', dmt: 67000, aeps: 19200, bills: 15200, recharge: 5200 }
];

export function CommissionSystem() {
  const [rates, setRates] = useState<CommissionRate[]>(mockRates);
  const [logs, setLogs] = useState<CommissionLog[]>(mockLogs);
  const [selectedRate, setSelectedRate] = useState<CommissionRate | null>(null);
  const [newRate, setNewRate] = useState({
    serviceType: '',
    userType: '',
    rate: 0,
    minAmount: 0,
    maxAmount: 0
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTotalStats = () => {
    const totalCommission = logs.reduce((acc, log) => acc + log.commissionAmount, 0);
    const completedTransfers = logs.filter(log => log.transferStatus === 'completed').length;
    const pendingTransfers = logs.filter(log => log.transferStatus === 'pending').length;
    
    return { totalCommission, completedTransfers, pendingTransfers, totalLogs: logs.length };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">Commission System</h1>
          <p className="text-muted-foreground mt-2">Manage commission rates and automatic transfers</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-glow">
                <Plus className="mr-2 h-4 w-4" />
                Add Commission Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-poppins">Add Commission Rate</DialogTitle>
                <DialogDescription>Set up commission rates for different services</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select value={newRate.serviceType} onValueChange={(value) => setNewRate(prev => ({ ...prev, serviceType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DMT">DMT</SelectItem>
                        <SelectItem value="AEPS">AEPS</SelectItem>
                        <SelectItem value="BILL_PAYMENT">Bill Payment</SelectItem>
                        <SelectItem value="RECHARGE">Recharge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User Type</Label>
                    <Select value={newRate.userType} onValueChange={(value) => setNewRate(prev => ({ ...prev, userType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retailer">Retailer</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.50"
                    value={newRate.rate}
                    onChange={(e) => setNewRate(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Minimum Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newRate.minAmount}
                      onChange={(e) => setNewRate(prev => ({ ...prev, minAmount: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="200000"
                      value={newRate.maxAmount}
                      onChange={(e) => setNewRate(prev => ({ ...prev, maxAmount: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button className="gradient-primary text-primary-foreground">Add Rate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  ₹{stats.totalCommission.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Transfers</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {stats.completedTransfers}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Transfers</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {stats.pendingTransfers}
                </p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rates</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {rates.filter(rate => rate.isActive).length}
                </p>
              </div>
              <Settings className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Trends Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-poppins">Commission Trends</CardTitle>
          <CardDescription>Monthly commission earnings by service type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={commissionTrends}>
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
              <Area type="monotone" dataKey="dmt" stackId="1" stroke="hsl(205 85% 15%)" fill="hsl(205 85% 15% / 0.8)" />
              <Area type="monotone" dataKey="aeps" stackId="1" stroke="hsl(205 85% 25%)" fill="hsl(205 85% 25% / 0.8)" />
              <Area type="monotone" dataKey="bills" stackId="1" stroke="hsl(205 85% 35%)" fill="hsl(205 85% 35% / 0.8)" />
              <Area type="monotone" dataKey="recharge" stackId="1" stroke="hsl(205 85% 45%)" fill="hsl(205 85% 45% / 0.8)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Commission Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-poppins">Commission Management</CardTitle>
          <CardDescription>Manage commission rates and transfer logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rates">Commission Rates</TabsTrigger>
              <TabsTrigger value="logs">Transfer Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rates" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Type</TableHead>
                      <TableHead>User Type</TableHead>
                      <TableHead>Rate (%)</TableHead>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Max Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Banknote className="h-4 w-4 text-primary" />
                            <span className="font-medium">{rate.serviceType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rate.userType === 'distributor' ? 'default' : 'secondary'}>
                            {rate.userType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          <div className="flex items-center space-x-1">
                            <Percent className="h-3 w-3" />
                            <span>{rate.rate}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">₹{rate.minAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">₹{rate.maxAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={rate.isActive ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                            {rate.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Transaction Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Transfer Status</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono font-medium">{log.transactionId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.userName}</p>
                            <p className="text-sm text-muted-foreground">{log.userId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.serviceType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">₹{log.transactionAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-mono font-semibold text-success">₹{log.commissionAmount}</TableCell>
                        <TableCell className="font-mono">{log.commissionRate}%</TableCell>
                        <TableCell>{getStatusBadge(log.transferStatus)}</TableCell>
                        <TableCell className="font-mono">{log.bankAccount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.transferDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}