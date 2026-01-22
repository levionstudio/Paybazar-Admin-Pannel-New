import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { jwtDecode } from "jwt-decode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, EyeOff, Loader2, User, Mail, Phone, CreditCard, Building, MapPin, Calendar, UserCog } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

const retailerSchema = z.object({
  distributor_id: z.string().min(1, "Please select a distributor"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100),
  phone: z.string().regex(/^[1-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  aadhar: z.string().regex(/^\d{12}$/, "Aadhar must be 12 digits"),
  pan: z
    .string()
    .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid PAN number")
    .transform((val) => val.toUpperCase()),
  dob: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Date of birth cannot be in the future"
    ),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    required_error: "Please select a gender",
  }),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  business_name: z.string().min(2, "Business name must be at least 2 characters").max(255),
  business_type: z.string().min(1, "Business type is required"),
  gst_number: z.string().optional().refine((val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val), "Enter a valid GST number"),
})

type RetailerFormData = z.infer<typeof retailerSchema>

interface DecodedToken {
  admin_id: string
  exp: number
}

interface Distributor {
  distributor_id: string
  distributor_name: string
  distributor_email?: string
  distributor_phone?: string
  business_name?: string
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

const CreateRetailerPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loadingDistributors, setLoadingDistributors] = useState(false)
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("")

  // Password strength helper
  const getPasswordStrength = (pwd: string): { label: "Weak" | "Medium" | "Strong"; score: 0 | 1 | 2 | 3 } => {
    if (!pwd) return { label: "Weak", score: 0 }
    const hasLower = /[a-z]/.test(pwd)
    const hasUpper = /[A-Z]/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const longEnough = pwd.length >= 8

    const met = [hasLower, hasUpper, hasSpecial].filter(Boolean).length

    if (met <= 1 || pwd.length < 6) return { label: "Weak", score: 1 }
    if (met === 2 || (met === 3 && !longEnough)) return { label: "Medium", score: 2 }
    return { label: "Strong", score: 3 }
  }

  // Fetch all distributors on mount (without pagination)
  useEffect(() => {
    const fetchDistributors = async () => {
      console.log("🔄 Fetching distributors...");
      const token = getAuthToken();
      
      if (!token) {
        console.error("❌ No auth token found");
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      console.log("✅ Auth token found:", token.substring(0, 20) + "...");
      
      let adminId: string;
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        adminId = decoded.admin_id;
      } catch {
        console.error("❌ Failed to decode token");
        toast({
          title: "Session Error",
          description: "Invalid session token",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      
      setLoadingDistributors(true);
      
      try {
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/admin/${adminId}`;
        console.log("📡 API URL:", apiUrl);
        
        const res = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            // Fetch all distributors without pagination
            limit: 10000,
            offset: 0,
          },
        });

        console.log("📥 Distributor Response:", res.data);

        if (res.data.status === "success" && res.data.data) {
          let distributorList = res.data.data.distributors || [];
          console.log("📋 Raw distributor list:", distributorList);
          console.log("📊 Total distributors fetched:", distributorList.length);
          
          // Map to correct structure matching Go backend
          distributorList = distributorList.map((d: any) => ({
            distributor_id: d.distributor_id,
            distributor_name: d.distributor_name,
            distributor_email: d.distributor_email,
            distributor_phone: d.distributor_phone,
            business_name: d.business_name,
          }));
          
          distributorList = distributorList.filter((d: any) => d.distributor_id);
          console.log("✅ Mapped distributors:", distributorList);
          console.log("✅ Final distributor count:", distributorList.length);
          
          setDistributors(distributorList);
          
          // Auto-select if only one distributor exists
          if (distributorList.length === 1) {
            console.log("🎯 Auto-selecting distributor:", distributorList[0].distributor_id);
            const distId = distributorList[0].distributor_id;
            setSelectedDistributorId(distId);
            // Important: Also set in react-hook-form with validation trigger
            setValue("distributor_id", distId, { shouldValidate: true });
          }
        } else {
          console.error("❌ Invalid response structure:", res.data);
          toast({
            title: "Error",
            description: "Failed to load distributors",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("❌ Error fetching distributors:", err);
        console.error("Error details:", err.response?.data);
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed to load distributors",
          variant: "destructive",
        });
      } finally {
        setLoadingDistributors(false);
      }
    };

    fetchDistributors();
  }, []);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RetailerFormData>({
    resolver: zodResolver(retailerSchema),
    defaultValues: {
      distributor_id: "",
    },
  })

  const genderValue = watch("gender")

  // Log form errors whenever they change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("⚠️ Form Validation Errors:", errors);
    }
  }, [errors]);

  const onSubmit = async (data: RetailerFormData) => {
    console.log("\n🚀 ===== CREATE RETAILER SUBMISSION =====");
    console.log("📝 Form Data:", data);
    
    const token = getAuthToken();
    if (!token) {
      console.error("❌ No auth token found");
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    console.log("✅ Auth token exists");

    if (!selectedDistributorId) {
      console.error("❌ No distributor selected");
      toast({
        title: "Selection Required",
        description: "Please select a distributor.",
        variant: "destructive",
      });
      return;
    }
    console.log("✅ Selected Distributor ID:", selectedDistributorId);

    const selectedDist = distributors.find(d => d.distributor_id === selectedDistributorId);
    console.log("✅ Selected Distributor Details:", selectedDist);

    const payload = {
      distributor_id: selectedDistributorId,
      retailer_name: data.name,
      retailer_phone: data.phone,
      retailer_email: data.email,
      retailer_password: data.password,
      aadhar_number: data.aadhar,
      pan_number: data.pan,
      date_of_birth: new Date(data.dob).toISOString(),
      gender: data.gender,
      city: data.city,
      state: data.state,
      address: data.address,
      pincode: data.pincode,
      business_name: data.business_name,
      business_type: data.business_type,

      // ✅ ONLY send gst_number if user entered it
      ...(data.gst_number ? { gst_number: data.gst_number } : {}),
    };

    console.log("📦 Request Payload:", JSON.stringify(payload, null, 2));
    console.log("📡 API Endpoint:", `${import.meta.env.VITE_API_BASE_URL}/retailer/create`);

    try {
      console.log("⏳ Sending request...");
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/retailer/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📥 Response Status:", res.status);
      console.log("📥 Response Data:", res.data);

      if (res.data.status === "success" || (res.status >= 200 && res.status < 300)) {
        console.log("✅ Retailer created successfully!");
        toast({
          title: "Success",
          description: res.data.message || `Retailer ${data.name} created successfully under ${selectedDist?.distributor_name}.`,
        });
        reset();
        setPassword("");
        setSelectedDistributorId("");
      } else {
        console.error("❌ Unexpected response status:", res.data);
        toast({
          title: "Creation Failed",
          description: res.data.message || res.data.msg || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ CREATE RETAILER ERROR:");
      console.error("Error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      console.error("Error response headers:", error.response?.headers);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.msg || 
                          error.response?.data?.error ||
                          error.message || 
                          "Failed to create retailer. Please try again.";
      
      console.error("Final error message:", errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    console.log("===== END CREATE RETAILER =====\n");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Create Retailer</h1>
        <p className="text-gray-600 mt-1">
          Add a new retailer to your network
        </p>
      </div>

      {/* Form Card */}
      <Card className="max-w-5xl mx-auto shadow-md">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
            {/* Distributor Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Distributor Assignment</h2>
                  <p className="text-sm text-gray-600">
                    Select the distributor {distributors.length > 0 && `(${distributors.length} available)`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distributor" className="text-sm font-medium text-gray-700">
                  Distributor <span className="text-red-500">*</span>
                </Label>
                
                {/* Hidden input to register with react-hook-form */}
                <input
                  type="hidden"
                  {...register("distributor_id")}
                  value={selectedDistributorId}
                />
                
                {loadingDistributors ? (
                  <div className="flex items-center gap-2 h-11 px-3 border rounded-md bg-white">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-600">Loading distributors...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedDistributorId || ""}
                    onValueChange={(value) => {
                      console.log("🎯 Distributor selected:", value);
                      setSelectedDistributorId(value);
                      setValue("distributor_id", value, { shouldValidate: true });
                      console.log("✅ Form distributor_id set to:", value);
                    }}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select a distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-600">
                          No distributors found
                        </div>
                      ) : (
                        distributors.map((d, index) => {
                          const displayName = d.distributor_name || d.distributor_id || d.distributor_email || `Distributor-${index + 1}`;
                          const businessInfo = d.business_name ? ` - ${d.business_name}` : '';
                          const displayText = `${displayName}${businessInfo}`;
                          
                          return (
                            <SelectItem
                              key={`dist-${d.distributor_id}-${index}`}
                              value={d.distributor_id}
                            >
                              {displayText}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
                {errors.distributor_id && (
                  <p className="text-sm text-red-600">
                    {errors.distributor_id.message}
                  </p>
                )}
                {!selectedDistributorId && !loadingDistributors && distributors.length > 0 && (
                  <p className="text-sm text-amber-600">
                    Please select a distributor from the {distributors.length} available option{distributors.length !== 1 ? 's' : ''}
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
                    {...register("name")}
                    className="h-11 bg-white"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
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
                      {...register("email")}
                      className="h-11 pl-10 bg-white"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
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
                      {...register("phone")}
                      className="h-11 pl-10 bg-white"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
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
                      {...register("password")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        register("password").onChange(e)
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
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
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
                    onValueChange={(value) => setValue("gender", value as RetailerFormData["gender"])}
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
                    placeholder="e.g., Retail Shop"
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
                  reset()
                  setPassword("")
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
                onClick={() => console.log("🖱️ Submit button clicked!")}
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
                  "Create Retailer"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}

export default CreateRetailerPage