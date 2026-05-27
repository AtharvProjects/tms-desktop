import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Send, Download, Copy, Phone, Calendar, Printer } from 'lucide-react'
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
  const companyName = localStorage.getItem('companyName') || 'TMS Logistics Pro'
  const companySub = localStorage.getItem('companySub') || 'Reliable Cargo & Transportation Services'
  const companyGst = localStorage.getItem('companyGst') || '27GTA12345Z678'
  const [invoices, setInvoices] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  
  const [search, setSearch] = useState('')
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Invoice Generation State
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [tripId, setTripId] = useState('')
  const [subtotal, setSubtotal] = useState(0)
  const [gstRate, setGstRate] = useState('12') // 12% standard GST for transport
  const [gstAmount, setGstAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const invRes = await window.electronAPI.prisma.query('invoice', 'findMany', {
        include: {
          trip: {
            include: {
              party: true,
              vehicle: true,
              driver: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      if (invRes.data) setInvoices(invRes.data)

      // Fetch all trips to check which ones don't have invoices yet
      const tripsRes = await window.electronAPI.prisma.query('trip', 'findMany', {
        include: {
          invoices: true,
          party: true
        },
        orderBy: { tripNo: 'desc' }
      })
      if (tripsRes.data) {
        // Filter: Only trips that do not have an invoice generated yet
        const uninvoiced = tripsRes.data.filter((t: any) => t.invoices.length === 0)
        setTrips(uninvoiced)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    if (location.state && (location.state as any).openNew) {
      handleOpenGenerate()
    }
  }, [location.state])

  // Auto-generate invoice number
  const generateNextInvoiceNo = () => {
    const year = new Date().getFullYear()
    if (invoices.length === 0) {
      setInvoiceNumber(`INV-${year}-001`)
      return
    }
    const numbers = invoices
      .map(inv => {
        const match = inv.invoiceNumber.match(/\d+$/)
        return match ? parseInt(match[0]) : NaN
      })
      .filter(num => !isNaN(num))
    
    if (numbers.length === 0) {
      setInvoiceNumber(`INV-${year}-001`)
      return
    }
    const maxNum = Math.max(...numbers)
    if (maxNum >= 1000 && maxNum < 3000) {
      setInvoiceNumber(`INV-${maxNum + 1}`)
    } else {
      const paddedNum = String(maxNum + 1).padStart(3, '0')
      setInvoiceNumber(`INV-${year}-${paddedNum}`)
    }
  }

  const handleOpenGenerate = () => {
    setError('')
    setTripId('')
    setSubtotal(0)
    setGstAmount(0)
    setTotalAmount(0)
    setDate(new Date().toISOString().split('T')[0])
    generateNextInvoiceNo()
    setIsGenerateOpen(true)
  }

  // Recalculate calculations when tripId or gstRate changes
  useEffect(() => {
    const trip = trips.find(t => t.id === tripId)
    if (trip) {
      const freight = trip.freightAmount || 0
      setSubtotal(freight)
      const rate = parseFloat(gstRate) || 0
      const gst = (freight * rate) / 100
      setGstAmount(gst)
      setTotalAmount(freight + gst)
    }
  }, [tripId, gstRate, trips])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!tripId || !invoiceNumber) {
      setError('Please select a trip and specify an invoice number')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('invoice', 'create', {
        data: {
          invoiceNumber,
          date: new Date(date),
          tripId,
          subtotal,
          gstAmount,
          totalAmount,
          status: 'Unpaid'
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        // Update Trip POD Status to 'Submitted'
        await window.electronAPI.prisma.query('trip', 'update', {
          where: { id: tripId },
          data: { podStatus: 'Submitted' }
        })

        setIsGenerateOpen(false)
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleShare = (invoice: any) => {
    setSelectedInvoice(invoice)
    setIsShareOpen(true)
  }

  const handleWhatsAppShare = async () => {
    if (!selectedInvoice) return
    const company = selectedInvoice.trip?.party?.companyName || 'Valued Client'
    const phone = selectedInvoice.trip?.party?.phone || ''
    
    const text = `Dear ${company},\n\nPlease find the invoice ${selectedInvoice.invoiceNumber} for Rs. ${selectedInvoice.totalAmount.toLocaleString('en-IN')} for transport services reference Trip: ${selectedInvoice.trip?.tripNo} (${selectedInvoice.trip?.from} to ${selectedInvoice.trip?.to}).\n\nPlease process the payment at your earliest convenience.\n\nThank you,\nTMS Logistics.`

    if (window.electronAPI?.whatsapp) {
      const isConnected = localStorage.getItem('whatsappConnected') === 'true'
      if (isConnected) {
        if (!phone) {
          alert("No phone number registered for this party.")
          return
        }
        try {
          const res = await window.electronAPI.whatsapp.send(phone, text)
          if (res && res.error) {
            alert('Error sending WhatsApp invoice: ' + res.error)
          } else {
            alert('WhatsApp invoice sent successfully via connected device!')
            setIsShareOpen(false)
          }
        } catch (err: any) {
          alert('WhatsApp send failed: ' + err.message)
        }
        return
      }
    }

    // Fallback if not connected or not in electron
    const fallbackText = `Dear ${company},%0A%0APlease find the invoice ${selectedInvoice.invoiceNumber} for Rs. ${selectedInvoice.totalAmount.toLocaleString('en-IN')} attached for transport services reference Trip: ${selectedInvoice.trip?.tripNo} (${selectedInvoice.trip?.from} to ${selectedInvoice.trip?.to}).%0A%0APlease process the payment at your earliest convenience.%0A%0AThank you,%0ATMS Logistics.`
    window.open(`https://wa.me/${phone}?text=${fallbackText}`, '_blank')
  }

  const handleCopyText = () => {
    if (!selectedInvoice) return
    const company = selectedInvoice.trip?.party?.companyName || 'Valued Client'
    const text = `Dear ${company},\n\nPlease find the invoice ${selectedInvoice.invoiceNumber} for Rs. ${selectedInvoice.totalAmount.toLocaleString('en-IN')} attached for transport services reference Trip: ${selectedInvoice.trip?.tripNo} (${selectedInvoice.trip?.from} to ${selectedInvoice.trip?.to}).\n\nPlease process the payment at your earliest convenience.\n\nThank you,\nTMS Logistics.`
    navigator.clipboard.writeText(text)
  }

  const handleEmailShare = () => {
    if (!selectedInvoice) return
    const company = selectedInvoice.trip?.party?.companyName || 'Valued Client'
    const subject = `Invoice ${selectedInvoice.invoiceNumber} from TMS Logistics`
    const body = `Dear ${company},\n\nPlease find the invoice ${selectedInvoice.invoiceNumber} for Rs. ${selectedInvoice.totalAmount.toLocaleString('en-IN')} for transport services reference Trip: ${selectedInvoice.trip?.tripNo} (${selectedInvoice.trip?.from} to ${selectedInvoice.trip?.to}).\n\nPlease process the payment at your earliest convenience.\n\nThank you,\nTMS Logistics.`
    window.open(`mailto:${selectedInvoice.trip?.party?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const triggerPrint = (invoice: any) => {
    if (!invoice) return
    const originalTitle = document.title
    document.title = `Invoice_${invoice.invoiceNumber}`
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.trip?.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
    inv.trip?.tripNo.toLowerCase().includes(search.toLowerCase())
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  const renderInvoiceContent = (inv: any) => {
    if (!inv) return null;
    return (
      <div 
        id="printable-invoice" 
        className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-sm font-sans"
      >
        <style>{`
          @media print {
            html, body, #root, #root > div, main, main > div, main > div > div {
              display: block !important;
              position: static !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body {
              visibility: hidden;
              background: white !important;
            }
            #printable-invoice, #printable-invoice * {
              visibility: visible !important;
            }
            #printable-invoice {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 40px !important;
              margin: 0 !important;
              background: white !important;
              color: #0f172a !important;
              box-sizing: border-box !important;
            }
            .no-print, [data-radix-portal], aside {
              display: none !important;
            }
          }
        `}</style>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-primary uppercase">{companyName}</h2>
            <p className="text-xs text-slate-500 mt-1">{companySub}</p>
            <p className="text-xs text-slate-500">GSTIN: {companyGst}</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase text-slate-800">Tax Invoice</h1>
            <p className="text-sm font-mono font-bold mt-1">{inv.invoiceNumber}</p>
            <p className="text-xs text-slate-500">Date: {new Date(inv.date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-8 py-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Billed To (Consignee):</p>
            <p className="font-bold text-slate-800 mt-1 text-base">{inv.trip?.party?.companyName}</p>
            <p className="text-slate-600 mt-1">{inv.trip?.party?.address || 'No Address Listed'}</p>
            {inv.trip?.party?.gstNumber && (
              <p className="font-mono text-xs mt-2 text-slate-700">
                GSTIN: <strong>{inv.trip?.party?.gstNumber}</strong>
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transport Details:</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs text-slate-600">
              <span className="font-medium text-slate-400">Trip Reference:</span>
              <span className="font-bold font-mono">{inv.trip?.tripNo}</span>
              <span className="font-medium text-slate-400">Vehicle:</span>
              <span className="font-semibold font-mono">{inv.trip?.vehicle?.vehicleNumber}</span>
              <span className="font-medium text-slate-400">Driver Name:</span>
              <span>{inv.trip?.driver?.driverName || 'N/A'}</span>
              <span className="font-medium text-slate-400">Cargo Material:</span>
              <span>{inv.trip?.material || 'N/A'} ({inv.trip?.sizeWeight || 'N/A'})</span>
            </div>
          </div>
        </div>

        {/* Route Header */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 my-2 text-xs flex justify-between font-semibold text-slate-700">
          <span>ROUTE SEGMENT:</span>
          <span>{inv.trip?.from} → {inv.trip?.to}</span>
        </div>

        {/* Ledger Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mt-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Description of Service</th>
                <th className="p-3 text-right">Freight Rate</th>
                <th className="p-3 text-right">Tax (GST)</th>
                <th className="p-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3">
                  <p className="font-bold text-slate-800">GTA Transport Freight Service Charges</p>
                  <p className="text-xs text-slate-500 mt-0.5">Route: {inv.trip?.from} to {inv.trip?.to}</p>
                </td>
                <td className="p-3 text-right font-mono font-medium">{formatCurrency(inv.subtotal)}</td>
                <td className="p-3 text-right font-mono font-medium">{formatCurrency(inv.gstAmount)}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Calculations */}
        <div className="flex justify-between items-start mt-8 pt-6 border-t border-slate-100">
          <div className="max-w-xs text-[11px] text-slate-400">
            <p className="font-bold">GTA Declaration:</p>
            <p className="mt-1">We declare that this invoice shows the actual price of the services described and that all particulars are true and correct. Taxes are calculated as per GTA reverse/forward charge directives.</p>
          </div>
          <div className="w-64 text-sm space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Freight:</span>
              <span className="font-mono font-medium">{formatCurrency(inv.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST Tax Component:</span>
              <span className="font-mono font-medium">+{formatCurrency(inv.gstAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Advances Deducted:</span>
              <span className="font-mono text-red-500">-{formatCurrency(inv.trip?.advance || 0)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-lg">
              <span>Balance Due:</span>
              <span className="font-mono">{formatCurrency(inv.totalAmount - (inv.trip?.advance || 0))}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="flex justify-between items-end mt-12 pt-8 border-t border-slate-200">
          <div className="text-xs text-slate-400">
            <p>Computer Generated Document</p>
            <p>No Signature Required</p>
          </div>
          <div className="text-center w-48 border-t border-slate-300 pt-2">
            <p className="text-xs font-semibold text-slate-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Screen layout wrapper (hidden during print) */}
      <div className="no-print space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            Invoice Management
          </h1>
          <Button 
            onClick={handleOpenGenerate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Generate Invoice
          </Button>
        </div>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">Recent Invoices</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
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
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party / Customer</TableHead>
                    <TableHead>Trip Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                        No invoices found. Generate an invoice from completed trips.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-semibold text-foreground font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center text-xs">
                            <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {new Date(inv.date).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{inv.trip?.party?.companyName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs border-primary/20 text-primary bg-primary/5">
                            {inv.trip?.tripNo} ({inv.trip?.from} → {inv.trip?.to})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            inv.status === 'Paid' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                            'border-orange-500/30 text-orange-500 bg-orange-500/10'
                          }>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { setSelectedInvoice(inv); setIsPreviewOpen(true); }}
                              className="hover:bg-white/10"
                            >
                              <Printer className="h-4 w-4 mr-1 text-purple-500" /> Print
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleShare(inv)}
                              className="hover:bg-white/10"
                            >
                              <Send className="h-4 w-4 mr-1 text-primary" /> Share
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

        {/* Generate Invoice Dialog */}
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate Tax Invoice</DialogTitle>
              <DialogDescription>
                Select a completed trip consignment to draft a billing invoice.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4 py-4">
              {error && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="tripId">Consignment Trip *</Label>
                <select
                  id="tripId"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                  required
                >
                  <option value="">Select Trip Route</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tripNo} ({t.party?.companyName} | {t.from} → {t.to})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-background/50 border-white/10 font-mono font-semibold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Billing Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-background/50 border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Tax Percentage (%)</Label>
                <select
                  id="gstRate"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="0">0% (GST Exempted)</option>
                  <option value="5">5% GTA (No Input Tax Credit)</option>
                  <option value="12">12% GTA (GTA Forward charge)</option>
                  <option value="18">18% (Standard Service charge)</option>
                </select>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/5 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Freight:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST Tax ({gstRate}%):</span>
                  <span className="font-mono font-medium text-orange-500">+{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-base">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsGenerateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6">
                  Generate Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Share Invoice</DialogTitle>
              <DialogDescription>
                Select a channel to dispatch billing invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button 
                variant="outline" 
                className="justify-start h-12 bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20" 
                onClick={handleWhatsAppShare}
              >
                <Phone className="mr-2 h-5 w-5" />
                Share via WhatsApp
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12 text-foreground"
                onClick={handleEmailShare}
              >
                <Send className="mr-2 h-5 w-5 text-blue-500" />
                Email Invoice
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12 text-foreground"
              onClick={() => {
                setIsShareOpen(false);
                setIsPreviewOpen(true);
                setTimeout(() => {
                  triggerPrint(selectedInvoice);
                }, 300);
              }}
              >
                <Download className="mr-2 h-5 w-5 text-purple-500" />
                Save as PDF (Print to PDF)
              </Button>
              <Button variant="outline" className="justify-start h-12 text-foreground" onClick={handleCopyText}>
                <Copy className="mr-2 h-5 w-5 text-muted-foreground" />
                Copy Payment Reminder Text
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invoice Print & Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="glass-panel border-white/20 sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="no-print">
              <DialogTitle>Tax Invoice Preview</DialogTitle>
              <DialogDescription>
                Preview and print tax invoice statement.
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* On-screen preview container (hidden during print) */}
                <div className="no-print">
                  {renderInvoiceContent(selectedInvoice)}
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 no-print">
                  <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => triggerPrint(selectedInvoice)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                  >
                    <Printer className="mr-2 h-4 w-4" /> Print Tax Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Hidden Print Container (Visible ONLY during print, placed in standard page flow) */}
      {selectedInvoice && (
        <div className="hidden print:block">
          {renderInvoiceContent(selectedInvoice)}
        </div>
      )}
    </div>
  )
}
