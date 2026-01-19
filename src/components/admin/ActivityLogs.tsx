import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { 
  Download, 
  Search,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  User,
  CreditCard,
  Settings,
  Eye,
  FileText,
  Calendar
} from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: 'USER' | 'TRANSACTION' | 'API' | 'SECURITY' | 'SYSTEM';
  status: 'success' | 'failed' | 'pending';
  riskLevel: 'low' | 'medium' | 'high';
  ipAddress: string;
  userAgent: string;
  details: string;
  amount?: number;
  transactionId?: string;
}

const mockActivityLogs: ActivityLog[] = [
  {
    id: 'LOG001',
    timestamp: '2024-01-20T14:30:00Z',
    userId: 'RT001',
    userName: 'Rajesh Kumar',
    action: 'DMT Transfer',
    category: 'TRANSACTION',
    status: 'success',
    riskLevel: 'low',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Chrome/91.0',
    details: 'DMT transfer of ₹5000 to beneficiary',
    amount: 5000,
    transactionId: 'TXN001'
  },
  {
    id: 'LOG002',
    timestamp: '2024-01-20T14:25:00Z',
    userId: 'DT005',
    userName: 'Priya Sharma',
    action: 'Login Attempt',
    category: 'SECURITY',
    status: 'failed',
    riskLevel: 'high',
    ipAddress: '203.112.45.78',
    userAgent: 'Mozilla/5.0 Firefox/88.0',
    details: 'Failed login attempt - incorrect password'
  },
  {
    id: 'LOG003',
    timestamp: '2024-01-20T14:20:00Z',
    userId: 'AD001',
    userName: 'Admin User',
    action: 'User Status Update',
    category: 'USER',
    status: 'success',
    riskLevel: 'medium',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Safari/14.0',
    details: 'Changed user status from Active to Blocked'
  },
  {
    id: 'LOG004',
    timestamp: '2024-01-20T14:15:00Z',
    userId: 'RT007',
    userName: 'Amit Singh',
    action: 'API Key Generated',
    category: 'API',
    status: 'success',
    riskLevel: 'low',
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 Chrome/91.0',
    details: 'Generated new API key for DMT service'
  },
  {
    id: 'LOG005',
    timestamp: '2024-01-20T14:10:00Z',
    userId: 'SYS001',
    userName: 'System',
    action: 'Database Backup',
    category: 'SYSTEM',
    status: 'success',
    riskLevel: 'low',
    ipAddress: '127.0.0.1',
    userAgent: 'System Process',
    details: 'Automated daily database backup completed'
  }
];

const statusColors = {
  success: 'bg-success text-success-foreground',
  failed: 'bg-destructive text-destructive-foreground',
  pending: 'bg-warning text-warning-foreground'
};

const riskColors = {
  low: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20'
};

const categoryIcons = {
  USER: User,
  TRANSACTION: CreditCard,
  API: Settings,
  SECURITY: Shield,
  SYSTEM: Activity
};

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>(mockActivityLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || log.riskLevel === riskFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesRisk;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(log => log.status === 'success').length,
    failed: logs.filter(log => log.status === 'failed').length,
    highRisk: logs.filter(log => log.riskLevel === 'high').length,
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCategoryIcon = (category: ActivityLog['category']) => {
    const Icon = categoryIcons[category];
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: ActivityLog['status']) => {
    const StatusIcon = status === 'success' ? CheckCircle : status === 'failed' ? XCircle : Info;
    return (
      <Badge className={statusColors[status]}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRiskBadge = (risk: ActivityLog['riskLevel']) => {
    const RiskIcon = risk === 'high' ? AlertTriangle : risk === 'medium' ? Info : CheckCircle;
    return (
      <Badge variant="outline" className={riskColors[risk]}>
        <RiskIcon className="w-3 h-3 mr-1" />
        {risk.charAt(0).toUpperCase() + risk.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">Monitor system activities and user actions</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.total}</p>
              </div>
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.success}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.failed}</p>
              </div>
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.highRisk}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs Table */}
      <Card className="shadow-card w-[1200px]">
        <CardHeader>
          <CardTitle className="font-poppins">Activity Logs</CardTitle>
          <CardDescription>View and filter system activity logs</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="TRANSACTION">Transaction</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Timestamp</TableHead>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead className="min-w-[150px]">Action</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Risk Level</TableHead>
                    <TableHead className="min-w-[120px]">IP Address</TableHead>
                    <TableHead className="min-w-[300px]">Details</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.userName}</p>
                          <p className="text-sm text-muted-foreground">{log.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(log.category)}
                          <span className="font-medium">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.category}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{getRiskBadge(log.riskLevel)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{log.ipAddress}</code>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm truncate" title={log.details}>
                            {log.details}
                          </p>
                          {log.amount && (
                            <p className="text-xs text-muted-foreground">
                              Amount: ₹{log.amount.toLocaleString()}
                            </p>
                          )}
                          {log.transactionId && (
                            <p className="text-xs text-muted-foreground">
                              TXN: {log.transactionId}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No activity logs found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}