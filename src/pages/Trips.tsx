import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Calendar, MapPin, Edit, AlertTriangle, Trash2, Download, RefreshCw, TrendingUp, Filter, Printer } from 'lucide-react'
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
import { TripReportView } from '../components/TripReportView'
import { processCSVImport, CSV_HEADERS } from '@/lib/csvImport'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Send } from 'lucide-react'
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
  const [dateFilter, setDateFilter] = useState('All')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
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
  const [liquidDiesel, setLiquidDiesel] = useState('0')
  const [driverCash, setDriverCash] = useState('0')
  const [toll, setToll] = useState('0') // Fastag/Toll
  const [partyAdvance, setPartyAdvance] = useState('0')
  const [driverAdvance, setDriverAdvance] = useState('0')
  const [commission, setCommission] = useState('0')
  const [maintenance, setMaintenance] = useState('0')
  const [extraRunning, setExtraRunning] = useState('0')
  const [detentionTime, setDetentionTime] = useState('')
  const [loadingDate, setLoadingDate] = useState('')
  const [unloadingDate, setUnloadingDate] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [extraCharges, setExtraCharges] = useState('0')
  const [status, setStatus] = useState('Scheduled')
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
    setDieselAmount(trip.dieselAmount?.toString() || '0')
    setLiquidDiesel(trip.liquidDiesel?.toString() || '0')
    setDriverCash(trip.driverCash?.toString() || '0')
    setToll(trip.toll?.toString() || '0')
    setPartyAdvance(trip.partyAdvance?.toString() || '0')
    setDriverAdvance(trip.driverAdvance?.toString() || '0')
    setCommission(trip.commission?.toString() || '0')
    setMaintenance(trip.maintenance?.toString() || '0')
    setExtraRunning(trip.extraRunning?.toString() || '0')
    setDetentionTime(trip.detentionTime || '')
    setLoadingDate(trip.loadingDate ? new Date(trip.loadingDate).toISOString().split('T')[0] : '')
    setUnloadingDate(trip.unloadingDate ? new Date(trip.unloadingDate).toISOString().split('T')[0] : '')
    setReportDate(trip.reportDate ? new Date(trip.reportDate).toISOString().split('T')[0] : '')
    setExtraCharges(trip.extraCharges?.toString() || '0')
    setStatus(trip.status || 'Scheduled')
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
          liquidDiesel: parseFloat(liquidDiesel) || 0,
          driverCash: parseFloat(driverCash) || 0,
          toll: parseFloat(toll) || 0,
          partyAdvance: parseFloat(partyAdvance) || 0,
          driverAdvance: parseFloat(driverAdvance) || 0,
          commission: parseFloat(commission) || 0,
          maintenance: parseFloat(maintenance) || 0,
          extraRunning: parseFloat(extraRunning) || 0,
          detentionTime: detentionTime || null,
          loadingDate: loadingDate ? new Date(loadingDate) : null,
          unloadingDate: unloadingDate ? new Date(unloadingDate) : null,
          reportDate: reportDate ? new Date(reportDate) : null,
          extraCharges: parseFloat(extraCharges) || 0,
          balance: (parseFloat(freightAmount) || 0) - (parseFloat(partyAdvance) || 0),
          status,
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
          liquidDiesel: parseFloat(liquidDiesel) || 0,
          driverCash: parseFloat(driverCash) || 0,
          toll: parseFloat(toll) || 0,
          partyAdvance: parseFloat(partyAdvance) || 0,
          driverAdvance: parseFloat(driverAdvance) || 0,
          commission: parseFloat(commission) || 0,
          maintenance: parseFloat(maintenance) || 0,
          extraRunning: parseFloat(extraRunning) || 0,
          detentionTime: detentionTime || null,
          loadingDate: loadingDate ? new Date(loadingDate) : null,
          unloadingDate: unloadingDate ? new Date(unloadingDate) : null,
          reportDate: reportDate ? new Date(reportDate) : null,
          extraCharges: parseFloat(extraCharges) || 0,
          balance: (parseFloat(freightAmount) || 0) - (parseFloat(partyAdvance) || 0),
          status,
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
    setLiquidDiesel('0')
    setDriverCash('0')
    setToll('0')
    setPartyAdvance('0')
    setDriverAdvance('0')
    setCommission('0')
    setMaintenance('0')
    setExtraRunning('0')
    setDetentionTime('')
    setLoadingDate('')
    setUnloadingDate('')
    setReportDate('')
    setExtraCharges('0')
    setStatus('Scheduled')
    setPodStatus('Pending')
    setPaymentStatus('Pending')
    setNotes('')
    setError('')
    setSelectedTrip(null)
  }

  const calcNetProfit = (trip: any) => {
    return (trip.freightAmount || 0) - (trip.commission || 0) - (trip.dieselAmount || 0) - (trip.liquidDiesel || 0) - (trip.driverCash || 0) - (trip.toll || 0) - (trip.maintenance || 0) - (trip.extraRunning || 0) - (trip.extraCharges || 0)
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

  const exportToCSV = () => {
    const headers = ['Trip No', 'Date', 'Report Date', 'Loading Date', 'Unloading Date', 'Vehicle', 'Driver', 'Party', 'From', 'To', 'Material', 'Billing Type', 'Freight', 'Party Advance', 'Driver Advance', 'Balance', 'Commission', 'Maintenance', 'Fastag/Toll', 'Diesel', 'Liquid Diesel', 'Driver Cash', 'Extra Running', 'Detention Time', 'Extra Charges', 'Net Profit', 'POD Status', 'Payment Status', 'Notes']
    const rows = filteredTrips.map(t => [
      t.tripNo,
      new Date(t.tripDate).toLocaleDateString(),
      t.reportDate ? new Date(t.reportDate).toLocaleDateString() : '',
      t.loadingDate ? new Date(t.loadingDate).toLocaleDateString() : '',
      t.unloadingDate ? new Date(t.unloadingDate).toLocaleDateString() : '',
      t.vehicle?.vehicleNumber || '',
      t.driver?.driverName || '',
      t.party?.companyName || '',
      t.from,
      t.to,
      t.material || '',
      t.billingType,
      t.freightAmount,
      t.partyAdvance,
      t.driverAdvance,
      t.balance,
      t.commission,
      t.maintenance,
      t.toll,
      t.dieselAmount,
      t.liquidDiesel,
      t.driverCash,
      t.extraRunning,
      t.detentionTime || '',
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

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // reset input so same file can be selected again
    e.target.value = '';

    processCSVImport(file, () => {
      alert('Import successful!');
      loadData();
    }, (err) => {
      alert(`Import failed: ${err}`);
    });
  }

  const downloadCSVTemplate = () => {
    const csvContent = CSV_HEADERS.join(',') + '\\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleSaveAsPDF = async () => {
    if (!window.electronAPI.app?.printToPdf) return;
    const container = document.querySelector('.print-report-container');
    if (!container) return;
    
    setIsGeneratingPdf(true);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; margin: 0; padding: 16px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid black; text-align: center; }
            th, td { border: 1px solid black; padding: 4px; word-wrap: break-word; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-white { background-color: white; }
            .font-bold { font-weight: bold; }
            .italic { font-style: italic; }
            .not-italic { font-style: normal; }
            .font-normal { font-weight: normal; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .uppercase { text-transform: uppercase; }
            .text-left { text-align: left; }
            .align-top { vertical-align: top; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .break-words { word-break: break-word; }
            
            /* Add specific column widths based on Tailwind classes used */
            th.w-\\[8\\%\\] { width: 8%; }
            th.w-\\[11\\%\\] { width: 11%; }
            th.w-\\[14\\%\\] { width: 14%; }
            th.w-\\[10\\%\\] { width: 10%; }
            th.w-\\[7\\%\\] { width: 7%; }
            th.w-\\[5\\%\\] { width: 5%; }
            th.w-\\[4\\%\\] { width: 4%; }
          </style>
        </head>
        <body>
          ${container.innerHTML}
        </body>
      </html>
    `;
    
    try {
      const base64Pdf = await window.electronAPI.app.printToPdf(htmlContent);
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64Pdf}`;
      link.download = `Trips_Statement_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsGeneratingPdf(false);
    }
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
    
    // Apply Date Filter
    if (dateFilter !== 'All') {
      const tripD = new Date(trip.tripDate);
      const now = new Date();
      if (dateFilter === 'This Month') {
        if (tripD.getMonth() !== now.getMonth() || tripD.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilter === 'Last Month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (tripD.getMonth() !== lastMonth.getMonth() || tripD.getFullYear() !== lastMonth.getFullYear()) return false;
      }
    }

    return true
  })

  const totalFreight = filteredTrips.reduce((acc, t) => acc + (t.freightAmount || 0), 0)
  const totalOutstanding = filteredTrips.filter(t => t.paymentStatus !== 'Paid').reduce((acc, t) => acc + (t.freightAmount - (t.partyAdvance || 0)), 0)
  const totalNetProfit = filteredTrips.reduce((acc, t) => acc + calcNetProfit(t), 0)
  const marginPercent = totalFreight > 0 ? ((totalNetProfit / totalFreight) * 100).toFixed(1) : '0.0'

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
          <Label>Report Date</Label>
          <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-background/50 border-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Loading Date</Label>
          <Input type="date" value={loadingDate} onChange={(e) => setLoadingDate(e.target.value)} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label>Unloading Date</Label>
          <Input type="date" value={unloadingDate} onChange={(e) => setUnloadingDate(e.target.value)} className="bg-background/50 border-white/10" />
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
        <div className="space-y-2"><Label>Freight Amount (₹) *</Label><Input type="number" value={freightAmount} onChange={(e) => setFreightAmount(e.target.value)} className="bg-background/50 border-white/10 font-semibold text-primary" required /></div>
        <div className="space-y-2"><Label>Commission (₹)</Label><Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Party Advance (₹)</Label><Input type="number" value={partyAdvance} onChange={(e) => setPartyAdvance(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Driver Advance (₹)</Label><Input type="number" value={driverAdvance} onChange={(e) => setDriverAdvance(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Driver Cash (₹)</Label><Input type="number" value={driverCash} onChange={(e) => setDriverCash(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Fastag/Toll (₹)</Label><Input type="number" value={toll} onChange={(e) => setToll(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Diesel Amount (₹)</Label><Input type="number" value={dieselAmount} onChange={(e) => setDieselAmount(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Liquid Diesel (₹)</Label><Input type="number" value={liquidDiesel} onChange={(e) => setLiquidDiesel(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Maintenance (₹)</Label><Input type="number" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Extra Running (₹)</Label><Input type="number" value={extraRunning} onChange={(e) => setExtraRunning(e.target.value)} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>Detention Time</Label><Input placeholder="e.g. 2 Days" value={detentionTime} onChange={(e) => setDetentionTime(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Extra Charges (₹)</Label><Input type="number" value={extraCharges} onChange={(e) => setExtraCharges(e.target.value)} className="bg-background/50 border-white/10" /></div>
        
        <Card className="bg-orange-500/10 border-orange-500/20 col-span-1">
          <CardContent className="p-3 flex justify-between items-center h-full">
            <span className="text-xs text-orange-500/80 font-medium">Balance</span>
            <span className={`text-lg font-bold text-orange-500`}>
              {formatCurrency((parseFloat(freightAmount) || 0) - (parseFloat(partyAdvance) || 0))}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 col-span-1">
          <CardContent className="p-3 flex justify-between items-center h-full">
            <span className="text-xs text-muted-foreground font-medium">Net Profit</span>
            <span className={`text-lg font-bold ${((parseFloat(freightAmount) || 0) - (parseFloat(commission) || 0) - (parseFloat(dieselAmount) || 0) - (parseFloat(liquidDiesel) || 0) - (parseFloat(driverCash) || 0) - (parseFloat(toll) || 0) - (parseFloat(maintenance) || 0) - (parseFloat(extraRunning) || 0) - (parseFloat(extraCharges) || 0)) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency((parseFloat(freightAmount) || 0) - (parseFloat(commission) || 0) - (parseFloat(dieselAmount) || 0) - (parseFloat(liquidDiesel) || 0) - (parseFloat(driverCash) || 0) - (parseFloat(toll) || 0) - (parseFloat(maintenance) || 0) - (parseFloat(extraRunning) || 0) - (parseFloat(extraCharges) || 0))}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>Trip Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Scheduled">Scheduled</option>
            <option value="Loading">Loading</option>
            <option value="In Transit">In Transit</option>
            <option value="Unloading">Unloading</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
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
          <Button variant="outline" size="sm" onClick={() => setIsReportOpen(true)} className="border-white/10 hover:bg-white/10">
            <Filter className="mr-2 h-4 w-4" /> View Report
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="border-white/10 hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <div className="relative inline-flex">
            <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-upload')?.click()} className="border-white/10 hover:bg-white/10">
              <Download className="mr-2 h-4 w-4 rotate-180" /> Import CSV
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCSVTemplate} className="border-white/10 hover:bg-white/10">
            Template
          </Button>
          <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Trip
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Freight</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFreight)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredTrips.length} trips shown</p>
          </CardContent>
        </Card>
        <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-green-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit (Est.)</CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{marginPercent}% Margin</Badge>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(totalNetProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">after diesel, toll & advances</p>
          </CardContent>
        </Card>
        <Card className="glass shadow-sm transition-all hover:shadow-md">
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
          <div className="flex items-center space-x-2">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
              <option value="All">All Time</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
            </select>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>Trip No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
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
                          <span className="flex items-center text-muted-foreground whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {new Date(trip.tripDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            trip.status === 'Completed' ? 'border-green-500/50 text-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                            trip.status === 'In Transit' ? 'border-blue-500/50 text-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                            trip.status === 'Loading' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                            trip.status === 'Unloading' ? 'border-purple-500/50 text-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]' :
                            'border-white/20 text-muted-foreground bg-white/5'
                          }>{trip.status || 'Scheduled'}</Badge>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] glass-panel border-white/10">
                              <DropdownMenuItem onClick={() => handleOpenEdit(trip)} className="hover:bg-white/10 cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Trip
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="hover:bg-white/10 cursor-pointer text-green-400 focus:text-green-400">
                                <Send className="mr-2 h-4 w-4" /> Share via WA
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedTrip(trip); setIsDeleteOpen(true) }} className="hover:bg-red-500/20 text-red-400 focus:text-red-400 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Trip
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* PDF Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="glass-panel border-white/20 max-w-[95vw] sm:max-w-[1200px] h-[90vh] flex flex-col p-4 print:p-0 print:border-none print:shadow-none print:h-auto print:max-w-none print:bg-white print:text-black">
          <DialogHeader className="mb-2 print:hidden">
            <DialogTitle>Trips Statement Report</DialogTitle>
            <DialogDescription>View the tabular statement. Use the buttons below to print or save.</DialogDescription>
            <div className="flex justify-end absolute right-12 top-4 space-x-2">
              <Button variant="outline" onClick={() => window.print()} className="border-primary/20 hover:bg-primary/10">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button onClick={handleSaveAsPDF} disabled={isGeneratingPdf} className="bg-primary hover:bg-primary/90 text-white shadow-md">
                {isGeneratingPdf ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Generating...' : 'Save as PDF'}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-white rounded-md overflow-y-auto print:overflow-visible print:p-0 border border-black/10 shadow-inner">
            <div className="print-report-container">
              <TripReportView trips={filteredTrips} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
