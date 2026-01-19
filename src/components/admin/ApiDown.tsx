import { useState, useEffect } from "react";
import { Shield, Power, AlertCircle, CheckCircle2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ApiManagement() {
  const [apiStatus, setApiStatus] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const handleToggle = async () => {
    setLoading(true);
    
    // Simulate API call to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newStatus = !apiStatus;
    setApiStatus(newStatus);
    setLastUpdated(new Date().toISOString());

    toast.success(
      `API ${newStatus ? "Enabled" : "Disabled"} Successfully`,
      {
        description: `All API services are now ${newStatus ? "operational" : "down"}`,
      }
    );

    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              API Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Control your API service availability
            </p>
          </div>
        </div>
      </div>

      {/* Main Control Card */}
      <Card className={cn(
        "border-border shadow-elevated transition-all duration-300",
        apiStatus ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xl font-bold flex items-center space-x-2">
                <Server className="h-6 w-6 text-primary" />
                <span>API Service Control</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Toggle to enable or disable all API services
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Current Status
              </p>
              <div className="flex items-center space-x-2">
                {apiStatus ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={cn(
                  "text-lg font-bold",
                  apiStatus ? "text-green-500" : "text-red-500"
                )}>
                  {apiStatus ? "API Active" : "API Down"}
                </span>
              </div>
            </div>
            <div className={cn(
              "h-4 w-4 rounded-full animate-pulse",
              apiStatus ? "bg-green-500" : "bg-red-500"
            )} />
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="font-medium text-card-foreground">
              {new Date(lastUpdated).toLocaleString()}
            </span>
          </div>

          {/* Toggle Button */}
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleToggle}
              disabled={loading}
              size="lg"
              className={cn(
                "w-full transition-all duration-200 font-semibold text-base h-12",
                apiStatus
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl"
                  : "gradient-primary text-primary-foreground hover:shadow-glow"
              )}
            >
              <Power className="h-5 w-5 mr-2" />
              {loading
                ? "Processing..."
                : apiStatus
                ? "Disable API Service"
                : "Enable API Service"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning Note */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-card-foreground">
                Important Notice
              </p>
              <p className="text-sm text-muted-foreground">
                Disabling the API will prevent all transactions and services from functioning. 
                Use this feature only during maintenance or emergencies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Description */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            What happens when API is disabled?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start space-x-2">
              <span className="text-red-500 mt-1">•</span>
              <span>All payment transactions will be blocked</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Payout services will be unavailable</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Wallet operations will be suspended</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Users will not be able to perform any transactions</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}