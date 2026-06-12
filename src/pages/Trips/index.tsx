import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, MapPin, Edit, AlertTriangle, Trash2, Download, RefreshCw, TrendingUp, Filter, Printer, MoreVertical, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';
import { TripReportView } from '@/components/TripReportView';
import { BiltyView } from '@/components/BiltyView';
import { processCSVImport, CSV_HEADERS } from '@/lib/csvImport';
import { generatePdf, sendWhatsAppPdf } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { TripForm } from './TripForm';
import { TripSettleForm } from './TripSettleForm';
import type { TripFormValues } from './schema';
import type { Trip, Vehicle, Driver, Party } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

type TripWithRelations = Trip & { vehicle: Vehicle | null, driver: Driver | null, party: Party | null };

export default function Trips() {
  const location = useLocation();
  const { t } = usePreferences();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  
  // Dialogs
  const [isNewOpen, setIsNewOpen] = useState(location.state && (location.state as any).openNew);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isLrOpen, setIsLrOpen] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [isSendExcelOpen, setIsSendExcelOpen] = useState(false);
  const [excelPhone, setExcelPhone] = useState('');
  const [isSendingExcel, setIsSendingExcel] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithRelations | null>(null);

  const { data: trips = [], isLoading, refetch } = usePrismaQuery<TripWithRelations[]>(
    ['trips', 'all'],
    'trip',
    'findMany',
    { include: { vehicle: true, party: true, driver: true, directDrivers: true, driverAdvances: true, driverChanges: true, tollEntries: true, maintenanceEntries: true, dieselEntries: true, tripLinks: true }, orderBy: { createdAt: 'desc' } }
  );
  
  const { data: allVehicles = [] } = usePrismaQuery<Vehicle[]>(['vehicles', 'all'], 'vehicle', 'findMany', { orderBy: { vehicleNumber: 'asc' } });
  const { data: parties = [] } = usePrismaQuery<Party[]>(['parties', 'all'], 'party', 'findMany', { where: { status: 'Active' }, orderBy: { companyName: 'asc' } });
  const { data: allDrivers = [] } = usePrismaQuery<Driver[]>(['drivers', 'all'], 'driver', 'findMany', { orderBy: { driverName: 'asc' } });

  const activeVehicles = allVehicles.filter(v => v.status === 'Active');
  const activeDrivers = allDrivers.filter(d => d.status === 'Active');

  const createMutation = usePrismaMutation<any, Trip>('trip', 'create', [['trips', 'all']]);
  const updateMutation = usePrismaMutation<any, Trip>('trip', 'update', [['trips', 'all']]);
  const deleteMutation = usePrismaMutation<any, Trip>('trip', 'delete', [['trips', 'all']]);
  const updateVehicleMutation = usePrismaMutation<any, Vehicle>('vehicle', 'update', [['vehicles', 'all']]);
  const updateDriverMutation = usePrismaMutation<any, Driver>('driver', 'update', [['drivers', 'all']]);

  const generateNextTripNo = () => {
    if (trips.length === 0) return 'TRP-1001';
    const numbers = trips.map(t => parseInt(t.tripNo.replace('TRP-', ''))).filter(num => !isNaN(num));
    if (numbers.length === 0) return 'TRP-1001';
    return `TRP-${Math.max(...numbers) + 1}`;
  };

  const handleOpenNew = () => {
    setSelectedTrip(null);
    setIsNewOpen(true);
  };

  const handleCreate = (data: TripFormValues) => {
    const { directDrivers, driverAdvances, driverChanges, tollEntries, maintenanceEntries, dieselEntries, tripLinks, ...restData } = data;
    createMutation.mutate({
      data: {
        ...restData,
        tripDate: new Date(data.tripDate),
        loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
        unloadingDate: data.unloadingDate ? new Date(data.unloadingDate) : null,
        reportDate: data.reportDate ? new Date(data.reportDate) : null,
        driverId: data.driverId || null,
        balance: data.freightAmount - data.partyAdvance,
        directDrivers: { create: directDrivers.map(d => ({ driverName: d.driverName })) },
        driverAdvances: { create: driverAdvances.map(a => ({ amount: a.amount, date: new Date(a.date), remarks: a.remarks })) },
        driverChanges: { create: driverChanges.map(c => ({ previousDriverId: c.previousDriverId || null, newDriverId: c.newDriverId || null, changedAt: new Date(c.changedAt) })) },
        tollEntries: { create: tollEntries.map(t => ({ tollName: t.tollName, amount: t.amount, date: new Date(t.date), remarks: t.remarks })) },
        maintenanceEntries: { create: maintenanceEntries.map(m => ({ maintenanceType: m.maintenanceType, amount: m.amount, date: new Date(m.date), remarks: m.remarks })) },
        dieselEntries: { create: dieselEntries.map(d => ({ fuelStation: d.fuelStation, litres: d.litres, ratePerLitre: d.ratePerLitre, totalCost: d.totalCost, date: new Date(d.date), vehicleId: data.vehicleId })) },
        tripLinks: { create: tripLinks.map(l => ({ url: l.url, description: l.description, date: new Date(l.date) })) }
      }
    }, {
      onSuccess: () => {
        if (data.driverId) updateDriverMutation.mutate({ where: { id: data.driverId }, data: { status: 'On-Trip' } });
        updateVehicleMutation.mutate({ where: { id: data.vehicleId }, data: { status: 'On-Trip' } });
        setIsNewOpen(false);
      }
    });
  };

  const handleUpdate = (data: TripFormValues) => {
    if (!selectedTrip) return;
    const { directDrivers, driverAdvances, driverChanges, tollEntries, maintenanceEntries, dieselEntries, tripLinks, ...restData } = data;
    updateMutation.mutate({
      where: { id: selectedTrip.id },
      data: {
        ...restData,
        tripDate: new Date(data.tripDate),
        loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
        unloadingDate: data.unloadingDate ? new Date(data.unloadingDate) : null,
        reportDate: data.reportDate ? new Date(data.reportDate) : null,
        driverId: data.driverId || null,
        balance: data.freightAmount - data.partyAdvance,
        directDrivers: { deleteMany: {}, create: directDrivers.map(d => ({ driverName: d.driverName })) },
        driverAdvances: { deleteMany: {}, create: driverAdvances.map(a => ({ amount: a.amount, date: new Date(a.date), remarks: a.remarks })) },
        driverChanges: { deleteMany: {}, create: driverChanges.map(c => ({ previousDriverId: c.previousDriverId || null, newDriverId: c.newDriverId || null, changedAt: new Date(c.changedAt) })) },
        tollEntries: { deleteMany: {}, create: tollEntries.map(t => ({ tollName: t.tollName, amount: t.amount, date: new Date(t.date), remarks: t.remarks })) },
        maintenanceEntries: { deleteMany: {}, create: maintenanceEntries.map(m => ({ maintenanceType: m.maintenanceType, amount: m.amount, date: new Date(m.date), remarks: m.remarks })) },
        dieselEntries: { deleteMany: {}, create: dieselEntries.map(d => ({ fuelStation: d.fuelStation, litres: d.litres, ratePerLitre: d.ratePerLitre, totalCost: d.totalCost, date: new Date(d.date), vehicleId: data.vehicleId })) },
        tripLinks: { deleteMany: {}, create: tripLinks.map(l => ({ url: l.url, description: l.description, date: new Date(l.date) })) }
      }
    }, {
      onSuccess: () => {
        if (data.podStatus === 'Received' && data.paymentStatus === 'Paid') {
          if (selectedTrip.driverId) updateDriverMutation.mutate({ where: { id: selectedTrip.driverId }, data: { status: 'Active' } });
          updateVehicleMutation.mutate({ where: { id: selectedTrip.vehicleId }, data: { status: 'Active' } });
        }
        setIsEditOpen(false);
      }
    });
  };

  const handleSettle = (data: Partial<TripFormValues>) => {
    if (!selectedTrip) return;
    updateMutation.mutate({
      where: { id: selectedTrip.id },
      data: {
        dieselAmount: data.dieselAmount,
        liquidDiesel: data.liquidDiesel,
        toll: data.toll,
        maintenance: data.maintenance,
        extraRunning: data.extraRunning,
        extraCharges: data.extraCharges,
        driverCash: data.driverCash,
        status: 'Completed',
        podStatus: 'Received',
        notes: data.notes || null,
      }
    }, {
      onSuccess: () => {
        if (selectedTrip.driverId) updateDriverMutation.mutate({ where: { id: selectedTrip.driverId }, data: { status: 'Active' } });
        updateVehicleMutation.mutate({ where: { id: selectedTrip.vehicleId }, data: { status: 'Active' } });
        setIsSettleOpen(false);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedTrip) return;
    deleteMutation.mutate({ where: { id: selectedTrip.id } }, {
      onSuccess: () => {
        if (selectedTrip.driverId) updateDriverMutation.mutate({ where: { id: selectedTrip.driverId }, data: { status: 'Active' } });
        updateVehicleMutation.mutate({ where: { id: selectedTrip.vehicleId }, data: { status: 'Active' } });
        setIsDeleteOpen(false);
      }
    });
  };

  const calcNetProfit = (trip: any) => {
    return (trip.freightAmount || 0) - (trip.commission || 0) - (trip.dieselAmount || 0) - (trip.liquidDiesel || 0) - (trip.driverCash || 0) - (trip.toll || 0) - (trip.maintenance || 0) - (trip.extraRunning || 0) - (trip.extraCharges || 0) - (trip.selfExpenses || 0);
  };

  const handleSendWALr = async (trip: TripWithRelations) => {
    const phone = trip.party?.phone;
    if (!phone) {
      alert("No phone number registered for the party associated with this trip.");
      return;
    }
    setSelectedTrip(trip);
    setIsSendingWA(true);
    setTimeout(async () => {
      const caption = `Dear ${trip.party?.companyName},\n\nPlease find attached the Lorry Receipt (LR) for the trip from ${trip.from} to ${trip.to}.\nVehicle: ${trip.vehicle?.vehicleNumber}\n\nThank you!`;
      await sendWhatsAppPdf(phone, '#hidden-wa-lr-capture .print-lr-container', `LR_${trip.tripNo}.pdf`, caption);
      setIsSendingWA(false);
    }, 500);
  };

  const handleSaveAsPDF = async () => {
    setIsGeneratingPdf(true);
    await generatePdf('.print-report-container', `Trips_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsGeneratingPdf(false);
  };

  const handleSaveLrAsPDF = async () => {
    setIsGeneratingPdf(true);
    await generatePdf('.print-lr-container', `LR_${selectedTrip?.tripNo}.pdf`);
    setIsGeneratingPdf(false);
  };

  const exportToCSV = () => {
    const headers = ['Trip No', 'Date', 'Report Date', 'Loading Date', 'Unloading Date', 'Vehicle', 'Driver', 'Party', 'From', 'To', 'Material', 'Billing Type', 'Freight', 'Party Advance', 'Driver Advance', 'Balance', 'Commission', 'Maintenance', 'Fastag/Toll', 'Diesel', 'Liquid Diesel', 'Driver Cash', 'Extra Running', 'Detention Time', 'Extra Charges', 'Net Profit', 'POD Status', 'Payment Status', 'Notes'];
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
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendExcelWA = async () => {
    if (!excelPhone) {
      alert("Please enter a phone number");
      return;
    }
    setIsSendingExcel(true);
    
    const headers = ['Trip No', 'Date', 'Report Date', 'Loading Date', 'Unloading Date', 'Vehicle', 'Driver', 'Party', 'From', 'To', 'Material', 'Billing Type', 'Freight', 'Party Advance', 'Driver Advance', 'Balance', 'Commission', 'Maintenance', 'Fastag/Toll', 'Diesel', 'Liquid Diesel', 'Driver Cash', 'Extra Running', 'Detention Time', 'Extra Charges', 'Net Profit', 'POD Status', 'Payment Status', 'Notes'];
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
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    
    const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
    
    try {
      const res = await window.electronAPI.whatsapp?.sendMedia({
        phone: excelPhone,
        caption: "Here is the trips report.",
        base64Data,
        mimetype: 'text/csv',
        filename: `trips_report_${new Date().toISOString().split('T')[0]}.csv`
      });

      if (res && res.error) {
        alert('Error sending WhatsApp message: ' + res.error);
      } else {
        alert('Report sent successfully!');
        setIsSendExcelOpen(false);
        setExcelPhone('');
      }
    } catch (err: any) {
      alert('WhatsApp send failed: ' + err.message);
    }
    
    setIsSendingExcel(false);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processCSVImport(file, () => {
      alert('Import successful!');
      refetch();
    }, (err) => {
      alert(`Import failed: ${err}`);
    });
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.tripNo.toLowerCase().includes(search.toLowerCase()) ||
      trip.vehicle?.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      trip.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      trip.from.toLowerCase().includes(search.toLowerCase()) ||
      trip.to.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pending_pod') return trip.podStatus === 'Pending';
    if (statusFilter === 'pending_payment') return trip.paymentStatus === 'Pending' || trip.paymentStatus === 'Partial';
    if (statusFilter === 'completed') return trip.podStatus === 'Received' && trip.paymentStatus === 'Paid';
    if (statusFilter === 'overdue') return trip.podStatus === 'Pending' && (new Date().getTime() - new Date(trip.tripDate).getTime() > 5 * 24 * 60 * 60 * 1000);
    
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
    return true;
  });

  const totalFreight = filteredTrips.reduce((acc, t) => acc + (t.freightAmount || 0), 0);
  const totalOutstanding = filteredTrips.filter(t => t.paymentStatus !== 'Paid').reduce((acc, t) => acc + (t.freightAmount - (t.partyAdvance || 0)), 0);
  const totalNetProfit = filteredTrips.reduce((acc, t) => acc + calcNetProfit(t), 0);
  const marginPercent = totalFreight > 0 ? ((totalNetProfit / totalFreight) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">{t('Trips Console')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('Manage dispatch, LR generation, and settlements.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background/50 border-white/10"><Filter className="mr-2 h-4 w-4" /> {dateFilter}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-panel border-white/10">
              {['All', 'This Month', 'Last Month', 'Custom'].map(d => <DropdownMenuItem key={d} onClick={() => setDateFilter(d)}>{t(d)}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center">
            <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-background/50 border-white/10 rounded-r-none"><Download className="mr-2 h-4 w-4" /> {t('Export / Import')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-panel border-white/10">
                <DropdownMenuItem onClick={exportToCSV}><Download className="mr-2 h-4 w-4" /> {t('Export trips to CSV')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSendExcelOpen(true)}><Send className="mr-2 h-4 w-4" /> {t('Send trips via WA')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('csv-upload')?.click()}><TrendingUp className="mr-2 h-4 w-4" /> {t('Import trips from CSV')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const csvContent = CSV_HEADERS.join(',') + '\\n';
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'trips_import_template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}><Download className="mr-2 h-4 w-4" /> {t('Download Import Template')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setIsReportOpen(true)} className="bg-background/50 border-white/10 rounded-l-none border-l-0"><Printer className="h-4 w-4" /></Button>
          </div>
          <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('New Dispatch')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('Loading trips...')}</div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Active Dispatches')}</CardTitle>
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">{trips.filter(t => t.status === 'In Transit' || t.status === 'Loading' || t.status === 'Unloading').length}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('on road')}</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Freight (Period)')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-green-400">{formatCurrency(totalFreight)}</div>
              </CardContent>
            </Card>
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Est. Net Profit')}</CardTitle>
                <Badge variant="outline" className="border-primary/50 text-primary">{marginPercent}{t('% Margin')}</Badge>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">{formatCurrency(totalNetProfit)}</div>
              </CardContent>
            </Card>
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-orange-400">{t('Total Outstanding')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalOutstanding)}</div>
                <p className="text-xs text-orange-400 mt-1">{t('Pending party payments')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {[{ label: t('All'), value: 'All' }, { label: t('Pending POD'), value: 'pending_pod' }, { label: t('Pending Payment'), value: 'pending_payment' }, { label: t('Completed'), value: 'completed' }, { label: t('Overdue'), value: 'overdue' }].map(tab => (
              <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">{t('Trip Registry')}</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder={t('Search trips, vehicles, parties...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead>{t('Trip & Date')}</TableHead>
                      <TableHead>{t('Vehicle & Driver')}</TableHead>
                      <TableHead>{t('Route (From → To)')}</TableHead>
                      <TableHead>{t('Customer')}</TableHead>
                      <TableHead>{t('Financials')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">{t('No trips found for current filters.')}</TableCell></TableRow>
                    ) : (
                      filteredTrips.map((trip) => (
                        <TableRow key={trip.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="font-semibold text-primary">{trip.tripNo}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{new Date(trip.tripDate).toLocaleDateString()}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{trip.vehicle?.vehicleNumber}</div>
                            <div className="text-xs text-muted-foreground">{trip.driver?.driverName || t('Unassigned')}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{trip.from}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm mt-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              <span className="font-medium">{trip.to}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{trip.party?.companyName}</TableCell>
                          <TableCell>
                            <div className="text-sm font-semibold">{formatCurrency(trip.freightAmount)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{t('Net:')} <span className={calcNetProfit(trip) >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(calcNetProfit(trip))}</span></div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="outline" className={`text-[10px] ${trip.status === 'Completed' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-blue-500/30 text-blue-500 bg-blue-500/10'}`}>{trip.status}</Badge>
                              {trip.podStatus === 'Pending' && <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500 bg-orange-500/10">{t('POD Pending')}</Badge>}
                              {trip.paymentStatus !== 'Paid' && <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500 bg-red-500/10">{t('Pmt Pending')}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10"><span className="sr-only">Open menu</span><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[180px] glass-panel border-white/10">
                                <DropdownMenuItem onClick={() => { setSelectedTrip(trip); setIsEditOpen(true); }} className="hover:bg-white/10 cursor-pointer"><Edit className="mr-2 h-4 w-4" /> {t('Edit Details')}</DropdownMenuItem>
                                {trip.status !== 'Completed' && (
                                  <DropdownMenuItem onClick={() => { setSelectedTrip(trip); setIsSettleOpen(true); }} className="hover:bg-green-500/20 text-green-400 focus:text-green-400 cursor-pointer"><RefreshCw className="mr-2 h-4 w-4" /> {t('Settle Trip')}</DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { setSelectedTrip(trip); setIsLrOpen(true); }} className="hover:bg-white/10 cursor-pointer"><Printer className="mr-2 h-4 w-4" /> {t('View Bilty/LR')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendWALr(trip)} className="hover:bg-green-500/20 text-green-400 focus:text-green-400 cursor-pointer"><Send className="mr-2 h-4 w-4" /> {t('Send LR on WA')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedTrip(trip); setIsDeleteOpen(true); }} className="hover:bg-red-500/20 text-red-400 focus:text-red-400 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> {t('Delete Trip')}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('New Trip Dispatch')}</DialogTitle>
            <DialogDescription>{t('Create a new trip, assign vehicle, and set freight details.')}</DialogDescription>
          </DialogHeader>
          <TripForm 
            initialData={{ tripNo: generateNextTripNo() }}
            vehicles={activeVehicles}
            drivers={activeDrivers}
            parties={parties}
            onSubmit={handleCreate}
            onCancel={() => setIsNewOpen(false)}
            isSubmitting={createMutation.isPending}
            isEdit={false}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Trip —')} {selectedTrip?.tripNo}</DialogTitle>
            <DialogDescription>{t('Update financials, status, and tracking details.')}</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <TripForm 
              initialData={selectedTrip as any}
              vehicles={allVehicles}
              drivers={allDrivers}
              parties={parties}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditOpen(false)}
              isSubmitting={updateMutation.isPending}
              isEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Settle Trip —')} {selectedTrip?.tripNo}</DialogTitle>
            <DialogDescription>{t('Log final expenses to complete this trip.')}</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <TripSettleForm 
              initialData={selectedTrip as any}
              onSubmit={handleSettle}
              onCancel={() => setIsSettleOpen(false)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Trip?')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to delete')} <strong>{selectedTrip?.tripNo}</strong>? {t('This will release the vehicle and driver.')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t('Deleting...') : t('Delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LR View */}
      <Dialog open={isLrOpen} onOpenChange={setIsLrOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background/50 sticky top-0 z-10 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold">{t('Lorry Receipt (LR)')}</h2>
              <p className="text-sm text-muted-foreground">{selectedTrip?.tripNo}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsLrOpen(false); if (selectedTrip) handleSendWALr(selectedTrip); }} disabled={isSendingWA} className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                <Send className="w-4 h-4 mr-2" /> {isSendingWA ? t('Sending...') : t('Send WhatsApp')}
              </Button>
              <Button variant="outline" onClick={handleSaveLrAsPDF} disabled={isGeneratingPdf} className="border-white/10">
                <Download className="w-4 h-4 mr-2" /> {isGeneratingPdf ? t('Generating...') : t('Save PDF')}
              </Button>
            </div>
          </div>
          <div className="p-8 bg-white min-h-[800px] w-full text-black overflow-x-auto print-lr-container">
            {selectedTrip && <BiltyView trip={selectedTrip} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Statement View */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[1000px] max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background/50 sticky top-0 z-10 backdrop-blur-md">
            <div>
              <h2 className="text-lg font-bold">{t('Trips Statement')}</h2>
              <p className="text-sm text-muted-foreground">{t(dateFilter)} ({filteredTrips.length} {t('trips')})</p>
            </div>
            <Button variant="outline" onClick={handleSaveAsPDF} disabled={isGeneratingPdf} className="border-white/10">
              <Download className="w-4 h-4 mr-2" /> {isGeneratingPdf ? t('Generating...') : t('Save PDF')}
            </Button>
          </div>
          <div className="p-8 bg-white min-h-[800px] w-full text-black overflow-x-auto print-report-container">
            <TripReportView trips={filteredTrips} dateFilter={dateFilter} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendExcelOpen} onOpenChange={setIsSendExcelOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('Send Report to WhatsApp')}</DialogTitle>
            <DialogDescription>{t('Enter WhatsApp number to receive the trips report (CSV).')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('WhatsApp Number')}</label>
              <Input 
                placeholder="e.g. 919876543210" 
                value={excelPhone} 
                onChange={(e) => setExcelPhone(e.target.value)} 
                className="bg-background/50 border-white/10"
              />
              <p className="text-xs text-muted-foreground">{t('Include country code without + (e.g. 91 for India)')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsSendExcelOpen(false)}>{t('Cancel')}</Button>
              <Button onClick={handleSendExcelWA} disabled={isSendingExcel} className="bg-green-600 hover:bg-green-700 text-white">
                <Send className="w-4 h-4 mr-2" />
                {isSendingExcel ? t('Sending...') : t('Send via WA')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for WhatsApp LR capture */}
      <div id="hidden-wa-lr-capture" style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none', background: 'white' }}>
        <div className="print-lr-container" style={{ width: '1000px', padding: '40px', background: 'white', color: 'black' }}>
          {selectedTrip && <BiltyView trip={selectedTrip} />}
        </div>
      </div>
    </div>
  );
}
