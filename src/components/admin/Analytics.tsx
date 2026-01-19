import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, CreditCard, DollarSign, Activity, Download, Calendar } from 'lucide-react';

const userGrowthData = [
  { month: 'Jan', retailers: 120, distributors: 25, total: 145 },
  { month: 'Feb', retailers: 150, distributors: 32, total: 182 },
  { month: 'Mar', retailers: 180, distributors: 38, total: 218 },
  { month: 'Apr', retailers: 220, distributors: 45, total: 265 },
  { month: 'May', retailers: 260, distributors: 52, total: 312 },
  { month: 'Jun', retailers: 300, distributors: 60, total: 360 },
];

const transactionData = [
  { month: 'Jan', dmt: 45000, aeps: 32000, billpay: 28000, recharge: 15000 },
  { month: 'Feb', dmt: 52000, aeps: 38000, billpay: 32000, recharge: 18000 },
  { month: 'Mar', dmt: 48000, aeps: 42000, billpay: 35000, recharge: 22000 },
  { month: 'Apr', dmt: 61000, aeps: 45000, billpay: 38000, recharge: 25000 },
  { month: 'May', dmt: 55000, aeps: 48000, billpay: 42000, recharge: 28000 },
  { month: 'Jun', dmt: 68000, aeps: 52000, billpay: 45000, recharge: 32000 },
];

const revenueData = [
  { month: 'Jan', revenue: 125000, commission: 8500 },
  { month: 'Feb', revenue: 145000, commission: 9800 },
  { month: 'Mar', revenue: 138000, commission: 9200 },
  { month: 'Apr', revenue: 162000, commission: 11200 },
  { month: 'May', revenue: 158000, commission: 10800 },
  { month: 'Jun', revenue: 175000, commission: 12500 },
];

const serviceDistribution = [
  { name: 'DMT', value: 35, amount: 68000 },
  { name: 'AEPS', value: 28, amount: 52000 },
  { name: 'Bill Payments', value: 25, amount: 45000 },
  { name: 'Recharge', value: 12, amount: 32000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const topPerformers = [
  { name: 'John Doe', type: 'Retailer', transactions: 1250, revenue: 45000, growth: 12.5 },
  { name: 'Jane Smith', type: 'Distributor', transactions: 980, revenue: 38000, growth: 8.3 },
  { name: 'Mike Johnson', type: 'Retailer', transactions: 850, revenue: 32000, growth: 15.2 },
  { name: 'Sarah Wilson', type: 'Distributor', transactions: 720, revenue: 28000, growth: -2.1 },
];

export function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="7days">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
        
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹17,50,000</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">360</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15.3% new users
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8.2% from last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.3% improvement
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
                <CardDescription>Transaction volume by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {serviceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Highest performing users this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">{performer.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{performer.revenue.toLocaleString()}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant={performer.growth > 0 ? "default" : "secondary"} className="text-xs">
                            {performer.growth > 0 ? '+' : ''}{performer.growth}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Monthly user acquisition trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="retailers"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Retailers"
                    />
                    <Area
                      type="monotone"
                      dataKey="distributors"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      name="Distributors"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume</CardTitle>
              <CardDescription>Monthly transaction volume by service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} />
                    <Bar dataKey="dmt" fill="#8884d8" name="DMT" />
                    <Bar dataKey="aeps" fill="#82ca9d" name="AEPS" />
                    <Bar dataKey="billpay" fill="#ffc658" name="Bill Pay" />
                    <Bar dataKey="recharge" fill="#ff7300" name="Recharge" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Commission</CardTitle>
              <CardDescription>Monthly revenue and commission trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Commission"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}