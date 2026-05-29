import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Phone, MapPin, DollarSign, Users, CheckCircle, Edit, Trash2, PlusCircle, RefreshCw, Calendar, FileText, Camera } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';
import { formatCurrency } from '@/lib/utils';
import type { Driver, DriverLedger } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

export default function Drivers() {
  const { t } = usePreferences();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isOpen, setIsOpen] = useState(location.state && (location.state as any).openNew);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Settle Advance State
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [selectedSettleDriver, setSelectedSettleDriver] = useState<Driver | null>(null);
  const [settleAmount, setSettleAmount] = useState('0');
  const [settleNotes, setSettleNotes] = useState('');

  // Give Advance State
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [giveAmount, setGiveAmount] = useState('0');
  const [giveNotes, setGiveNotes] = useState('');

  // Form State
  const [driverName, setDriverName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [salary, setSalary] = useState('0');
  const [advanceBalance, setAdvanceBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Active');
  
  // New Fields: Guarantor & Docs
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [dlImagePath, setDlImagePath] = useState('');
  const [aadhaarImagePath, setAadhaarImagePath] = useState('');
  const [panImagePath, setPanImagePath] = useState('');

  // Ledger State
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  
  const { data: drivers = [], isLoading, refetch } = usePrismaQuery<Driver[]>(['drivers', 'all'], 'driver', 'findMany', { orderBy: { driverName: 'asc' } });
  
  const { data: ledgerData = [] } = usePrismaQuery<DriverLedger[]>(
    ['driverLedger', selectedDriver?.id || ''], 
    'driverLedger', 
    'findMany', 
    { where: { driverId: selectedDriver?.id }, orderBy: { date: 'desc' } },
    { enabled: !!selectedDriver?.id && isLedgerOpen }
  );

  const createMutation = usePrismaMutation<any, Driver>('driver', 'create', [['drivers', 'all']]);
  const updateMutation = usePrismaMutation<any, Driver>('driver', 'update', [['drivers', 'all']]);
  const deleteMutation = usePrismaMutation<any, Driver>('driver', 'delete', [['drivers', 'all']]);
  const createLedgerMutation = usePrismaMutation<any, DriverLedger>('driverLedger', 'create', [['drivers', 'all'], ['driverLedger']]);

  const [error, setError] = useState('');

  const handleOpenSettle = (driver: Driver) => {
    setSelectedSettleDriver(driver);
    setSettleAmount('0');
    setSettleNotes('');
    setIsSettleOpen(true);
  };

  const handleOpenGive = (driver: Driver) => {
    setSelectedSettleDriver(driver);
    setGiveAmount('0');
    setGiveNotes('');
    setIsGiveOpen(true);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(settleAmount);
    if (!selectedSettleDriver || isNaN(amt) || amt <= 0) { setError(t('Please enter a valid settle amount')); return; }
    
    const newBalance = Math.max(0, (selectedSettleDriver.advanceBalance || 0) - amt);
    
    updateMutation.mutate({
      where: { id: selectedSettleDriver.id },
      data: { advanceBalance: newBalance }
    }, {
      onSuccess: () => {
        createLedgerMutation.mutate({
          data: {
            driverId: selectedSettleDriver.id,
            type: 'Settlement',
            amount: amt,
            description: settleNotes || t('Advance Settlement'),
            date: new Date()
          }
        }, {
          onSuccess: () => setIsSettleOpen(false)
        });
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const handleGiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(giveAmount);
    if (!selectedSettleDriver || isNaN(amt) || amt <= 0) { setError(t('Please enter a valid advance amount')); return; }
    
    const newBalance = (selectedSettleDriver.advanceBalance || 0) + amt;
    
    updateMutation.mutate({
      where: { id: selectedSettleDriver.id },
      data: { advanceBalance: newBalance }
    }, {
      onSuccess: () => {
        createLedgerMutation.mutate({
          data: {
            driverId: selectedSettleDriver.id,
            type: 'Advance',
            amount: amt,
            description: giveNotes || t('Cash Advance given'),
            date: new Date()
          }
        }, {
          onSuccess: () => setIsGiveOpen(false)
        });
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!driverName || !mobileNumber) { setError(t('Driver Name and Mobile Number are required')); return; }
    
    createMutation.mutate({
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
        status,
        guarantorName: guarantorName || null,
        guarantorPhone: guarantorPhone || null,
        dlImagePath: dlImagePath || null,
        aadhaarImagePath: aadhaarImagePath || null,
        panImagePath: panImagePath || null
      }
    }, {
      onSuccess: (data: Driver) => {
        if (parseFloat(advanceBalance) > 0) {
          createLedgerMutation.mutate({
            data: {
              driverId: data.id,
              type: 'Advance',
              amount: parseFloat(advanceBalance),
              description: t('Initial Advance Balance'),
              date: new Date()
            }
          });
        }
        setIsOpen(false);
        resetForm();
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setPath: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const ext = file.name.split('.').pop();
        const filename = `doc_${Date.now()}.${ext}`;
        const res = await window.electronAPI.app?.saveImage({ base64Data, filename, subfolder: 'driver_docs' });
        if (res?.success && res.filePath) {
          setPath(res.filePath);
        } else {
          setError(res?.error || 'Failed to save image');
        }
      } catch (err: any) { setError(err.message); }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenLedger = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsLedgerOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedDriver) return;
    if (!driverName || !mobileNumber) { setError(t('Driver Name and Mobile Number are required')); return; }
    
    updateMutation.mutate({
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
        status,
        guarantorName: guarantorName || null,
        guarantorPhone: guarantorPhone || null,
        dlImagePath: dlImagePath || null,
        aadhaarImagePath: aadhaarImagePath || null,
        panImagePath: panImagePath || null
      }
    }, {
      onSuccess: () => {
        setIsEditOpen(false);
        resetForm();
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const handleOpenEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverName(driver.driverName);
    setMobileNumber(driver.mobileNumber);
    setLicenseNumber(driver.licenseNumber || '');
    setLicenseExpiry(driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '');
    setAadhaarNumber(driver.aadhaarNumber || '');
    setPanNumber(driver.panNumber || '');
    setSalary(String(driver.salary || 0));
    setAdvanceBalance(String(driver.advanceBalance || 0));
    setAddress(driver.address || '');
    setStatus(driver.status);
    setGuarantorName(driver.guarantorName || '');
    setGuarantorPhone(driver.guarantorPhone || '');
    setDlImagePath(driver.dlImagePath || '');
    setAadhaarImagePath(driver.aadhaarImagePath || '');
    setPanImagePath(driver.panImagePath || '');
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    if (!selectedDriver) return;
    deleteMutation.mutate({ where: { id: selectedDriver.id } }, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedDriver(null);
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const resetForm = () => {
    setDriverName('');
    setMobileNumber('');
    setLicenseNumber('');
    setLicenseExpiry('');
    setAadhaarNumber('');
    setPanNumber('');
    setSalary('0');
    setAdvanceBalance('0');
    setAddress('');
    setStatus('Active');
    setGuarantorName('');
    setGuarantorPhone('');
    setDlImagePath('');
    setAadhaarImagePath('');
    setPanImagePath('');
    setError('');
    setSelectedDriver(null);
  };

  const filteredDrivers = drivers
    .filter(d => statusFilter === 'All' || d.status === statusFilter)
    .filter(d =>
      d.driverName.toLowerCase().includes(search.toLowerCase()) ||
      d.mobileNumber.includes(search) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(search.toLowerCase()))
    );

  const statusTabs = ['All', 'Active', 'On-Trip', 'Inactive'];

  const renderDriverForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Driver Name *')}</Label><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={t('e.g. Ramesh Singh')} className="bg-background/50 border-white/10" required /></div>
        <div className="space-y-2"><Label>{t('Mobile Number *')}</Label><Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder={t('e.g. 9988776655')} className="bg-background/50 border-white/10" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('DL Number')}</Label><Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={t('e.g. MH-12-2015-...')} className="bg-background/50 border-white/10 font-mono uppercase" /></div>
        <div className="space-y-2"><Label>{t('License Expiry Date')}</Label><Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Salary (₹ / Month)')}</Label><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="bg-background/50 border-white/10" /></div>
        {!isEdit && <div className="space-y-2"><Label>{t('Initial Advance (₹)')}</Label><Input type="number" value={advanceBalance} onChange={(e) => setAdvanceBalance(e.target.value)} className="bg-background/50 border-white/10" /></div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Aadhaar Card')}</Label><Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="1234 5678 9012" className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('PAN Card')}</Label><Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" className="bg-background/50 border-white/10 font-mono uppercase" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
        <div className="space-y-2"><Label>{t('Guarantor/Reference Name')}</Label><Input value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} placeholder={t('e.g. Suresh (Uncle)')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Guarantor Phone')}</Label><Input value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} placeholder={t('e.g. 9876543210')} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="space-y-2 pt-2 border-t border-white/10">
        <Label>{t('Document Vault (Upload Photos)')}</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('DL Photo')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10">
              <Camera className="h-4 w-4 mr-2" /> {dlImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDlImagePath)} />
            </Label>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('Aadhaar Photo')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10">
              <Camera className="h-4 w-4 mr-2" /> {aadhaarImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAadhaarImagePath)} />
            </Label>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('PAN Photo')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10">
              <Camera className="h-4 w-4 mr-2" /> {panImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setPanImagePath)} />
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-white/10"><Label>{t('Address')}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('e.g. Ward No. 5, Jamshedpur')} className="bg-background/50 border-white/10" /></div>
      <div className="space-y-2">
        <Label>{t('Status')}</Label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
          <option value="Active">{t('Active (Available)')}</option>
          <option value="On-Trip">{t('On-Trip (Busy)')}</option>
          <option value="Inactive">{t('Inactive')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setIsEditOpen(false); resetForm(); }}>{t('Cancel')}</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {createMutation.isPending || updateMutation.isPending ? t('Saving...') : (isEdit ? t('Update Driver') : t('Save Driver'))}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">{t('Driver Directory')}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('Add Driver')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Drivers')}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{drivers.filter(d => d.status === 'Active').length} {t('available')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('On-Trip Drivers')}</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20 border-blue-500/30">{t('Active Duty')}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.filter(d => d.status === 'On-Trip').length}</div>
            <p className="text-xs text-muted-foreground mt-1">{drivers.filter(d => d.status === 'Inactive').length} {t('inactive')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Advance Balance')}</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(drivers.reduce((acc, d) => acc + (d.advanceBalance || 0), 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('across')} {drivers.filter(d => (d.advanceBalance || 0) > 0).length} {t('drivers')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        {statusTabs.map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === tab ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}>
            {t(tab)} {tab !== 'All' && <span className="ml-1 text-xs opacity-70">({drivers.filter(d => d.status === tab).length})</span>}
          </button>
        ))}
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">{t('Drivers Roster')}</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('Search by name, phone, license...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Driver Name')}</TableHead>
                  <TableHead>{t('Mobile')}</TableHead>
                  <TableHead>{t('License / Expiry')}</TableHead>
                  <TableHead>{t('Govt IDs')}</TableHead>
                  <TableHead>{t('Salary')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="text-right">{t('Advance Balance')}</TableHead>
                  <TableHead className="text-center">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">{t('Loading drivers...')}</TableCell></TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">{t('No drivers found.')}</TableCell></TableRow>
                ) : (
                  filteredDrivers.map((driver) => {
                    const licExpDays = driver.licenseExpiry ? Math.ceil((new Date(driver.licenseExpiry).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : null;
                    return (
                      <TableRow key={driver.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span>{driver.driverName}</span>
                            <span className="text-xs text-muted-foreground font-normal flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{driver.address || t('No Address Listed')}
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
                                {licExpDays < 0 ? `${t('Expired')} ${Math.abs(licExpDays)}d` : `${t('Exp in')} ${licExpDays}d`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col space-y-0.5">
                            {driver.aadhaarNumber && <span>{t('AADHAAR:')} {driver.aadhaarNumber}</span>}
                            {driver.panNumber && <span>{t('PAN:')} {driver.panNumber}</span>}
                            {!driver.aadhaarNumber && !driver.panNumber && <span>-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(driver.salary || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={driver.status === 'On-Trip' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : driver.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'}>
                            {t(driver.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${(driver.advanceBalance || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{formatCurrency(driver.advanceBalance || 0)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenLedger(driver)} className="h-8 w-8 p-0 hover:bg-purple-500/20 hover:text-purple-400" title={t('View Ledger (Khata)')}><FileText className="h-3.5 w-3.5" /></Button>
                            {(driver.advanceBalance || 0) > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenSettle(driver)} className="h-8 w-8 p-0 hover:bg-green-500/20 hover:text-green-400" title={t('Settle Advance')}><CheckCircle className="h-3.5 w-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleOpenGive(driver)} className="h-8 w-8 p-0 hover:bg-orange-500/20 hover:text-orange-400" title={t('Give Advance')}><PlusCircle className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(driver)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title={t('Edit Driver')}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDriver(driver); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title={t('Delete Driver')}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('Add New Driver')}</DialogTitle><DialogDescription>{t('Register a new driver profile in the system.')}</DialogDescription></DialogHeader>
          {renderDriverForm(false, handleSubmit)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('Edit Driver — ')}{selectedDriver?.driverName}</DialogTitle><DialogDescription>{t('Update driver details and compliance information.')}</DialogDescription></DialogHeader>
          {renderDriverForm(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>

      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('Settle Driver Cash Advance')}</DialogTitle>
            <DialogDescription>{t('Subtract from')} {selectedSettleDriver?.driverName}'s {t('outstanding advance balance (Current:')} {selectedSettleDriver && formatCurrency(selectedSettleDriver.advanceBalance || 0)}).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleSubmit} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            <div className="space-y-2"><Label>{t('Settle / Deduction Amount (₹) *')}</Label><Input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-background/50 border-white/10 font-bold" required /></div>
            <div className="space-y-2"><Label>{t('Settlement Notes')}</Label><Input placeholder={t('e.g. Returned unused trip cash')} value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} className="bg-background/50 border-white/10" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsSettleOpen(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={updateMutation.isPending || createLedgerMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">{t('Settle Balance')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGiveOpen} onOpenChange={setIsGiveOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('Give Cash Advance')}</DialogTitle>
            <DialogDescription>{t('Add to')} {selectedSettleDriver?.driverName}'s {t('outstanding advance balance (Current:')} {selectedSettleDriver && formatCurrency(selectedSettleDriver.advanceBalance || 0)}).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGiveSubmit} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            <div className="space-y-2"><Label>{t('Advance Amount (₹) *')}</Label><Input type="number" value={giveAmount} onChange={(e) => setGiveAmount(e.target.value)} className="bg-background/50 border-white/10 font-bold" required /></div>
            <div className="space-y-2"><Label>{t('Notes')}</Label><Input placeholder={t('e.g. Pre-trip advance for Pune run')} value={giveNotes} onChange={(e) => setGiveNotes(e.target.value)} className="bg-background/50 border-white/10" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsGiveOpen(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={updateMutation.isPending || createLedgerMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white"><PlusCircle className="h-4 w-4 mr-2" />{t('Give Advance')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Driver?')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to permanently delete ')}<strong>{selectedDriver?.driverName}</strong>{t('? This action cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending} onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />{t('Delete Driver')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('Driver Ledger (Khata) - ')}{selectedDriver?.driverName}</DialogTitle>
            <DialogDescription>{t('Transaction history and current advance balance: ')}<span className="font-bold text-orange-500">{formatCurrency(selectedDriver?.advanceBalance || 0)}</span></DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Description')}</TableHead>
                  <TableHead className="text-right">{t('Amount (₹)')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">{t('No ledger entries found.')}</TableCell></TableRow>
                ) : (
                  ledgerData.map((entry) => (
                    <TableRow key={entry.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>{new Date(entry.date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={entry.type === 'Advance' ? 'text-orange-400 border-orange-500/30' : 'text-green-400 border-green-500/30'}>
                          {t(entry.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.description || '-'}</TableCell>
                      <TableCell className={`text-right font-bold ${entry.type === 'Advance' ? 'text-orange-500' : 'text-green-500'}`}>
                        {entry.type === 'Advance' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
