import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Phone, MapPin, DollarSign, Users, CheckCircle } from 'lucide-react'
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

export default function Drivers() {
  const location = useLocation()
  const [drivers, setDrivers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Settle Advance State
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [selectedSettleDriver, setSelectedSettleDriver] = useState<any>(null)
  const [settleAmount, setSettleAmount] = useState('0')
  const [settleNotes, setSettleNotes] = useState('')

  // Form State
  const [driverName, setDriverName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [salary, setSalary] = useState('0')
  const [advanceBalance, setAdvanceBalance] = useState('0')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('Active')
  const [error, setError] = useState('')

  async function loadDrivers() {
    try {
      const res = await window.electronAPI.prisma.query('driver', 'findMany', {
        orderBy: { driverName: 'asc' }
      })
      if (res.data) setDrivers(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadDrivers()
    if (location.state && (location.state as any).openNew) {
      setIsOpen(true)
    }
  }, [location.state])

  const handleOpenSettle = (driver: any) => {
    setSelectedSettleDriver(driver)
    setSettleAmount('0')
    setSettleNotes('')
    setIsSettleOpen(true)
  }

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(settleAmount)
    if (!selectedSettleDriver || isNaN(amt) || amt <= 0) {
      setError('Please enter a valid settle amount')
      return
    }

    try {
      const newBalance = Math.max(0, selectedSettleDriver.advanceBalance - amt)
      const res = await window.electronAPI.prisma.query('driver', 'update', {
        where: { id: selectedSettleDriver.id },
        data: { advanceBalance: newBalance }
      })

      if (res.error) {
        setError(res.error)
      } else {
        // Log this settlement as a operational expense
        await window.electronAPI.prisma.query('expense', 'create', {
          data: {
            category: 'Driver Salary / Bhatta',
            description: `Driver Advance Settlement: ${selectedSettleDriver.driverName}. Notes: ${settleNotes || 'None'}`,
            amount: amt,
            paidBy: 'Office',
            date: new Date()
          }
        })

        setIsSettleOpen(false)
        loadDrivers()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!driverName || !mobileNumber) {
      setError('Driver Name and Mobile Number are required')
      return
    }

    try {
      const res = await window.electronAPI.prisma.query('driver', 'create', {
        data: {
          driverName,
          mobileNumber,
          licenseNumber: licenseNumber || null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber || null,
          salary: parseFloat(salary) || 0,
          advanceBalance: parseFloat(advanceBalance) || 0,
          address: address || null,
          status
        }
      })

      if (res.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
        resetForm()
        loadDrivers()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const resetForm = () => {
    setDriverName('')
    setMobileNumber('')
    setLicenseNumber('')
    setAadhaarNumber('')
    setPanNumber('')
    setSalary('0')
    setAdvanceBalance('0')
    setAddress('')
    setStatus('Active')
    setError('')
  }

  const filteredDrivers = drivers.filter(d => 
    d.driverName.toLowerCase().includes(search.toLowerCase()) ||
    d.mobileNumber.includes(search) ||
    (d.licenseNumber && d.licenseNumber.toLowerCase().includes(search.toLowerCase()))
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
          Driver Directory
        </h1>
        <Button 
          onClick={() => { resetForm(); setIsOpen(true) }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Driver
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Trip Drivers</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">
              Active Duty
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => d.status === 'On-Trip').length}
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Advance Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(drivers.reduce((acc, d) => acc + (d.advanceBalance || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Drivers Roster</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, phone, license..."
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
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>License Details</TableHead>
                  <TableHead>Govt IDs (Aadhaar/PAN)</TableHead>
                  <TableHead>Salary (Monthly)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Advance Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      No drivers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{driver.driverName}</span>
                          <span className="text-xs text-muted-foreground font-normal flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            {driver.address || 'No Address Listed'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="flex items-center h-12">
                        <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {driver.mobileNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{driver.licenseNumber || '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col space-y-0.5">
                          {driver.aadhaarNumber && <span>AADHAAR: {driver.aadhaarNumber}</span>}
                          {driver.panNumber && <span>PAN: {driver.panNumber}</span>}
                          {!driver.aadhaarNumber && !driver.panNumber && <span>-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(driver.salary || 0)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          driver.status === 'On-Trip' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          driver.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          'border-red-500/30 text-red-500 bg-red-500/10'
                        }>
                          {driver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-bold text-orange-500">{formatCurrency(driver.advanceBalance || 0)}</span>
                          {(driver.advanceBalance || 0) > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenSettle(driver)}
                              className="h-8 w-8 p-0 text-primary hover:text-primary-foreground hover:bg-primary/20 rounded-full"
                              title="Settle Cash Advance"
                            >
                              <CheckCircle className="h-4 w-4" />
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
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Register a new driver profile in the system.
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
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Singh"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number *</Label>
                <Input
                  id="mobileNumber"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. 9988776655"
                  className="bg-background/50 border-white/10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">DL Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MH-12-2015-..."
                  className="bg-background/50 border-white/10 font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary (₹ / Month)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aadhaarNumber">Aadhaar Card</Label>
                <Input
                  id="aadhaarNumber"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  className="bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Card</Label>
                <Input
                  id="panNumber"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="bg-background/50 border-white/10 font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outstanding">Initial Driver Cash / Advance (₹)</Label>
              <Input
                id="outstanding"
                type="number"
                value={advanceBalance}
                onChange={(e) => setAdvanceBalance(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Ward No. 5, Jamshedpur"
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
                <option value="Active">Active (Available)</option>
                <option value="On-Trip">On-Trip (Busy)</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Driver
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settle Advance Dialog */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Settle Driver Cash Advance</DialogTitle>
            <DialogDescription>
              Subtract from {selectedSettleDriver?.driverName}'s outstanding advance balance (Current: {selectedSettleDriver && formatCurrency(selectedSettleDriver.advanceBalance)}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="settleAmount">Settle / Deduction Amount (₹) *</Label>
              <Input
                id="settleAmount"
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="bg-background/50 border-white/10 font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settleNotes">Settlement Notes</Label>
              <Input
                id="settleNotes"
                placeholder="e.g. Returned unused trip cash, salary deduct"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsSettleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Settle Balance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
