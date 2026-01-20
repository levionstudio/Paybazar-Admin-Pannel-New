import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  CreditCard,
  Building,
  MapPin,
  Calendar,
} from "lucide-react";

/* -------------------- SCHEMA -------------------- */

const distributorSchema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  phone: z.string().regex(/^[1-9]\d{9}$/, "Invalid phone"),
  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Invalid Aadhar"),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN"),
  dob: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => new Date(v) <= new Date(), "DOB cannot be future"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  city: z.string().min(2),
  state: z.string().min(2),
  address: z.string().min(5),
  pincode: z.string().regex(/^\d{6}$/),
  business_name: z.string().min(2),
  business_type: z.string().min(1),
  gst_number: z
  .string()
  .trim()
  .transform((val) => (val === "" ? undefined : val))
  .refine(
    (val) => !val || val.length === 15,
    "GST number must be exactly 15 characters"
  )
  .optional(),

});

type DistributorFormData = z.infer<typeof distributorSchema>;

interface DecodedToken {
  admin_id: string;
  exp: number;
}

/* -------------------- AUTH HELPER -------------------- */

function getAdminIdFromToken(): string | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }
    return decoded.admin_id;
  } catch {
    return null;
  }
}

/* -------------------- COMPONENT -------------------- */

export default function CreateMasterDistributorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  /* ---------- AUTH CHECK ---------- */
  useEffect(() => {
    const id = getAdminIdFromToken();
    if (!id) {
      toast({
        title: "Session expired",
        description: "Please login again",
        variant: "destructive",
      });
      navigate("/login");
    } else {
      setAdminId(id);
    }
  }, [navigate, toast]);

  /* ---------- FORM ---------- */
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema),
  });

  const password = watch("password", "");
  const genderValue = watch("gender");

  /* ---------- PASSWORD STRENGTH ---------- */
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "Weak", score: 0 };
    const rules = [
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /[^A-Za-z0-9]/.test(pwd),
    ].filter(Boolean).length;

    if (rules <= 1) return { label: "Weak", score: 1 };
    if (rules === 2) return { label: "Medium", score: 2 };
    return { label: "Strong", score: 3 };
  };

  /* ---------- SUBMIT ---------- */
  const onSubmit = async (data: DistributorFormData) => {
    if (!adminId) return;

const payload = {
  admin_id: adminId,

  master_distributor_name: data.name.trim(),
  master_distributor_email: data.email.trim().toLowerCase(),
  master_distributor_password: data.password,
  master_distributor_phone: data.phone.trim(),

  aadhar_number: data.aadhar.trim(),
  pan_number: data.pan.trim().toUpperCase(),

  // ✅ THIS IS THE ONLY CORRECT LINE
  date_of_birth: `${data.dob}T00:00:00Z`,

  gender: data.gender,
  city: data.city.trim(),
  state: data.state.trim(),
  address: data.address.trim(),
  pincode: data.pincode.trim(),

  business_name: data.business_name.trim(),
  business_type: data.business_type.trim(),

  ...(data.gst_number
    ? { gst_number: data.gst_number.toUpperCase() }
    : {}),
};



    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/md/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      toast({
        title: "Success",
        description: "Master Distributor created successfully",
      });

      reset();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Creation failed",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Create Master Distributor</h1>
        <p className="text-gray-600 mt-1">
          Add a new master distributor to your network
        </p>
      </div>

      {/* Form Card */}
      <Card className="max-w-5xl mx-auto shadow-md">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-5 w-5 " />
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
                  <CreditCard className="h-5 w-5 " />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">KYC Documents</h2>
                  <p className="text-sm text-gray-600">Identity and verification details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aadhar Number */}
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

                {/* PAN Number */}
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
                  <Building className="h-5 w-5 " />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
                  <p className="text-sm text-gray-600">Company and business details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Name */}
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

                {/* Business Type */}
                <div className="space-y-2">
                  <Label htmlFor="business_type" className="text-sm font-medium text-gray-700">
                    Business Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="business_type"
                    placeholder="e.g., Sole Proprietorship, Partnership"
                    {...register("business_type")}
                    className="h-11 bg-white"
                  />
                  {errors.business_type && (
                    <p className="text-sm text-red-600">{errors.business_type.message}</p>
                  )}
                </div>

                {/* GST Number */}
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
                  <MapPin className="h-5 w-5 " />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Address Details</h2>
                  <p className="text-sm text-gray-600">Location and contact information</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Address */}
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
                  {/* City */}
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

                  {/* State */}
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

                  {/* Pincode */}
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
                  "Create Master Distributor"
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

