import { useState } from "react"
import axios from "axios"
import { jwtDecode } from "jwt-decode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Wallet,
  IndianRupee,
  MessageSquare,
  ArrowRight,
  Loader2,
} from "lucide-react"

/* -------------------- TOKEN TYPES -------------------- */

interface DecodedToken {
 admin_id: string
  exp: number
}

/* -------------------- AUTH HELPER -------------------- */

function getAdminIdFromToken(): string | null {
  const token = localStorage.getItem("authToken")
  if (!token) return null

  try {
    const decoded = jwtDecode<DecodedToken>(token)

    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("authToken")
      return null
    }

    return decoded.admin_id
  } catch {
    return null
  }
}

/* -------------------- COMPONENT -------------------- */

const WalletTopUp = () => {
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    amount: "",
  })

  const [loading, setLoading] = useState(false)

  /* -------------------- INPUT HANDLER -------------------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target

    if (id === "amount") {
      const sanitized = value.replace(/[^\d.]/g, "")
      setFormData((prev) => ({ ...prev, amount: sanitized }))
    } 
  }

  /* -------------------- SUBMIT HANDLER -------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const adminId = getAdminIdFromToken()

    if (!adminId) {
      toast({
        title: "Session Expired",
        description: "Please login again.",
        variant: "destructive",
      })
      window.location.href = "/login"
      return
    }

    const amount = parseFloat(formData.amount)

    if (!formData.amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (amount > 10000000) {
      toast({
        title: "Amount Too Large",
        description: "Maximum top-up amount is ₹1,00,00,000.",
        variant: "destructive",
      })
      return
    }

    const token = localStorage.getItem("authToken")
    if (!token) {
      window.location.href = "/login"
      return
    }

    const payload = {
      admin_id: adminId,
      amount:  Number(formData.amount),
    }

    try {
      setLoading(true)

      const { data } = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/admin/update/wallet`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      toast({
        title: "Success",
        description: data.message || "Wallet topped up successfully.",
      })

      setFormData({ amount: ""})

      setTimeout(() => {
        window.location.href = "/admin/logs"
      }, 1500)
    } catch (err: any) {
      console.error("Wallet top-up error:", err)
      toast({
        title: "Error",
        description:
          err.response?.data?.message ||
          "Failed to top up wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Wallet className="h-6 w-6 " />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wallet Top-Up</h1>
            <p className="text-gray-600 mt-1">
              Add funds to your admin wallet
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
     


        
       

      </div>

      {/* Main Form Card */}
      <Card className="max-w-3xl mx-auto shadow-md">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Amount Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <IndianRupee className="h-5 w-5 " />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Top-Up Amount</h2>
                  <p className="text-sm text-gray-600">Enter the amount to add to wallet</p>
                </div>
              </div>

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
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    className="h-12 pl-8 text-lg font-semibold bg-white"
                    required
                  />
                </div>
                {formData.amount && parseFloat(formData.amount) > 0 && (
                  <p className="text-sm text-gray-600">
                    Amount in words: {new Intl.NumberFormat('en-IN', { 
                      style: 'currency', 
                      currency: 'INR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(parseFloat(formData.amount))}
                  </p>
                )}
              </div>
            </div>

           
          

            {/* Summary Box */}
            {formData.amount && parseFloat(formData.amount) > 0 && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">
                  Transaction Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Amount to Add:</span>
                    <span className="text-lg font-bold text-blue-900">
                      ₹{parseFloat(formData.amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                    <span className="text-sm text-blue-700">New Wallet Balance:</span>
                    <span className="text-sm font-semibold text-blue-900">
                      Will be updated after confirmation
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                disabled={loading}
                onClick={() => (window.location.href = "/admin")}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="flex-1 h-12 paybazaar-button"
                disabled={loading || !formData.amount}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Top-Up Wallet
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="max-w-3xl mx-auto bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Important Notes:
          </h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Top-up amount must be between ₹1 and ₹1,00,00,000</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Remarks are mandatory for audit and tracking purposes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Funds will be added to your wallet immediately after confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>All transactions are logged and can be viewed in transaction history</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default WalletTopUp