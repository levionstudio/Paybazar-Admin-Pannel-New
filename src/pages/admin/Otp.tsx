import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import payBazaarLogo from '@/assets/paybazaar-logo.png';

export function OtpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate authentication
    try {
      // Basic validation
      if (!otp) {
        setError('Please fill in all fields');
        return;
      }

      if (otp === '123456' ) {
        toast({
          title: 'Login Successful',
          description: 'Welcome to PayBazaar Admin Panel',
        });
        navigate('/admin');
      } else {
        setError('Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-card p-3 rounded-2xl shadow-elevated">
              <img src={payBazaarLogo} alt="PayBazaar" className="h-12 w-auto" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-poppins text-primary-foreground mb-2">
            PayBazaar Admin
          </h1>
          <p className="text-primary-foreground/80">
            Secure access to your admin dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-elevated border-0">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-poppins flex items-center justify-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Enter Otp</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full gradient-primary text-primary-foreground shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>Demo credentials:</p>
                <p className="font-mono text-xs">123456</p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-primary-foreground/60">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}