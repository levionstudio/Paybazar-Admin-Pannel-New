import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JWTPayload {
  admin_id: string;
  exp: number;
}

interface AdminBankAccount {
  admin_bank_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}

interface CreateAdminBankData {
  admin_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AdminBankAccount() {
  const [adminDetails, setAdminDetails] = useState<JWTPayload | null>(null);
  const [bankAccounts, setBankAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<AdminBankAccount | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateAdminBankData>({
    admin_id: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<CreateAdminBankData>>({});

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    bank_name: "",
    account_number: "",
    ifsc_code: "",
  });

  const [editFormErrors, setEditFormErrors] = useState<Partial<{
    bank_name: string;
    account_number: string;
    ifsc_code: string;
  }>>({});

  // Decode JWT token and get admin details
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      setAdminDetails(decoded);
      setFormData((prev) => ({ ...prev, admin_id: decoded.admin_id }));
    } catch (error) {
      console.error("Invalid token", error);
      toast.error("Invalid authentication token");
    }
  }, []);

  // Fetch admin bank accounts
  const fetchAdminBanks = async () => {
    if (!adminDetails?.admin_id) return;

    setFetchingBanks(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bank/get/admin/${adminDetails.admin_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bank accounts");
      }

      const data = await response.json();
      console.log("API Response:", data);
      
      // Handle different possible response structures
      const accounts = Array.isArray(data) 
        ? data 
        : Array.isArray(data.data) 
        ? data.data 
        : data.data?.admin_banks 
        ? data.data.admin_banks 
        : [];
      
      setBankAccounts(accounts);
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      toast.error(error.message || "Failed to fetch bank accounts");
      setBankAccounts([]); // Set empty array on error
    } finally {
      setFetchingBanks(false);
    }
  };

  // Fetch banks when admin details are available
  useEffect(() => {
    if (adminDetails?.admin_id) {
      fetchAdminBanks();
    }
  }, [adminDetails]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<CreateAdminBankData> = {};

    if (!formData.bank_name.trim()) {
      errors.bank_name = "Bank name is required";
    }

    if (!formData.account_number.trim()) {
      errors.account_number = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.account_number.trim())) {
      errors.account_number = "Account number must be 9-18 digits";
    }

    if (!formData.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.trim().toUpperCase())) {
      errors.ifsc_code = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field: keyof CreateAdminBankData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Create admin bank account
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${API_BASE_URL}/bank/create/admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create bank account");
      }

      toast.success("Bank account created successfully");
      
      // Reset form
      setFormData({
        admin_id: adminDetails?.admin_id || "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
      });
      setShowCreateForm(false);
      
      // Refresh bank accounts list
      fetchAdminBanks();
    } catch (error: any) {
      console.error("Error creating bank:", error);
      toast.error(error.message || "Failed to create bank account");
    } finally {
      setLoading(false);
    }
  };

  // Delete admin bank account
  const handleDeleteBank = async () => {
    if (!selectedBankId) return;

    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bank/delete/admin/${selectedBankId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete bank account");
      }

      toast.success("Bank account deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedBankId("");
      
      // Refresh bank accounts list
      fetchAdminBanks();
    } catch (error: any) {
      console.error("Error deleting bank:", error);
      toast.error(error.message || "Failed to delete bank account");
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (bankId: string) => {
    setSelectedBankId(bankId);
    setDeleteDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (bank: AdminBankAccount) => {
    setSelectedBank(bank);
    setEditFormData({
      bank_name: bank.bank_name,
      account_number: bank.account_number,
      ifsc_code: bank.ifsc_code,
    });
    setEditFormErrors({});
    setEditDialogOpen(true);
  };

  // Validate edit form
  const validateEditForm = (): boolean => {
    const errors: Partial<typeof editFormData> = {};

    if (!editFormData.bank_name.trim()) {
      errors.bank_name = "Bank name is required";
    }

    if (!editFormData.account_number.trim()) {
      errors.account_number = "Account number is required";
    } else if (!/^\d{9,18}$/.test(editFormData.account_number.trim())) {
      errors.account_number = "Account number must be 9-18 digits";
    }

    if (!editFormData.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(editFormData.ifsc_code.trim().toUpperCase())) {
      errors.ifsc_code = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit input change
  const handleEditInputChange = (field: keyof typeof editFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    if (editFormErrors[field]) {
      setEditFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Update admin bank account
  const handleUpdateBank = async () => {
    if (!selectedBank) return;

    if (!validateEditForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("authToken");

    // Build payload with only changed fields
    const payload: any = {
      admin_bank_id: parseInt(selectedBank.admin_bank_id),
    };

    if (editFormData.bank_name !== selectedBank.bank_name) {
      payload.bank_name = editFormData.bank_name;
    }
    if (editFormData.account_number !== selectedBank.account_number) {
      payload.account_number = editFormData.account_number;
    }
    if (editFormData.ifsc_code !== selectedBank.ifsc_code) {
      payload.ifsc_code = editFormData.ifsc_code;
    }

    // Check if any changes were made
    if (Object.keys(payload).length === 1) {
      toast.info("No changes detected");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bank/update/admin`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update bank account");
      }

      toast.success("Bank account updated successfully");
      setEditDialogOpen(false);
      setSelectedBank(null);
      
      // Refresh bank accounts list
      fetchAdminBanks();
    } catch (error: any) {
      console.error("Error updating bank:", error);
      toast.error(error.message || "Failed to update bank account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg gradient-primary">
                  <Building2 className="h-8 w-8 text-primary-foreground" />
                </div>
                Admin Bank Accounts
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your bank account information
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showCreateForm ? "Cancel" : "Add Bank Account"}
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-6 shadow-elevated border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                Add New Bank Account
              </CardTitle>
              <CardDescription>
                Enter your bank account details below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Name */}
                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-card-foreground">
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g., State Bank of India"
                      value={formData.bank_name}
                      onChange={(e) =>
                        handleInputChange("bank_name", e.target.value)
                      }
                      className={cn(
                        "bg-background border-border text-card-foreground",
                        formErrors.bank_name && "border-destructive"
                      )}
                    />
                    {formErrors.bank_name && (
                      <p className="text-sm text-destructive">
                        {formErrors.bank_name}
                      </p>
                    )}
                  </div>

                  {/* Account Number */}
                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-card-foreground">
                      Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="account_number"
                      placeholder="e.g., 123456789012"
                      value={formData.account_number}
                      onChange={(e) =>
                        handleInputChange("account_number", e.target.value)
                      }
                      className={cn(
                        "bg-background border-border text-card-foreground",
                        formErrors.account_number && "border-destructive"
                      )}
                    />
                    {formErrors.account_number && (
                      <p className="text-sm text-destructive">
                        {formErrors.account_number}
                      </p>
                    )}
                  </div>

                  {/* IFSC Code */}
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code" className="text-card-foreground">
                      IFSC Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ifsc_code"
                      placeholder="e.g., SBIN0001234"
                      value={formData.ifsc_code}
                      onChange={(e) =>
                        handleInputChange("ifsc_code", e.target.value.toUpperCase())
                      }
                      className={cn(
                        "bg-background border-border text-card-foreground uppercase",
                        formErrors.ifsc_code && "border-destructive"
                      )}
                      maxLength={11}
                    />
                    {formErrors.ifsc_code && (
                      <p className="text-sm text-destructive">
                        {formErrors.ifsc_code}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({
                        admin_id: adminDetails?.admin_id || "",
                        bank_name: "",
                        account_number: "",
                        ifsc_code: "",
                      });
                      setFormErrors({});
                    }}
                    className="border-border text-muted-foreground hover:bg-secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="gradient-primary text-primary-foreground shadow-glow"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Bank Accounts List */}
        <Card className="shadow-elevated border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-card-foreground">
                Your Bank Accounts
              </CardTitle>
              <CardDescription>
                {bankAccounts.length} account(s) registered
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdminBanks}
              disabled={fetchingBanks}
              className="border-border text-muted-foreground hover:bg-secondary"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2",
                  fetchingBanks && "animate-spin"
                )}
              />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {fetchingBanks ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bank accounts found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Add Bank Account" to create your first account
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-card-foreground font-semibold">
                        Bank Name
                      </TableHead>
                      <TableHead className="text-card-foreground font-semibold">
                        Account Number
                      </TableHead>
                      <TableHead className="text-card-foreground font-semibold">
                        IFSC Code
                      </TableHead>
                      <TableHead className="text-card-foreground font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((bank) => (
                      <TableRow
                        key={bank.admin_bank_id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium text-card-foreground">
                          {bank.bank_name}
                        </TableCell>
                        <TableCell className="text-card-foreground">
                          {bank.account_number}
                        </TableCell>
                        <TableCell className="text-card-foreground font-mono">
                          {bank.ifsc_code}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(bank)}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(bank.admin_bank_id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Bank Account Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                Edit Bank Account
              </DialogTitle>
              <DialogDescription>
                Update your bank account information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit_bank_name" className="text-card-foreground">
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_bank_name"
                    placeholder="e.g., State Bank of India"
                    value={editFormData.bank_name}
                    onChange={(e) =>
                      handleEditInputChange("bank_name", e.target.value)
                    }
                    className={cn(
                      "bg-background border-border text-card-foreground",
                      editFormErrors.bank_name && "border-destructive"
                    )}
                  />
                  {editFormErrors.bank_name && (
                    <p className="text-sm text-destructive">
                      {editFormErrors.bank_name}
                    </p>
                  )}
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label htmlFor="edit_account_number" className="text-card-foreground">
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_account_number"
                    placeholder="e.g., 123456789012"
                    value={editFormData.account_number}
                    onChange={(e) =>
                      handleEditInputChange("account_number", e.target.value)
                    }
                    className={cn(
                      "bg-background border-border text-card-foreground",
                      editFormErrors.account_number && "border-destructive"
                    )}
                  />
                  {editFormErrors.account_number && (
                    <p className="text-sm text-destructive">
                      {editFormErrors.account_number}
                    </p>
                  )}
                </div>

                {/* IFSC Code */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit_ifsc_code" className="text-card-foreground">
                    IFSC Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_ifsc_code"
                    placeholder="e.g., SBIN0001234"
                    value={editFormData.ifsc_code}
                    onChange={(e) =>
                      handleEditInputChange("ifsc_code", e.target.value.toUpperCase())
                    }
                    className={cn(
                      "bg-background border-border text-card-foreground uppercase",
                      editFormErrors.ifsc_code && "border-destructive"
                    )}
                    maxLength={11}
                  />
                  {editFormErrors.ifsc_code && (
                    <p className="text-sm text-destructive">
                      {editFormErrors.ifsc_code}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedBank(null);
                  setEditFormErrors({});
                }}
                disabled={loading}
                className="border-border text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBank}
                disabled={loading}
                className="gradient-primary text-primary-foreground shadow-glow"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Update Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                Confirm Delete
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this bank account? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedBankId("");
                }}
                disabled={loading}
                className="border-border text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteBank}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}