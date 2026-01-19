import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  UserCheck, 
  UserX, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Camera,
  CreditCard,
  Building,
  MapPin,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KYCDocument {
  type: 'aadhaar' | 'pan' | 'bank_statement' | 'address_proof' | 'photo';
  url: string;
  uploadDate: string;
  status: 'verified' | 'pending' | 'rejected';
}

interface KYCApplication {
  id: string;
  userId: string;
  userName: string;
  email: string;
  phone: string;
  userType: 'retailer' | 'distributor';
  applicationDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  documents: KYCDocument[];
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    aadhaarNumber: string;
    panNumber: string;
  };
  businessInfo?: {
    businessName: string;
    businessType: string;
    gstNumber?: string;
    businessAddress: string;
  };
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
  };
  reviewNotes?: string;
  reviewedBy?: string;
  reviewDate?: string;
}

const mockApplications: KYCApplication[] = [
  {
    id: 'KYC001',
    userId: 'RT001',
    userName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 9876543210',
    userType: 'retailer',
    applicationDate: '2024-01-10T09:00:00Z',
    status: 'pending',
    documents: [
      { type: 'aadhaar', url: '/docs/aadhaar.pdf', uploadDate: '2024-01-10T09:00:00Z', status: 'pending' },
      { type: 'pan', url: '/docs/pan.pdf', uploadDate: '2024-01-10T09:05:00Z', status: 'pending' },
      { type: 'photo', url: '/docs/photo.jpg', uploadDate: '2024-01-10T09:10:00Z', status: 'pending' },
    ],
    personalInfo: {
      fullName: 'Rajesh Kumar Singh',
      dateOfBirth: '1985-05-15',
      address: '123 Main Street, Sector 15',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      aadhaarNumber: '1234 5678 9012',
      panNumber: 'ABCDE1234F'
    },
    bankDetails: {
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      branchName: 'Mumbai Main Branch'
    }
  },
  {
    id: 'KYC002',
    userId: 'DT005',
    userName: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+91 9876543211',
    userType: 'distributor',
    applicationDate: '2024-01-12T14:30:00Z',
    status: 'under_review',
    documents: [
      { type: 'aadhaar', url: '/docs/aadhaar2.pdf', uploadDate: '2024-01-12T14:30:00Z', status: 'verified' },
      { type: 'pan', url: '/docs/pan2.pdf', uploadDate: '2024-01-12T14:35:00Z', status: 'verified' },
      { type: 'photo', url: '/docs/photo2.jpg', uploadDate: '2024-01-12T14:40:00Z', status: 'pending' },
    ],
    personalInfo: {
      fullName: 'Priya Sharma',
      dateOfBirth: '1990-08-22',
      address: '456 Park Avenue, Block A',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarNumber: '9876 5432 1098',
      panNumber: 'FGHIJ5678K'
    },
    businessInfo: {
      businessName: 'Sharma Enterprises',
      businessType: 'Financial Services',
      gstNumber: '27FGHIJ5678K1Z5',
      businessAddress: '456 Park Avenue, Block A, Delhi - 110001'
    },
    bankDetails: {
      accountNumber: '0987654321',
      ifscCode: 'ICIC0001234',
      bankName: 'ICICI Bank',
      branchName: 'Delhi Central Branch'
    },
    reviewNotes: 'Photo verification pending',
    reviewedBy: 'Admin',
    reviewDate: '2024-01-13T10:00:00Z'
  }
];

