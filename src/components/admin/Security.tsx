import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Activity,
  Bell,
  Settings,
  UserX,
  Globe,
  Smartphone
} from 'lucide-react';

const securityAlerts = [
  {
    id: 'SEC001',
    type: 'High Risk',
    title: 'Multiple Failed Login Attempts',
    description: 'User john.doe@example.com has 5 failed login attempts from IP 192.168.1.100',
    timestamp: '2024-01-15 10:30:25',
    status: 'Active',
    action: 'Block IP',
  },
  {
    id: 'SEC002',
    type: 'Medium Risk',
    title: 'Unusual Transaction Pattern',
    description: 'Large volume transactions detected from new user account',
    timestamp: '2024-01-15 09:45:12',
    status: 'Investigating',
    action: 'Monitor',
  },
  {
    id: 'SEC003',
    type: 'Low Risk',
    title: 'New Device Login',
    description: 'User logged in from new device/location',
    timestamp: '2024-01-15 08:20:33',
    status: 'Resolved',
    action: 'Verified',
  },
];

const securitySettings = [
  {
    category: 'Authentication',
    settings: [
      { name: 'Two-Factor Authentication', description: 'Require 2FA for all admin accounts', enabled: true },
      { name: 'Session Timeout', description: 'Auto logout after 30 minutes of inactivity', enabled: true },
      { name: 'Password Complexity', description: 'Enforce strong password requirements', enabled: true },
      { name: 'Login Monitoring', description: 'Monitor and alert on suspicious login attempts', enabled: true },
    ]
  },
  {
    category: 'API Security',
    settings: [
      { name: 'Rate Limiting', description: 'Limit API requests per minute per user', enabled: true },
      { name: 'IP Whitelisting', description: 'Restrict API access to whitelisted IPs only', enabled: false },
      { name: 'API Key Rotation', description: 'Auto-rotate API keys every 90 days', enabled: true },
      { name: 'Request Logging', description: 'Log all API requests for audit trail', enabled: true },
    ]
  },
  {
    category: 'Transaction Security',
    settings: [
      { name: 'Transaction Limits', description: 'Enforce daily transaction limits per user', enabled: true },
      { name: 'Fraud Detection', description: 'AI-powered fraud detection system', enabled: true },
      { name: 'Real-time Monitoring', description: 'Real-time transaction monitoring', enabled: true },
      { name: 'Suspicious Activity Alerts', description: 'Alert on suspicious transaction patterns', enabled: true },
    ]
  },
];

const blockedIPs = [
  { ip: '192.168.1.100', reason: 'Multiple failed login attempts', blockedAt: '2024-01-15 10:30:25', country: 'India' },
  { ip: '10.0.0.45', reason: 'Suspicious API requests', blockedAt: '2024-01-15 09:15:10', country: 'Unknown' },
  { ip: '172.16.0.25', reason: 'Fraud attempt', blockedAt: '2024-01-14 16:22:45', country: 'Russia' },
];

const activeSessions = [
  {
    user: 'admin@paybazaar.com',
    device: 'Chrome on Windows',
    ip: '192.168.1.1',
    location: 'Mumbai, India',
    lastActivity: '2024-01-15 11:30:25',
    status: 'Active',
  },
  {
    user: 'support@paybazaar.com',
    device: 'Safari on macOS',
    ip: '192.168.1.10',
    location: 'Delhi, India',
    lastActivity: '2024-01-15 11:25:10',
    status: 'Active',
  },
];

const alertColors = {
  'High Risk': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Medium Risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Low Risk': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const statusColors = {
  'Active': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Investigating': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

export function Security() {
  const [selectedTab, setSelectedTab] = useState('alerts');

  const securityScore = 85;
  const totalAlerts = securityAlerts.length;
  const activeAlerts = securityAlerts.filter(alert => alert.status === 'Active').length;
  const blockedIPsCount = blockedIPs.length;
  const activeSessionsCount = activeSessions.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
        <p className="text-muted-foreground">Monitor and manage system security</p>
      </div>

      {/* Security Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityScore}%</div>
            <Progress value={securityScore} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">of {totalAlerts} total alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedIPsCount}</div>
            <p className="text-xs text-muted-foreground">IP addresses blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">Current admin sessions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Monitor and respond to security threats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityAlerts.map((alert) => (
                  <Alert key={alert.id} className="border-l-4 border-l-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{alert.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={alertColors[alert.type as keyof typeof alertColors]}>
                          {alert.type}
                        </Badge>
                        <Badge className={statusColors[alert.status as keyof typeof statusColors]}>
                          {alert.status}
                        </Badge>
                      </div>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>{alert.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Investigate
                          </Button>
                          <Button size="sm">
                            {alert.action}
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {securitySettings.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
                <CardDescription>Configure {category.category.toLowerCase()} security settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.settings.map((setting) => (
                    <div key={setting.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{setting.name}</p>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch checked={setting.enabled} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocked IP Addresses</CardTitle>
              <CardDescription>Manage blocked IP addresses and security rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="Enter IP address to block" className="flex-1" />
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Block reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="failed-login">Failed Login</SelectItem>
                    <SelectItem value="suspicious">Suspicious Activity</SelectItem>
                    <SelectItem value="fraud">Fraud Attempt</SelectItem>
                    <SelectItem value="spam">Spam/Abuse</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Lock className="h-4 w-4 mr-2" />
                  Block IP
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((blockedIP) => (
                      <TableRow key={blockedIP.ip}>
                        <TableCell className="font-mono">{blockedIP.ip}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {blockedIP.country}
                          </div>
                        </TableCell>
                        <TableCell>{blockedIP.reason}</TableCell>
                        <TableCell className="font-mono text-xs">{blockedIP.blockedAt}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Unlock className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Admin Sessions</CardTitle>
              <CardDescription>Monitor and manage active administrator sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSessions.map((session, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{session.user}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            {session.device}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{session.ip}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {session.location}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{session.lastActivity}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm">
                              <XCircle className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}