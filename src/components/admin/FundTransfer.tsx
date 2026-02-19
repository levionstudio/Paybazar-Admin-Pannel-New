import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Wallet,
  User,
  Phone,
  CreditCard,
  Building2,
  ArrowRightLeft,
  ArrowRight,
  IndianRupee,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL;

// No pagination for dropdowns — fetch everything
const ALL = "limit=100000&offset=0";

interface DecodedToken {
  admin_id: string;
  exp: number;
}
interface DropdownMD {
  master_distributor_id: string;
  master_distributor_name: string;
}
interface DropdownDist {
  distributor_id: string;
  distributor_name: string;
  distributor_phone?: string;
  wallet_balance?: number;
}
interface DropdownRetailer {
  retailer_id: string;
  retailer_name: string;
  retailer_phone?: string;
  wallet_balance?: number;
}
interface RecipientDetails {
  name: string;
  phone: string;
  id: string;
  currentBalance: number;
}

function getToken() { return localStorage.getItem("authToken") ?? ""; }
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}
function getAdminId(): string | null {
  try {
    const decoded = jwtDecode<DecodedToken>(getToken());
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded.admin_id;
  } catch { return null; }
}

// Normalize various API response shapes into a flat array
function extractArray<T>(raw: any, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  for (const key of keys) {
    if (Array.isArray(raw?.[key])) return raw[key] as T[];
  }
  return [];
}

// ─── Searchable Dropdown ──────────────────────────────────────────────────────
interface SearchItem { id: string; name: string; sub?: string; }
interface SearchableDropdownProps {
  items: SearchItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  loading?: boolean;
  emptyMessage?: string;
  icon?: React.ReactNode;
}

