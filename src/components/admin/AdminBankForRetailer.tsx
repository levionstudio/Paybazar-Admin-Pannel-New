import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Edit,
  Search,
  ChevronLeft,
  ChevronRight,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JWTPayload {
  admin_id: string;
  exp: number;
}

interface Bank {
  bank_id: string;
  bank_name: string;
  ifsc_code: string;
}

interface CreateBankData {
  bank_name: string;
  ifsc_code: string;
}

interface UpdateBankData {
  bank_id: number;
  bank_name?: string;
  ifsc_code?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RetailerBankAccount() {
  const [adminDetails, setAdminDetails] = useState<JWTPayload | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<CreateBankData>({
    bank_name: "",
    ifsc_code: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<CreateBankData>>({});

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    bank_name: "",
    ifsc_code: "",
  });

  const [editFormErrors, setEditFormErrors] = useState<Partial<{
    bank_name: string;
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
    } catch (error) {
      console.error("Invalid token", error);
      toast.error("Invalid authentication token");
    }
  }, []);

  // Fetch all banks
  const fetchBanks = async () => {
    setFetchingBanks(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${API_BASE_URL}/bank/get/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch banks");
      }

      const data = await response.json();

      // Handle different possible response structures
      const banksList = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : data.data?.banks
        ? data.data.banks
        : [];

      setBanks(banksList);
      setFilteredBanks(banksList);
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      toast.error(error.message || "Failed to fetch banks");
      setBanks([]);
      setFilteredBanks([]);
    } finally {
      setFetchingBanks(false);
    }
  };

  // Fetch banks when component mounts
  useEffect(() => {
    if (adminDetails?.admin_id) {
      fetchBanks();
    }
  }, [adminDetails]);

  // Filter banks based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBanks(banks);
    } else {
      const filtered = banks.filter(
        (bank) =>
          bank.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bank.ifsc_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm, banks]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBanks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBanks = filteredBanks.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<CreateBankData> = {};

    if (!formData.bank_name.trim()) {
      errors.bank_name = "Bank name is required";
    }

    if (!formData.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required";
    } else if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.trim().toUpperCase())
    ) {
      errors.ifsc_code = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field: keyof CreateBankData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Create bank
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${API_BASE_URL}/bank/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create bank");
      }

      toast.success("Bank created successfully");

      // Reset form
      setFormData({
        bank_name: "",
        ifsc_code: "",
      });
      setShowCreateForm(false);

      // Refresh banks list
      fetchBanks();
    } catch (error: any) {
      console.error("Error creating bank:", error);
      toast.error(error.message || "Failed to create bank");
    } finally {
      setLoading(false);
    }
  };

  // Delete bank
  const handleDeleteBank = async () => {
    if (!selectedBankId) return;

    setLoading(true);
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/bank/delete/${selectedBankId}`,
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
        throw new Error(data.message || "Failed to delete bank");
      }

      toast.success("Bank deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedBankId("");

      // Refresh banks list
      fetchBanks();
    } catch (error: any) {
      console.error("Error deleting bank:", error);
      toast.error(error.message || "Failed to delete bank");
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
  const openEditDialog = (bank: Bank) => {
    setSelectedBank(bank);
    setEditFormData({
      bank_name: bank.bank_name,
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

    if (!editFormData.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required";
    } else if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(editFormData.ifsc_code.trim().toUpperCase())
    ) {
      errors.ifsc_code = "Invalid IFSC code format (e.g., SBIN0001234)";
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit input change
  const handleEditInputChange = (
    field: keyof typeof editFormData,
    value: string
  ) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    if (editFormErrors[field]) {
      setEditFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Update bank
  const handleUpdateBank = async () => {
    if (!selectedBank) return;

    if (!validateEditForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("authToken");

    // Build payload with only changed fields
    const payload: UpdateBankData = {
      bank_id: parseInt(selectedBank.bank_id),
    };

    if (editFormData.bank_name !== selectedBank.bank_name) {
      payload.bank_name = editFormData.bank_name;
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
      const response = await fetch(`${API_BASE_URL}/bank/update`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update bank");
      }

      toast.success("Bank updated successfully");
      setEditDialogOpen(false);
      setSelectedBank(null);

      // Refresh banks list
      fetchBanks();
    } catch (error: any) {
      console.error("Error updating bank:", error);
      toast.error(error.message || "Failed to update bank");
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
                Retailer Banks
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage bank information for retailers
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showCreateForm ? "Cancel" : "Add Bank"}
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="mb-6 shadow-elevated border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                Add New Bank
              </CardTitle>
              <CardDescription>Enter bank details below</CardDescription>
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
                        handleInputChange(
                          "ifsc_code",
                          e.target.value.toUpperCase()
                        )
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
                        bank_name: "",
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
                        Create Bank
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Banks List */}
        <Card className="shadow-elevated border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-card-foreground">All Banks</CardTitle>
                <CardDescription>
                  {filteredBanks.length} bank(s) registered
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or IFSC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-background border-border text-card-foreground"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBanks}
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fetchingBanks ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBanks.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No banks found matching your search"
                    : "No banks found"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {!searchTerm && 'Click "Add Bank" to create your first bank'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-card-foreground font-semibold w-20">
                          S.No
                        </TableHead>
                        <TableHead className="text-card-foreground font-semibold">
                          Bank Name
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
                      {currentBanks.map((bank, index) => (
                        <TableRow key={bank.bank_id} className="hover:bg-muted/50">
                          <TableCell className="text-card-foreground">
                            {startIndex + index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-card-foreground">
                            {bank.bank_name}
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
                                onClick={() => openDeleteDialog(bank.bank_id)}
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

                {/* Pagination Controls */}
                {filteredBanks.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Rows per page:
                      </span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="w-20 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} ({filteredBanks.length}{" "}
                        total)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="border-border"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className="border-border"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Bank Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                Edit Bank
              </DialogTitle>
              <DialogDescription>Update bank information</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="edit_bank_name"
                    className="text-card-foreground"
                  >
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

                {/* IFSC Code */}
                <div className="space-y-2">
                  <Label
                    htmlFor="edit_ifsc_code"
                    className="text-card-foreground"
                  >
                    IFSC Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_ifsc_code"
                    placeholder="e.g., SBIN0001234"
                    value={editFormData.ifsc_code}
                    onChange={(e) =>
                      handleEditInputChange(
                        "ifsc_code",
                        e.target.value.toUpperCase()
                      )
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
                    Update Bank
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
                Are you sure you want to delete this bank? This action cannot be
                undone.
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