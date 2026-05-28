import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Phone, Mail, MapPin, DollarSign, Building, MessageSquare, RefreshCw, Edit, Trash2 } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState('All')
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPartyAction, setSelectedPartyAction] = useState<any>(null)
  
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
  const [selectedParty, setSelectedParty] = useState<any>(null)
  const [isSendingWA, setIsSendingWA] = useState(false)

  const systemCompanyName = localStorage.getItem('companyName') || 'TMS Logistics Pro'
  const systemCompanySub = localStorage.getItem('companySub') || 'Reliable Cargo & Transportation Services'
  const systemCompanyGst = localStorage.getItem('companyGst') || '27GTA12345Z678'
  const systemCompanyAddr = localStorage.getItem('companyAddr') || 'Mumbai, Maharashtra'

  async function loadParties() {
    try {
      const res = await window.electronAPI.prisma.query('party', 'findMany', {
        orderBy: { companyName: 'asc' }
      })
      if (res.data) setParties(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadParties()
    if (location.state && (location.state as any).openNew) { setIsOpen(true) }
  }, [location.state])

  const renderReminderContent = (party: any) => {
    if (!party) return null
    return (
      <div id="printable-reminder" className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-sm font-sans">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-primary uppercase">{systemCompanyName}</h2>
            <p className="text-xs text-slate-500 mt-1">{systemCompanySub}</p>
            <p className="text-xs text-slate-500">GSTIN: {systemCompanyGst}</p>
            <p className="text-xs text-slate-500">{systemCompanyAddr}</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase text-orange-600">OUTSTANDING STATEMENT</h1>
            <p className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="py-6 text-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statement For:</p>
          <p className="font-bold text-slate-800 mt-1 text-base">{party.companyName}</p>
          {party.contactPerson && <p className="text-slate-600 font-medium">Attn: {party.contactPerson}</p>}
          <p className="text-slate-600 mt-1">{party.address || 'No Address Listed'}</p>
          {party.phone && <p className="text-slate-600 font-mono text-xs mt-1">Phone: {party.phone}</p>}
          {party.gstNumber && <p className="font-mono text-xs mt-2 text-slate-700">GSTIN: <strong>{party.gstNumber}</strong></p>}
        </div>
        <div className="bg-orange-50 border border-orange-100 text-orange-800 rounded-lg p-4 my-2 text-xs leading-relaxed">
          <p className="font-bold mb-1">Friendly Payment Reminder:</p>
          <p>This is a friendly reminder that there is an outstanding balance of <strong>Rs. {party.outstandingBalance.toLocaleString('en-IN')}</strong> currently due on your account. We kindly request you to review and arrange for the payment at your earliest convenience.</p>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden mt-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
              <tr><th className="p-3">Description</th><th className="p-3 text-right">Total Outstanding Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="p-3 font-sans"><p className="font-bold text-slate-800">Outstanding Account Balance</p><p className="text-xs text-slate-500 mt-0.5">As of {new Date().toLocaleDateString()}</p></td>
                <td className="p-3 text-right font-bold text-orange-600 text-base">{formatCurrency(party.outstandingBalance || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-end mt-12 pt-8 border-t border-slate-200">
          <div className="text-xs text-slate-400"><p>Computer Generated Statement</p><p>No Signature Required</p></div>
          <div className="text-center w-48 border-t border-slate-300 pt-2"><p className="text-xs font-semibold text-slate-600">Accounts Department</p></div>
        </div>
      </div>
    )
  }

  const handleWhatsAppReminder = async (party: any) => {
    if (!party.phone) { alert("No phone number registered for this party."); return }
    const text = `Dear ${party.companyName},\n\nThis is a friendly reminder from TMS Logistics regarding an outstanding balance of Rs. ${party.outstandingBalance.toLocaleString('en-IN')} on your account.\n\nPlease arrange for the settlement at your earliest convenience.\n\nThank you!`
    if (window.electronAPI?.whatsapp) {
      const isConnected = localStorage.getItem('whatsappConnected') === 'true'
      if (isConnected) {
        setSelectedParty(party)
        setIsSendingWA(true)
        setTimeout(async () => {
          try {
            const element = document.querySelector('#hidden-reminder-capture > div')
            if (!element) throw new Error("Reminder element not found in capture container")
            let stylesHtml = ''
            for (const sheet of Array.from(document.styleSheets)) {
              try { const rules = Array.from(sheet.cssRules); stylesHtml += `<style>${rules.map(r => r.cssText).join('\n')}</style>\n` } catch (e) {}
            }
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { margin: 0; padding: 40px; font-family: sans-serif; background: white !important; color: #0f172a !important; }</style>${stylesHtml}</head><body>${element.outerHTML}</body></html>`
            const pdfBase64 = await window.electronAPI.app!.printToPdf(fullHtml)
            const res = await window.electronAPI.whatsapp!.sendMedia({ phone: party.phone, caption: text, base64Data: pdfBase64, mimetype: 'application/pdf', filename: `Outstanding_Statement_${party.companyName.replace(/\s+/g, '_')}.pdf` })
            if (res && res.error) { alert('Error sending WhatsApp reminder: ' + res.error) } else { alert(`WhatsApp reminder sent to ${party.companyName}!`) }
          } catch (err: any) { alert('WhatsApp send failed: ' + err.message) } finally { setIsSendingWA(false); setSelectedParty(null) }
        }, 400)
        return
      }
    }
    const fallbackText = `Dear ${party.companyName},%0A%0AOutstanding balance: Rs. ${party.outstandingBalance.toLocaleString('en-IN')}%0APlease arrange for settlement.%0AThank you!`
    window.open(`https://wa.me/${party.phone || ''}?text=${fallbackText}`, '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName) { setError('Company Name is required'); return }
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
      if (res.error) { setError(res.error) } else { setIsOpen(false); resetForm(); loadParties() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName) { setError('Company Name is required'); return }
    try {
      const res = await window.electronAPI.prisma.query('party', 'update', {
        where: { id: selectedPartyAction.id },
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
      if (res.error) { setError(res.error) } else { setIsEditOpen(false); resetForm(); loadParties() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleOpenEdit = (party: any) => {
    setSelectedPartyAction(party)
    setCompanyName(party.companyName)
    setContactPerson(party.contactPerson || '')
    setPhone(party.phone || '')
    setEmail(party.email || '')
    setGstNumber(party.gstNumber || '')
    setAddress(party.address || '')
    setOutstandingBalance(String(party.outstandingBalance || 0))
    setStatus(party.status)
    setError('')
    setIsEditOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedPartyAction) return
    try {
      await window.electronAPI.prisma.query('party', 'delete', { where: { id: selectedPartyAction.id } })
      setIsDeleteOpen(false)
      setSelectedPartyAction(null)
      loadParties()
    } catch (err: any) { setError(err.message || 'Delete failed') }
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
    setSelectedPartyAction(null)
  }

  const filteredParties = parties
    .filter(p => statusFilter === 'All' || p.status === statusFilter)
    .filter(p =>
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (p.gstNumber && p.gstNumber.toLowerCase().includes(search.toLowerCase())) ||
      (p.phone && p.phone.includes(search))
    )

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

  const partyFormContent = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Company Name *</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Tata Steel" className="bg-background/50 border-white/10" required /></div>
        <div className="space-y-2"><Label>Contact Person</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Ramesh Patel" className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. info@client.com" className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>GST Number</Label><Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g. 22AAAAA0000A1Z5" className="bg-background/50 border-white/10 font-mono uppercase" /></div>
        <div className="space-y-2"><Label>Outstanding Balance (₹)</Label><Input type="number" value={outstandingBalance} onChange={(e) => setOutstandingBalance(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Phase 2, Industrial Area, Pune" className="bg-background/50 border-white/10" /></div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setIsEditOpen(false); resetForm() }}>Cancel</Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{isEdit ? 'Update Party' : 'Save Party'}</Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Party Management</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={loadParties} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add Party
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Building className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parties.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{parties.filter(p => p.status === 'Active').length} active accounts</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(parties.reduce((acc, p) => acc + (p.outstandingBalance || 0), 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">across {parties.filter(p => p.outstandingBalance > 0).length} parties</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Accounts</CardTitle>
            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 border-green-500/30">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parties.filter(p => p.status === 'Active').length}</div>
            <p className="text-xs text-muted-foreground mt-1">{parties.filter(p => p.status === 'Inactive').length} inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex items-center space-x-2">
        {['All', 'Active', 'Inactive'].map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === tab ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
            {tab} {tab !== 'All' && <span className="ml-1 text-xs opacity-70">({parties.filter(p => p.status === tab).length})</span>}
          </button>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Customers List</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search by company, contact, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
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
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParties.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No parties found.</TableCell></TableRow>
                ) : (
                  filteredParties.map((party) => (
                    <TableRow key={party.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{party.companyName}</span>
                          <span className="text-xs text-muted-foreground font-normal flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{party.address || 'No Address'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{party.contactPerson || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm space-y-0.5">
                          {party.phone && (
                            <a href={`tel:${party.phone}`} className="flex items-center text-primary hover:text-primary/80 transition-colors" title="Click to call">
                              <Phone className="h-3 w-3 mr-1" />{party.phone}
                            </a>
                          )}
                          {party.email && <span className="flex items-center text-muted-foreground"><Mail className="h-3 w-3 mr-1" />{party.email}</span>}
                          {!party.phone && !party.email && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{party.gstNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={party.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'}>
                          {party.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${(party.outstandingBalance || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                          {formatCurrency(party.outstandingBalance || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-1">
                          {(party.outstandingBalance || 0) > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => handleWhatsAppReminder(party)} disabled={isSendingWA && selectedParty?.id === party.id} className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10" title="Send WhatsApp Reminder">
                              {isSendingWA && selectedParty?.id === party.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(party)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title="Edit Party">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPartyAction(party); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title="Delete Party">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Add Party Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Add New Customer Party</DialogTitle><DialogDescription>Create a new client profile. Click save when you're done.</DialogDescription></DialogHeader>
          {partyFormContent(false, handleSubmit)}
        </DialogContent>
      </Dialog>

      {/* Edit Party Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit Party — {selectedPartyAction?.companyName}</DialogTitle><DialogDescription>Update client details, contact info, and outstanding balance.</DialogDescription></DialogHeader>
          {partyFormContent(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Party?</DialogTitle>
            <DialogDescription>Permanently delete <strong>{selectedPartyAction?.companyName}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete Party</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div id="hidden-reminder-capture" className="absolute left-[-9999px] top-[-9999px] bg-white text-slate-900" style={{ width: '800px' }}>
        {selectedParty && renderReminderContent(selectedParty)}
      </div>
    </div>
  )
}
