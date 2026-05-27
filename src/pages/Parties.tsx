import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Phone, Mail, MapPin, DollarSign, Building, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'

export default function Parties() {
  const location = useLocation()
  const [parties, setParties] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  // Form state
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [address, setAddress] = useState('')
  const [outstandingBalance, setOutstandingBalance] = useState('0')
  const [status, setStatus] = useState('Active')
  const [error, setError] = useState('')

  async function loadParties() {
    try {
      const res = await window.electronAPI.prisma.query('party', 'findMany', {
        orderBy: { companyName: 'asc' }
      })
      if (res.data) {
        setParties(res.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadParties()
    if (location.state && (location.state as any).openNew) {
      setIsOpen(true)
    }
  }, [location.state])

  const handleWhatsAppReminder = async (party: any) => {
    const text = `Dear ${party.companyName},\n\nThis is a friendly reminder from TMS Logistics regarding an outstanding balance of Rs. ${party.outstandingBalance.toLocaleString('en-IN')} on your account.\n\nPlease arrange for the settlement at your earliest convenience.\n\nThank you!`
    
    if (window.electronAPI?.whatsapp) {
      const isConnected = localStorage.getItem('whatsappConnected') === 'true'
      if (isConnected) {
        if (!party.phone) {
          alert("No phone number registered for this party.")
          return
        }
        try {
          const res = await window.electronAPI.whatsapp.send(party.phone, text)
          if (res && res.error) {
            alert('Error sending WhatsApp reminder: ' + res.error)
          } else {
            alert('WhatsApp reminder sent successfully!')
          }
        } catch (err: any) {
          alert('WhatsApp send failed: ' + err.message)
        }
        return
      }
    }
    
    // Fallback if not connected or not in electron
    const fallbackText = `Dear ${party.companyName},%0A%0AThis is a friendly reminder from TMS Logistics regarding an outstanding balance of Rs. ${party.outstandingBalance.toLocaleString('en-IN')} on your account.%0A%0APlease arrange for the settlement at your earliest convenience.%0A%0AThank you!`
    window.open(`https://wa.me/${party.phone || ''}?text=${fallbackText}`, '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName) {
      setError('Company Name is required')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('party', 'create', {
        data: {
          companyName,
          contactPerson: contactPerson || null,
          phone: phone || null,
          email: email || null,
          gstNumber: gstNumber || null,
          address: address || null,
          outstandingBalance: parseFloat(outstandingBalance) || 0,
          status
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
        resetForm()
        loadParties()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setCompanyName('')
    setContactPerson('')
    setPhone('')
    setEmail('')
    setGstNumber('')
    setAddress('')
    setOutstandingBalance('0')
    setStatus('Active')
    setError('')
  }

  const filteredParties = parties.filter(p => 
    p.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
    (p.gstNumber && p.gstNumber.toLowerCase().includes(search.toLowerCase()))
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Party Management
        </h1>
        <Button 
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Party
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Building className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parties.length}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(parties.reduce((acc, p) => acc + (p.outstandingBalance || 0), 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Accounts</CardTitle>
            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 border-green-500/30">
              Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parties.filter(p => p.status === 'Active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Customers List</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by company or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone / Email</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                      No parties found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParties.map((party) => (
                    <TableRow key={party.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{party.companyName}</span>
                          <span className="text-xs text-muted-foreground font-normal flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            {party.address || 'No Address'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{party.contactPerson || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {party.phone && <span className="flex items-center"><Phone className="h-3 w-3 mr-1 text-muted-foreground" /> {party.phone}</span>}
                          {party.email && <span className="flex items-center mt-0.5"><Mail className="h-3 w-3 mr-1 text-muted-foreground" /> {party.email}</span>}
                          {!party.phone && !party.email && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{party.gstNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          party.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'
                        }>
                          {party.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-bold text-orange-500">{formatCurrency(party.outstandingBalance || 0)}</span>
                          {(party.outstandingBalance || 0) > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleWhatsAppReminder(party)}
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10 rounded-full"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer Party</DialogTitle>
            <DialogDescription>
              Create a new client profile. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Tata Steel"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@client.com"
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="bg-background/50 border-white/10 font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outstanding">Opening Outstanding (₹)</Label>
                <Input
                  id="outstanding"
                  type="number"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Phase 2, Industrial Area, Pune"
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Party
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
