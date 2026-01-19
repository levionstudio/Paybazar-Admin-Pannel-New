import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  UserX, 
  UserCheck, 
  Eye, 
  Edit, 
  Ban, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'retailer' | 'distributor';
  status: 'active' | 'blocked' | 'suspended';
  kycStatus: 'verified' | 'pending' | 'rejected';
  joinDate: string;
  lastActive: string;
  location: string;
  totalTransactions: number;
  totalCommission: number;
  avatar?: string;
}

const mockUsers: User[] = [
  {
    id: 'RT001',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 9876543210',
    type: 'retailer',
    status: 'active',
    kycStatus: 'verified',
    joinDate: '2024-01-15',
    lastActive: '2 hours ago',
    location: 'Mumbai, Maharashtra',
    totalTransactions: 245,
    totalCommission: 12450
  },
  {
    id: 'DT005',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+91 9876543211',
    type: 'distributor',
    status: 'active',
    kycStatus: 'pending',
    joinDate: '2024-02-10',
    lastActive: '1 day ago',
    location: 'Delhi, NCR',
    totalTransactions: 89,
    totalCommission: 4250
  },
  {
    id: 'RT003',
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '+91 9876543212',
    type: 'retailer',
    status: 'blocked',
    kycStatus: 'rejected',
    joinDate: '2024-01-20',
    lastActive: '3 days ago',
    location: 'Ahmedabad, Gujarat',
    totalTransactions: 156,
    totalCommission: 7800
  }
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || user.type === filterType;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const toggleUserStatus = (userId: string, newStatus: 'active' | 'blocked') => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    
    toast({
      title: newStatus === 'active' ? 'User Unblocked' : 'User Blocked',
      description: `User ${userId} has been ${newStatus === 'active' ? 'unblocked' : 'blocked'} successfully.`,
      variant: newStatus === 'active' ? 'default' : 'destructive'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'suspended':
        return <Badge className="bg-warning text-warning-foreground">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getKycBadge = (kycStatus: string) => {
    switch (kycStatus) {
      case 'verified':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{kycStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage retailer and distributor portals</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="gradient-primary text-primary-foreground shadow-glow">
            <UserCheck className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-poppins">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blocked Users</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {users.filter(u => u.status === 'blocked').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending KYC</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {users.filter(u => u.kycStatus === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Distributors</p>
                <p className="text-2xl font-bold font-poppins text-foreground">
                  {users.filter(u => u.type === 'distributor').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-poppins">Users List</CardTitle>
          <CardDescription>Manage individual user portals and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="gradient-primary text-primary-foreground">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.id}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.type === 'distributor' ? 'default' : 'secondary'}>
                        {user.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                    <TableCell className="font-mono">{user.totalTransactions}</TableCell>
                    <TableCell className="font-mono">₹{user.totalCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastActive}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-poppins">User Details</DialogTitle>
                              <DialogDescription>Complete user information and controls</DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-6">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedUser.avatar} />
                                    <AvatarFallback className="gradient-primary text-primary-foreground text-lg">
                                      {selectedUser.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                                    <p className="text-muted-foreground">{selectedUser.id}</p>
                                    {getStatusBadge(selectedUser.status)}
                                  </div>
                                </div>
                                
                                <Tabs defaultValue="details" className="w-full">
                                  <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="activity">Activity</TabsTrigger>
                                    <TabsTrigger value="controls">Controls</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="details" className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center">
                                          <Mail className="w-4 h-4 mr-2" />
                                          Email
                                        </Label>
                                        <p className="text-sm">{selectedUser.email}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center">
                                          <Phone className="w-4 h-4 mr-2" />
                                          Phone
                                        </Label>
                                        <p className="text-sm">{selectedUser.phone}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center">
                                          <MapPin className="w-4 h-4 mr-2" />
                                          Location
                                        </Label>
                                        <p className="text-sm">{selectedUser.location}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center">
                                          <Calendar className="w-4 h-4 mr-2" />
                                          Join Date
                                        </Label>
                                        <p className="text-sm">{selectedUser.joinDate}</p>
                                      </div>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="activity" className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <Card>
                                        <CardContent className="p-4">
                                          <p className="text-sm font-medium">Total Transactions</p>
                                          <p className="text-2xl font-bold">{selectedUser.totalTransactions}</p>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardContent className="p-4">
                                          <p className="text-sm font-medium">Total Commission</p>
                                          <p className="text-2xl font-bold">₹{selectedUser.totalCommission.toLocaleString()}</p>
                                        </CardContent>
                                      </Card>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Last active: {selectedUser.lastActive}</p>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="controls" className="space-y-4">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <Label className="text-sm font-medium">Portal Access</Label>
                                          <p className="text-sm text-muted-foreground">Enable or disable user portal access</p>
                                        </div>
                                        <Switch
                                          checked={selectedUser.status === 'active'}
                                          onCheckedChange={(checked) => {
                                            toggleUserStatus(selectedUser.id, checked ? 'active' : 'blocked');
                                            setSelectedUser(prev => prev ? { ...prev, status: checked ? 'active' : 'blocked' } : null);
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">KYC Status</Label>
                                        {getKycBadge(selectedUser.kycStatus)}
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant={user.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.status === 'active' ? 'blocked' : 'active')}
                        >
                          {user.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
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