import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Phone, MapPin, DollarSign, Users, CheckCircle, Edit, Trash2, PlusCircle, RefreshCw, Calendar } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState('All')
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<any>(null)

  // Settle Advance State
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [selectedSettleDriver, setSelectedSettleDriver] = useState<any>(null)
  const [settleAmount, setSettleAmount] = useState('0')
  const [settleNotes, setSettleNotes] = useState('')

  // Give Advance State
  const [isGiveOpen, setIsGiveOpen] = useState(false)
  const [giveAmount, setGiveAmount] = useState('0')
  const [giveNotes, setGiveNotes] = useState('')

  // Form State
  const [driverName, setDriverName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseExpiry, setLicenseExpiry] = useState('')
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
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    loadDrivers()
    if (location.state && (location.state as any).openNew) { setIsOpen(true) }
  }, [location.state])

  const handleOpenSettle = (driver: any) => {
    setSelectedSettleDriver(driver)
    setSettleAmount('0')
    setSettleNotes('')
    setIsSettleOpen(true)
  }

  const handleOpenGive = (driver: any) => {
    setSelectedSettleDriver(driver)
    setGiveAmount('0')
    setGiveNotes('')
    setIsGiveOpen(true)
  }

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(settleAmount)
    if (!selectedSettleDriver || isNaN(amt) || amt <= 0) { setError('Please enter a valid settle amount'); return }
    try {
      const newBalance = Math.max(0, selectedSettleDriver.advanceBalance - amt)
      const res = await window.electronAPI.prisma.query('driver', 'update', {
        where: { id: selectedSettleDriver.id },
        data: { advanceBalance: newBalance }
      })
      if (res.error) { setError(res.error) } else {
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
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleGiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(giveAmount)
    if (!selectedSettleDriver || isNaN(amt) || amt <= 0) { setError('Please enter a valid advance amount'); return }
    try {
      const newBalance = (selectedSettleDriver.advanceBalance || 0) + amt
      const res = await window.electronAPI.prisma.query('driver', 'update', {
        where: { id: selectedSettleDriver.id },
        data: { advanceBalance: newBalance }
      })
      if (res.error) { setError(res.error) } else { setIsGiveOpen(false); loadDrivers() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!driverName || !mobileNumber) { setError('Driver Name and Mobile Number are required'); return }
    try {
      const res = await window.electronAPI.prisma.query('driver', 'create', {
        data: {
          driverName,
          mobileNumber,
          licenseNumber: licenseNumber || null,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber || null,
          salary: parseFloat(salary) || 0,
          advanceBalance: parseFloat(advanceBalance) || 0,
          address: address || null,
          status
        }
      })
      if (res.error) { setError(res.error) } else { setIsOpen(false); resetForm(); loadDrivers() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!driverName || !mobileNumber) { setError('Driver Name and Mobile Number are required'); return }
    try {
      const res = await window.electronAPI.prisma.query('driver', 'update', {
        where: { id: selectedDriver.id },
        data: {
          driverName,
          mobileNumber,
          licenseNumber: licenseNumber || null,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber || null,
          salary: parseFloat(salary) || 0,
          address: address || null,
          status
        }
      })
      if (res.error) { setError(res.error) } else { setIsEditOpen(false); resetForm(); loadDrivers() }
    } catch (err: any) { setError(err.message || 'An error occurred') }
  }

  const handleOpenEdit = (driver: any) => {
    setSelectedDriver(driver)
    setDriverName(driver.driverName)
    setMobileNumber(driver.mobileNumber)
    setLicenseNumber(driver.licenseNumber || '')
    setLicenseExpiry(driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '')
    setAadhaarNumber(driver.aadhaarNumber || '')
    setPanNumber(driver.panNumber || '')
    setSalary(String(driver.salary || 0))
    setAdvanceBalance(String(driver.advanceBalance || 0))
    setAddress(driver.address || '')
    setStatus(driver.status)
    setError('')
    setIsEditOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedDriver) return
    try {
      await window.electronAPI.prisma.query('driver', 'delete', { where: { id: selectedDriver.id } })
      setIsDeleteOpen(false)
      setSelectedDriver(null)
      loadDrivers()
    } catch (err: any) { setError(err.message || 'Delete failed') }
  }

  const resetForm = () => {
    setDriverName('')
    setMobileNumber('')
    setLicenseNumber('')
    setLicenseExpiry('')
    setAadhaarNumber('')
    setPanNumber('')
    setSalary('0')
    setAdvanceBalance('0')
    setAddress('')
    setStatus('Active')
    setError('')
    setSelectedDriver(null)
  }

  const filteredDrivers = drivers
    .filter(d => statusFilter === 'All' || d.status === statusFilter)
    .filter(d =>
      d.driverName.toLowerCase().includes(search.toLowerCase()) ||
      d.mobileNumber.includes(search) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(search.toLowerCase()))
    )

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

  const statusTabs = ['All', 'Active', 'On-Trip', 'Inactive']

  const renderDriverForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Driver Name *</Label><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Ramesh Singh" className="bg-background/50 border-white/10" required /></div>
        <div className="space-y-2"><Label>Mobile Number *</Label><Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="e.g. 9988776655" className="bg-background/50 border-white/10" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>DL Number</Label><Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. MH-12-2015-..." className="bg-background/50 border-white/10 font-mono uppercase" /></div>
        <div className="space-y-2"><Label>License Expiry Date</Label><Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Salary (₹ / Month)</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="bg-background/50 border-white/10" /></div>
        {!isEdit && <div className="space-y-2"><Label>Initial Advance (₹)</Label><Input type="number" value={advanceBalance} onChange={(e) => setAdvanceBalance(e.target.value)} className="bg-background/50 border-white/10" /></div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Aadhaar Card</Label><Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="1234 5678 9012" className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>PAN Card</Label><Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" className="bg-background/50 border-white/10 font-mono uppercase" /></div>
      </div>
      <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Ward No. 5, Jamshedpur" className="bg-background/50 border-white/10" /></div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
          <option value="Active">Active (Available)</option>
          <option value="On-Trip">On-Trip (Busy)</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setIsEditOpen(false); resetForm() }}>Cancel</Button>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">{isEdit ? 'Update Driver' : 'Save Driver'}</Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Driver Directory</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={loadDrivers} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{drivers.filter(d => d.status === 'Active').length} available</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Trip Drivers</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">Active Duty</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.filter(d => d.status === 'On-Trip').length}</div>
            <p className="text-xs text-muted-foreground mt-1">{drivers.filter(d => d.status === 'Inactive').length} inactive</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Advance Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(drivers.reduce((acc, d) => acc + (d.advanceBalance || 0), 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">across {drivers.filter(d => d.advanceBalance > 0).length} drivers</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2">
        {statusTabs.map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === tab ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}>
            {tab} {tab !== 'All' && <span className="ml-1 text-xs opacity-70">({drivers.filter(d => d.status === tab).length})</span>}
          </button>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Drivers Roster</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search by name, phone, license..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>License / Expiry</TableHead>
                  <TableHead>Govt IDs</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Advance Balance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">No drivers found.</TableCell></TableRow>
                ) : (
                  filteredDrivers.map((driver) => {
                    const licExpDays = driver.licenseExpiry ? Math.ceil((new Date(driver.licenseExpiry).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : null
                    return (
                      <TableRow key={driver.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span>{driver.driverName}</span>
                            <span className="text-xs text-muted-foreground font-normal flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{driver.address || 'No Address Listed'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a href={`tel:${driver.mobileNumber}`} className="flex items-center text-primary hover:text-primary/80 transition-colors" title="Click to call">
                            <Phone className="h-3.5 w-3.5 mr-1" />{driver.mobileNumber}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col">
                            <span>{driver.licenseNumber || '-'}</span>
                            {licExpDays !== null && (
                              <span className={`text-[10px] mt-0.5 ${licExpDays < 0 ? 'text-red-400 font-bold' : licExpDays <= 30 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
                                {licExpDays < 0 ? `Expired ${Math.abs(licExpDays)}d ago` : `Exp in ${licExpDays}d`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col space-y-0.5">
                            {driver.aadhaarNumber && <span>AADHAAR: {driver.aadhaarNumber}</span>}
                            {driver.panNumber && <span>PAN: {driver.panNumber}</span>}
                            {!driver.aadhaarNumber && !driver.panNumber && <span>-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(driver.salary || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={driver.status === 'On-Trip' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : driver.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'}>
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${(driver.advanceBalance || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{formatCurrency(driver.advanceBalance || 0)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-1">
                            {(driver.advanceBalance || 0) > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenSettle(driver)} className="h-8 w-8 p-0 hover:bg-green-500/20 hover:text-green-400" title="Settle Advance"><CheckCircle className="h-3.5 w-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleOpenGive(driver)} className="h-8 w-8 p-0 hover:bg-orange-500/20 hover:text-orange-400" title="Give Advance"><PlusCircle className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(driver)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title="Edit Driver"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDriver(driver); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title="Delete Driver"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Driver Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Driver</DialogTitle><DialogDescription>Register a new driver profile in the system.</DialogDescription></DialogHeader>
          {renderDriverForm(false, handleSubmit)}
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm() }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Driver — {selectedDriver?.driverName}</DialogTitle><DialogDescription>Update driver details and compliance information.</DialogDescription></DialogHeader>
          {renderDriverForm(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>

      {/* Settle Advance Dialog */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Settle Driver Cash Advance</DialogTitle>
            <DialogDescription>Subtract from {selectedSettleDriver?.driverName}'s outstanding advance balance (Current: {selectedSettleDriver && formatCurrency(selectedSettleDriver.advanceBalance)}).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleSubmit} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            <div className="space-y-2"><Label>Settle / Deduction Amount (₹) *</Label><Input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-background/50 border-white/10 font-bold" required /></div>
            <div className="space-y-2"><Label>Settlement Notes</Label><Input placeholder="e.g. Returned unused trip cash" value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} className="bg-background/50 border-white/10" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsSettleOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Settle Balance</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Give Advance Dialog */}
      <Dialog open={isGiveOpen} onOpenChange={setIsGiveOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Give Cash Advance</DialogTitle>
            <DialogDescription>Add to {selectedSettleDriver?.driverName}'s advance balance (Current: {selectedSettleDriver && formatCurrency(selectedSettleDriver.advanceBalance || 0)}).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGiveSubmit} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            <div className="space-y-2"><Label>Advance Amount (₹) *</Label><Input type="number" value={giveAmount} onChange={(e) => setGiveAmount(e.target.value)} className="bg-background/50 border-white/10 font-bold" required /></div>
            <div className="space-y-2"><Label>Notes</Label><Input placeholder="e.g. Pre-trip advance for Pune run" value={giveNotes} onChange={(e) => setGiveNotes(e.target.value)} className="bg-background/50 border-white/10" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsGiveOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white"><PlusCircle className="h-4 w-4 mr-2" />Give Advance</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Driver?</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete <strong>{selectedDriver?.driverName}</strong>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete Driver</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
