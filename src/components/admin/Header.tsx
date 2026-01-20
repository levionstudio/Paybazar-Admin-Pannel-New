import {
  Bell,
  Search,
  LogOut,
  Menu,
  Wallet,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import { useLocation, useNavigate } from "react-router-dom";

/* ======================================================
   TYPES
====================================================== */

interface HeaderProps {
  onMenuClick: () => void;
}

interface DecodedToken {
  admin_id: string;
  user_name: string;
  user_role: string;
  exp: number;
  iat: number;
}

/* ======================================================
   HELPERS
====================================================== */

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

function getAdminFromToken(): { id: string; name: string } | null {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode<DecodedToken>(token);

    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken");
      return null;
    }

    return {
      id: decoded.admin_id,
      name: decoded.user_name,
    };
  } catch {
    return null;
  }
}

/* ======================================================
   COMPONENT
====================================================== */

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminId, setAdminId] = useState("");

  /* ---------- HIDE WALLET ON FUND REQUEST PAGE ---------- */
  useEffect(() => {
    setHideBalance(location.pathname === "/admin/funds/request");
  }, [location.pathname]);

  /* ---------- INIT ADMIN ---------- */
  useEffect(() => {
    const admin = getAdminFromToken();
    if (!admin) {
      toast.error("Session expired");
      navigate("/login");
      return;
    }
    setAdminName(admin.name);
    setAdminId(admin.id);
  }, [navigate]);

  /* ---------- FETCH WALLET BALANCE ---------- */
  useEffect(() => {
    const admin = getAdminFromToken();
    if (!admin) return;

    const fetchWalletBalance = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/wallet/get/balance/admin/${admin.id}`,
          getAuthHeaders()
        );

        const balance =
          res.data?.data?.balance ??
          res.data?.data?.wallet_balance ??
          0;

        setWalletBalance(Number(balance));
      } catch {
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();
  }, []);

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    toast.success("Logged out successfully");
    navigate("/");
  };

  /* ======================================================
     UI
  ====================================================== */

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Mobile Menu */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions, users, or logs..."
              className="pl-9 bg-secondary/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Wallet */}
          {!hideBalance && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-semibold">
                ₹{walletBalance.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* User Details */}
              <div className="px-2 py-2 space-y-1">
                {adminName && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <span className="text-sm font-medium">{adminName}</span>
                  </div>
                )}
                
                {adminId && (
                  <div className="flex flex-col mt-2">
                    <span className="text-xs text-muted-foreground">User ID</span>
                    <span className="text-sm font-mono">{adminId}</span>
                  </div>
                )}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}