import { useState, useEffect } from "react";
import axios from "axios";
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
import {
  Loader2,
  User,
  MapPin,
  Ban,
  CheckCircle,
  Wallet,
  Building,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface Retailer {
  retailer_id: string;
  retailer_password: string;
  distributor_id: string;
  retailer_name: string;
  retailer_phone: string;
  retailer_email: string;
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
  documents_url: string | null;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  mpin: string;
}

interface EditFormData {
  retailer_id: string;
  retailer_password: string;
  retailer_name: string;
  retailer_phone: string;
  pan_number: string;
  aadhar_number: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  business_name: string;
  business_type: string;
  gst_number: string;
  wallet_balance: number;
  is_blocked: boolean;
  kyc_status: boolean;
}

interface EditRetailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailer: Retailer | null;
  authToken: string | null;
  onSuccess: () => void;
}

export default function EditRetailerDialog({
  open,
  onOpenChange,
  retailer,
  authToken,
  onSuccess,
}: EditRetailerDialogProps) {
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fullRetailerData, setFullRetailerData] = useState<Retailer | null>(
    null
  );
  const [editFormData, setEditFormData] = useState<EditFormData>({
    retailer_id: "",
    retailer_password: "",
    retailer_name: "",
    retailer_phone: "",
    pan_number: "",
    aadhar_number: "",
    city: "",
    state: "",
    address: "",
    pincode: "",
    business_name: "",
    business_type: "",
    gst_number: "",
    wallet_balance: 0,
    is_blocked: false,
    kyc_status: false,
  });

  // Fetch full retailer profile when dialog opens
  useEffect(() => {
    if (open && retailer && authToken) {
      fetchRetailerProfile();
    }
  }, [open, retailer]);

  const fetchRetailerProfile = async () => {
    if (!retailer || !authToken) return;

    setIsFetchingProfile(true);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${retailer.retailer_id}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      const retData = response.data?.data?.retailer || response.data?.data;

      if (!retData) {
        toast.error("Invalid profile data");
        onOpenChange(false);
        return;
      }

      setFullRetailerData(retData);

      setEditFormData({
        retailer_id: retData.retailer_id,
        retailer_password: retData.retailer_password ?? "",
        retailer_name: retData.retailer_name ?? "",
        retailer_phone: retData.retailer_phone ?? "",
        pan_number: retData.pan_number ?? "",
        aadhar_number: retData.aadhar_number ?? "",
        city: retData.city ?? "",
        state: retData.state ?? "",
        address: retData.address ?? "",
        pincode: retData.pincode ?? "",
        business_name: retData.business_name ?? "",
        business_type: retData.business_type ?? "",
        gst_number: retData.gst_number ?? "",
        wallet_balance: Number(retData.wallet_balance ?? 0),
        is_blocked: Boolean(retData.is_blocked),
        kyc_status: Boolean(retData.kyc_status),
      });

      toast.success("Profile loaded successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load profile");
      onOpenChange(false);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleUpdateRetailer = async () => {
    if (!fullRetailerData?.retailer_id || !authToken) {
      toast.error("Invalid retailer selected");
      return;
    }

    if (!editFormData.retailer_name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!/^[1-9]\d{9}$/.test(editFormData.retailer_phone)) {
      toast.error("Invalid phone number");
      return;
    }

    if (
      editFormData.pan_number &&
      editFormData.pan_number !== fullRetailerData.pan_number
    ) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editFormData.pan_number)) {
        toast.error("Invalid PAN number format. Should be like: ABCDE1234F");
        return;
      }
    }

    if (
      editFormData.aadhar_number &&
      editFormData.aadhar_number !== fullRetailerData.aadhar_number
    ) {
      if (!/^\d{12}$/.test(editFormData.aadhar_number)) {
        toast.error("Invalid Aadhar number. Should be 12 digits");
        return;
      }
    }

    if (editFormData.wallet_balance < 0) {
      toast.error("Wallet balance cannot be negative");
      return;
    }

    const url = `${import.meta.env.VITE_API_BASE_URL}/retailer/update/details`;

    const payload: any = {
      retailer_id: fullRetailerData.retailer_id,
    };

    const allowedKeys = [
      "retailer_name",
      "retailer_password",
      "retailer_phone",
      "city",
      "state",
      "address",
      "pincode",
      "business_name",
      "business_type",
      "gst_number",
      "pan_number",
      "aadhar_number",
      "wallet_balance",
    ];

    allowedKeys.forEach((key) => {
      const formValue = (editFormData as any)[key];
      const originalValue = (fullRetailerData as any)[key];

      if (formValue !== originalValue) {
        payload[key] = formValue;
      }
    });

    if (Object.keys(payload).length === 1) {
      toast.info("No changes detected");
      return;
    }

    try {
      setIsUpdating(true);

      const response = await axios.put(url, payload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      toast.success(
        response.data?.message || "Retailer updated successfully"
      );

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRetailerBlockStatus = async (blockStatus: boolean) => {
    if (!fullRetailerData?.retailer_id || !authToken) {
      toast.error("Invalid retailer selected");
      return;
    }

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/update/block`,
        {
          retailer_id: fullRetailerData.retailer_id,
          block_status: blockStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      toast.success("Retailer block status updated");

      // Update both form data and full retailer data
      setEditFormData((prev) => ({
        ...prev,
        is_blocked: blockStatus,
      }));

      setFullRetailerData((prev) => 
        prev ? { ...prev, is_blocked: blockStatus } : null
      );

      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update block status"
      );
    }
  };

  const handleUpdateRetailerKYCStatus = async (kycStatus: boolean) => {
    if (!fullRetailerData?.retailer_id || !authToken) {
      toast.error("Invalid retailer selected");
      return;
    }

    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/update/kyc`,
        {
          retailer_id: fullRetailerData.retailer_id,
          kyc_status: kycStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      toast.success("Retailer KYC status updated");

      // Update both form data and full retailer data
      setEditFormData((prev) => ({
        ...prev,
        kyc_status: kycStatus,
      }));

      setFullRetailerData((prev) => 
        prev ? { ...prev, kyc_status: kycStatus } : null
      );

      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update KYC status"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Retailer Profile
          </DialogTitle>
        </DialogHeader>

        {isFetchingProfile ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="ml-2 text-muted-foreground">
              Loading profile...
            </span>
          </div>
        ) : (
          fullRetailerData && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">
                    Personal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retailer_name">Full Name *</Label>
                    <Input
                      id="retailer_name"
                      value={editFormData.retailer_name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          retailer_name: e.target.value,
                        })
                      }
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retailer_phone">Phone Number *</Label>
                    <Input
                      id="retailer_phone"
                      value={editFormData.retailer_phone}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          retailer_phone: e.target.value,
                        })
                      }
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      value={editFormData.pan_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          pan_number: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="aadhar_number">Aadhar Number</Label>
                    <Input
                      id="aadhar_number"
                      value={editFormData.aadhar_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          aadhar_number: e.target.value,
                        })
                      }
                      placeholder="Enter 12-digit Aadhar"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg">
                    Address Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editFormData.address}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          address: e.target.value,
                        })
                      }
                      placeholder="Enter full address"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editFormData.city}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            city: e.target.value,
                          })
                        }
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={editFormData.state}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            state: e.target.value,
                          })
                        }
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={editFormData.pincode}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            pincode: e.target.value,
                          })
                        }
                        placeholder="Enter pincode"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-lg">
                    Business Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
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

                  <div>
                    <Label htmlFor="business_type">Business Type</Label>
                    <Input
                      id="business_type"
                      value={editFormData.business_type}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          business_type: e.target.value,
                        })
                      }
                      placeholder="Enter business type"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      value={editFormData.gst_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          gst_number: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Enter GST number"
                    />
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">
                    Account Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retailer_password">Password</Label>
                    <Input
                      id="retailer_password"
                      type="text"
                      value={editFormData.retailer_password}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          retailer_password: e.target.value,
                        })
                      }
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wallet_balance">Wallet Balance (₹)</Label>
                    <Input
                      id="wallet_balance"
                      type="number"
                      step="0.01"
                      value={editFormData.wallet_balance}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          wallet_balance: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Settings className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-lg">Status Controls</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">KYC Status</Label>
                      <p className="text-sm text-gray-500">
                        Verify customer identity
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          editFormData.kyc_status ? "default" : "outline"
                        }
                        onClick={() => handleUpdateRetailerKYCStatus(true)}
                        className={
                          editFormData.kyc_status ? "bg-green-600 hover:bg-green-700" : ""
                        }
                        disabled={editFormData.kyc_status}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verified
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          !editFormData.kyc_status ? "default" : "outline"
                        }
                        onClick={() => handleUpdateRetailerKYCStatus(false)}
                        className={
                          !editFormData.kyc_status ? "bg-yellow-600 hover:bg-yellow-700" : ""
                        }
                        disabled={!editFormData.kyc_status}
                      >
                        Pending
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Account Status</Label>
                      <p className="text-sm text-gray-500">
                        Block or activate account
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          !editFormData.is_blocked ? "default" : "outline"
                        }
                        onClick={() => handleUpdateRetailerBlockStatus(false)}
                        className={
                          !editFormData.is_blocked ? "bg-green-600 hover:bg-green-700" : ""
                        }
                        disabled={!editFormData.is_blocked}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          editFormData.is_blocked ? "destructive" : "outline"
                        }
                        onClick={() => handleUpdateRetailerBlockStatus(true)}
                        disabled={editFormData.is_blocked}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Blocked
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating || isFetchingProfile}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRetailer}
            disabled={isUpdating || isFetchingProfile}
          >
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
  );
}