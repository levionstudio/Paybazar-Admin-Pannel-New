// import { useState } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Calendar } from '@/components/ui/calendar';
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover';
// import { 
//   Search, 
//   Download, 
//   Filter, 
//   Calendar as CalendarIcon,
//   CreditCard,
//   Smartphone,
//   Receipt,
//   TrendingUp,
//   ArrowUpRight,
//   ArrowDownRight,
//   Clock,
//   CheckCircle,
//   XCircle,
//   AlertCircle
// } from 'lucide-react';
// import { format } from 'date-fns';
// import { cn } from '@/lib/utils';

// interface Transaction {
//   id: string;
//   type: 'DMT' | 'AEPS' | 'BILL_PAYMENT' | 'RECHARGE';
//   userId: string;
//   userName: string;
//   amount: number;
//   commission: number;
//   status: 'success' | 'failed' | 'pending';
//   timestamp: string;
//   details: {
//     recipient?: string;
//     billProvider?: string;
//     phoneNumber?: string;
//     referenceId: string;
//   };
// }

// const mockTransactions: Transaction[] = [
//   {
//     id: 'TXN001',
//     type: 'DMT',
//     userId: 'RT001',
//     userName: 'Rajesh Kumar',
//     amount: 25000,
//     commission: 125,
//     status: 'success',
//     timestamp: '2024-01-15T10:30:00Z',
//     details: {
//       recipient: 'Priya Sharma',
//       referenceId: 'DMT123456789'
//     }
//   },
//   {
//     id: 'TXN002',
//     type: 'AEPS',
//     userId: 'DT005',
//     userName: 'Amit Patel',
//     amount: 10000,
//     commission: 30,
//     status: 'success',
//     timestamp: '2024-01-15T11:15:00Z',
//     details: {
//       referenceId: 'AEPS987654321'
//     }
//   },
//   {
//     id: 'TXN003',
//     type: 'BILL_PAYMENT',
//     userId: 'RT003',
//     userName: 'Sunita Gupta',
//     amount: 5500,
//     commission: 27.5,
//     status: 'pending',
//     timestamp: '2024-01-15T12:00:00Z',
//     details: {
//       billProvider: 'Electricity Board',
//       referenceId: 'BILL456789123'
//     }
//   },
//   {
//     id: 'TXN004',
//     type: 'RECHARGE',
//     userId: 'RT007',
//     userName: 'Vikash Singh',
//     amount: 299,
//     commission: 8.97,
//     status: 'failed',
//     timestamp: '2024-01-15T12:30:00Z',
//     details: {
//       phoneNumber: '+91 9876543210',
//       referenceId: 'RCH789123456'
//     }
//   }
// ];

// const transactionTypes = [
//   { value: 'DMT', label: 'Domestic Money Transfer', icon: CreditCard, color: 'text-primary' },
//   { value: 'AEPS', label: 'Aadhaar Enabled Payment', icon: Smartphone, color: 'text-accent' },
//   { value: 'BILL_PAYMENT', label: 'Bill Payments', icon: Receipt, color: 'text-success' },
//   { value: 'RECHARGE', label: 'Mobile Recharge', icon: TrendingUp, color: 'text-warning' }
// ];

// export function TransactionLogs() {
//   const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterType, setFilterType] = useState<string>('all');
//   const [filterStatus, setFilterStatus] = useState<string>('all');
//   const [dateFrom, setDateFrom] = useState<Date>();
//   const [dateTo, setDateTo] = useState<Date>();

//   const filteredTransactions = transactions.filter(txn => {
//     const matchesSearch = txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          txn.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          txn.userId.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesType = filterType === 'all' || txn.type === filterType;
//     const matchesStatus = filterStatus === 'all' || txn.status === filterStatus;
    
//     return matchesSearch && matchesType && matchesStatus;
//   });

