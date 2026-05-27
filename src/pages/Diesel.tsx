import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Fuel, Calendar, DollarSign, Gauge } from 'lucide-react'
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

export default function Diesel() {
  const location = useLocation()
  const [logs, setLogs] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Form State
  const [vehicleId, setVehicleId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [fuelStation, setFuelStation] = useState('')
  const [litres, setLitres] = useState('')
  const [ratePerLitre, setRatePerLitre] = useState('')
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const logsRes = await window.electronAPI.prisma.query('dieselLog', 'findMany', {
        include: { vehicle: true },
        orderBy: { date: 'desc' }
      })
      if (logsRes.data) setLogs(logsRes.data)

      const vRes = await window.electronAPI.prisma.query('vehicle', 'findMany', {
        orderBy: { vehicleNumber: 'asc' }
      })
      if (vRes.data) setVehicles(vRes.data)
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

  const getMileage = (log: any, index: number) => {
    if (!log.odometer) return null
    const prevLog = logs.slice(index + 1).find(l => l.vehicleId === log.vehicleId && l.odometer)
    if (!prevLog || !prevLog.odometer || prevLog.odometer >= log.odometer) return null
    const dist = log.odometer - prevLog.odometer
    const mileage = dist / log.litres
    return mileage.toFixed(2)
  }

  // Auto-calculated total cost
  const calculatedTotalCost = (parseFloat(litres) || 0) * (parseFloat(ratePerLitre) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!vehicleId || !litres || !ratePerLitre) {
      setError('Vehicle, Litres, and Rate per Litre are required')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('dieselLog', 'create', {
        data: {
          vehicleId,
          date: new Date(date),
          fuelStation: fuelStation || null,
          litres: parseFloat(litres),
          ratePerLitre: parseFloat(ratePerLitre),
          totalCost: calculatedTotalCost,
          odometer: odometer ? parseInt(odometer) : null
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
    setVehicleId('')
    setDate(new Date().toISOString().split('T')[0])
    setFuelStation('')
    setLitres('')
    setRatePerLitre('')
    setOdometer('')
    setError('')
  }

  const filteredLogs = logs.filter(log => 
    log.vehicle?.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
    (log.fuelStation && log.fuelStation.toLowerCase().includes(search.toLowerCase()))
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  const totalSpend = logs.reduce((acc, log) => acc + (log.totalCost || 0), 0)
  const totalLitresFilled = logs.reduce((acc, log) => acc + (log.litres || 0), 0)
  const averageRate = logs.length > 0 ? (logs.reduce((acc, log) => acc + (log.ratePerLitre || 0), 0) / logs.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          Fuel & Diesel Logging
        </h1>
        <Button 
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Fuel Log
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fuel Expense</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Litres Filled</CardTitle>
            <Fuel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLitresFilled.toLocaleString('en-IN')} L
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Price / Litre</CardTitle>
            <Badge className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/20 border-orange-500/30">
              Fuel Average
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(averageRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Diesel Refueling Logs</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by truck number or station..."
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
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fuel Station</TableHead>
                  <TableHead className="text-right">Volume (Litres)</TableHead>
                  <TableHead className="text-right">Rate / Litre</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Odometer Reading</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      No fuel logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold font-mono text-foreground">
                        {log.vehicle?.vehicleNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>{log.fuelStation || 'N/A Station'}</TableCell>
                      <TableCell className="text-right font-medium">{log.litres.toLocaleString('en-IN')} L</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(log.ratePerLitre)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(log.totalCost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.odometer ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center justify-end font-semibold">
                              <Gauge className="h-3 w-3 mr-1 text-muted-foreground" />
                              {log.odometer.toLocaleString('en-IN')} km
                            </span>
                            {(() => {
                              const mileage = getMileage(log, index);
                              return mileage ? (
                                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1.5 py-0.5 rounded mt-0.5">
                                  {mileage} km/L
                                </span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          '-'
                        )}
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
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Log Fuel Entry</DialogTitle>
            <DialogDescription>
              Record diesel filling details for fuel tracking and trip reconciliation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle / Truck *</Label>
              <select
                id="vehicleId"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                required
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Refuel Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input
                  id="odometer"
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="Current km reading"
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelStation">Fuel Station / Vendor Name</Label>
              <Input
                id="fuelStation"
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                placeholder="e.g. HP Petrol Pump, Reliance NH4"
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="litres">Fuel Litres Filled *</Label>
                <Input
                  id="litres"
                  type="number"
                  step="0.01"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  placeholder="e.g. 150"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Price per Litre *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={ratePerLitre}
                  onChange={(e) => setRatePerLitre(e.target.value)}
                  placeholder="e.g. 91.50"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Estimated Total Cost:</span>
                <span className="text-lg font-bold text-primary font-mono">{formatCurrency(calculatedTotalCost)}</span>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Log Diesel Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
