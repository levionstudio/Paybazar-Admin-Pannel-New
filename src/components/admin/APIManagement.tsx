import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Key, 
  Settings, 
  Eye, 
  EyeOff,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Code,
  Globe,
  Shield,
  Zap,
  Copy,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APICredential {
  id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  userId: string;
  userName: string;
  serviceType: 'DMT' | 'AEPS' | 'BILL_PAYMENT' | 'RECHARGE' | 'ALL';
  environment: 'sandbox' | 'production';
  status: 'active' | 'inactive' | 'suspended';
  createdDate: string;
  lastUsed: string;
  requestCount: number;
  rateLimit: number;
  permissions: string[];
}

interface APIEndpoint {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  serviceType: string;
  status: 'active' | 'maintenance' | 'deprecated';
  version: string;
  responseTime: number;
  successRate: number;
  lastUpdate: string;
}

const mockCredentials: APICredential[] = [
  {
    id: 'API001',
    name: 'Production DMT API',
    apiKey: 'pk_live_abcd1234efgh5678ijkl',
    secretKey: 'sk_live_mnop9012qrst3456uvwx',
    userId: 'RT001',
    userName: 'Rajesh Kumar',
    serviceType: 'DMT',
    environment: 'production',
    status: 'active',
    createdDate: '2024-01-15T10:00:00Z',
    lastUsed: '2024-01-20T14:30:00Z',
    requestCount: 1250,
    rateLimit: 1000,
    permissions: ['dmt.transfer', 'dmt.status', 'dmt.balance']
  },
  {
    id: 'API002',
    name: 'Sandbox AEPS API',
    apiKey: 'pk_test_yzab7890cdef1234ghij',
    secretKey: 'sk_test_klmn5678opqr9012stuv',
    userId: 'DT005',
    userName: 'Priya Sharma',
    serviceType: 'AEPS',
    environment: 'sandbox',
    status: 'active',
    createdDate: '2024-01-10T09:00:00Z',
    lastUsed: '2024-01-19T11:15:00Z',
    requestCount: 450,
    rateLimit: 500,
    permissions: ['aeps.withdrawal', 'aeps.balance', 'aeps.mini_statement']
  },
  {
    id: 'API002',
    name: 'Sandbox AEPS API',
    apiKey: 'pk_test_yzab7890cdef1234ghij',
    secretKey: 'sk_test_klmn5678opqr9012stuv',
    userId: 'DT005',
    userName: 'Priya Sharma',
    serviceType: 'AEPS',
    environment: 'sandbox',
    status: 'active',
    createdDate: '2024-01-10T09:00:00Z',
    lastUsed: '2024-01-19T11:15:00Z',
    requestCount: 450,
    rateLimit: 500,
    permissions: ['aeps.withdrawal', 'aeps.balance', 'aeps.mini_statement']
  },
  {
    id: 'API002',
    name: 'Sandbox AEPS API',
    apiKey: 'pk_test_yzab7890cdef1234ghij',
    secretKey: 'sk_test_klmn5678opqr9012stuv',
    userId: 'DT005',
    userName: 'Priya Sharma',
    serviceType: 'AEPS',
    environment: 'sandbox',
    status: 'active',
    createdDate: '2024-01-10T09:00:00Z',
    lastUsed: '2024-01-19T11:15:00Z',
    requestCount: 450,
    rateLimit: 500,
    permissions: ['aeps.withdrawal', 'aeps.balance', 'aeps.mini_statement']
  },
  {
    id: 'API002',
    name: 'Sandbox AEPS API',
    apiKey: 'pk_test_yzab7890cdef1234ghij',
    secretKey: 'sk_test_klmn5678opqr9012stuv',
    userId: 'DT005',
    userName: 'Priya Sharma',
    serviceType: 'AEPS',
    environment: 'sandbox',
    status: 'active',
    createdDate: '2024-01-10T09:00:00Z',
    lastUsed: '2024-01-19T11:15:00Z',
    requestCount: 450,
    rateLimit: 500,
    permissions: ['aeps.withdrawal', 'aeps.balance', 'aeps.mini_statement']
  }
];

const mockEndpoints: APIEndpoint[] = [
  {
    id: 'EP001',
    name: 'DMT Transfer',
    endpoint: '/api/v1/dmt/transfer',
    method: 'POST',
    serviceType: 'DMT',
    status: 'active',
    version: 'v1.2.3',
    responseTime: 1250,
    successRate: 99.8,
    lastUpdate: '2024-01-15T10:00:00Z'
  },
  {
    id: 'EP002',
    name: 'AEPS Withdrawal',
    endpoint: '/api/v1/aeps/withdrawal',
    method: 'POST',
    serviceType: 'AEPS',
    status: 'active',
    version: 'v1.1.0',
    responseTime: 850,
    successRate: 99.5,
    lastUpdate: '2024-01-12T14:30:00Z'
  },
  {
    id: 'EP003',
    name: 'Bill Payment',
    endpoint: '/api/v1/bills/pay',
    method: 'POST',
    serviceType: 'BILL_PAYMENT',
    status: 'maintenance',
    version: 'v1.0.5',
    responseTime: 2100,
    successRate: 98.2,
    lastUpdate: '2024-01-18T09:00:00Z'
  },  {
    id: 'EP003',
    name: 'Bill Payment',
    endpoint: '/api/v1/bills/pay',
    method: 'POST',
    serviceType: 'BILL_PAYMENT',
    status: 'maintenance',
    version: 'v1.0.5',
    responseTime: 2100,
    successRate: 98.2,
    lastUpdate: '2024-01-18T09:00:00Z'
  },  {
    id: 'EP003',
    name: 'Bill Payment',
    endpoint: '/api/v1/bills/pay',
    method: 'POST',
    serviceType: 'BILL_PAYMENT',
    status: 'maintenance',
    version: 'v1.0.5',
    responseTime: 2100,
    successRate: 98.2,
    lastUpdate: '2024-01-18T09:00:00Z'
  },  {
    id: 'EP003',
    name: 'Bill Payment',
    endpoint: '/api/v1/bills/pay',
    method: 'POST',
    serviceType: 'BILL_PAYMENT',
    status: 'maintenance',
    version: 'v1.0.5',
    responseTime: 2100,
    successRate: 98.2,
    lastUpdate: '2024-01-18T09:00:00Z'
  },  {
    id: 'EP003',
    name: 'Bill Payment',
    endpoint: '/api/v1/bills/pay',
    method: 'POST',
    serviceType: 'BILL_PAYMENT',
    status: 'maintenance',
    version: 'v1.0.5',
    responseTime: 2100,
    successRate: 98.2,
    lastUpdate: '2024-01-18T09:00:00Z'
  }
];