//   const getTransactionsByType = (type: string) => {
//     return filterType === 'all' ? 
//       transactions.filter(txn => txn.type === type) : 
//       filteredTransactions.filter(txn => txn.type === type);
//   };

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case 'success':
//         return (
//           <Badge className="bg-success text-success-foreground">
//             <CheckCircle className="w-3 h-3 mr-1" />
//             Success
//           </Badge>
//         );
//       case 'failed':
//         return (
//           <Badge variant="destructive">
//             <XCircle className="w-3 h-3 mr-1" />
//             Failed
//           </Badge>
//         );
//       case 'pending':
//         return (
//           <Badge className="bg-warning text-warning-foreground">
//             <Clock className="w-3 h-3 mr-1" />
//             Pending
//           </Badge>
//         );
//       default:
//         return <Badge variant="secondary">{status}</Badge>;
//     }
//   };

//   const getTypeIcon = (type: string) => {
//     const typeInfo = transactionTypes.find(t => t.value === type);
//     if (typeInfo) {
//       const Icon = typeInfo.icon;
//       return <Icon className={`h-4 w-4 ${typeInfo.color}`} />;
//     }
//     return <CreditCard className="h-4 w-4" />;
//   };

//   const getTotalStats = () => {
//     const total = filteredTransactions.reduce((acc, txn) => acc + txn.amount, 0);
//     const commission = filteredTransactions.reduce((acc, txn) => acc + txn.commission, 0);
//     const successful = filteredTransactions.filter(txn => txn.status === 'success').length;
    
//     return { total, commission, successful, count: filteredTransactions.length };
//   };

//   const stats = getTotalStats();

//   return (
//     <div className="space-y-6">
//       {/* Page Header */}
//       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold font-poppins text-foreground">Transaction Logs</h1>
//           <p className="text-muted-foreground mt-2">Monitor all transaction activities across services</p>
//         </div>
        
//       </div>

//       {/* Stats Overview */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         <Card className="shadow-card">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
//                 <p className="text-2xl font-bold font-poppins text-foreground">
//                   ₹{stats.total.toLocaleString()}
//                 </p>
//               </div>
//               <ArrowUpRight className="h-5 w-5 text-success" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="shadow-card">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Commission Earned</p>
//                 <p className="text-2xl font-bold font-poppins text-foreground">
//                   ₹{stats.commission.toLocaleString()}
//                 </p>
//               </div>
//               <TrendingUp className="h-5 w-5 text-primary" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="shadow-card">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Successful</p>
//                 <p className="text-2xl font-bold font-poppins text-foreground">
//                   {stats.successful}
//                 </p>
//               </div>
//               <CheckCircle className="h-5 w-5 text-success" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="shadow-card">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
//                 <p className="text-2xl font-bold font-poppins text-foreground">
//                   {stats.count}
//                 </p>
//               </div>
//               <Receipt className="h-5 w-5 text-accent" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Filters */}
//       <Card className="shadow-card">
//         <CardHeader>
//           <CardTitle className="font-poppins">Search & Filter</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="flex flex-col lg:flex-row gap-4">
//             <div className="flex-1">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                 <Input
//                   placeholder="Search by transaction ID, user name, or user ID..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-9"
//                 />
//               </div>
//             </div>
//             <Select value={filterType} onValueChange={setFilterType}>
//               <SelectTrigger className="w-full lg:w-48">
//                 <SelectValue placeholder="Transaction Type" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Types</SelectItem>
//                 {transactionTypes.map(type => (
//                   <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//             <Select value={filterStatus} onValueChange={setFilterStatus}>
//               <SelectTrigger className="w-full lg:w-48">
//                 <SelectValue placeholder="Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="success">Success</SelectItem>
//                 <SelectItem value="pending">Pending</SelectItem>
//                 <SelectItem value="failed">Failed</SelectItem>
//               </SelectContent>
//             </Select>
//             <div className="flex gap-2">
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button variant="outline" className="w-full lg:w-auto">
//                     <CalendarIcon className="mr-2 h-4 w-4" />
//                     {dateFrom ? format(dateFrom, "PPP") : "From Date"}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-auto p-0" align="start">
//                   <Calendar
//                     mode="single"
//                     selected={dateFrom}
//                     onSelect={setDateFrom}
//                     initialFocus
//                     className="pointer-events-auto"
//                   />
//                 </PopoverContent>
//               </Popover>
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button variant="outline" className="w-full lg:w-auto">
//                     <CalendarIcon className="mr-2 h-4 w-4" />
//                     {dateTo ? format(dateTo, "PPP") : "To Date"}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-auto p-0" align="start">
//                   <Calendar
//                     mode="single"
//                     selected={dateTo}
//                     onSelect={setDateTo}
//                     initialFocus
//                     className="pointer-events-auto"
//                   />
//                 </PopoverContent>
//               </Popover>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Transaction Logs by Category */}
//       <Card className="shadow-card">
//         <CardHeader>
//           <CardTitle className="font-poppins">Transaction Logs</CardTitle>
//           <CardDescription>Categorized transaction logs by service type</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <Tabs defaultValue="all" className="w-full">
//             <TabsList className="grid w-full grid-cols-5">
//               <TabsTrigger value="all">All Transactions</TabsTrigger>
//               <TabsTrigger value="DMT">DMT</TabsTrigger>
//               <TabsTrigger value="AEPS">AEPS</TabsTrigger>
//               <TabsTrigger value="BILL_PAYMENT">Bills</TabsTrigger>
//               <TabsTrigger value="RECHARGE">Recharge</TabsTrigger>
//             </TabsList>
            