export function KYCVerification() {
  const [applications, setApplications] = useState<KYCApplication[]>(mockApplications);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<KYCApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const updateApplicationStatus = (applicationId: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { 
        ...app, 
        status: newStatus,
        reviewNotes: notes || app.reviewNotes,
        reviewedBy: 'Admin',
        reviewDate: new Date().toISOString()
      } : app
    ));
    
    toast({
      title: `KYC ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
      description: `Application ${applicationId} has been ${newStatus}.`,
      variant: newStatus === 'approved' ? 'default' : 'destructive'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'under_review':
        return <Badge className="bg-warning text-warning-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success text-success-foreground text-xs">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'aadhaar':
        return <CreditCard className="h-4 w-4 text-primary" />;
      case 'pan':
        return <FileText className="h-4 w-4 text-accent" />;
      case 'photo':
        return <Camera className="h-4 w-4 text-success" />;
      case 'bank_statement':
        return <Building className="h-4 w-4 text-warning" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const stats = {
    pending: applications.filter(app => app.status === 'pending').length,
    underReview: applications.filter(app => app.status === 'under_review').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-poppins text-foreground">KYC Verification</h1>
          <p className="text-muted-foreground mt-2">Review and verify user KYC applications</p>
        </div>
       
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.pending}</p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.underReview}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.approved}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold font-poppins text-foreground">{stats.rejected}</p>
              </div>
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
                  placeholder="Search by name, user ID, or application ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KYC Applications Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-poppins">KYC Applications</CardTitle>
          <CardDescription>Review and verify user KYC submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="gradient-primary text-primary-foreground">
                            {application.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{application.userName}</p>
                          <p className="text-sm text-muted-foreground">{application.id}</p>
                          <p className="text-sm text-muted-foreground">{application.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={application.userType === 'distributor' ? 'default' : 'secondary'}>
                        {application.userType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(application.applicationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {application.documents.map((doc, index) => (
                          <div key={index} className="flex items-center space-x-1">
                            {getDocumentIcon(doc.type)}
                            {getDocumentStatusBadge(doc.status)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {application.reviewDate ? new Date(application.reviewDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="font-poppins">KYC Application Review</DialogTitle>
                            <DialogDescription>Review and verify user KYC documents</DialogDescription>
                          </DialogHeader>
                          {selectedApplication && (
                            <div className="space-y-6">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarFallback className="gradient-primary text-primary-foreground text-lg">
                                    {selectedApplication.userName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-xl font-semibold">{selectedApplication.userName}</h3>
                                  <p className="text-muted-foreground">{selectedApplication.id}</p>
                                  {getStatusBadge(selectedApplication.status)}
                                </div>
                              </div>
                              
                              <Tabs defaultValue="personal" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                                  <TabsTrigger value="business">Business Info</TabsTrigger>
                                  <TabsTrigger value="bank">Bank Details</TabsTrigger>
                                  <TabsTrigger value="documents">Documents</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="personal" className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Full Name</Label>
                                      <p className="text-sm">{selectedApplication.personalInfo.fullName}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Date of Birth</Label>
                                      <p className="text-sm">{selectedApplication.personalInfo.dateOfBirth}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Phone</Label>
                                      <p className="text-sm">{selectedApplication.phone}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Email</Label>
                                      <p className="text-sm">{selectedApplication.email}</p>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                      <Label className="text-sm font-medium">Address</Label>
                                      <p className="text-sm">
                                        {selectedApplication.personalInfo.address}, {selectedApplication.personalInfo.city}, 
                                        {selectedApplication.personalInfo.state} - {selectedApplication.personalInfo.pincode}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Aadhaar Number</Label>
                                      <p className="text-sm font-mono">{selectedApplication.personalInfo.aadhaarNumber}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">PAN Number</Label>
                                      <p className="text-sm font-mono">{selectedApplication.personalInfo.panNumber}</p>
                                    </div>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="business" className="space-y-4">
                                  {selectedApplication.businessInfo ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">Business Name</Label>
                                        <p className="text-sm">{selectedApplication.businessInfo.businessName}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">Business Type</Label>
                                        <p className="text-sm">{selectedApplication.businessInfo.businessType}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">GST Number</Label>
                                        <p className="text-sm font-mono">{selectedApplication.businessInfo.gstNumber || 'N/A'}</p>
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="text-sm font-medium">Business Address</Label>
                                        <p className="text-sm">{selectedApplication.businessInfo.businessAddress}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No business information provided (Retailer account)</p>
                                  )}
                                </TabsContent>
                                
                                <TabsContent value="bank" className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Account Number</Label>
                                      <p className="text-sm font-mono">{selectedApplication.bankDetails.accountNumber}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">IFSC Code</Label>
                                      <p className="text-sm font-mono">{selectedApplication.bankDetails.ifscCode}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Bank Name</Label>
                                      <p className="text-sm">{selectedApplication.bankDetails.bankName}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Branch Name</Label>
                                      <p className="text-sm">{selectedApplication.bankDetails.branchName}</p>
                                    </div>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="documents" className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {selectedApplication.documents.map((doc, index) => (
                                      <Card key={index} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-2">
                                            {getDocumentIcon(doc.type)}
                                            <span className="font-medium capitalize">{doc.type.replace('_', ' ')}</span>
                                          </div>
                                          {getDocumentStatusBadge(doc.status)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                                        </p>
                                        <Button variant="outline" size="sm" className="w-full">
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Document
                                        </Button>
                                      </Card>
                                    ))}
                                  </div>
                                </TabsContent>
                              </Tabs>
                              
                              {selectedApplication.status === 'pending' || selectedApplication.status === 'under_review' ? (
                                <div className="space-y-4 border-t pt-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="review-notes">Review Notes</Label>
                                    <Textarea
                                      id="review-notes"
                                      placeholder="Add review notes or feedback..."
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex space-x-3">
                                    <Button 
                                      className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                                      onClick={() => {
                                        updateApplicationStatus(selectedApplication.id, 'approved', reviewNotes);
                                        setReviewNotes('');
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve KYC
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      className="flex-1"
                                      onClick={() => {
                                        updateApplicationStatus(selectedApplication.id, 'rejected', reviewNotes);
                                        setReviewNotes('');
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject KYC
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-t pt-4">
                                  <div className="space-y-2">
                                    <Label>Review Notes</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedApplication.reviewNotes || 'No review notes available'}
                                    </p>
                                  </div>
                                  {selectedApplication.reviewDate && (
                                    <div className="space-y-2 mt-2">
                                      <Label>Reviewed By</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedApplication.reviewedBy} on {new Date(selectedApplication.reviewDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
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