export function APIManagement() {
  const [credentials, setCredentials] = useState<APICredential[]>(mockCredentials);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(mockEndpoints);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const filteredCredentials = credentials.filter(cred =>
    cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCredentialStatus = (credentialId: string) => {
    setCredentials(prev => prev.map(cred =>
      cred.id === credentialId 
        ? { ...cred, status: cred.status === 'active' ? 'inactive' : 'active' }
        : cred
    ));
    
    toast({
      title: 'Credential Updated',
      description: `API credential ${credentialId} status has been updated.`,
    });
  };

  const toggleEndpointStatus = (endpointId: string) => {
    setEndpoints(prev => prev.map(endpoint =>
      endpoint.id === endpointId 
        ? { ...endpoint, status: endpoint.status === 'active' ? 'maintenance' : 'active' }
        : endpoint
    ));
    
    toast({
      title: 'Endpoint Updated',
      description: `API endpoint status has been updated.`,
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${type} has been copied to clipboard.`,
    });
  };

  const regenerateCredential = (credentialId: string) => {
    const newApiKey = 'pk_live_' + Math.random().toString(36).substring(2, 22);
    const newSecretKey = 'sk_live_' + Math.random().toString(36).substring(2, 22);
    
    setCredentials(prev => prev.map(cred =>
      cred.id === credentialId 
        ? { ...cred, apiKey: newApiKey, secretKey: newSecretKey }
        : cred
    ));
    
    toast({
      title: 'Credentials Regenerated',
      description: 'New API credentials have been generated.',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'maintenance':
        return <Badge className="bg-warning text-warning-foreground"><Settings className="w-3 h-3 mr-1" />Maintenance</Badge>;
      case 'deprecated':
        return <Badge variant="destructive">Deprecated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEnvironmentBadge = (env: string) => {
    return env === 'production' 
      ? <Badge className="bg-primary text-primary-foreground">Production</Badge>
      : <Badge variant="outline">Sandbox</Badge>;
  };

  const stats = {
    totalCredentials: credentials.length,
    activeCredentials: credentials.filter(c => c.status === 'active').length,
    totalEndpoints: endpoints.length,
    activeEndpoints: endpoints.filter(e => e.status === 'active').length,
  };
  return (
  <div className="space-y-6">
    {/* Page Header */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold font-poppins text-foreground">
          API Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage API credentials and endpoints
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button className="gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Generate API Key
        </Button>
      </div>
    </div>

    {/* Stats Overview */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Credentials
              </p>
              <p className="text-2xl font-bold font-poppins text-foreground">
                {stats.totalCredentials}
              </p>
            </div>
            <Key className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Credentials
              </p>
              <p className="text-2xl font-bold font-poppins text-foreground">
                {stats.activeCredentials}
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
              <p className="text-sm font-medium text-muted-foreground">
                Total Endpoints
              </p>
              <p className="text-2xl font-bold font-poppins text-foreground">
                {stats.totalEndpoints}
              </p>
            </div>
            <Globe className="h-5 w-5 text-accent" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                API Uptime
              </p>
              <p className="text-2xl font-bold font-poppins text-foreground">
                99.8%
              </p>
            </div>
            <Activity className="h-5 w-5 text-success" />
          </div>
        </CardContent>
      </Card>
    </div>

    {/* API Management Tabs */}
  <Card className="shadow-card w-full">

      <CardHeader>
        <CardTitle>API Management</CardTitle>
        <CardDescription>
          Manage API credentials, endpoints, and documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">API Credentials</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          </TabsList>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="mt-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search credentials..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Credentials Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCredentials.map((credential) => (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{credential.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {credential.userId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {credential.serviceType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getEnvironmentBadge(credential.environment)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {showSecrets[credential.id]
                                ? credential.apiKey
                                : "••••••••••••••••••••"}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(credential.apiKey, "API Key")
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(credential.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={credential.status === "active"}
                              onCheckedChange={() =>
                                toggleCredentialStatus(credential.id)
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="mt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4 text-primary" />
                          <span className="font-medium">{endpoint.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {endpoint.endpoint}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            endpoint.method === "GET" ? "secondary" : "default"
                          }
                          className={
                            endpoint.method === "POST"
                              ? "bg-success text-success-foreground"
                              : endpoint.method === "PUT"
                              ? "bg-warning text-warning-foreground"
                              : endpoint.method === "DELETE"
                              ? "bg-destructive text-destructive-foreground"
                              : ""
                          }
                        >
                          {endpoint.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.serviceType}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(endpoint.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={endpoint.status === "active"}
                            onCheckedChange={() =>
                              toggleEndpointStatus(endpoint.id)
                            }
                          />
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
        </Tabs>
      </CardContent>
    </Card>
  </div>
);

}