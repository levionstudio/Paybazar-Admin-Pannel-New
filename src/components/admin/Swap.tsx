import { useState, useEffect } from "react";
import React from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  Users,
  ChevronRight,
  ChevronDown,
  Edit,
  Save,
  X,
  UserCog,
  Building2,
  Store,
} from "lucide-react";

interface DecodedToken {
  admin_id: string;
  exp: number;
}

interface MasterDistributor {
  master_distributor_id: string;
  master_distributor_name: string;
  master_distributor_email: string;
  master_distributor_phone: string;
  admin_id: string;
}

interface Distributor {
  distributor_id: string;
  distributor_name: string;
  distributor_email: string;
  distributor_phone: string;
  master_distributor_id: string;
}

interface Retailer {
  retailer_id: string;
  retailer_name: string;
  retailer_email: string;
  retailer_phone: string;
  distributor_id: string;
  master_distributor_id: string;
}

interface HierarchyNode {
  md: MasterDistributor;
  distributors: (Distributor & { retailers: Retailer[] })[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export function UserHierarchySwap() {
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [allMDs, setAllMDs] = useState<MasterDistributor[]>([]);
  const [allDistributors, setAllDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMDs, setExpandedMDs] = useState<Set<string>>(new Set());
  const [expandedDists, setExpandedDists] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Edit states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editType, setEditType] = useState<"distributor" | "retailer" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Distributor | Retailer | null>(null);
  const [newMDId, setNewMDId] = useState("");
  const [newDistId, setNewDistId] = useState("");
  const [processing, setProcessing] = useState(false);

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

  /* -------------------- FETCH DATA -------------------- */
  const fetchAllData = async () => {
    setLoading(true);
    const adminId = getAdminIdFromToken();

    if (!adminId) {
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Fetch all Master Distributors
      const mdResponse = await axios.get(
        `${API_BASE_URL}/md/get/admin/${adminId}`,
        getAuthHeaders()
      );
      const masterDistributors = mdResponse.data.data.master_distributors || [];
      setAllMDs(masterDistributors);

      // Fetch all Distributors
      const distResponse = await axios.get(
        `${API_BASE_URL}/distributor/get/admin/${adminId}`,
        getAuthHeaders()
      );
      const distributors = distResponse.data.data.distributors || [];
      setAllDistributors(distributors);

      // Fetch all Retailers
      const retailerResponse = await axios.get(
        `${API_BASE_URL}/retailer/get/admin/${adminId}`,
        getAuthHeaders()
      );
      const retailers = retailerResponse.data.data.retailers || [];

      // Build hierarchy
      const hierarchyData: HierarchyNode[] = masterDistributors.map((md: MasterDistributor) => {
        const mdDistributors = distributors.filter(
          (d: Distributor) => d.master_distributor_id === md.master_distributor_id
        );

        const distributorsWithRetailers = mdDistributors.map((dist: Distributor) => {
          const distRetailers = retailers.filter(
            (r: Retailer) => r.distributor_id === dist.distributor_id
          );
          return {
            ...dist,
            retailers: distRetailers,
          };
        });

        return {
          md,
          distributors: distributorsWithRetailers,
        };
      });

      setHierarchy(hierarchyData);
    } catch (error: any) {
      console.error("=== Fetch Hierarchy Error ===");
      console.error("Error:", error.response?.data);
      console.error("============================");
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch hierarchy data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  /* -------------------- TOGGLE EXPAND -------------------- */
  const toggleMD = (mdId: string) => {
    const newExpanded = new Set(expandedMDs);
    if (newExpanded.has(mdId)) {
      newExpanded.delete(mdId);
    } else {
      newExpanded.add(mdId);
    }
    setExpandedMDs(newExpanded);
  };

  const toggleDist = (distId: string) => {
    const newExpanded = new Set(expandedDists);
    if (newExpanded.has(distId)) {
      newExpanded.delete(distId);
    } else {
      newExpanded.add(distId);
    }
    setExpandedDists(newExpanded);
  };

  /* -------------------- EDIT HANDLERS -------------------- */
  const openEditDistributor = (distributor: Distributor) => {
    setEditType("distributor");
    setSelectedItem(distributor);
    setNewMDId(distributor.master_distributor_id);
    setShowEditDialog(true);
  };

  const openEditRetailer = (retailer: Retailer) => {
    setEditType("retailer");
    setSelectedItem(retailer);
    setNewMDId(retailer.master_distributor_id);
    setNewDistId(retailer.distributor_id);
    setShowEditDialog(true);
  };

  const handleSwap = async () => {
    if (!selectedItem) return;

    setProcessing(true);

    try {
      if (editType === "distributor") {
        const distributor = selectedItem as Distributor;
        
        // Check if MD actually changed
        if (distributor.master_distributor_id === newMDId) {
          toast({
            title: "No Changes",
            description: "Please select a different Master Distributor",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }

        // Verify distributor exists in our local data
        const distributorExists = allDistributors.find(
          d => d.distributor_id === distributor.distributor_id
        );

        if (!distributorExists) {
          console.error("Distributor not found in local data:", distributor.distributor_id);
          toast({
            title: "Error",
            description: "Distributor not found. Please refresh and try again.",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }

        const payload = {
          distributor_id: distributor.distributor_id,
          master_distributor_id: newMDId,
        };

        console.log("=== Update Distributor MD Payload ===");
        console.log("Distributor ID:", distributor.distributor_id);
        console.log("Distributor Name:", distributor.distributor_name);
        console.log("Current MD ID:", distributor.master_distributor_id);
        console.log("New MD ID:", newMDId);
        console.log("Distributor exists in local data:", distributorExists);
        console.log("All distributors count:", allDistributors.length);
        console.log("Payload:", payload);
        console.log("Endpoint:", `${API_BASE_URL}/distributor/update/md`);
        console.log("====================================");

        // Update distributor's master_distributor_id
        const response = await axios.put(
          `${API_BASE_URL}/distributor/update/md`,
          payload,
          getAuthHeaders()
        );

        console.log("=== Update Distributor MD Response ===");
        console.log("Response:", response.data);
        console.log("======================================");

        toast({
          title: "Success",
          description: `Distributor ${distributor.distributor_name} reassigned successfully`,
        });
      } else if (editType === "retailer") {
        const retailer = selectedItem as Retailer;

        // Check if anything actually changed
        if (retailer.distributor_id === newDistId && retailer.master_distributor_id === newMDId) {
          toast({
            title: "No Changes",
            description: "Please select different assignments",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }

        const payload = {
          retailer_id: retailer.retailer_id,
          distributor_id: newDistId,
        };

        console.log("=== Update Retailer Distributor Payload ===");
        console.log("Retailer ID:", retailer.retailer_id);
        console.log("New Distributor ID:", newDistId);
        console.log("New MD ID (for reference):", newMDId);
        console.log("Payload:", payload);
        console.log("Endpoint:", `${API_BASE_URL}/retailer/update/distributor`);
        console.log("==========================================");

        // Update retailer's distributor_id (which will automatically update master_distributor_id based on the new distributor)
        const response = await axios.put(
          `${API_BASE_URL}/retailer/update/distributor`,
          payload,
          getAuthHeaders()
        );

        console.log("=== Update Retailer Distributor Response ===");
        console.log("Response:", response.data);
        console.log("============================================");

        toast({
          title: "Success",
          description: `Retailer ${retailer.retailer_name} reassigned successfully`,
        });
      }

      setShowEditDialog(false);
      setSelectedItem(null);
      setNewMDId("");
      setNewDistId("");
      await fetchAllData(); // Refresh data
    } catch (error: any) {
      console.error("=== Swap Error ===");
      console.error("Status:", error.response?.status);
      console.error("Status Text:", error.response?.statusText);
      console.error("Error Data:", error.response?.data);
      console.error("Error Message:", error.response?.data?.message);
      console.error("Full Error:", error);
      console.error("==================");
      
      toast({
        title: "Error",
        description: error.response?.data?.message || error.response?.data?.error || "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  /* -------------------- SEARCH FILTER -------------------- */
  const filteredHierarchy = hierarchy.filter((node) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const mdMatch = 
      node.md.master_distributor_id.toLowerCase().includes(searchLower) ||
      node.md.master_distributor_name.toLowerCase().includes(searchLower) ||
      node.md.master_distributor_email.toLowerCase().includes(searchLower);
    
    const distMatch = node.distributors.some(
      (d) =>
        d.distributor_id.toLowerCase().includes(searchLower) ||
        d.distributor_name.toLowerCase().includes(searchLower) ||
        d.distributor_email.toLowerCase().includes(searchLower)
    );
    
    const retailerMatch = node.distributors.some((d) =>
      d.retailers.some(
        (r) =>
          r.retailer_id.toLowerCase().includes(searchLower) ||
          r.retailer_name.toLowerCase().includes(searchLower) ||
          r.retailer_email.toLowerCase().includes(searchLower)
      )
    );
    
    return mdMatch || distMatch || retailerMatch;
  });

  /* -------------------- STATS -------------------- */
  const totalMDs = hierarchy.length;
  const totalDistributors = hierarchy.reduce((sum, node) => sum + node.distributors.length, 0);
  const totalRetailers = hierarchy.reduce(
    (sum, node) => sum + node.distributors.reduce((dSum, d) => dSum + d.retailers.length, 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Hierarchy Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and reassign Master Distributors, Distributors, and Retailers
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Master Distributors</p>
                <p className="text-2xl font-bold text-foreground">{totalMDs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <UserCog className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distributors</p>
                <p className="text-2xl font-bold text-foreground">{totalDistributors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-glow/10">
                <Store className="h-6 w-6 text-primary-glow" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retailers</p>
                <p className="text-2xl font-bold text-foreground">{totalRetailers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by ID, Name, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Table */}
      <Card className="shadow-card">
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            User Hierarchy Tree
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {filteredHierarchy.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-semibold text-foreground">No users found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      User ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Phone
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Parent
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHierarchy.map((node) => (
                    <React.Fragment key={`md-${node.md.master_distributor_id}`}>
                      {/* Master Distributor Row */}
                      <TableRow
                        className="border-b bg-primary/5 hover:bg-primary/10"
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMD(node.md.master_distributor_id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedMDs.has(node.md.master_distributor_id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-primary">
                          {node.md.master_distributor_id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {node.md.master_distributor_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {node.md.master_distributor_email}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {node.md.master_distributor_phone}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Master Distributor
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Admin: {node.md.admin_id}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-muted-foreground">-</span>
                        </TableCell>
                      </TableRow>

                      {/* Distributors under this MD */}
                      {expandedMDs.has(node.md.master_distributor_id) &&
                        node.distributors.map((dist) => (
                          <React.Fragment key={`dist-${dist.distributor_id}`}>
                            <TableRow
                              className="border-b bg-accent/5 hover:bg-accent/10"
                            >
                              <TableCell className="pl-12">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDist(dist.distributor_id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {expandedDists.has(dist.distributor_id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-accent">
                                {dist.distributor_id}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                {dist.distributor_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.distributor_email}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {dist.distributor_phone}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-accent/10 text-accent border-accent/20">
                                  Distributor
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                MD: {dist.master_distributor_id}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDistributor(dist)}
                                  className="h-7 text-xs"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Reassign
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Retailers under this Distributor */}
                            {expandedDists.has(dist.distributor_id) &&
                              dist.retailers.map((retailer) => (
                                <TableRow
                                  key={retailer.retailer_id}
                                  className="border-b bg-muted/20 hover:bg-muted/30"
                                >
                                  <TableCell className="pl-24"></TableCell>
                                  <TableCell className="font-mono font-semibold text-primary-glow">
                                    {retailer.retailer_id}
                                  </TableCell>
                                  <TableCell className="font-medium text-foreground">
                                    {retailer.retailer_name}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {retailer.retailer_email}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {retailer.retailer_phone}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className="bg-primary-glow/10 text-primary-glow border-primary-glow/20">
                                      Retailer
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    Dist: {retailer.distributor_id}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditRetailer(retailer)}
                                      className="h-7 text-xs"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Reassign
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </React.Fragment>
                        ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Reassign {editType === "distributor" ? "Distributor" : "Retailer"}
            </DialogTitle>
            <DialogDescription>
              Change the parent assignment for this{" "}
              {editType === "distributor" ? "distributor" : "retailer"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedItem && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Current Assignment:</p>
                {editType === "distributor" ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Distributor ID:</span>{" "}
                      <span className="font-mono">{(selectedItem as Distributor).distributor_id}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Name:</span> {(selectedItem as Distributor).distributor_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Email:</span> {(selectedItem as Distributor).distributor_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Phone:</span> {(selectedItem as Distributor).distributor_phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Current MD:</span>{" "}
                      <span className="font-mono">{selectedItem.master_distributor_id}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Retailer ID:</span>{" "}
                      <span className="font-mono">{(selectedItem as Retailer).retailer_id}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Name:</span> {(selectedItem as Retailer).retailer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Current Distributor:</span>{" "}
                      <span className="font-mono">{(selectedItem as Retailer).distributor_id}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Current MD:</span>{" "}
                      <span className="font-mono">{selectedItem.master_distributor_id}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Select new Master Distributor (for distributor reassignment) */}
            {editType === "distributor" && (
              <div className="space-y-2">
                <Label>New Master Distributor *</Label>
                <Select value={newMDId} onValueChange={setNewMDId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Master Distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMDs.map((md) => (
                      <SelectItem key={md.master_distributor_id} value={md.master_distributor_id}>
                        {md.master_distributor_id} - {md.master_distributor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Select new Master Distributor first (for retailer reassignment) */}
            {editType === "retailer" && (
              <>
                <div className="space-y-2">
                  <Label>New Master Distributor *</Label>
                  <Select 
                    value={newMDId} 
                    onValueChange={(value) => {
                      setNewMDId(value);
                      setNewDistId(""); // Reset distributor when MD changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Master Distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMDs.map((md) => (
                        <SelectItem key={md.master_distributor_id} value={md.master_distributor_id}>
                          {md.master_distributor_id} - {md.master_distributor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select new Distributor (only show after MD is selected) */}
                {newMDId && (
                  <div className="space-y-2">
                    <Label>New Distributor *</Label>
                    <Select value={newDistId} onValueChange={setNewDistId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Distributor" />
                      </SelectTrigger>
                      <SelectContent>
                        {allDistributors
                          .filter((d) => d.master_distributor_id === newMDId)
                          .map((dist) => (
                            <SelectItem key={dist.distributor_id} value={dist.distributor_id}>
                              {dist.distributor_id} - {dist.distributor_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {allDistributors.filter((d) => d.master_distributor_id === newMDId).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No distributors found under this Master Distributor
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedItem(null);
                setNewMDId("");
                setNewDistId("");
              }}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSwap}
              disabled={
                processing ||
                !newMDId ||
                (editType === "retailer" && !newDistId)
              }
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}