import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import payBazaarLogo from "@/assets/paybazaar-logo.png";

export function LoginPage() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    try {
      if (!adminId || !password) {
        setError("Please fill in all fields");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_id: adminId,
          admin_password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard",
        });

        // ✅ Correct token key
        localStorage.setItem("authToken", data.data.access_token);

        navigate("/admin");
      } else {
        setError(data.message || "Invalid admin credentials");
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-card p-3 rounded-2xl shadow-elevated">
              <img
                src={payBazaarLogo}
                alt="PayBazaar"
                className="h-12 w-auto"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">
            PayBazaar Admin
          </h1>
          <p className="text-primary-foreground/80">
            Secure access to your admin dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-2xl flex items-center justify-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your admin credentials
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Admin ID */}
              <div className="space-y-2">
                <Label htmlFor="adminId">Admin ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="adminId"
                    placeholder="Enter Admin ID (e.g. A000001)"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-primary-foreground/60">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
}
