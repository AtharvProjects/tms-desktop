import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Calendar, MapPin, Edit, AlertTriangle } from 'lucide-react'
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
  const [vehicles, setVehicles] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  
  const [search, setSearch] = useState('')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
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
        where: { status: 'Active' },
        orderBy: { vehicleNumber: 'asc' }
      })
      if (vRes.data) setVehicles(vRes.data)

      const pRes = await window.electronAPI.prisma.query('party', 'findMany', {
        where: { status: 'Active' },
        orderBy: { companyName: 'asc' }
      })
      if (pRes.data) setParties(pRes.data)

      const dRes = await window.electronAPI.prisma.query('driver', 'findMany', {
        where: { status: 'Active' },
        orderBy: { driverName: 'asc' }
      })
      if (dRes.data) setDrivers(dRes.data)
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

  // Auto-generate next Trip Number
  const generateNextTripNo = () => {
    if (trips.length === 0) {
      setTripNo('TRP-1001')
      return
    }
    const numbers = trips
      .map(t => parseInt(t.tripNo.replace('TRP-', '')))
      .filter(num => !isNaN(num))
    
    if (numbers.length === 0) {
      setTripNo('TRP-1001')
      return
    }
    const maxNum = Math.max(...numbers)
    setTripNo(`TRP-${maxNum + 1}`)
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
          from,
          to,
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

      if (res.error) {
        setError(res.error)
      } else {
        // Update assigned driver status to On-Trip
        if (driverId) {
          await window.electronAPI.prisma.query('driver', 'update', {
            where: { id: driverId },
            data: { status: 'On-Trip' }
          })
        }
        // Update assigned vehicle status to On-Trip
        await window.electronAPI.prisma.query('vehicle', 'update', {
          where: { id: vehicleId },
          data: { status: 'On-Trip' }
        })

        setIsNewOpen(false)
        resetForm()
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await window.electronAPI.prisma.query('trip', 'update', {
        where: { id: selectedTrip.id },
        data: {
          podStatus,
          paymentStatus,
          notes: notes || null
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        // If trip is marked as settled/delivered, we release driver and vehicle back to Active
        if (podStatus === 'Received' && paymentStatus === 'Paid') {
          if (selectedTrip.driverId) {
            await window.electronAPI.prisma.query('driver', 'update', {
              where: { id: selectedTrip.driverId },
              data: { status: 'Active' }
            })
          }
          await window.electronAPI.prisma.query('vehicle', 'update', {
            where: { id: selectedTrip.vehicleId },
            data: { status: 'Active' }
          })
        }

        setIsEditOpen(false)
        setSelectedTrip(null)
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
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
  }

  const filteredTrips = trips.filter(trip => 
    trip.tripNo.toLowerCase().includes(search.toLowerCase()) ||
    trip.vehicle?.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
    trip.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
    trip.from.toLowerCase().includes(search.toLowerCase()) ||
    trip.to.toLowerCase().includes(search.toLowerCase())
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
          Trip Management
        </h1>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleOpenNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> New Trip
          </Button>
        </div>
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
                  <TableHead>Route (From - To)</TableHead>
                  <TableHead>POD Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right">Freight Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                      No trips found. Create a new trip to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrips.map((trip) => (
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
                          }>
                            {trip.podStatus}
                          </Badge>
                          {trip.podStatus === 'Pending' && (new Date().getTime() - new Date(trip.tripDate).getTime() > 5 * 24 * 60 * 60 * 1000) && (
                            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 animate-pulse text-[10px] py-0.5 px-1.5 flex items-center">
                              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          trip.paymentStatus === 'Paid' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          trip.paymentStatus === 'Partial' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          'border-orange-500/30 text-orange-500 bg-orange-500/10'
                        }>
                          {trip.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(trip.freightAmount)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(trip)}
                          className="hover:bg-white/10"
                        >
                          <Edit className="h-4 w-4 mr-1 text-muted-foreground" /> Edit Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Trip Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
            <DialogDescription>
              Create a new cargo consignment dispatch route sheet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTrip} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tripNo">Trip Number *</Label>
                <Input
                  id="tripNo"
                  value={tripNo}
                  onChange={(e) => setTripNo(e.target.value)}
                  className="bg-background/50 border-white/10 font-mono font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripDate">Trip Date *</Label>
                <Input
                  id="tripDate"
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle *</Label>
                <select
                  id="vehicleId"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partyId">Customer Party *</Label>
                <select
                  id="partyId"
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                  required
                >
                  <option value="">Select Customer</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverId">Assigned Driver</Label>
                <select
                  id="driverId"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.driverName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div className="space-y-2">
                <Label htmlFor="from">From Route Location *</Label>
                <Input
                  id="from"
                  placeholder="Dispatch City"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To Route Location *</Label>
                <Input
                  id="to"
                  placeholder="Delivery Destination"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material Cargo</Label>
                <Input
                  id="material"
                  placeholder="e.g. Iron Coils, Cement Bags"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizeWeight">Consignment weight (e.g. 24 Tons)</Label>
                <Input
                  id="sizeWeight"
                  placeholder="e.g. 25 Tons"
                  value={sizeWeight}
                  onChange={(e) => setSizeWeight(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <div className="space-y-2">
                <Label htmlFor="billingType">Billing Type</Label>
                <select
                  id="billingType"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="Fixed">Fixed Price</option>
                  <option value="Per Ton">Per Ton billing</option>
                  <option value="Per Trip">Per Trip billing</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freightAmount">Freight Amount (Total ₹) *</Label>
                <Input
                  id="freightAmount"
                  type="number"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value)}
                  className="bg-background/50 border-white/10 font-semibold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance">Advance Received (₹)</Label>
                <Input
                  id="advance"
                  type="number"
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverCash">Driver Cash Advance (₹)</Label>
                <Input
                  id="driverCash"
                  type="number"
                  value={driverCash}
                  onChange={(e) => setDriverCash(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dieselAmount">Diesel Card Amount (₹)</Label>
                <Input
                  id="dieselAmount"
                  type="number"
                  value={dieselAmount}
                  onChange={(e) => setDieselAmount(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toll">Estimated Toll Cash (₹)</Label>
                <Input
                  id="toll"
                  type="number"
                  value={toll}
                  onChange={(e) => setToll(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save & Dispatch Trip
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Update Trip Status</DialogTitle>
            <DialogDescription>
              Modify POD delivery status and payment logs for trip {selectedTrip?.tripNo}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="podStatus">POD Status</Label>
              <select
                id="podStatus"
                value={podStatus}
                onChange={(e) => setPodStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
              >
                <option value="Pending">Pending (On Road)</option>
                <option value="Received">Received (Delivered)</option>
                <option value="Submitted">Submitted (Billed)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial Paid</option>
                <option value="Paid">Fully Paid (Settled)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Settlement / Closure Notes</Label>
              <Input
                id="notes"
                placeholder="e.g. POD copy received signed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route:</span>
                  <span className="font-medium text-foreground">{selectedTrip?.from} → {selectedTrip?.to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Freight:</span>
                  <span className="font-bold text-foreground">{selectedTrip && formatCurrency(selectedTrip.freightAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Received:</span>
                  <span className="font-medium text-green-500">-{selectedTrip && formatCurrency(selectedTrip.advance)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5 font-bold text-primary">
                  <span>Balance Due:</span>
                  <span>{selectedTrip && formatCurrency(selectedTrip.freightAmount - selectedTrip.advance)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Update Status
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
