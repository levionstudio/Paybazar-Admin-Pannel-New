import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Activity, User, Shield, CreditCard, Settings, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const mockActivityLogs = [
  {
    id: 'LOG001',
    user: 'John Doe',
    userType: 'Retailer',
    action: 'Login',
    category: 'Authentication',
    description: 'User logged in successfully',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 10:30:25',
    status: 'Success',
    riskLevel: 'Low',
  },
  {
    id: 'LOG002',
    user: 'Jane Smith',
    userType: 'Distributor',
    action: 'Payment Transaction',
    category: 'Transaction',
    description: 'DMT transaction of ₹5,000 to account ending 1234',
    ipAddress: '192.168.1.101',
    timestamp: '2024-01-15 10:25:14',
    status: 'Success',
    riskLevel: 'Medium',
  },


];

const statusColors = {
  'Success': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const riskColors = {
  'Low': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'High': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const categoryIcons = {
  'Authentication': Shield,
  'Transaction': CreditCard,
  'User Management': User,
  'API Management': Settings,
  'System': Activity,
};

export function ActivityLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredLogs = mockActivityLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || log.riskLevel === riskFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesRisk;
  });

  const stats = {
    total: mockActivityLogs.length,
    success: mockActivityLogs.filter(log => log.status === 'Success').length,
    failed: mockActivityLogs.filter(log => log.status === 'Failed').length,
    highRisk: mockActivityLogs.filter(log => log.riskLevel === 'High').length,
  };
return (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
      <p className="text-muted-foreground">Monitor and audit all system activities</p>
    </div>

    {/* Stats Cards */}
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Successful</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <Activity className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Risk</CardTitle>
          <Shield className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
        </CardContent>
      </Card>
    </div>

    {/* Filters */}
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>Filter and monitor system activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="lg:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Authentication">Authentication</SelectItem>
              <SelectItem value="Transaction">Transaction</SelectItem>
              <SelectItem value="User Management">User Management</SelectItem>
              <SelectItem value="API Management">API Management</SelectItem>
              <SelectItem value="System">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="lg:w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Success">Success</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="lg:w-[140px]">
              <SelectValue placeholder="All Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="lg:w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Table without IP + Timestamp */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const IconComponent = categoryIcons[log.category as keyof typeof categoryIcons] || Activity;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.user}</div>
                        <div className="text-xs text-muted-foreground">{log.userType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        {log.action}
                      </div>
                    </TableCell>
                    <TableCell>{log.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[log.status as keyof typeof statusColors]}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);
}