//             <TabsContent value="all" className="mt-6">
//               <TransactionTable transactions={filteredTransactions} getStatusBadge={getStatusBadge} getTypeIcon={getTypeIcon} />
//             </TabsContent>
            
//             {transactionTypes.map(type => (
//               <TabsContent key={type.value} value={type.value} className="mt-6">
//                 <TransactionTable 
//                   transactions={getTransactionsByType(type.value)} 
//                   getStatusBadge={getStatusBadge} 
//                   getTypeIcon={getTypeIcon}
//                 />
//               </TabsContent>
//             ))}
//           </Tabs>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// interface TransactionTableProps {
//   transactions: Transaction[];
//   getStatusBadge: (status: string) => JSX.Element;
//   getTypeIcon: (type: string) => JSX.Element;
// }

// function TransactionTable({ transactions, getStatusBadge, getTypeIcon }: TransactionTableProps) {
//   return (
//     <div className="overflow-x-auto">
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>Transaction ID</TableHead>
//             <TableHead>Type</TableHead>
//             <TableHead>User</TableHead>
//             <TableHead>Amount</TableHead>
//             <TableHead>Commission</TableHead>
//             <TableHead>Status</TableHead>
//             <TableHead>Details</TableHead>
//             <TableHead>Timestamp</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {transactions.map((txn) => (
//             <TableRow key={txn.id}>
//               <TableCell className="font-mono font-medium">{txn.id}</TableCell>
//               <TableCell>
//                 <div className="flex items-center space-x-2">
//                   {getTypeIcon(txn.type)}
//                   <span className="font-medium">{txn.type}</span>
//                 </div>
//               </TableCell>
//               <TableCell>
//                 <div>
//                   <p className="font-medium">{txn.userName}</p>
//                   <p className="text-sm text-muted-foreground">{txn.userId}</p>
//                 </div>
//               </TableCell>
//               <TableCell className="font-mono font-semibold">₹{txn.amount.toLocaleString()}</TableCell>
//               <TableCell className="font-mono text-success">₹{txn.commission}</TableCell>
//               <TableCell>{getStatusBadge(txn.status)}</TableCell>
//               <TableCell>
//                 <div className="space-y-1">
//                   {txn.details.recipient && (
//                     <p className="text-sm">To: {txn.details.recipient}</p>
//                   )}
//                   {txn.details.billProvider && (
//                     <p className="text-sm">Provider: {txn.details.billProvider}</p>
//                   )}
//                   {txn.details.phoneNumber && (
//                     <p className="text-sm">Phone: {txn.details.phoneNumber}</p>
//                   )}
//                   <p className="text-xs text-muted-foreground font-mono">Ref: {txn.details.referenceId}</p>
//                 </div>
//               </TableCell>
//               <TableCell className="text-sm text-muted-foreground">
//                 {format(new Date(txn.timestamp), 'PPp')}
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );
// }