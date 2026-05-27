import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Car, Calendar, Truck, User, ShieldAlert } from 'lucide-react'
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

export default function Vehicles() {
  const location = useLocation()
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Form State
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [capacity, setCapacity] = useState('')
  const [insuranceExpiry, setInsuranceExpiry] = useState('')
  const [fitnessExpiry, setFitnessExpiry] = useState('')
  const [permitExpiry, setPermitExpiry] = useState('')
  const [pollutionExpiry, setPollutionExpiry] = useState('')
  const [driverId, setDriverId] = useState('')
  const [status, setStatus] = useState('Active')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const vRes = await window.electronAPI.prisma.query('vehicle', 'findMany', {
        include: { driver: true },
        orderBy: { vehicleNumber: 'asc' }
      })
      if (vRes.data) setVehicles(vRes.data)

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
      setIsOpen(true)
    }
  }, [location.state])

  const getExpiryStatus = (dateStr: string | Date | null) => {
    if (!dateStr) return { label: 'N/A', class: 'text-muted-foreground' }
    const exp = new Date(dateStr)
    const today = new Date()
    today.setHours(0,0,0,0)
    const diff = exp.getTime() - today.getTime()
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
    
    if (days < 0) {
      return { label: 'Expired', class: 'text-red-500 font-extrabold animate-pulse' }
    } else if (days <= 15) {
      return { label: 'Critical', class: 'text-orange-600 font-bold' }
    } else if (days <= 30) {
      return { label: 'Warning', class: 'text-orange-500 font-semibold' }
    }
    return { label: 'Valid', class: 'text-green-500 font-semibold' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!vehicleNumber || !vehicleType) {
      setError('Vehicle Number and Vehicle Type are required')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('vehicle', 'create', {
        data: {
          vehicleNumber,
          vehicleType,
          capacity: capacity || null,
          insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
          fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
          permitExpiry: permitExpiry ? new Date(permitExpiry) : null,
          pollutionExpiry: pollutionExpiry ? new Date(pollutionExpiry) : null,
          driverId: driverId || null,
          status,
          notes: notes || null
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
        resetForm()
        loadData()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setVehicleNumber('')
    setVehicleType('')
    setCapacity('')
    setInsuranceExpiry('')
    setFitnessExpiry('')
    setPermitExpiry('')
    setPollutionExpiry('')
    setDriverId('')
    setStatus('Active')
    setNotes('')
    setError('')
  }

  const filteredVehicles = vehicles.filter(v => 
    v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleType.toLowerCase().includes(search.toLowerCase()) ||
    (v.driver && v.driver.driverName.toLowerCase().includes(search.toLowerCase()))
  )

  const isExpiredSoon = (dateStr: string | Date | null) => {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const diff = exp.getTime() - new Date().getTime()
    return diff < 30 * 24 * 60 * 60 * 1000 // 30 days
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Fleet Registry
        </h1>
        <Button 
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fleet Size</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Vehicles</CardTitle>
            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 border-green-500/30">
              On-Road
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.filter(v => v.status === 'Active' || v.status === 'On-Trip').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-400">Compliance Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {vehicles.filter(v => 
                isExpiredSoon(v.insuranceExpiry) || 
                isExpiredSoon(v.fitnessExpiry) || 
                isExpiredSoon(v.pollutionExpiry) ||
                isExpiredSoon(v.permitExpiry)
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Vehicles Status</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by registration number, type..."
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
                  <TableHead>Vehicle Registration</TableHead>
                  <TableHead>Type & Capacity</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Compliance Expiry Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                      No vehicles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-primary" />
                          <span className="font-mono">{vehicle.vehicleNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{vehicle.vehicleType}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{vehicle.capacity || 'N/A Capacity'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.driver ? (
                          <div className="flex items-center space-x-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{vehicle.driver.driverName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {(() => {
                            const ins = getExpiryStatus(vehicle.insuranceExpiry);
                            const fit = getExpiryStatus(vehicle.fitnessExpiry);
                            const permit = getExpiryStatus(vehicle.permitExpiry);
                            const puc = getExpiryStatus(vehicle.pollutionExpiry);
                            return (
                              <>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  Ins: <span className={`${ins.class} ml-1`} title={ins.label}>
                                    {vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString() : 'N/A'}
                                  </span>
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  Fit: <span className={`${fit.class} ml-1`} title={fit.label}>
                                    {vehicle.fitnessExpiry ? new Date(vehicle.fitnessExpiry).toLocaleDateString() : 'N/A'}
                                  </span>
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  Permit: <span className={`${permit.class} ml-1`} title={permit.label}>
                                    {vehicle.permitExpiry ? new Date(vehicle.permitExpiry).toLocaleDateString() : 'N/A'}
                                  </span>
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  PUC: <span className={`${puc.class} ml-1`} title={puc.label}>
                                    {vehicle.pollutionExpiry ? new Date(vehicle.pollutionExpiry).toLocaleDateString() : 'N/A'}
                                  </span>
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          vehicle.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          vehicle.status === 'On-Trip' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          'border-red-500/30 text-red-500 bg-red-500/10'
                        }>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                        {vehicle.notes || '-'}
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
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Register a new truck or container to the fleet registry.
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
                <Label htmlFor="vehicleNumber">Registration Number *</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH 12 AB 1234"
                  className="bg-background/50 border-white/10 font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Input
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="e.g. Trailer 40ft, 10 Wheeler"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (e.g. 30 Tons)</Label>
                <Input
                  id="capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 25 Tons"
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverId">Default Driver</Label>
                <select
                  id="driverId"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="">Unassigned</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.driverName} ({d.mobileNumber})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fitnessExpiry">Fitness Expiry</Label>
                <Input
                  id="fitnessExpiry"
                  type="date"
                  value={fitnessExpiry}
                  onChange={(e) => setFitnessExpiry(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permitExpiry">National Permit Expiry</Label>
                <Input
                  id="permitExpiry"
                  type="date"
                  value={permitExpiry}
                  onChange={(e) => setPermitExpiry(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pollutionExpiry">Pollution (PUC) Expiry</Label>
                <Input
                  id="pollutionExpiry"
                  type="date"
                  value={pollutionExpiry}
                  onChange={(e) => setPollutionExpiry(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Engine work completed in May"
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Vehicle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
