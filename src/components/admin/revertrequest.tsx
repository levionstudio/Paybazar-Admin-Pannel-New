import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Loader2, 
  RotateCcw, 
  User,
  Phone,
  CreditCard,
  UserCog,
  IndianRupee,
  Search,
  X,
  HomeIcon
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

interface DecodedToken {
  admin_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

interface UserOption {
  id: string;
  name: string;
  phone: string;
  balance: number;
  Business: string;
}

interface UserDetails {
  name: string;
  phone: string;
  userId: string;
  currentBalance: number;
  Business: string;
}

export default function RefundRequest() {
  const [userType, setUserType] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [filteredUserOptions, setFilteredUserOptions] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminId, setAdminId] = useState("");

  // Get admin ID from token
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Please login to continue");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        return;
      }
      setAdminId(decoded.admin_id);
    } catch (error) {
      toast.error("Invalid session. Please login again.");
    }
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUserOptions(userOptions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = userOptions.filter((user) => {
      const matchesId = user.id.toLowerCase().includes(query);
      const matchesName = user.name.toLowerCase().includes(query);
      const matchesPhone = user.phone.includes(query);
      const matchesBusiness = user.Business?.toLowerCase().includes(query);
      
      return matchesId || matchesName || matchesPhone || matchesBusiness;
    });

    setFilteredUserOptions(filtered);
  }, [searchQuery, userOptions]);

  const getUserTypeLabel = (type: string) => {
    const labels = {
      "master-distributor": "Master Distributor",
      "distributor": "Distributor",
      "retailer": "Retailer",
    };
    return labels[type] || "";
  };

  // Fetch all users when user type changes (without pagination - get all at once)
  const fetchUsers = async (type: string) => {
    if (!type || !adminId) return;

    setIsLoadingUsers(true);
    setUserOptions([]);
    setFilteredUserOptions([]);
    setSelectedUserId("");
    setUserDetails(null);
    setSearchQuery("");

    try {
      const token = localStorage.getItem("authToken");
      let endpoint = "";

      switch (type) {
        case "master-distributor":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/md/get/admin/${adminId}?limit=10000`;
          break;

        case "distributor":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/admin/${adminId}?limit=10000`;
          break;

        case "retailer":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/admin/${adminId}?limit=10000`;
          break;

        default:
          return;
      }

      const { data } = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (data.status !== "success") {
        toast.error("Failed to load users");
        return;
      }

      let users: UserOption[] = [];

      // ✅ CORRECT MAPPING (MATCH BACKEND)
      if (type === "master-distributor") {
        users = (data.data.master_distributors || []).map((md: any) => ({
          id: md.master_distributor_id,
          name: md.master_distributor_name,
          phone: md.master_distributor_phone,
          balance: Number(md.wallet_balance || 0),
          Business: md.business_name || "N/A",
        }));
      }

      if (type === "distributor") {
        users = (data.data.distributors || []).map((dist: any) => ({
          id: dist.distributor_id,
          name: dist.distributor_name,
          phone: dist.distributor_phone,
          balance: Number(dist.wallet_balance || 0),
          Business: dist.business_name || "N/A",
        }));
      }

      if (type === "retailer") {
        users = (data.data.retailers || []).map((ret: any) => ({
          id: ret.retailer_id,
          name: ret.retailer_name,
          phone: ret.retailer_phone,
          balance: Number(ret.wallet_balance || 0),
          Business: ret.business_name || "N/A",
        }));
      }

      setUserOptions(users);
      setFilteredUserOptions(users);
      toast.success(`Loaded ${users.length} ${getUserTypeLabel(type)}(s)`);

    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch users"
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    if (!userId || !userType) return;

    try {
      const token = localStorage.getItem("authToken");
      let endpoint = "";

      switch (userType) {
        case "master-distributor":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/md/get/md/${userId}`;
          break;

        case "distributor":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/distributor/get/distributor/${userId}`;
          break;

        case "retailer":
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/retailer/get/retailer/${userId}`;
          break;
      }

      const { data } = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.status !== "success") {
        toast.error("Failed to fetch user details");
        return;
      }

      let user: any;

      if (userType === "master-distributor") {
        user = data.data.master_distributor;
      } else if (userType === "distributor") {
        user = data.data.distributor;
      } else if (userType === "retailer") {
        user = data.data.retailer;
      }

      if (!user) {
        toast.error("User not found");
        return;
      }

      setUserDetails({
        name:
          user.master_distributor_name ||
          user.distributor_name ||
          user.retailer_name,
        Business: user.business_name || "N/A",
        phone:
          user.master_distributor_phone ||
          user.distributor_phone ||
          user.retailer_phone,
        userId:
          user.master_distributor_id ||
          user.distributor_id ||
          user.retailer_id,
        currentBalance: Number(user.wallet_balance || 0),
      });

      toast.success("User details loaded");

    } catch (error: any) {
      console.error("Error fetching user details:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch user details"
      );
    }
  };

  const handleUserTypeChange = (value: string) => {
    setUserType(value);
    setSelectedUserId("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setSearchQuery("");
    fetchUsers(value);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    fetchUserDetails(userId);
  };

  const handleRevert = async () => {
    if (!adminId) {
      toast.error("Admin ID not found. Please login again.");
      return;
    }

    if (!userDetails) {
      toast.error("Please select a user first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const revertAmount = parseFloat(amount);
    if (revertAmount > userDetails.currentBalance) {
      toast.error(
        `Insufficient balance. Current balance: ₹${userDetails.currentBalance.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("authToken");

      const payload = {
        from_id: adminId,
        on_id: selectedUserId,
        amount: revertAmount,
        remarks: remarks.trim() || "Revert request processed",
      };

      const { data } = await axios.post(
        import.meta.env.VITE_API_BASE_URL + "/revert/create",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.status === "success") {
        toast.success(data.message || "Revert processed successfully");
        handleReset();
      } else {
        toast.error(data.message || "Failed to process revert");
      }
    } catch (error: any) {
      console.error("Revert error:", error);
      toast.error(
        error.response?.data?.message || "Failed to process revert"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUserType("");
    setSelectedUserId("");
    setAmount("");
    setRemarks("");
    setUserDetails(null);
    setUserOptions([]);
    setFilteredUserOptions([]);
    setSearchQuery("");
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revert Request</h1>
          <p className="text-gray-600 mt-1">
            Process revert requests for users in your network
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Main Form Card */}
      <Card className="max-w-4xl mx-auto shadow-md">
        <CardContent className="p-0">
          <form className="p-6 md:p-8 space-y-8">
            {/* User Type Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                  <UserCog className="h-5 w-5 text-paybazaar-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">User Selection</h2>
                  <p className="text-sm text-gray-600">Select user type and choose a user</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                {/* User Type */}
                <div className="space-y-2">
                  <Label htmlFor="userType" className="text-sm font-medium text-gray-700">
                    User Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={userType} onValueChange={handleUserTypeChange}>
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="master-distributor">Master Distributor</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User Selection Dropdown with Search */}
                <div className="space-y-2">
                  <Label htmlFor="userSelect" className="text-sm font-medium text-gray-700">
                    Select {getUserTypeLabel(userType) || "User"} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={handleUserSelect}
                    disabled={!userType || isLoadingUsers}
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue
                        placeholder={
                          isLoadingUsers
                            ? `Loading all ${getUserTypeLabel(userType)}s...`
                            : userOptions.length === 0
                            ? "No users available"
                            : selectedUserId 
                            ? `${userOptions.find(u => u.id === selectedUserId)?.name || selectedUserId}`
                            : `Select from ${userOptions.length} users`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-w-md">
                      {/* Search Bar Inside Dropdown */}
                      <div className="sticky top-0 z-10 bg-white p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by ID, name, phone, business..."
                            className="h-9 pl-9 pr-9 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery("");
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {searchQuery && (
                          <p className="text-xs text-gray-500 mt-1.5 px-1">
                            Found {filteredUserOptions.length} result(s)
                          </p>
                        )}
                      </div>
                      
                      {/* User List */}
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredUserOptions?.length > 0 ? (
                          filteredUserOptions.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id}
                              className="cursor-pointer hover:bg-gray-100"
                            >
                              <div className="flex flex-col py-1.5 w-full">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-semibold text-sm text-gray-900">
                                    {user.name}
                                  </span>
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    ₹{formatAmount(user.balance)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="font-mono">{user.id}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{user.phone}</span>
                                  {user.Business && user.Business !== "N/A" && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span className="truncate max-w-[150px]">{user.Business}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : searchQuery ? (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="font-medium">No results found</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No users available
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  {isLoadingUsers && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching all {getUserTypeLabel(userType)}s...
                    </p>
                  )}
                  {!isLoadingUsers && userOptions.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {userOptions.length} {getUserTypeLabel(userType)}{userOptions.length !== 1 ? 's' : ''} available
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* User Details Display */}
            {userDetails && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                    <User className="h-5 w-5 text-paybazaar-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
                    <p className="text-sm text-gray-600">Verified user information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">{userDetails.name}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-mono font-semibold text-gray-900">{userDetails.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">User ID</Label>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-mono font-semibold text-gray-900">{userDetails.userId}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Business Name</Label>
                    <div className="flex items-center gap-2">
                      <HomeIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-mono font-semibold text-gray-900">{userDetails.Business}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Current Balance</Label>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                      <p className="text-base font-bold text-green-600">
                        ₹{formatAmount(userDetails.currentBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Revert Amount & Remarks */}
            {userDetails && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                    <IndianRupee className="h-5 w-5 text-paybazaar-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Revert Details</h2>
                    <p className="text-sm text-gray-600">Enter the amount and remarks</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                      Amount (₹) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="text"
                        value={amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.]/g, "");
                          if (value.split(".").length <= 2) {
                            setAmount(value);
                          }
                        }}
                        placeholder="Enter amount"
                        className="h-12 pl-8 text-lg font-semibold bg-white"
                      />
                    </div>
                  
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">
                      Remarks <span className="text-gray-400 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="remarks"
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter remarks (optional)"
                      className="h-12 bg-white"
                    />
                  </div>
                </div>

                {/* Summary Box */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                    <h3 className="text-sm font-semibold text-red-900 mb-3">
                      Revert Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700">Amount to Revert:</span>
                        <span className="text-lg font-bold text-red-900">
                          ₹{formatAmount(parseFloat(amount))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-red-200">
                        <span className="text-sm text-red-700">New Balance (After Revert):</span>
                        <span className="text-base font-semibold text-red-900">
                          ₹{formatAmount(userDetails.currentBalance - parseFloat(amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1 h-12"
                disabled={isProcessing}
              >
                Reset Form
              </Button>

              <Button
                type="button"
                onClick={handleRevert}
                disabled={isProcessing || !userDetails || !amount || parseFloat(amount) <= 0}
                className="flex-1 h-12 paybazaar-button"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Process Revert
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="max-w-4xl mx-auto bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Important Notes:
          </h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>Select the user type before choosing a user</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>All users of the selected type will be loaded at once</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>Use the search bar inside the dropdown to quickly find users by ID, name, phone, or business name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>Each user entry shows their current wallet balance for reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>User must be registered in the system</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>Revert amount cannot exceed user's current wallet balance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-paybazaar-blue mt-1">•</span>
              <span>All revert transactions are logged and can be viewed in history</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}