function SearchableDropdown({ items, value, onChange, placeholder, loading, emptyMessage = "No items found", icon }: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => items.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );
  const selected = items.find((i) => i.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-sd]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (loading) {
    return (
      <div className="w-full h-11 px-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading all records...
      </div>
    );
  }

  return (
    <div data-sd className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className="w-full h-11 px-3 flex items-center justify-between rounded-md border border-input bg-white text-sm hover:border-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-900 truncate">{selected.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{selected.id}</span>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selected && (
            <span
              role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="text-xs text-gray-400 mb-1 px-1">
              {items.length} record{items.length !== 1 ? "s" : ""} loaded
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full h-8 pl-7 pr-3 text-sm rounded border border-gray-200 focus:outline-none focus:border-gray-400 bg-gray-50"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-gray-400">{emptyMessage}</div>
            ) : (
              filtered.map((item) => (
                <div key={item.id}
                  onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${value === item.id ? "bg-blue-50" : ""}`}
                >
                  <div className="font-medium text-sm text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.id}</div>
                  {item.sub && <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recipient Info Card ──────────────────────────────────────────────────────
function RecipientInfoCard({ details }: { details: RecipientDetails }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
          <User className="h-5 w-5 text-paybazaar-blue" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recipient Details</h2>
          <p className="text-sm text-gray-600">Verified recipient information</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-gray-600">Name</Label>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">{details.name}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-mono font-semibold text-gray-900">{details.phone}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium text-gray-600">User ID</Label>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-mono font-semibold text-gray-900">{details.id}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium text-gray-600">Current Balance</Label>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-600" />
            <p className="text-base font-bold text-green-600">
              ₹{details.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Fields ──────────────────────────────────────────────────────────
interface TransferFieldsProps {
  adminId: string;
  recipientId: string;
  walletBalance: number;
  amount: string;
  setAmount: (v: string) => void;
  remarks: string;
  setRemarks: (v: string) => void;
  disabled: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function TransferFields({ adminId, recipientId, walletBalance, amount, setAmount, remarks, setRemarks, disabled, loading, onCancel, onSubmit }: TransferFieldsProps) {
  const parsedAmount = parseFloat(amount) || 0;
  const insufficient = parsedAmount > walletBalance;
  const defaultRemark = `Fund transfer from ${adminId} to ${recipientId}`;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
          <IndianRupee className="h-5 w-5 text-paybazaar-blue" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transfer Details</h2>
          <p className="text-sm text-gray-600">Enter the amount and remarks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
            Amount (₹) <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
            <Input
              id="amount" type="text" inputMode="decimal" value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                if (v.split(".").length <= 2) setAmount(v);
              }}
              disabled={disabled} required placeholder="Enter amount"
              className="h-12 pl-8 text-lg font-semibold bg-white"
              style={{ fontSize: "16px" }}
            />
          </div>
          {parsedAmount > 0 && (
            <p className={`text-sm ${insufficient ? "text-red-500" : "text-gray-500"}`}>
              {insufficient
                ? `⚠️ Insufficient balance! You need ₹${(parsedAmount - walletBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} more.`
                : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(parsedAmount)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">
            Remarks <span className="text-gray-400 text-xs">(Optional)</span>
          </Label>
          <Input
            id="remarks" type="text" value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks (optional)"
            className="h-12 bg-white" disabled={disabled}
          />
          <p className="text-xs text-gray-400">
            Default: <span className="font-mono text-gray-500 break-all">"{defaultRemark}"</span>
          </p>
        </div>
      </div>

      {parsedAmount > 0 && !insufficient && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-3">Transfer Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Amount to Transfer:</span>
              <span className="text-lg font-bold text-green-900">
                ₹{parsedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-green-200">
              <span className="text-sm text-green-700">Your Balance After:</span>
              <span className="text-base font-semibold text-green-900">
                ₹{(walletBalance - parsedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-6 border-t">
        <Button type="button" variant="outline" className="flex-1 h-12" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 h-12 paybazaar-button"
          disabled={loading || disabled || !amount || insufficient}
        >
          {loading ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
          ) : (
            <>Transfer Funds<ArrowRight className="ml-2 h-5 w-5" /></>
          )}
        </Button>
      </div>
    </form>
  );
}

function SelectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Tab 1: Fund Master Distributor ──────────────────────────────────────────
function FundMDTab({ adminId, walletBalance, onSuccess }: { adminId: string; walletBalance: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mdList, setMdList] = useState<DropdownMD[]>([]);
  const [selectedMd, setSelectedMd] = useState("");
  const [mdDetails, setMdDetails] = useState<RecipientDetails | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setLoadingList(true);
    // Fetch ALL master distributors — no pagination limit
    axios.get(`${API}/md/get/dropdown/${adminId}?${ALL}`, { headers: authHeaders() })
      .then((res) => {
        const raw = res.data?.data;
        setMdList(extractArray<DropdownMD>(raw, ["master_distributors", "mds", "data"]));
      })
      .catch(() => toast({ title: "Error", description: "Failed to load master distributors", variant: "destructive" }))
      .finally(() => setLoadingList(false));
  }, [adminId]);

  const handleSelectMd = (mdId: string) => {
    setSelectedMd(mdId); setMdDetails(null); setAmount(""); setRemarks("");
    if (!mdId) return;
    setLoadingDetails(true);
    axios.get(`${API}/md/get/md/${mdId}`, { headers: authHeaders() })
      .then((res) => {
        const md = res.data?.data?.master_distributor ?? res.data?.data;
        setMdDetails({
          name: md?.master_distributor_name || "N/A",
          phone: md?.master_distributor_phone || "N/A",
          id: md?.master_distributor_id || mdId,
          currentBalance: Number(md?.wallet_balance) || 0,
        });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load MD details", variant: "destructive" }))
      .finally(() => setLoadingDetails(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mdDetails || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/fund_transfer/create`,
        { from_id: adminId, to_id: selectedMd, amount: parseFloat(amount), remarks: remarks.trim() || `Fund transfer from ${adminId} to ${selectedMd}` },
        { headers: authHeaders() }
      );
      toast({ title: "Transfer Successful", description: data.message || "Funds transferred successfully." });
      setSelectedMd(""); setMdDetails(null); setAmount(""); setRemarks(""); onSuccess();
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.response?.data?.message || "Something went wrong.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const mdItems: SearchItem[] = mdList.map((md) => ({
    id: md.master_distributor_id,
    name: md.master_distributor_name,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SelectionHeader
          icon={<User className="h-5 w-5 text-paybazaar-blue" />}
          title="User Selection"
          subtitle={`Select master distributor to fund${mdList.length ? ` (${mdList.length} total)` : ""}`}
        />
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Select Master Distributor <span className="text-red-500">*</span>
          </Label>
          <SearchableDropdown
            items={mdItems} value={selectedMd} onChange={handleSelectMd}
            placeholder="Search & Select Master Distributor"
            loading={loadingList} emptyMessage="No master distributors found"
            icon={<User className="h-4 w-4" />}
          />
        </div>
      </div>
      {loadingDetails && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-paybazaar-blue" /></div>}
      {mdDetails && !loadingDetails && (
        <>
          <RecipientInfoCard details={mdDetails} />
          <TransferFields
            adminId={adminId} recipientId={selectedMd} walletBalance={walletBalance}
            amount={amount} setAmount={setAmount} remarks={remarks} setRemarks={setRemarks}
            disabled={false} loading={loading} onCancel={() => navigate(-1)} onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Fund Distributor ──────────────────────────────────────────────────
function FundDistributorTab({ adminId, walletBalance, onSuccess }: { adminId: string; walletBalance: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mdList, setMdList] = useState<DropdownMD[]>([]);
  const [selectedMd, setSelectedMd] = useState("");
  const [distList, setDistList] = useState<DropdownDist[]>([]);
  const [selectedDist, setSelectedDist] = useState("");
  const [distDetails, setDistDetails] = useState<RecipientDetails | null>(null);
  const [loadingMd, setLoadingMd] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setLoadingMd(true);
    // Fetch ALL master distributors
    axios.get(`${API}/md/get/dropdown/${adminId}?${ALL}`, { headers: authHeaders() })
      .then((res) => {
        const raw = res.data?.data;
        setMdList(extractArray<DropdownMD>(raw, ["master_distributors", "mds", "data"]));
      })
      .catch(() => toast({ title: "Error", description: "Failed to load master distributors", variant: "destructive" }))
      .finally(() => setLoadingMd(false));
  }, [adminId]);

  const handleSelectMd = (mdId: string) => {
    setSelectedMd(mdId); setDistList([]); setSelectedDist(""); setDistDetails(null); setAmount(""); setRemarks("");
    if (!mdId) return;
    setLoadingDist(true);
    // Fetch ALL distributors under this MD
    axios.get(`${API}/distributor/get/dropdown/${mdId}?${ALL}`, { headers: authHeaders() })
      .then((res) => {
        const raw = res.data?.data;
        const list = extractArray<DropdownDist>(raw, ["distributors", "data"]);
        setDistList(list);
        if (!list.length) toast({ title: "No Distributors", description: "No distributors found under this MD" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load distributors", variant: "destructive" }))
      .finally(() => setLoadingDist(false));
  };

  const handleSelectDist = (distId: string) => {
    setSelectedDist(distId); setDistDetails(null); setAmount(""); setRemarks("");
    if (!distId) return;
    setLoadingDetails(true);
    axios.get(`${API}/distributor/get/distributor/${distId}`, { headers: authHeaders() })
      .then((res) => {
        const d = res.data?.data?.distributor ?? res.data?.data;
        setDistDetails({
          name: d?.distributor_name || "N/A",
          phone: d?.distributor_phone || "N/A",
          id: d?.distributor_id || distId,
          currentBalance: Number(d?.wallet_balance) || 0,
        });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load distributor details", variant: "destructive" }))
      .finally(() => setLoadingDetails(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distDetails || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/fund_transfer/create`,
        { from_id: adminId, to_id: selectedDist, amount: parseFloat(amount), remarks: remarks.trim() || `Fund transfer from ${adminId} to ${selectedDist}` },
        { headers: authHeaders() }
      );
      toast({ title: "Transfer Successful", description: data.message || "Funds transferred successfully." });
      setSelectedMd(""); setSelectedDist(""); setDistList([]); setDistDetails(null); setAmount(""); setRemarks(""); onSuccess();
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.response?.data?.message || "Something went wrong.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const mdItems: SearchItem[] = mdList.map((md) => ({
    id: md.master_distributor_id,
    name: md.master_distributor_name,
  }));
  const distItems: SearchItem[] = distList.map((d) => ({
    id: d.distributor_id,
    name: d.distributor_name,
    sub: [d.distributor_phone, d.wallet_balance !== undefined ? `₹${d.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" • ") || undefined,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SelectionHeader
          icon={<Building2 className="h-5 w-5 text-paybazaar-blue" />}
          title="User Selection"
          subtitle="Select master distributor then distributor to fund"
        />
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Select Master Distributor <span className="text-red-500">*</span>
          </Label>
          <SearchableDropdown
            items={mdItems} value={selectedMd} onChange={handleSelectMd}
            placeholder="Search & Select Master Distributor"
            loading={loadingMd} emptyMessage="No master distributors found"
            icon={<User className="h-4 w-4" />}
          />
        </div>
        {selectedMd && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Select Distributor <span className="text-red-500">*</span>
              {distList.length > 0 && <span className="text-xs text-gray-400 ml-1">({distList.length} found)</span>}
            </Label>
            <SearchableDropdown
              items={distItems} value={selectedDist} onChange={handleSelectDist}
              placeholder="Search & Select Distributor"
              loading={loadingDist} emptyMessage="No distributors found under this MD"
              icon={<Building2 className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
      {loadingDetails && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-paybazaar-blue" /></div>}
      {distDetails && !loadingDetails && (
        <>
          <RecipientInfoCard details={distDetails} />
          <TransferFields
            adminId={adminId} recipientId={selectedDist} walletBalance={walletBalance}
            amount={amount} setAmount={setAmount} remarks={remarks} setRemarks={setRemarks}
            disabled={false} loading={loading} onCancel={() => navigate(-1)} onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Fund Retailer ─────────────────────────────────────────────────────
function FundRetailerTab({ adminId, walletBalance, onSuccess }: { adminId: string; walletBalance: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [distList, setDistList] = useState<DropdownDist[]>([]);
  const [selectedDist, setSelectedDist] = useState("");
  const [retailerList, setRetailerList] = useState<DropdownRetailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState("");
  const [retailerDetails, setRetailerDetails] = useState<RecipientDetails | null>(null);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setLoadingDist(true);
    // Fetch ALL distributors under this admin
    axios.get(`${API}/distributor/get/admin/${adminId}?${ALL}`, { headers: authHeaders() })
      .then((res) => {
        const raw = res.data?.data;
        setDistList(extractArray<DropdownDist>(raw, ["distributors", "data"]));
      })
      .catch(() => toast({ title: "Error", description: "Failed to load distributors", variant: "destructive" }))
      .finally(() => setLoadingDist(false));
  }, [adminId]);

  const handleSelectDist = (distId: string) => {
    setSelectedDist(distId); setRetailerList([]); setSelectedRetailer(""); setRetailerDetails(null); setAmount(""); setRemarks("");
    if (!distId) return;
    setLoadingRetailers(true);
    // Fetch ALL retailers under this distributor
    axios.get(`${API}/retailer/get/dropdown/${distId}?${ALL}`, { headers: authHeaders() })
      .then((res) => {
        const raw = res.data?.data;
        const list = extractArray<DropdownRetailer>(raw, ["retailers", "data"]);
        setRetailerList(list);
        if (!list.length) toast({ title: "No Retailers", description: "No retailers found under this distributor" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load retailers", variant: "destructive" }))
      .finally(() => setLoadingRetailers(false));
  };

  const handleSelectRetailer = (retailerId: string) => {
    setSelectedRetailer(retailerId); setRetailerDetails(null); setAmount(""); setRemarks("");
    if (!retailerId) return;
    setLoadingDetails(true);
    axios.get(`${API}/retailer/get/retailer/${retailerId}`, { headers: authHeaders() })
      .then((res) => {
        const r = res.data?.data?.retailer ?? res.data?.data;
        setRetailerDetails({
          name: r?.retailer_name || "N/A",
          phone: r?.retailer_phone || "N/A",
          id: r?.retailer_id || retailerId,
          currentBalance: Number(r?.wallet_balance) || 0,
        });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load retailer details", variant: "destructive" }))
      .finally(() => setLoadingDetails(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailerDetails || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/fund_transfer/create`,
        { from_id: adminId, to_id: selectedRetailer, amount: parseFloat(amount), remarks: remarks.trim() || `Fund transfer from ${adminId} to ${selectedRetailer}` },
        { headers: authHeaders() }
      );
      toast({ title: "Transfer Successful", description: data.message || "Funds transferred successfully." });
      setSelectedDist(""); setSelectedRetailer(""); setRetailerList([]); setRetailerDetails(null); setAmount(""); setRemarks(""); onSuccess();
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.response?.data?.message || "Something went wrong.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const distItems: SearchItem[] = distList.map((d) => ({
    id: d.distributor_id,
    name: d.distributor_name,
    sub: [d.distributor_phone, d.wallet_balance !== undefined ? `₹${d.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" • ") || undefined,
  }));
  const retailerItems: SearchItem[] = retailerList.map((r) => ({
    id: r.retailer_id,
    name: r.retailer_name,
    sub: [r.retailer_phone, r.wallet_balance !== undefined ? `₹${r.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" • ") || undefined,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SelectionHeader
          icon={<User className="h-5 w-5 text-paybazaar-blue" />}
          title="User Selection"
          subtitle="Select distributor then retailer to fund"
        />
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Select Distributor <span className="text-red-500">*</span>
            {distList.length > 0 && <span className="text-xs text-gray-400 ml-1">({distList.length} found)</span>}
          </Label>
          <SearchableDropdown
            items={distItems} value={selectedDist} onChange={handleSelectDist}
            placeholder="Search & Select Distributor"
            loading={loadingDist} emptyMessage="No distributors found"
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>
        {selectedDist && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Select Retailer <span className="text-red-500">*</span>
              {retailerList.length > 0 && <span className="text-xs text-gray-400 ml-1">({retailerList.length} found)</span>}
            </Label>
            <SearchableDropdown
              items={retailerItems} value={selectedRetailer} onChange={handleSelectRetailer}
              placeholder="Search & Select Retailer"
              loading={loadingRetailers} emptyMessage="No retailers found under this distributor"
              icon={<User className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
      {loadingDetails && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-paybazaar-blue" /></div>}
      {retailerDetails && !loadingDetails && (
        <>
          <RecipientInfoCard details={retailerDetails} />
          <TransferFields
            adminId={adminId} recipientId={selectedRetailer} walletBalance={walletBalance}
            amount={amount} setAmount={setAmount} remarks={remarks} setRemarks={setRemarks}
            disabled={false} loading={loading} onCancel={() => navigate(-1)} onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminFundTransfer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({ title: "Authentication Required", description: "Please login to continue.", variant: "destructive" });
      window.location.href = "/login"; return;
    }
    const id = getAdminId();
    if (!id) {
      localStorage.removeItem("authToken");
      toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
      window.location.href = "/login"; return;
    }
    setAdminId(id); setIsCheckingAuth(false);
  }, []);

  const fetchBalance = async () => {
    if (!adminId) return;
    try {
      const res = await axios.get(`${API}/wallet/get/balance/admin/${adminId}`, { headers: authHeaders() });
      const bal = res.data?.data?.balance ?? res.data?.data?.wallet_balance ?? res.data?.balance ?? 0;
      setWalletBalance(Number(bal));
    } catch { setWalletBalance(0); }
  };

  useEffect(() => { if (adminId) fetchBalance(); }, [adminId]);

  if (isCheckingAuth || !adminId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-paybazaar-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fund Transfer</h1>
          <p className="text-gray-600 mt-1">Transfer funds to Master Distributors, Distributors, or Retailers</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="max-w-4xl mx-auto shadow-md">
        <CardContent className="p-0">
          <div className="p-6 md:p-8 space-y-8">
            {/* Wallet Balance */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paybazaar-blue/10">
                <Wallet className="h-5 w-5 text-paybazaar-blue" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Admin Wallet Balance:{" "}
                  <span className="text-green-600">
                    ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </h2>
                <p className="text-sm text-gray-600">Available balance for fund transfer</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="md">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="md" className="gap-1.5 text-xs sm:text-sm">
                  <User className="h-4 w-4" /><span className="hidden sm:inline">Master</span> Dist.
                </TabsTrigger>
                <TabsTrigger value="distributor" className="gap-1.5 text-xs sm:text-sm">
                  <Building2 className="h-4 w-4" />Distributor
                </TabsTrigger>
                <TabsTrigger value="retailer" className="gap-1.5 text-xs sm:text-sm">
                  <ArrowRightLeft className="h-4 w-4" />Retailer
                </TabsTrigger>
              </TabsList>
              <TabsContent value="md">
                <FundMDTab adminId={adminId} walletBalance={walletBalance} onSuccess={fetchBalance} />
              </TabsContent>
              <TabsContent value="distributor">
                <FundDistributorTab adminId={adminId} walletBalance={walletBalance} onSuccess={fetchBalance} />
              </TabsContent>
              <TabsContent value="retailer">
                <FundRetailerTab adminId={adminId} walletBalance={walletBalance} onSuccess={fetchBalance} />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="max-w-4xl mx-auto bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Important Notes:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {[
              "Ensure the recipient details are correct before transferring funds",
              "Transfers are instant and cannot be reversed once confirmed",
              "All transactions are logged and can be viewed in transaction history",
              "You cannot transfer more than your current wallet balance",
              "Use the search bar inside the dropdown to quickly find users by ID or name",
              "Each user entry shows their current wallet balance for reference",
            ].map((note) => (
              <li key={note} className="flex items-start gap-2">
                <span className="text-paybazaar-blue mt-1">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFundTransfer;