import { useState, useEffect } from "react"
import { jwtDecode } from "jwt-decode"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Loader2, 
  RefreshCw, 
  Mail, 
  Phone, 
  User, 
  Search,
  MessageSquare,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  Check,
  X as XIcon
} from "lucide-react"

interface DecodedToken {
  admin_id: string
  user_name: string
  user_role: string
  exp: number
  iat: number
}

interface Ticket {
  ticket_id: number
  admin_id: string
  ticket_title: string
  ticket_description: string
  is_ticket_cleared: boolean
  created_at: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 

export default function Tickets() {
  const token = localStorage.getItem("authToken")
  const [adminId, setAdminId] = useState("")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Decode token to get admin_id
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token)
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("authToken")
          toast.error("Session expired. Please login again.")
          return
        }
        setAdminId(decoded.admin_id || decoded.admin_id)
      } catch (error) {
        console.error("Error decoding token:", error)
        toast.error("Invalid token. Please log in again.")
      }
    }
  }, [token])

  // Auto-fetch on mount
  useEffect(() => {
    if (adminId) {
      fetchTickets()
    }
  }, [adminId])

  const fetchTickets = async () => {
    if (!adminId) {
      toast.error("Admin ID not found. Please login again.")
      return
    }

    if (!token) {
      toast.error("Authentication required")
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await axios.get(
        `${API_BASE_URL}/ticket/admin/${adminId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      console.log("API Response:", response.data)

      if (response.data && response.data.status === "success") {
        const ticketsList = response.data.data || []
        
        // Sort by created_at (most recent first)
        const sortedTickets = [...ticketsList].sort((a, b) => {
          try {
            const dateA = new Date(a.created_at)
            const dateB = new Date(b.created_at)
            return dateB.getTime() - dateA.getTime()
          } catch {
            return 0
          }
        })
        
        setTickets(sortedTickets)
        setFilteredTickets(sortedTickets)
        
        if (sortedTickets.length > 0) {
          toast.success(`Loaded ${sortedTickets.length} ticket${sortedTickets.length > 1 ? 's' : ''}`)
        } else {
          toast.info("No tickets found")
        }
      } else {
        setTickets([])
        setFilteredTickets([])
        toast.info("No tickets found")
      }
    } catch (error: any) {
      console.error("Fetch error:", error)
      setTickets([])
      setFilteredTickets([])
      
      if (error.response?.status === 404) {
        toast.info("No tickets found")
      } else {
        toast.error(
          error.response?.data?.message || "Failed to fetch tickets"
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...tickets]

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "cleared") {
        filtered = filtered.filter(ticket => ticket.is_ticket_cleared === true)
      } else if (statusFilter === "pending") {
        filtered = filtered.filter(ticket => ticket.is_ticket_cleared === false)
      }
    }

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (ticket) =>
          ticket.admin_id?.toLowerCase().includes(searchLower) ||
          ticket.ticket_title?.toLowerCase().includes(searchLower) ||
          ticket.ticket_description?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredTickets(filtered)
    setCurrentPage(1)
  }, [searchTerm, statusFilter, tickets])

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setViewDialogOpen(true)
  }

  const handleUpdateTicketStatus = async (ticketId: number, newStatus: boolean) => {
    if (!token) {
      toast.error("Authentication required")
      return
    }

    try {
      setLoading(true)

      const payload = {
        is_ticket_cleared: newStatus
      }

      const response = await axios.put(
        `${API_BASE_URL}/ticket/update/${ticketId}/status`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data && response.data.status === "success") {
        toast.success(
          newStatus 
            ? "Ticket marked as cleared successfully" 
            : "Ticket marked as pending successfully"
        )
        
        // Update local state
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket.ticket_id === ticketId
              ? { ...ticket, is_ticket_cleared: newStatus }
              : ticket
          )
        )
        
        setFilteredTickets(prevFiltered =>
          prevFiltered.map(ticket =>
            ticket.ticket_id === ticketId
              ? { ...ticket, is_ticket_cleared: newStatus }
              : ticket
          )
        )

        // Update selected ticket if viewing
        if (selectedTicket && selectedTicket.ticket_id === ticketId) {
          setSelectedTicket({ ...selectedTicket, is_ticket_cleared: newStatus })
        }
      }
    } catch (error: any) {
      console.error("Update status error:", error)
      toast.error(
        error.response?.data?.message || "Failed to update ticket status"
      )
    } finally {
      setLoading(false)
    }
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return "N/A"
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (isCleared: boolean) => {
    if (isCleared) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Cleared
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    )
  }

  // Calculate statistics
  const totalTickets = tickets.length
  const clearedTickets = tickets.filter(t => t.is_ticket_cleared).length
  const pendingTickets = tickets.filter(t => !t.is_ticket_cleared).length
  const uniqueUsers = new Set(tickets.map(t => t.admin_id)).size

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / recordsPerPage)
  const indexOfLastRecord = currentPage * recordsPerPage
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage
  const paginatedTickets = filteredTickets.slice(indexOfFirstRecord, indexOfLastRecord)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-600 mt-1">
                Manage and view customer support tickets
              </p>
            </div>
          </div>
          <Button 
            onClick={fetchTickets} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {searched && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cleared</p>
                  <p className="text-2xl font-bold text-gray-900">{clearedTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unique Users</p>
                  <p className="text-2xl font-bold text-gray-900">{uniqueUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Section */}
      <Card className="max-w-7xl mx-auto border-gray-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search Tickets
              </Label>
              <Input
                placeholder="Search by user ID, title, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white h-11"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Records per page */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Records Per Page
              </Label>
              <Select
                value={recordsPerPage.toString()}
                onValueChange={(value) => {
                  setRecordsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="max-w-7xl mx-auto border-gray-200 overflow-hidden">
        <CardContent className="p-0">
          {/* Table Controls */}
          {filteredTickets.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-gray-50 px-4 md:px-6 py-4 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Showing {indexOfFirstRecord + 1} to{" "}
                  {Math.min(indexOfLastRecord, filteredTickets.length)} of{" "}
                  {filteredTickets.length} tickets
                </span>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading tickets...</p>
              </div>
            ) : paginatedTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <MessageSquare className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  No tickets found
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {searched 
                    ? "Try adjusting your search terms or filters" 
                    : "Click 'Refresh' to load tickets"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      S.No
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Ticket ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      User ID
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Title
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Description Preview
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Status
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Created At
                    </TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase text-gray-700 whitespace-nowrap px-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTickets.map((ticket, idx) => (
                    <TableRow
                      key={ticket.ticket_id}
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <TableCell className="py-4 px-4 text-center text-sm font-medium text-gray-900">
                        {indexOfFirstRecord + idx + 1}
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                          #{ticket.ticket_id}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium text-sm text-gray-900 font-mono">
                            {ticket.admin_id}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center">
                        <span className="font-semibold text-sm text-gray-900">
                          {truncateText(ticket.ticket_title, 40)}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center max-w-md">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {truncateText(ticket.ticket_description)}
                        </p>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center">
                        {getStatusBadge(ticket.is_ticket_cleared)}
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {!ticket.is_ticket_cleared && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleUpdateTicketStatus(ticket.ticket_id, true)}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {filteredTickets.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-gray-50 px-4 md:px-6 py-4 gap-3">
              <div className="text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Ticket Details
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
                    <p className="text-sm text-gray-600">Basic ticket details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Ticket ID</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                        #{selectedTicket.ticket_id}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">User ID</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 font-mono">{selectedTicket.admin_id}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="flex items-start gap-2">
                      {getStatusBadge(selectedTicket.is_ticket_cleared)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-600">Created At</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedTicket.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Content */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ticket Content</h3>
                    <p className="text-sm text-gray-600">Title and description details</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Title</Label>
                    <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                      <p className="text-sm font-semibold text-purple-900">
                        {selectedTicket.ticket_title}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                        {selectedTicket.ticket_description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                {!selectedTicket.is_ticket_cleared && (
                  <Button
                    onClick={() => {
                      handleUpdateTicketStatus(selectedTicket.ticket_id, true)
                      setViewDialogOpen(false)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark as Cleared
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info Note */}
      <Card className="max-w-7xl mx-auto bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Important Notes:
          </h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>All support tickets are tracked and monitored for customer satisfaction</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Use filters to narrow down tickets by status</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Click "View" to see complete ticket details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Pending tickets require attention and resolution</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}