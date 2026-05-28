import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileText, Download, MessageSquare, IndianRupee, Printer, Calendar, ShieldCheck, Trash2, Filter, RefreshCw, CheckCircle } from 'lucide-react'
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

export default function Invoices() {
  const location = useLocation()
  const [invoices, setInvoices] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('all')
  
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isSendingWA, setIsSendingWA] = useState(false)

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [gstPercentage, setGstPercentage] = useState('0')
  const [amountPaid, setAmountPaid] = useState('0')
  const [status, setStatus] = useState('Unpaid')
  const [error, setError] = useState('')

  // Selected Trip Details for form
  const selectedTrip = trips.find(t => t.id === selectedTripId)
  const calculatedSubtotal = selectedTrip ? selectedTrip.freightAmount : 0
  const calculatedGst = (calculatedSubtotal * parseFloat(gstPercentage || '0')) / 100
  const calculatedTotal = calculatedSubtotal + calculatedGst

  // System Config
  const systemCompanyName = localStorage.getItem('companyName') || 'TMS Logistics Pro'
  const systemCompanySub = localStorage.getItem('companySub') || 'Reliable Cargo & Transportation Services'
  const systemCompanyGst = localStorage.getItem('companyGst') || '27GTA12345Z678'
  const systemCompanyAddr = localStorage.getItem('companyAddr') || 'Mumbai, Maharashtra'
  const systemCompanyBank = localStorage.getItem('companyBank') || 'HDFC Bank, Ac: 50100000000000, IFSC: HDFC0000001'

  async function loadData() {
    try {
      const invRes = await window.electronAPI.prisma.query('invoice', 'findMany', {
        include: { trip: { include: { party: true, vehicle: true } } },
        orderBy: { date: 'desc' }
      })
      if (invRes.data) setInvoices(invRes.data)

      const tripsRes = await window.electronAPI.prisma.query('trip', 'findMany', {
        where: { podStatus: { in: ['Received', 'Submitted'] } },
        include: { party: true },
        orderBy: { tripNo: 'desc' }
      })
      if (tripsRes.data) {
        // Only show trips that don't already have an invoice
        const existingTripIds = invRes.data ? invRes.data.map((i: any) => i.tripId) : []
        setTrips(tripsRes.data.filter((t: any) => !existingTripIds.includes(t.id)))
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadData()
    if (location.state && (location.state as any).openNew) {
      handleOpenNew()
    }
  }, [location.state])

  const generateNextInvoiceNo = () => {
    if (invoices.length === 0) { setInvoiceNumber('INV-2001'); return }
    const numbers = invoices.map(i => parseInt(i.invoiceNumber.replace('INV-', ''))).filter(num => !isNaN(num))
    if (numbers.length === 0) { setInvoiceNumber('INV-2001'); return }
    setInvoiceNumber(`INV-${Math.max(...numbers) + 1}`)
  }

  const handleOpenNew = () => {
    resetForm()
    generateNextInvoiceNo()
    setIsNewOpen(true)
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedTripId) { setError('Please select a trip to invoice'); return }

    try {
      const res = await window.electronAPI.prisma.query('invoice', 'create', {
        data: {
          invoiceNumber,
          date: new Date(invoiceDate),
          tripId: selectedTripId,
          subtotal: calculatedSubtotal,
          gstAmount: calculatedGst,
          totalAmount: calculatedTotal,
          amountPaid: parseFloat(amountPaid) || 0,
          status
        }
      })
      if (res.error) { setError(res.error) } else {
        await window.electronAPI.prisma.query('trip', 'update', {
          where: { id: selectedTripId },
          data: { podStatus: 'Submitted' }
        })
        const outstandingAddition = calculatedTotal - (parseFloat(amountPaid) || 0)
        if (outstandingAddition > 0 && selectedTrip) {
          const currentParty = await window.electronAPI.prisma.query('party', 'findUnique', { where: { id: selectedTrip.partyId } })
          if (currentParty.data) {
            await window.electronAPI.prisma.query('party', 'update', {
              where: { id: selectedTrip.partyId },
              data: { outstandingBalance: currentParty.data.outstandingBalance + outstandingAddition }
            })
          }
        }
        setIsNewOpen(false)
        resetForm()
        loadData()
      }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleTogglePaid = async (invoice: any) => {
    try {
      const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid'
      const newAmountPaid = newStatus === 'Paid' ? invoice.totalAmount : 0
      
      await window.electronAPI.prisma.query('invoice', 'update', {
        where: { id: invoice.id },
        data: {
          status: newStatus,
          amountPaid: newAmountPaid
        }
      })
      
      // Update Trip status accordingly
      await window.electronAPI.prisma.query('trip', 'update', {
        where: { id: invoice.tripId },
        data: { paymentStatus: newStatus === 'Paid' ? 'Paid' : 'Pending' }
      })
      
      // Update Party outstanding balance
      const balanceChange = newStatus === 'Paid' ? -invoice.totalAmount : invoice.totalAmount
      const party = invoice.trip?.party
      if (party) {
        await window.electronAPI.prisma.query('party', 'update', {
          where: { id: party.id },
          data: { outstandingBalance: Math.max(0, party.outstandingBalance + balanceChange) }
        })
      }
      loadData()
    } catch (err: any) { console.error('Failed to toggle paid status', err) }
  }

  const handleDelete = async () => {
    if (!selectedInvoice) return
    try {
      await window.electronAPI.prisma.query('invoice', 'delete', { where: { id: selectedInvoice.id } })
      
      // Revert Trip status
      await window.electronAPI.prisma.query('trip', 'update', {
        where: { id: selectedInvoice.tripId },
        data: { podStatus: 'Received' } // Assuming it goes back to received before billing
      })
      
      // Revert Party outstanding balance if it was unpaid
      if (selectedInvoice.status !== 'Paid') {
        const party = selectedInvoice.trip?.party
        if (party) {
          const revertAmount = selectedInvoice.totalAmount - selectedInvoice.amountPaid
          await window.electronAPI.prisma.query('party', 'update', {
            where: { id: party.id },
            data: { outstandingBalance: Math.max(0, party.outstandingBalance - revertAmount) }
          })
        }
      }
      
      setIsDeleteOpen(false)
      setSelectedInvoice(null)
      loadData()
    } catch (err: any) { setError(err.message || 'Delete failed') }
  }

  const resetForm = () => {
    setInvoiceNumber('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setSelectedTripId('')
    setGstPercentage('0')
    setAmountPaid('0')
    setStatus('Unpaid')
    setError('')
  }

  const handlePrint = async () => {
    const element = document.getElementById('printable-invoice')
    if (element && window.electronAPI?.app) {
      const isMac = navigator.userAgent.includes('Mac OS')
      if (isMac) { window.print(); return }
      
      let stylesHtml = ''
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules)
          const cssText = rules.map(rule => rule.cssText).join('\n')
          stylesHtml += `<style>${cssText}</style>\n`
        } catch (e) {}
      }

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { margin: 0; padding: 40px; font-family: sans-serif; background: white !important; color: #0f172a !important; } @media print { body { padding: 0; } }</style>${stylesHtml}</head><body>${element.outerHTML}</body></html>`
      try {
        const pdfBase64 = await window.electronAPI.app.printToPdf(fullHtml)
        const link = document.createElement('a')
        link.href = `data:application/pdf;base64,${pdfBase64}`
        link.download = `${selectedInvoice.invoiceNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) { alert('Failed to generate PDF') }
    } else { window.print() }
  }

  const handleWhatsApp = async (invoice: any) => {
    const phone = invoice.trip?.party?.phone
    if (!phone) { alert("No phone number registered for this party."); return }
    
    const text = `Dear ${invoice.trip.party.companyName},\n\nPlease find attached the invoice ${invoice.invoiceNumber} for the recent trip from ${invoice.trip.from} to ${invoice.trip.to}.\n\nTotal Amount: Rs. ${invoice.totalAmount.toLocaleString('en-IN')}\n\nPlease process the payment at your earliest convenience.\n\nThank you!`
    
    if (window.electronAPI?.whatsapp) {
      const isConnected = localStorage.getItem('whatsappConnected') === 'true'
      if (isConnected) {
        setSelectedInvoice(invoice)
        setIsSendingWA(true)
        
        setTimeout(async () => {
          try {
            const element = document.querySelector('#hidden-invoice-capture > div')
            if (!element) throw new Error("Invoice element not found in capture container")

            let stylesHtml = ''
            for (const sheet of Array.from(document.styleSheets)) {
              try { const rules = Array.from(sheet.cssRules); stylesHtml += `<style>${rules.map(r => r.cssText).join('\n')}</style>\n` } catch (e) {}
            }

            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { margin: 0; padding: 40px; font-family: sans-serif; background: white !important; color: #0f172a !important; } @media print { body { padding: 0; } }</style>${stylesHtml}</head><body>${element.outerHTML}</body></html>`
            const pdfBase64 = await window.electronAPI.app!.printToPdf(fullHtml)
            const res = await window.electronAPI.whatsapp!.sendMedia({ phone, caption: text, base64Data: pdfBase64, mimetype: 'application/pdf', filename: `${invoice.invoiceNumber}.pdf` })
            
            if (res && res.error) { alert('Error sending WhatsApp invoice: ' + res.error) } else { alert(`WhatsApp invoice successfully sent to ${invoice.trip.party.companyName}!`) }
          } catch (err: any) { alert('WhatsApp send failed: ' + err.message) } finally { setIsSendingWA(false) }
        }, 400)
        return
      }
    }
    
    const fallbackText = `Dear ${invoice.trip.party.companyName},%0A%0AInvoice ${invoice.invoiceNumber} for trip ${invoice.trip.from} to ${invoice.trip.to}.%0AAmount: Rs. ${invoice.totalAmount.toLocaleString('en-IN')}%0A%0AThank you!`
    window.open(`https://wa.me/${phone}?text=${fallbackText}`, '_blank')
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.trip?.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.trip?.tripNo.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
    
    const invDate = new Date(inv.date)
    const matchesMonth = monthFilter === 'all' ||
      (monthFilter === 'this' && invDate >= thisMonthStart) ||
      (monthFilter === 'last' && invDate >= lastMonthStart && invDate <= lastMonthEnd)

    return matchesSearch && matchesStatus && matchesMonth
  })

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  
  const totalBilled = filteredInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0)
  const totalCollected = filteredInvoices.reduce((acc, i) => acc + (i.amountPaid || 0), 0)
  const totalOutstanding = filteredInvoices.filter(i => i.status !== 'Paid').reduce((acc, i) => acc + (i.totalAmount - i.amountPaid), 0)

  const renderInvoiceContent = (invoice: any) => {
    if (!invoice) return null
    return (
      <div id="printable-invoice" className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-sm font-sans">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase">{systemCompanyName}</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{systemCompanySub}</p>
            <p className="text-xs text-slate-500 mt-1">GSTIN: {systemCompanyGst}</p>
            <p className="text-xs text-slate-500 max-w-[250px]">{systemCompanyAddr}</p>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold uppercase text-slate-200 tracking-wider">Invoice</h1>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-500 text-right">Invoice No:</span>
              <span className="font-bold">{invoice.invoiceNumber}</span>
              <span className="text-slate-500 text-right">Date:</span>
              <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
              <span className="text-slate-500 text-right">Trip Ref:</span>
              <span className="font-mono">{invoice.trip?.tripNo}</span>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-12 mt-8">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To:</p>
            <p className="font-bold text-slate-800 text-lg">{invoice.trip?.party?.companyName}</p>
            <p className="text-slate-600 text-sm mt-1">{invoice.trip?.party?.address || 'No Address Listed'}</p>
            {invoice.trip?.party?.gstNumber && (
              <p className="font-mono text-xs mt-2 text-slate-700 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200">
                GSTIN: <strong>{invoice.trip.party.gstNumber}</strong>
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trip Details:</p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div className="flex justify-between mb-1"><span className="text-slate-500">Route:</span><span className="font-medium">{invoice.trip?.from} to {invoice.trip?.to}</span></div>
              <div className="flex justify-between mb-1"><span className="text-slate-500">Vehicle:</span><span className="font-mono">{invoice.trip?.vehicle?.vehicleNumber}</span></div>
              <div className="flex justify-between mb-1"><span className="text-slate-500">Material:</span><span>{invoice.trip?.material || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Weight:</span><span>{invoice.trip?.sizeWeight || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-10 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Description of Service</th>
                <th className="p-4 text-center">Billing Type</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 text-center text-slate-500">1</td>
                <td className="p-4 font-medium text-slate-800">Transportation Freight Charges<br/><span className="text-xs text-slate-500 font-normal mt-1 block">From {invoice.trip?.from} to {invoice.trip?.to}</span></td>
                <td className="p-4 text-center text-slate-600">{invoice.trip?.billingType}</td>
                <td className="p-4 text-right font-mono font-medium">{formatCurrency(invoice.subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-start mt-6">
          <div className="w-1/2 pr-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bank Details:</p>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-xs text-slate-600 whitespace-pre-line">
              {systemCompanyBank}
            </div>
          </div>
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal:</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.gstAmount > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-500">GST:</span><span className="font-mono">{formatCurrency(invoice.gstAmount)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-primary"><span>Total:</span><span className="font-mono">{formatCurrency(invoice.totalAmount)}</span></div>
            {(invoice.amountPaid || 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600 border-t border-slate-100 pt-2"><span>Amount Paid:</span><span className="font-mono">-{formatCurrency(invoice.amountPaid)}</span></div>
            )}
            {(invoice.amountPaid || 0) > 0 && (
              <div className="flex justify-between text-sm font-bold text-orange-600 bg-orange-50 p-2 rounded"><span>Balance Due:</span><span className="font-mono">{formatCurrency(invoice.totalAmount - invoice.amountPaid)}</span></div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end">
          <div className="text-xs text-slate-400">
            <p>1. Subject to local jurisdiction.</p>
            <p>2. Payment strictly due within 15 days.</p>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <p className="text-xs font-semibold text-slate-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Billing & Invoices
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredInvoices.length} invoices generated</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">from {filteredInvoices.filter(i => i.status === 'Paid').length} paid invoices</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">from {filteredInvoices.filter(i => i.status !== 'Paid').length} unpaid invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {[['all', 'All Time'], ['this', 'This Month'], ['last', 'Last Month']].map(([val, label]) => (
            <button key={val} onClick={() => setMonthFilter(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${monthFilter === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {['All', 'Unpaid', 'Partial', 'Paid'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Invoice Records</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search invoice, customer, trip..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Invoice Details</TableHead>
                  <TableHead>Customer / Party</TableHead>
                  <TableHead>Trip Ref</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No invoices generated yet.</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-foreground">{invoice.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />{new Date(invoice.date).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{invoice.trip?.party?.companyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
                          {invoice.trip?.tripNo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right">
                        {invoice.amountPaid > 0 ? (
                          <span className="font-medium text-green-500">{formatCurrency(invoice.amountPaid)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          invoice.status === 'Paid' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          invoice.status === 'Partial' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          'border-orange-500/30 text-orange-500 bg-orange-500/10 animate-pulse'
                        }>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleTogglePaid(invoice)}
                            className={`h-8 w-8 p-0 ${invoice.status === 'Paid' ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'}`} 
                            title={invoice.status === 'Paid' ? "Mark Unpaid" : "Mark Full Paid"}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true) }} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title="View / Print">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(invoice)} disabled={isSendingWA && selectedInvoice?.id === invoice.id} className="h-8 w-8 p-0 hover:bg-green-500/20 hover:text-green-400" title="Send WhatsApp">
                            {isSendingWA && selectedInvoice?.id === invoice.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-green-400" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title="Delete">
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

      {/* New Invoice Dialog */}
      <Dialog open={isNewOpen} onOpenChange={(o) => { setIsNewOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Generate New Invoice</DialogTitle>
            <DialogDescription>Select a completed trip to bill the customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number *</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="bg-background/50 border-white/10 font-mono font-bold" required />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="bg-background/50 border-white/10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Completed Trip to Bill *</Label>
              <select value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" required>
                <option value="">-- Choose a trip pending invoice --</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tripNo} - {t.party?.companyName} ({formatCurrency(t.freightAmount)})
                  </option>
                ))}
              </select>
              {trips.length === 0 && (
                <p className="text-xs text-orange-400 mt-1">No completed trips available to invoice. Make sure trip POD is received.</p>
              )}
            </div>

            {selectedTrip && (
              <Card className="bg-white/5 border-white/10 shadow-none">
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Route:</span><span>{selectedTrip.from} → {selectedTrip.to}</span></div>
                  <div className="flex justify-between font-medium"><span>Freight Amount (Subtotal):</span><span>{formatCurrency(calculatedSubtotal)}</span></div>
                  
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <Label className="flex items-center space-x-2">
                      <span>Add GST %:</span>
                      <Input type="number" value={gstPercentage} onChange={(e) => setGstPercentage(e.target.value)} className="w-20 h-8 bg-background/50 border-white/10" />
                    </Label>
                    <span>{formatCurrency(calculatedGst)}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/10 pt-3 text-lg font-bold text-primary">
                    <span>Total Bill Amount:</span>
                    <span>{formatCurrency(calculatedTotal)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Initial Payment Received (₹)</Label>
                      <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="bg-background/50 border-white/10 h-8" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Payment Status</Label>
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-8 px-2 rounded-md bg-background/50 border border-white/10 focus:outline-none text-xs text-foreground">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Fully Paid</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedTripId} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Generate Invoice
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Invoice Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass-panel border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Invoice Preview</DialogTitle>
              <DialogDescription>Review and print or share this invoice.</DialogDescription>
            </div>
            <div className="flex items-center space-x-2 mr-6">
              <Button onClick={() => handleWhatsApp(selectedInvoice)} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                <MessageSquare className="mr-2 h-4 w-4" /> Send WhatsApp
              </Button>
              <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 bg-slate-100 rounded-lg overflow-x-auto my-4">
            {renderInvoiceContent(selectedInvoice)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Invoice?</DialogTitle>
            <DialogDescription>Permanently delete invoice <strong>{selectedInvoice?.invoiceNumber}</strong>? The associated trip will be reverted to 'Received' (unbilled) status. Outstanding balances will be recalculated. Cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Off-screen hidden container for PDF generation capture */}
      <div id="hidden-invoice-capture" className="absolute left-[-9999px] top-[-9999px] bg-white text-slate-900" style={{ width: '800px' }}>
        {selectedInvoice && renderInvoiceContent(selectedInvoice)}
      </div>
    </div>
  )
}
