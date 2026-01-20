import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff, Loader2, User, Mail, Phone, CreditCard, Building, MapPin, Calendar, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const distributorSchema = z.object({
  distributor_name: z.string().min(3).max(100),

  distributor_email: z.string().email(),

  distributor_password: z
    .string()
    .min(6)
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),

  distributor_phone: z.string().regex(/^[1-9]\d{9}$/, "Invalid phone number"),

  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Invalid Aadhar number"),

  pan: z
    .string()
    .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN number")
    .transform((v) => v.toUpperCase()),

  dob: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => new Date(v) <= new Date(), "DOB cannot be in the future"),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]),

  city: z.string().min(1),
  state: z.string().min(1),
  address: z.string().min(5),

  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),

  business_name: z.string().min(1),
  business_type: z.string().min(1),

  gst_number: z
    .string()
    .optional()
    .transform((v) => (v?.trim() === "" ? undefined : v))
    .refine((v) => !v || v.length === 15, "GST must be 15 characters"),
});


type DistributorFormData = z.infer<typeof distributorSchema>;

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface MasterDistributor {
  master_distributor_id: string;
  master_distributor_name: string;
  master_distributor_email: string;
  [key: string]: any;
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

const CreateDistributorPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [masterDistributors, setMasterDistributors] = useState<MasterDistributor[]>([]);
  const [selectedMasterDistributorId, setSelectedMasterDistributorId] = useState<string>("");
  const [loadingMasterDistributors, setLoadingMasterDistributors] = useState(false);

  // Password strength helper
  const getPasswordStrength = (pwd: string): { label: "Weak" | "Medium" | "Strong"; score: 0 | 1 | 2 | 3 } => {
    if (!pwd) return { label: "Weak", score: 0 };
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const longEnough = pwd.length >= 8;

    const met = [hasLower, hasUpper, hasSpecial].filter(Boolean).length;

    if (met <= 1 || pwd.length < 6) return { label: "Weak", score: 1 };
    if (met === 2 || (met === 3 && !longEnough)) return { label: "Medium", score: 2 };
    return { label: "Strong", score: 3 };
  };

  // Fetch master distributors
  useEffect(() => {
    const fetchMasterDistributors = async () => {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setLoadingMasterDistributors(true);
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const adminId = decoded.admin_id;
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/md/get/admin/${adminId}`;
        
        const res = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.data.status === "success" && res.data.data) {
          // Handle nested master_distributors array
          let distributors = res.data.data.master_distributors || [];
          
          // Map to correct structure matching Go backend
          distributors = distributors.map((md: any) => ({
            master_distributor_id: md.master_distributor_id,
            master_distributor_name: md.master_distributor_name,
            master_distributor_email: md.master_distributor_email,
            master_distributor_phone: md.master_distributor_phone,
            business_name: md.business_name,
            ...md
          }));
          
          // Filter out any invalid entries
          distributors = distributors.filter((md: any) => md.master_distributor_id);
          
          setMasterDistributors(distributors);
          
          // Auto-select if only one MD exists
          if (distributors.length === 1) {
            setSelectedMasterDistributorId(distributors[0].master_distributor_id);
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load master distributors",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Error fetching master distributors:", err);
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed to load master distributors",
          variant: "destructive",
        });
      } finally {
        setLoadingMasterDistributors(false);
      }
    };

    fetchMasterDistributors();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema),
  });

  const genderValue = watch("gender");

const onSubmit = async (data: DistributorFormData) => {
  const token = getAuthToken();
  if (!token) {
    toast({
      title: "Session Expired",
      description: "Please log in again.",
      variant: "destructive",
    });
    navigate("/login");
    return;
  }

  if (!selectedMasterDistributorId) {
    toast({
      title: "Selection Required",
      description: "Please select a master distributor.",
      variant: "destructive",
    });
    return;
  }

  const selectedMD = masterDistributors.find(
    (md) => md.master_distributor_id === selectedMasterDistributorId
  );

  if (!selectedMD) {
    toast({
      title: "Invalid Selection",
      description: "Selected master distributor not found. Please select again.",
      variant: "destructive",
    });
    return;
  }

  // Build the payload object directly instead of using a function
  const requestPayload = {
    master_distributor_id: selectedMasterDistributorId,
    distributor_name: data.distributor_name.trim(),
    distributor_email: data.distributor_email.trim().toLowerCase(),
    distributor_password: data.distributor_password,
    distributor_phone: data.distributor_phone.trim(),
    aadhar_number: data.aadhar.trim(),
    pan_number: data.pan.toUpperCase(),
    date_of_birth: `${data.dob}T00:00:00Z`,
    gender: data.gender,
    city: data.city.trim(),
    state: data.state.trim(),
    address: data.address.trim(),
    pincode: data.pincode.trim(),
    business_name: data.business_name.trim(),
    business_type: data.business_type.trim(),
    ...(data.gst_number ? { gst_number: data.gst_number.toUpperCase() } : {}),
  };

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/distributor/create`,
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const res = response.data;

    if (res.status === "success" || (response.status >= 200 && response.status < 300)) {
      toast({
        title: "Success",
        description:
          res.message ||
          `Distributor ${data.distributor_name} created successfully under ${selectedMD.master_distributor_name}.`,
      });
      reset();
      setPassword("");
      setSelectedMasterDistributorId("");
    } else {
      toast({
        title: "Creation Failed",
        description: res.message || res.msg || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    console.error("Error creating distributor:", error);

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      "Failed to create distributor. Please try again.";

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }
};

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Create Distributor</h1>
        <p className="text-gray-600 mt-1">
          Add a new distributor to your network
        </p>
      </div>

      {/* Form Card */}
      <Card className="max-w-5xl mx-auto shadow-md">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
            {/* Master Distributor Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Master Distributor Assignment</h2>
                  <p className="text-sm text-gray-600">Select the master distributor</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="masterDistributor" className="text-sm font-medium text-gray-700">
                  Master Distributor <span className="text-red-500">*</span>
                </Label>
                {loadingMasterDistributors ? (
                  <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-white">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-600">Loading master distributors...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedMasterDistributorId || ""}
                    onValueChange={setSelectedMasterDistributorId}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select a master distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterDistributors.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-600">
                          No master distributors found
                        </div>
                      ) : (
                        masterDistributors.map((md, index) => {
                          const displayName = md.master_distributor_id || md.master_distributor_email ||md.master_distributor_name || `MD-${index + 1}`;
                          
                          return (
                            <SelectItem
                              key={`md-${md.master_distributor_id}-${index}`}
                              value={md.master_distributor_id}
                            >
                              {displayName}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
                {!selectedMasterDistributorId && !loadingMasterDistributors && (
                  <p className="text-sm text-red-600">
                    Please select a master distributor
                  </p>
                )}
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-600">Basic details and identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    {...register("distributor_name")}
                    className="h-11 bg-white"
                  />
                  {errors.distributor_name && (
                    <p className="text-sm text-red-600">{errors.distributor_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      {...register("distributor_email")}
                      className="h-11 pl-10 bg-white"
                    />
                  </div>
                  {errors.distributor_email && (
                    <p className="text-sm text-red-600">{errors.distributor_email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      {...register("distributor_phone")}
                      className="h-11 pl-10 bg-white"
                    />
                  </div>
                  {errors.distributor_phone && (
                    <p className="text-sm text-red-600">{errors.distributor_phone.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("distributor_password")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        register("distributor_password").onChange(e);
                      }}
                      className="h-11 pr-10 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            getPasswordStrength(password).score === 1
                              ? "w-1/3 bg-red-500"
                              : getPasswordStrength(password).score === 2
                              ? "w-2/3 bg-orange-500"
                              : getPasswordStrength(password).score === 3
                              ? "w-full bg-green-500"
                              : "w-0"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        Strength:{" "}
                        <span
                          className={`font-medium ${
                            getPasswordStrength(password).label === "Weak"
                              ? "text-red-600"
                              : getPasswordStrength(password).label === "Medium"
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {getPasswordStrength(password).label}
                        </span>
                      </p>
                    </div>
                  )}
                  {errors.distributor_password && (
                    <p className="text-sm text-red-600">{errors.distributor_password.message}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="dob"
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      {...register("dob")}
                      className="h-11 pl-10 bg-white"
                    />
                  </div>
                  {errors.dob && (
                    <p className="text-sm text-red-600">{errors.dob.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={genderValue || ""}
                    onValueChange={(value) => setValue("gender", value as DistributorFormData["gender"])}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-600">{errors.gender.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* KYC Documents Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">KYC Documents</h2>
                  <p className="text-sm text-gray-600">Identity and verification details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aadhar" className="text-sm font-medium text-gray-700">
                    Aadhar Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="aadhar"
                    placeholder="123456789012"
                    {...register("aadhar")}
                    className="h-11 bg-white font-mono"
                    maxLength={12}
                  />
                  {errors.aadhar && (
                    <p className="text-sm text-red-600">{errors.aadhar.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan" className="text-sm font-medium text-gray-700">
                    PAN Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pan"
                    placeholder="ABCDE1234F"
                    {...register("pan")}
                    className="h-11 bg-white font-mono uppercase"
                    maxLength={10}
                  />
                  {errors.pan && (
                    <p className="text-sm text-red-600">{errors.pan.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
                  <p className="text-sm text-gray-600">Company and business details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-sm font-medium text-gray-700">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="Enter business name"
                    {...register("business_name")}
                    className="h-11 bg-white"
                  />
                  {errors.business_name && (
                    <p className="text-sm text-red-600">{errors.business_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type" className="text-sm font-medium text-gray-700">
                    Business Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="business_type"
                    placeholder="e.g., Sole Proprietorship"
                    {...register("business_type")}
                    className="h-11 bg-white"
                  />
                  {errors.business_type && (
                    <p className="text-sm text-red-600">{errors.business_type.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="gst_number" className="text-sm font-medium text-gray-700">
                    GST Number <span className="text-gray-500 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="gst_number"
                    placeholder="22AAAAA0000A1Z5"
                    {...register("gst_number")}
                    className="h-11 bg-white font-mono uppercase"
                    maxLength={15}
                  />
                  {errors.gst_number && (
                    <p className="text-sm text-red-600">{errors.gst_number.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Address Details</h2>
                  <p className="text-sm text-gray-600">Location and contact information</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Full Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
                    {...register("address")}
                    className="min-h-[100px] resize-none bg-white"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      {...register("city")}
                      className="h-11 bg-white"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="state"
                      placeholder="Enter state"
                      {...register("state")}
                      className="h-11 bg-white"
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600">{errors.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">
                      Pincode <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pincode"
                      placeholder="400001"
                      {...register("pincode")}
                      className="h-11 bg-white font-mono"
                      maxLength={6}
                    />
                    {errors.pincode && (
                      <p className="text-sm text-red-600">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setPassword("");
                }}
                className="flex-1 h-11"
                disabled={isSubmitting}
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 paybazaar-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  "Create Distributor"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  );
};

export default CreateDistributorPage;