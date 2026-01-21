import { useState } from "react";
import { Shield, AlertCircle, CheckCircle2, Server, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axios from "axios";

export default function ApiManagement() {
  const [apiStatus, setApiStatus] = useState<"locked" | "unlocked" | null>(null);
  const [lockLoading, setLockLoading] = useState<boolean>(false);
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Modal states
  const [showLockDialog, setShowLockDialog] = useState<boolean>(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);

  const handleLockClick = () => {
    setShowLockDialog(true);
  };

  const handleUnlockClick = () => {
    setShowUnlockDialog(true);
  };

  const confirmLock = async () => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      toast.error("Authentication required");
      setShowLockDialog(false);
      return;
    }

    setLockLoading(true);
    console.log("🔄 Locking API...");

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/admin/portal/lock`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Lock response:", response.data);

      setApiStatus("locked");
      setLastUpdated(new Date().toISOString());
      setShowLockDialog(false);
      
      toast.success(
        response.data?.message || "API Locked Successfully",
        {
          description: "All API services are now down",
        }
      );
    } catch (error: any) {
      console.error("❌ Error locking API:", error);
      console.error("Error response:", error.response?.data);

      toast.error(
        error.response?.data?.message || "Failed to lock API",
        {
          description: "Please try again",
        }
      );
      setShowLockDialog(false);
    } finally {
      setLockLoading(false);
    }
  };

  const confirmUnlock = async () => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      toast.error("Authentication required");
      setShowUnlockDialog(false);
      return;
    }

    setUnlockLoading(true);
    console.log("🔄 Unlocking API...");

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/admin/portal/unlock`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Unlock response:", response.data);

      setApiStatus("unlocked");
      setLastUpdated(new Date().toISOString());
      setShowUnlockDialog(false);
      
      toast.success(
        response.data?.message || "API Unlocked Successfully",
        {
          description: "All API services are now operational",
        }
      );
    } catch (error: any) {
      console.error("❌ Error unlocking API:", error);
      console.error("Error response:", error.response?.data);

      toast.error(
        error.response?.data?.message || "Failed to unlock API",
        {
          description: "Please try again",
        }
      );
      setShowUnlockDialog(false);
    } finally {
      setUnlockLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">API Management</h1>
          <p className="text-sm text-muted-foreground">
            Control your API service availability
          </p>
        </div>
      </div>

      {/* Main Control Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>API Service Control</span>
              </CardTitle>
              <CardDescription>
                Lock or unlock API services
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          {apiStatus && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Current Status
                </p>
                <div className="flex items-center space-x-2">
                  {apiStatus === "unlocked" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={cn(
                    "text-lg font-semibold",
                    apiStatus === "unlocked" ? "text-green-600" : "text-red-600"
                  )}>
                    {apiStatus === "unlocked" ? "Unlocked" : "Locked"}
                  </span>
                </div>
              </div>
              <div className={cn(
                "h-3 w-3 rounded-full",
                apiStatus === "unlocked" ? "bg-green-600" : "bg-red-600"
              )} />
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">
                {new Date(lastUpdated).toLocaleString()}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              onClick={handleLockClick}
              disabled={lockLoading || unlockLoading}
              size="lg"
              variant="destructive"
              className="h-12"
            >
              {lockLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock API
                </>
              )}
            </Button>

            <Button
              onClick={handleUnlockClick}
              disabled={lockLoading || unlockLoading}
              size="lg"
              className="h-12"
            >
              {unlockLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock API
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning Note */}
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Important Notice</p>
              <p className="text-sm text-muted-foreground">
                Locking the API will prevent all transactions and services from functioning. 
                Use this feature only during maintenance or emergencies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What happens when API is locked?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>All payment transactions will be blocked</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>Payout services will be unavailable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>Wallet operations will be suspended</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>Users will not be able to perform any transactions</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Lock API Service
            </DialogTitle>
            <DialogDescription>
              This action will disable all API services
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <p className="text-sm">
                Are you sure you want to lock the API service?
              </p>
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This will immediately:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Block all payment transactions</li>
                  <li>• Disable payout services</li>
                  <li>• Suspend wallet operations</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(false)}
              disabled={lockLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLock}
              disabled={lockLoading}
            >
              {lockLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock API
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-600" />
              Unlock API Service
            </DialogTitle>
            <DialogDescription>
              This action will enable all API services
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <p className="text-sm">
                Are you sure you want to unlock the API service?
              </p>
              <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-3">
                <p className="text-sm font-medium text-green-600">
                  ✓ This will restore:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• All payment transactions</li>
                  <li>• Payout services</li>
                  <li>• Wallet operations</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlockDialog(false)}
              disabled={unlockLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUnlock}
              disabled={unlockLoading}
            >
              {unlockLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock API
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}