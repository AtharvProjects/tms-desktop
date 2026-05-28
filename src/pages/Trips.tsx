import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Calendar, MapPin, Edit, AlertTriangle, Trash2, Download, RefreshCw, TrendingUp, Filter } from 'lucide-react'
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

export default function Trips() {
  const location = useLocation()
  const [trips, setTrips] = useState<any[]>([])
  const [allVehicles, setAllVehicles] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [allDrivers, setAllDrivers] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)

  // Form State for Create/Edit
  const [tripNo, setTripNo] = useState('')
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleId, setVehicleId] = useState('')
  const [partyId, setPartyId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [material, setMaterial] = useState('')
  const [sizeWeight, setSizeWeight] = useState('')
  const [billingType, setBillingType] = useState('Fixed')
  const [freightAmount, setFreightAmount] = useState('0')
  const [dieselAmount, setDieselAmount] = useState('0')
  const [driverCash, setDriverCash] = useState('0')
  const [toll, setToll] = useState('0')
  const [advance, setAdvance] = useState('0')
  const [extraCharges, setExtraCharges] = useState('0')
  const [podStatus, setPodStatus] = useState('Pending')
  const [paymentStatus, setPaymentStatus] = useState('Pending')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const tripsRes = await window.electronAPI.prisma.query('trip', 'findMany', {
        include: {
          vehicle: true,
          party: true,
          driver: true,
        },
        orderBy: { createdAt: 'desc' }
      })
      if (tripsRes.data) setTrips(tripsRes.data)

      const vRes = await window.electronAPI.prisma.query('vehicle', 'findMany', {
        orderBy: { vehicleNumber: 'asc' }
      })
      if (vRes.data) {
        setAllVehicles(vRes.data)
        setVehicles(vRes.data.filter((v: any) => v.status === 'Active'))
      }

      const pRes = await window.electronAPI.prisma.query('party', 'findMany', {
        where: { status: 'Active' },
        orderBy: { companyName: 'asc' }
      })
      if (pRes.data) setParties(pRes.data)

      const dRes = await window.electronAPI.prisma.query('driver', 'findMany', {
        orderBy: { driverName: 'asc' }
      })
      if (dRes.data) {
        setAllDrivers(dRes.data)
        setDrivers(dRes.data.filter((d: any) => d.status === 'Active'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    if (location.state && (location.state as any).openNew) {
      handleOpenNew()
    }
  }, [location.state])

  const generateNextTripNo = () => {
    if (trips.length === 0) { setTripNo('TRP-1001'); return }
    const numbers = trips.map(t => parseInt(t.tripNo.replace('TRP-', ''))).filter(num => !isNaN(num))
    if (numbers.length === 0) { setTripNo('TRP-1001'); return }
    setTripNo(`TRP-${Math.max(...numbers) + 1}`)
  }

  const handleOpenNew = () => {
    resetForm()
    generateNextTripNo()
    setIsNewOpen(true)
  }

  const handleOpenEdit = (trip: any) => {
    setSelectedTrip(trip)
    setTripNo(trip.tripNo)
    setTripDate(new Date(trip.tripDate).toISOString().split('T')[0])
    setVehicleId(trip.vehicleId)
    setPartyId(trip.partyId)
    setDriverId(trip.driverId || '')
    setFrom(trip.from)
    setTo(trip.to)
    setMaterial(trip.material || '')
    setSizeWeight(trip.sizeWeight || '')
    setBillingType(trip.billingType)
    setFreightAmount(trip.freightAmount.toString())
    setDieselAmount(trip.dieselAmount.toString())
    setDriverCash(trip.driverCash.toString())
    setToll(trip.toll.toString())
    setAdvance(trip.advance.toString())
    setExtraCharges(trip.extraCharges.toString())
    setPodStatus(trip.podStatus)
    setPaymentStatus(trip.paymentStatus)
    setNotes(trip.notes || '')
    setIsEditOpen(true)
  }

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!vehicleId || !partyId || !from || !to) {
      setError('Vehicle, Party, Route From and Route To are required')
      return
    }
    try {
      const res = await window.electronAPI.prisma.query('trip', 'create', {
        data: {
          tripNo,
          tripDate: new Date(tripDate),
          vehicleId,
          partyId,
          driverId: driverId || null,
          from, to,
          material: material || null,
          sizeWeight: sizeWeight || null,
          billingType,
          freightAmount: parseFloat(freightAmount) || 0,
          dieselAmount: parseFloat(dieselAmount) || 0,
          driverCash: parseFloat(driverCash) || 0,
          toll: parseFloat(toll) || 0,
          advance: parseFloat(advance) || 0,
          extraCharges: parseFloat(extraCharges) || 0,
          podStatus,
          paymentStatus
        }
      })
      if (res.error) { setError(res.error) } else {
        if (driverId) {
          await window.electronAPI.prisma.query('driver', 'update', { where: { id: driverId }, data: { status: 'On-Trip' } })
        }
        await window.electronAPI.prisma.query('vehicle', 'update', { where: { id: vehicleId }, data: { status: 'On-Trip' } })
        setIsNewOpen(false)
        resetForm()
        loadData()
      }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await window.electronAPI.prisma.query('trip', 'update', {
        where: { id: selectedTrip.id },
        data: {
          tripDate: new Date(tripDate),
          vehicleId,
          partyId,
          driverId: driverId || null,
          from, to,
          material: material || null,
          sizeWeight: sizeWeight || null,
          billingType,
          freightAmount: parseFloat(freightAmount) || 0,
          dieselAmount: parseFloat(dieselAmount) || 0,
          driverCash: parseFloat(driverCash) || 0,
          toll: parseFloat(toll) || 0,
          advance: parseFloat(advance) || 0,
          extraCharges: parseFloat(extraCharges) || 0,
          podStatus,
          paymentStatus,
          notes: notes || null
        }
      })
      if (res.error) { setError(res.error) } else {
        // Release vehicle/driver if now completed
        if (podStatus === 'Received' && paymentStatus === 'Paid') {
          if (selectedTrip.driverId) {
            await window.electronAPI.prisma.query('driver', 'update', { where: { id: selectedTrip.driverId }, data: { status: 'Active' } })
          }
          await window.electronAPI.prisma.query('vehicle', 'update', { where: { id: selectedTrip.vehicleId }, data: { status: 'Active' } })
        }
        setIsEditOpen(false)
        setSelectedTrip(null)
        loadData()
      }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleDelete = async () => {
    if (!selectedTrip) return
    try {
      await window.electronAPI.prisma.query('trip', 'delete', { where: { id: selectedTrip.id } })
      // Reset vehicle/driver status
      if (selectedTrip.driverId) {
        await window.electronAPI.prisma.query('driver', 'update', { where: { id: selectedTrip.driverId }, data: { status: 'Active' } })
      }
      await window.electronAPI.prisma.query('vehicle', 'update', { where: { id: selectedTrip.vehicleId }, data: { status: 'Active' } })
      setIsDeleteOpen(false)
      setSelectedTrip(null)
      loadData()
    } catch (err: any) { setError(err.message || 'Delete failed') }
  }

  const resetForm = () => {
    setTripNo('')
    setTripDate(new Date().toISOString().split('T')[0])
    setVehicleId('')
    setPartyId('')
    setDriverId('')
    setFrom('')
    setTo('')
    setMaterial('')
    setSizeWeight('')
    setBillingType('Fixed')
    setFreightAmount('0')
    setDieselAmount('0')
    setDriverCash('0')
    setToll('0')
    setAdvance('0')
    setExtraCharges('0')
    setPodStatus('Pending')
    setPaymentStatus('Pending')
    setNotes('')
    setError('')
    setSelectedTrip(null)
  }

  const calcNetProfit = (trip: any) => {
    return trip.freightAmount - (trip.dieselAmount || 0) - (trip.driverCash || 0) - (trip.toll || 0) - (trip.extraCharges || 0)
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

  const exportToCSV = () => {
    const headers = ['Trip No', 'Date', 'Vehicle', 'Driver', 'Party', 'From', 'To', 'Material', 'Billing Type', 'Freight', 'Diesel', 'Driver Cash', 'Toll', 'Advance', 'Extra Charges', 'Net Profit', 'POD Status', 'Payment Status', 'Notes']
    const rows = filteredTrips.map(t => [
      t.tripNo,
      new Date(t.tripDate).toLocaleDateString(),
      t.vehicle?.vehicleNumber || '',
      t.driver?.driverName || '',
      t.party?.companyName || '',
      t.from,
      t.to,
      t.material || '',
      t.billingType,
      t.freightAmount,
      t.dieselAmount,
      t.driverCash,
      t.toll,
      t.advance,
      t.extraCharges,
      calcNetProfit(t),
      t.podStatus,
      t.paymentStatus,
      t.notes || ''
    ])
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trips_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusFilters = [
    { label: 'All', value: 'All' },
    { label: 'Pending POD', value: 'pending_pod' },
    { label: 'Pending Payment', value: 'pending_payment' },
    { label: 'Completed', value: 'completed' },
    { label: 'Overdue', value: 'overdue' },
  ]

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.tripNo.toLowerCase().includes(search.toLowerCase()) ||
      trip.vehicle?.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      trip.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      trip.from.toLowerCase().includes(search.toLowerCase()) ||
      trip.to.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'All') return true
    if (statusFilter === 'pending_pod') return trip.podStatus === 'Pending'
    if (statusFilter === 'pending_payment') return trip.paymentStatus === 'Pending' || trip.paymentStatus === 'Partial'
    if (statusFilter === 'completed') return trip.podStatus === 'Received' && trip.paymentStatus === 'Paid'
    if (statusFilter === 'overdue') {
      return trip.podStatus === 'Pending' && (new Date().getTime() - new Date(trip.tripDate).getTime() > 5 * 24 * 60 * 60 * 1000)
    }
    return true
  })

  const totalFreight = filteredTrips.reduce((acc, t) => acc + (t.freightAmount || 0), 0)
  const totalOutstanding = filteredTrips.filter(t => t.paymentStatus !== 'Paid').reduce((acc, t) => acc + (t.freightAmount - t.advance), 0)
  const totalNetProfit = filteredTrips.reduce((acc, t) => acc + calcNetProfit(t), 0)

  const tripFormContent = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Trip Number *</Label>
          <Input value={tripNo} onChange={(e) => setTripNo(e.target.value)} className="bg-background/50 border-white/10 font-mono font-bold" readOnly={isEdit} required />
        </div>
        <div className="space-y-2">
          <Label>Trip Date *</Label>
          <Input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="bg-background/50 border-white/10" required />
        </div>
        <div className="space-y-2">
          <Label>Vehicle *</Label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" required>
            <option value="">Select Vehicle</option>
            {(isEdit ? allVehicles : vehicles).map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} {isEdit && v.status !== 'Active' ? `(${v.status})` : ''}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer Party *</Label>
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" required>
            <option value="">Select Customer</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Assigned Driver</Label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">Select Driver</option>
            {(isEdit ? allDrivers : drivers).map(d => <option key={d.id} value={d.id}>{d.driverName}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2"><Label>From Route Location *</Label><Input placeholder="Dispatch City" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-background/50 border-white/10" required /></div>
        <div className="space-y-2"><Label>To Route Location *</Label><Input placeholder="Delivery Destination" value={to} onChange={(e) => setTo(e.target.value)} className="bg-background/50 border-white/10" required /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Material Cargo</Label><Input placeholder="e.g. Iron Coils, Cement Bags" value={material} onChange={(e) => setMaterial(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Consignment Weight</Label><Input placeholder="e.g. 25 Tons" value={sizeWeight} onChange={(e) => setSizeWeight(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>Billing Type</Label>
          <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Fixed">Fixed Price</option>
            <option value="Per Ton">Per Ton</option>
            <option value="Per Trip">Per Trip</option>
          </select>
        </div>
        <div className="space-y-2"><Label>Freight Amount (₹) *</Label><Input type="number" value={freightAmount} onChange={(e) => setFreightAmount(e.target.value)} className="bg-background/50 border-white/10 font-semibold" required /></div>
        <div className="space-y-2"><Label>Advance Received (₹)</Label><Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Driver Cash Advance (₹)</Label><Input type="number" value={driverCash} onChange={(e) => setDriverCash(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Diesel Amount (₹)</Label><Input type="number" value={dieselAmount} onChange={(e) => setDieselAmount(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Toll Cash (₹)</Label><Input type="number" value={toll} onChange={(e) => setToll(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Extra Charges (₹)</Label><Input type="number" value={extraCharges} onChange={(e) => setExtraCharges(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Net Profit (Est.)</span>
            <span className={`text-base font-bold ${(parseFloat(freightAmount) - parseFloat(dieselAmount) - parseFloat(driverCash) - parseFloat(toll) - parseFloat(extraCharges)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(parseFloat(freightAmount) - parseFloat(dieselAmount) - parseFloat(driverCash) - parseFloat(toll) - parseFloat(extraCharges))}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>POD Status</Label>
          <select value={podStatus} onChange={(e) => setPodStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Pending">Pending (On Road)</option>
            <option value="Received">Received (Delivered)</option>
            <option value="Submitted">Submitted (Billed)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Payment Status</Label>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Pending">Pending</option>
            <option value="Partial">Partial Paid</option>
            <option value="Paid">Fully Paid (Settled)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Settlement / Notes</Label>
        <Input placeholder="e.g. POD copy received signed" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background/50 border-white/10" />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
        <Button type="button" variant="ghost" onClick={() => { setIsNewOpen(false); setIsEditOpen(false); resetForm() }}>Cancel</Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isEdit ? 'Update Trip' : 'Save & Dispatch Trip'}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Trip Management
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={loadData} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="border-white/10 hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Trip
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Freight</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFreight)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredTrips.length} trips shown</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit (Est.)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(totalNetProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">after diesel, toll & advances</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">pending payment from parties</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {statusFilters.map(({ label, value }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">All Trips</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by trip no, vehicle, party..."
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
                  <TableHead>Trip No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle & Driver</TableHead>
                  <TableHead>Party / Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>POD</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Freight</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-32 text-muted-foreground">
                      No trips found. Create a new trip to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrips.map((trip) => {
                    const netProfit = calcNetProfit(trip)
                    return (
                      <TableRow key={trip.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-semibold text-foreground font-mono">{trip.tripNo}</TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {new Date(trip.tripDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-mono">{trip.vehicle?.vehicleNumber}</span>
                            <span className="text-xs text-muted-foreground">{trip.driver?.driverName || 'No Driver'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{trip.party?.companyName}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            <span>{trip.from}</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span>{trip.to}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1 items-start">
                            <Badge variant="outline" className={
                              trip.podStatus === 'Received' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                              trip.podStatus === 'Submitted' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                              'border-orange-500/30 text-orange-500 bg-orange-500/10'
                            }>{trip.podStatus}</Badge>
                            {trip.podStatus === 'Pending' && (new Date().getTime() - new Date(trip.tripDate).getTime() > 5 * 24 * 60 * 60 * 1000) && (
                              <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 animate-pulse text-[10px] py-0.5 px-1.5 flex items-center">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            trip.paymentStatus === 'Paid' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                            trip.paymentStatus === 'Partial' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                            'border-orange-500/30 text-orange-500 bg-orange-500/10'
                          }>{trip.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(trip.freightAmount)}</TableCell>
                        <TableCell className={`text-right font-bold text-sm ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(netProfit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(trip)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title="Edit Trip">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTrip(trip); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title="Delete Trip">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredTrips.length > 0 && (
            <div className="flex justify-between items-center mt-3 px-2 py-2 bg-primary/5 rounded-lg border border-primary/10">
              <span className="text-sm text-muted-foreground">Summary ({filteredTrips.length} trips)</span>
              <div className="flex items-center space-x-6 text-sm font-bold">
                <span>Freight: <span className="text-primary">{formatCurrency(totalFreight)}</span></span>
                <span>Net Profit: <span className={totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(totalNetProfit)}</span></span>
                <span>Outstanding: <span className="text-orange-500">{formatCurrency(totalOutstanding)}</span></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Trip Dialog */}
      <Dialog open={isNewOpen} onOpenChange={(o) => { setIsNewOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
            <DialogDescription>Create a new cargo consignment dispatch route sheet.</DialogDescription>
          </DialogHeader>
          {tripFormContent(false, handleCreateTrip)}
        </DialogContent>
      </Dialog>

      {/* Full Edit Trip Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip — {selectedTrip?.tripNo}</DialogTitle>
            <DialogDescription>Update all trip details including route, amounts, and status.</DialogDescription>
          </DialogHeader>
          {tripFormContent(true, handleUpdateTrip)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Trip?</DialogTitle>
            <DialogDescription>
              Permanently delete trip <strong>{selectedTrip?.tripNo}</strong> ({selectedTrip?.from} → {selectedTrip?.to})?
              Vehicle and driver will be set back to Active. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />Delete Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
