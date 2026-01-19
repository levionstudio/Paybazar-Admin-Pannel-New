import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, MessageSquare, Clock, CheckCircle, XCircle, Eye, Reply } from 'lucide-react';

const mockQueries = [
  {
    id: 'SUP001',
    user: 'John Doe',
    userType: 'Retailer',
    subject: 'Payment Gateway Issue',
    category: 'Technical',
    priority: 'High',
    status: 'Open',
    createdAt: '2024-01-15',
    lastUpdated: '2024-01-15',
    description: 'Unable to process payments through the gateway. Getting error code 502.',
  },
  {
    id: 'SUP002',
    user: 'Jane Smith',
    userType: 'Distributor',
    subject: 'Commission Calculation Error',
    category: 'Billing',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '2024-01-14',
    lastUpdated: '2024-01-15',
    description: 'Commission rates are not calculating correctly for AEPS transactions.',
  },
  {
    id: 'SUP003',
    user: 'Mike Johnson',
    userType: 'Retailer',
    subject: 'Account Verification',
    category: 'Account',
    priority: 'Low',
    status: 'Resolved',
    createdAt: '2024-01-13',
    lastUpdated: '2024-01-14',
    description: 'Need help with account verification process.',
  },
];

const statusColors = {
  'Open': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const priorityColors = {
  'High': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Low': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

export function SupportQueries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedQuery, setSelectedQuery] = useState<any>(null);

  const filteredQueries = mockQueries.filter(query => {
    const matchesSearch = query.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         query.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         query.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || query.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || query.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: mockQueries.length,
    open: mockQueries.filter(q => q.status === 'Open').length,
    inProgress: mockQueries.filter(q => q.status === 'In Progress').length,
    resolved: mockQueries.filter(q => q.status === 'Resolved').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Queries</h1>
        <p className="text-muted-foreground">Manage and resolve customer support requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Support Queries</CardTitle>
          <CardDescription>Filter and manage customer support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="md:w-[180px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueries.map((query) => (
                  <TableRow key={query.id}>
                    <TableCell className="font-medium">{query.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{query.user}</div>
                        <div className="text-xs text-muted-foreground">{query.userType}</div>
                      </div>
                    </TableCell>
                    <TableCell>{query.subject}</TableCell>
                    <TableCell>{query.category}</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[query.priority as keyof typeof priorityColors]}>
                        {query.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[query.status as keyof typeof statusColors]}>
                        {query.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{query.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedQuery(query)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Query Details - {query.id}</DialogTitle>
                              <DialogDescription>
                                Support query from {query.user}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Subject</label>
                                  <p className="text-sm text-muted-foreground">{query.subject}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Category</label>
                                  <p className="text-sm text-muted-foreground">{query.category}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Priority</label>
                                  <Badge className={priorityColors[query.priority as keyof typeof priorityColors]}>
                                    {query.priority}
                                  </Badge>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Badge className={statusColors[query.status as keyof typeof statusColors]}>
                                    {query.status}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground mt-1">{query.description}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Response</label>
                                <Textarea placeholder="Type your response here..." className="mt-1" />
                              </div>
                              <div className="flex gap-2">
                                <Button>
                                  <Reply className="h-4 w-4 mr-2" />
                                  Send Response
                                </Button>
                                <Select>
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Change Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm">
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}