import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, RefreshCw, User, MapPin, CreditCard, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Distributor {
  distributor_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Retailer {
  retailer_id: string;
  distributor_id: string;
  name: string;
  phone: string;
  email: string;
  aadhar_number: string;
  pan_number: string;
  date_of_birth: string;
  gender: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  kyc_status: boolean;
  documents_url: string;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface DecodedToken {
  user_id: string;
  exp: number;
}

interface EditFormData {
  name: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  kyc_status: boolean;
  is_blocked: boolean;
  wallet_balance: number;
}

/* -------------------- AUTH HELPER -------------------- */
function getAuthToken(): string | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export default function GetAllRetailers() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    phone: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    business_name: "",
    business_type: "",
    gst_number: "",
    kyc_status: false,
    is_blocked: false,
    wallet_balance: 0,
  });
  const itemsPerPage = 10;

  // Fetch all Distributors on mount
  useEffect(() => {
    const fetchDistributors = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingDistributors(false);
        return;
      }

      setLoadingDistributors(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/distributor/get/all`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.data?.status === "success" && res.data?.data) {
          const list = res.data.data.distributors || [];
          
          const normalized = list.map((d: any) => ({
            distributor_id: d.distributor_id,
            name: d.name,
            email: d.email,
            phone: d.phone,
          }));

          setDistributors(normalized);
          
          // Auto-select first distributor
          if (normalized.length > 0) {
            setSelectedDistributor(normalized[0].distributor_id);
          }
        } else {
          toast.error("Failed to load distributors");
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load distributors");
      } finally {
        setLoadingDistributors(false);
      }
    };

    fetchDistributors();
  }, []);

  // Fetch retailers when distributor is selected
  const fetchRetailers = async (distributorId: string) => {
    if (!distributorId) {
      setRetailers([]);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoadingRetailers(true);
    setRetailers([]);
    
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/get/distributor/${distributorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.status === "success" && res.data?.data) {
        const list = res.data.data.retailers || [];
        
        setRetailers(list);
        setCurrentPage(1);
      } else {
        toast.error("Failed to load retailers");
      }
    } catch (error: any) {
      console.error("Error fetching retailers:", error);
      toast.error(error.response?.data?.message || "Failed to load retailers");
    } finally {
      setLoadingRetailers(false);
    }
  };

  useEffect(() => {
    if (selectedDistributor) {
      fetchRetailers(selectedDistributor);
    }
  }, [selectedDistributor]);

  // FETCH DATA FIRST, THEN OPEN DIALOG
  const handleEditClick = async (retailer: Retailer) => {
    // Start loading immediately
    setIsFetchingProfile(true);

    const token = getAuthToken();
    if (!token) {
      setIsFetchingProfile(false);
      return;
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/${retailer.retailer_id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data?.data) {
        const retData = response.data.data;
        
        // Populate ALL form fields with fetched data
        setEditFormData({
          name: retData.name || "",
          phone: retData.phone || "",
          city: retData.city || "",
          state: retData.state || "",
          address: retData.address || "",
          pincode: retData.pincode || "",
          business_name: retData.business_name || "",
          business_type: retData.business_type || "",
          gst_number: retData.gst_number || "",
          kyc_status: retData.kyc_status || false,
          is_blocked: retData.is_blocked || false,
          wallet_balance: retData.wallet_balance || 0,
        });
        
        // Set the selected retailer with complete data
        setSelectedRetailer(retData);
        
        // NOW open the dialog - data is ready!
        setEditDialogOpen(true);
        toast.success("Profile loaded successfully");
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error: any) {
      console.error("Error fetching retailer profile:", error);
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateRetailer = async () => {
    if (!selectedRetailer) return;

    // Validation
    if (!editFormData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editFormData.phone.trim() || editFormData.phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setIsUpdating(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/update/${selectedRetailer.retailer_id}`;

      // Build request body with only changed fields (pointers for Go backend)
      const requestBody: any = {};
      
      if (editFormData.name !== selectedRetailer.name) {
        requestBody.name = editFormData.name;
      }
      if (editFormData.phone !== selectedRetailer.phone) {
        requestBody.phone = editFormData.phone;
      }
      if (editFormData.city !== selectedRetailer.city) {
        requestBody.city = editFormData.city;
      }
      if (editFormData.state !== selectedRetailer.state) {
        requestBody.state = editFormData.state;
      }
      if (editFormData.address !== selectedRetailer.address) {
        requestBody.address = editFormData.address;
      }
      if (editFormData.pincode !== selectedRetailer.pincode) {
        requestBody.pincode = editFormData.pincode;
      }
      if (editFormData.business_name !== selectedRetailer.business_name) {
        requestBody.business_name = editFormData.business_name;
      }
      if (editFormData.business_type !== selectedRetailer.business_type) {
        requestBody.business_type = editFormData.business_type;
      }
      if (editFormData.gst_number !== selectedRetailer.gst_number) {
        requestBody.gst_number = editFormData.gst_number;
      }
      if (editFormData.kyc_status !== selectedRetailer.kyc_status) {
        requestBody.kyc_status = editFormData.kyc_status;
      }
      if (editFormData.is_blocked !== selectedRetailer.is_blocked) {
        requestBody.is_blocked = editFormData.is_blocked;
      }
      if (editFormData.wallet_balance !== selectedRetailer.wallet_balance) {
        requestBody.wallet_balance = editFormData.wallet_balance;
      }

      const response = await axios.put(url, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status >= 200 && response.status < 300) {
        toast.success(response.data?.message || "Retailer updated successfully");
        setEditDialogOpen(false);
        setSelectedRetailer(null);
        
        setTimeout(() => {
          fetchRetailers(selectedDistributor);
        }, 500);
      }
    } catch (error: any) {
      console.error("Error updating retailer:", error);
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (isBlocked: boolean) => {
    if (isBlocked) {
      return <Badge className="bg-red-50 text-red-700 border-red-300">Blocked</Badge>;
    }
    return <Badge className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
  };

  const getKYCBadge = (kycStatus: boolean) => {
    if (kycStatus) {
      return <Badge className="bg-green-50 text-green-700 border-green-300">Verified</Badge>;
    }
    return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(retailers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRetailers = retailers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Retailers</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all retailers
          </p>
        </div>
        <Button 
          onClick={() => selectedDistributor && fetchRetailers(selectedDistributor)} 
          variant="outline" 
          size="sm"
          disabled={!selectedDistributor}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Distributor Selection Card */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[140px]">
              Select Distributor:
            </Label>
            {loadingDistributors ? (
              <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-white flex-1">
                <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            ) : (
              <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                <SelectTrigger className="h-11 flex-1 bg-white">
                  <SelectValue placeholder="Select distributor" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-600">
                      No distributors found
                    </div>
                  ) : (
                    distributors.map((d) => (
                      <SelectItem
                        key={d.distributor_id}
                        value={d.distributor_id}
                      >
                        {d.name || d.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retailers Table */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-0">
          {!selectedDistributor ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-gray-600">Please select a distributor to view retailers</p>
            </div>
          ) : loadingRetailers ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="ml-2 text-gray-600">Loading retailers...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-center font-semibold">Sl No</TableHead>
                        <TableHead className="text-center font-semibold">Dist ID</TableHead>
                      <TableHead className="text-center font-semibold">Retailer ID</TableHead>
                      <TableHead className="text-center font-semibold">Name</TableHead>
                      <TableHead className="text-center font-semibold">Email</TableHead>
                      <TableHead className="text-center font-semibold">Phone</TableHead>
                      <TableHead className="text-center font-semibold">Business</TableHead>
                      <TableHead className="text-center font-semibold">Wallet Balance</TableHead>
                      <TableHead className="text-center font-semibold">KYC</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentRetailers.length > 0 ? (
                      currentRetailers.map((r, idx) => (
                        <TableRow key={r.retailer_id} className="hover:bg-gray-50">
                          <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {r.distributor_id}
                          </TableCell>
                          <TableCell className="font-mono text-center text-xs">
                            {r.retailer_id}
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {r.name || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">{r.email || "N/A"}</TableCell>
                          <TableCell className="text-center">{r.phone || "N/A"}</TableCell>
                          <TableCell className="text-center">{r.business_name || "N/A"}</TableCell>
                          <TableCell className="font-semibold text-center text-green-600">
                            ₹{r.wallet_balance?.toLocaleString("en-IN") || "0"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getKYCBadge(r.kyc_status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(r.is_blocked)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(r)}
                              disabled={isFetchingProfile}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-20 text-gray-600">
                          No retailers found for the selected distributor
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {retailers.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, retailers.length)} of{" "}
                    {retailers.length} retailers
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay - Shows BEFORE dialog opens */}
      {isFetchingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading profile data...</p>
          </div>
        </div>
      )}

      {/* Edit Retailer Dialog - Only opens AFTER data is loaded */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Retailer Profile</DialogTitle>
          </DialogHeader>
          
          {selectedRetailer && (
            <div className="space-y-6">
              {/* Non-editable Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Retailer ID</Label>
                  <p className="font-mono text-sm font-semibold">{selectedRetailer.retailer_id}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedRetailer.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                  <p className="text-sm">{formatDate(selectedRetailer.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Aadhar Number</Label>
                  <p className="font-mono text-sm">{selectedRetailer.aadhar_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
                  <p className="font-mono text-sm uppercase">{selectedRetailer.pan_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                  <p className="text-sm">{formatDate(selectedRetailer.date_of_birth)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                  <p className="text-sm">{selectedRetailer.gender}</p>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Personal Information</h3>
                    <p className="text-sm text-muted-foreground">Update basic details</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      type="text"
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, name: e.target.value })
                      }
                      placeholder="Enter name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      inputMode="numeric"
                      value={editFormData.phone}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          phone: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Business Information</h3>
                    <p className="text-sm text-muted-foreground">Company details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-business-name">Business Name</Label>
                    <Input
                      id="edit-business-name"
                      type="text"
                      value={editFormData.business_name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          business_name: e.target.value,
                        })
                      }
                      placeholder="Enter business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-business-type">Business Type</Label>
                    <Input
                      id="edit-business-type"
                      type="text"
                      value={editFormData.business_type}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          business_type: e.target.value,
                        })
                      }
                      placeholder="e.g., Retail Shop"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-gst">
                      GST Number{" "}
                      <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="edit-gst"
                      type="text"
                      value={editFormData.gst_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          gst_number: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className="font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Address Details</h3>
                    <p className="text-sm text-muted-foreground">Location information</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Full Address</Label>
                    <Textarea
                      id="edit-address"
                      value={editFormData.address}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, address: e.target.value })
                      }
                      placeholder="Enter complete address"
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input
                        id="edit-city"
                        type="text"
                        value={editFormData.city}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, city: e.target.value })
                        }
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Input
                        id="edit-state"
                        type="text"
                        value={editFormData.state}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, state: e.target.value })
                        }
                        placeholder="Enter state"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-pincode">Pincode</Label>
                      <Input
                        id="edit-pincode"
                        type="tel"
                        inputMode="numeric"
                        value={editFormData.pincode}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            pincode: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="400001"
                        maxLength={6}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Wallet Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <h3 className="font-semibold text-lg">Status & Wallet Management</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-kyc">KYC Status</Label>
                    <Select
                      value={editFormData.kyc_status ? "verified" : "pending"}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          kyc_status: value === "verified",
                        })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Verified</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <span>Pending</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Account Status</Label>
                    <Select
                      value={editFormData.is_blocked ? "blocked" : "active"}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          is_blocked: value === "blocked",
                        })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Active</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="blocked">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-600" />
                            <span>Blocked</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-wallet">Wallet Balance (₹)</Label>
                    <Input
                      id="edit-wallet"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.wallet_balance}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          wallet_balance: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedRetailer(null);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRetailer} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Retailer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}