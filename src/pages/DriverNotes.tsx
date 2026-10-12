import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, Edit, Trash2, Tag, Filter, RefreshCw, BookOpen, Users, Phone, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { StandaloneDriverLedger, Driver } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';

// Separated into Give vs Receive for clearer driver accounting
const GIVE_TYPES = [
  'Salary',
  'Advance',
  'Cash Given',
  'Expenses Paid',
];

const RECEIVE_TYPES = [
  'Money Received',
  'Recovery',
  'Other Receipt',
];

const TYPE_COLORS: Record<string, string> = {
  'Salary': 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  'Advance': 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  'Cash Given': 'border-green-500/30 text-green-500 bg-green-500/10',
  'Expenses Paid': 'border-orange-500/30 text-orange-500 bg-orange-500/10',
  'Money Received': 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10',
  'Recovery': 'border-cyan-500/30 text-cyan-500 bg-cyan-500/10',
  'Other Receipt': 'border-slate-500/30 text-slate-500 bg-slate-500/10',
  // Legacy types for backward compatibility
  'Driver cash': 'border-green-500/30 text-green-500 bg-green-500/10',
  'Driver kharch': 'border-orange-500/30 text-orange-500 bg-orange-500/10',
  'Driver bachat multiple': 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  'Driver Salary': 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  'Driver thene dene': 'border-red-500/30 text-red-500 bg-red-500/10',
};

export default function DriverNotes() {
  const { t } = usePreferences();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string | null>(
    (location.state as any)?.driverName || null
  );
  
  useEffect(() => {
    if ((location.state as any)?.driverName) {
      setSelectedDriverFilter((location.state as any).driverName);
    }
  }, [location.state]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StandaloneDriverLedger | null>(null);

  // Form State
  const [driverName, setDriverName] = useState('');
  const [type, setType] = useState(GIVE_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const { data: drivers = [] } = usePrismaQuery<Driver[]>(
    ['drivers', 'all'],
    'driver',
    'findMany',
    { orderBy: { driverName: 'asc' } }
  );

  const { data: entries = [], isLoading, refetch } = usePrismaQuery<StandaloneDriverLedger[]>(
    ['standaloneLedgers', 'all'],
    'standaloneDriverLedger',
    'findMany',
    { orderBy: { date: 'desc' } }
  );

  const createMutation = usePrismaMutation<any, StandaloneDriverLedger>('standaloneDriverLedger', 'create', [['standaloneLedgers', 'all']]);
  const updateMutation = usePrismaMutation<any, StandaloneDriverLedger>('standaloneDriverLedger', 'update', [['standaloneLedgers', 'all']]);
  const deleteMutation = usePrismaMutation<any, StandaloneDriverLedger>('standaloneDriverLedger', 'delete', [['standaloneLedgers', 'all']]);

  const resetForm = () => {
    setDriverName(selectedDriverFilter || '');
    setType(GIVE_TYPES[0]);
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSelectedEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!amount || parseFloat(amount) <= 0) {
      setError(t('Please enter a valid amount'));
      return;
    }
    if (!driverName.trim()) {
      setError(t('Please enter driver name'));
      return;
    }
    createMutation.mutate({
      data: {
        driverName: driverName.trim(),
        type,
        amount: parseFloat(amount),
        notes: notes || null,
        date: new Date(date)
      }
    }, {
      onSuccess: () => {
        toast.success(t('Driver note recorded successfully'));
        setIsOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast.error(t('Failed to save note: ') + err.message);
        setError(err.message);
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedEntry) return;
    if (!amount || parseFloat(amount) <= 0) {
      setError(t('Please enter a valid amount'));
      return;
    }
    if (!driverName.trim()) {
      setError(t('Please enter driver name'));
      return;
    }
    updateMutation.mutate({
      where: { id: selectedEntry.id },
      data: {
        driverName: driverName.trim(),
        type,
        amount: parseFloat(amount),
        notes: notes || null,
        date: new Date(date)
      }
    }, {
      onSuccess: () => {
        toast.success(t('Driver note updated successfully'));
        setIsEditOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast.error(t('Failed to update note: ') + err.message);
        setError(err.message);
      }
    });
  };

  const handleOpenEdit = (entry: StandaloneDriverLedger) => {
    setSelectedEntry(entry);
    setDriverName(entry.driverName);
    setType(entry.type);
    setAmount(String(entry.amount));
    setNotes(entry.notes || '');
    setDate(new Date(entry.date).toISOString().split('T')[0]);
    setError('');
    setIsEditOpen(true);
  };

  const handleDelete = () => {
    if (!selectedEntry) return;
    deleteMutation.mutate({ where: { id: selectedEntry.id } }, {
      onSuccess: () => {
        toast.success(t('Driver note deleted successfully'));
        setIsDeleteOpen(false);
        setSelectedEntry(null);
      },
      onError: (err: any) => {
        toast.error(t('Failed to delete note: ') + err.message);
        setError(err.message);
      }
    });
  };

  // Group entries by driver — separate give vs receive
  const isGiveType = (t: string) => GIVE_TYPES.includes(t) || ['Driver cash', 'Driver kharch', 'Driver Salary'].includes(t);
  const isReceiveType = (t: string) => RECEIVE_TYPES.includes(t) || ['Driver bachat multiple', 'Driver thene dene'].includes(t);

  const driverSummaries: Record<string, any> = {};

  // Initialize with registered drivers to connect directory with financials
  drivers.forEach(d => {
    driverSummaries[d.driverName.trim()] = {
      name: d.driverName.trim(),
      mobile: d.mobileNumber,
      salary: d.salary || 0,
      totalGiven: d.advanceBalance || 0,
      totalReceived: 0,
    };
  });

  // Aggregate standalone entries
  entries.forEach((entry: StandaloneDriverLedger) => {
    const trimmedName = entry.driverName.trim();
    if (!driverSummaries[trimmedName]) {
      const match = drivers.find(d => d.driverName.trim().toLowerCase() === trimmedName.toLowerCase());
      driverSummaries[trimmedName] = {
        name: trimmedName,
        mobile: match?.mobileNumber || '',
        salary: match?.salary || 0,
        totalGiven: 0,
        totalReceived: 0,
      };
    }
    const val = entry.amount || 0;
    if (isGiveType(entry.type)) {
      driverSummaries[trimmedName].totalGiven += val;
    } else if (isReceiveType(entry.type)) {
      driverSummaries[trimmedName].totalReceived += val;
    }
  });

  const summaryList: any[] = Object.values(driverSummaries);

  const filteredEntries = entries.filter((entry: StandaloneDriverLedger) => {
    const matchesType = typeFilter === 'All' || entry.type === typeFilter;
    const matchesDriver = selectedDriverFilter 
      ? entry.driverName.trim().toLowerCase() === selectedDriverFilter.trim().toLowerCase() 
      : true;
    const matchesSearch = 
      entry.driverName.toLowerCase().includes(search.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(search.toLowerCase()));
    
    return matchesType && matchesDriver && matchesSearch;
  });

  const activeDriverInfo = selectedDriverFilter 
    ? (driverSummaries[selectedDriverFilter.trim()] || drivers.find(d => d.driverName.trim().toLowerCase() === selectedDriverFilter.trim().toLowerCase()))
    : null;

  const renderForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      
      <div className="space-y-2">
        <Label>{t('Driver Name *')}</Label>
        <Input 
          list="driver-name-options" 
          placeholder={t('Enter or select driver name...')} 
          value={driverName} 
          onChange={(e) => setDriverName(e.target.value)} 
          className="bg-background/50 border-white/10" 
          required 
          autoFocus 
        />
        <datalist id="driver-name-options">
          {drivers.map(d => (
            <option key={d.id} value={d.driverName}>
              {d.driverName} {d.salary ? `(Salary: ₹${d.salary.toLocaleString('en-IN')})` : ''}
            </option>
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label>{t('Entry Type *')}</Label>
        <Select value={type} onValueChange={setType} required>
          <SelectTrigger className="bg-background/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">{t('💸 Money Given to Driver')}</div>
            {GIVE_TYPES.map(tOption => <SelectItem key={tOption} value={tOption}>{t(tOption)}</SelectItem>)}
            <div className="px-2 py-1 text-xs text-muted-foreground font-semibold border-t border-white/10 mt-1 pt-1">{t('💰 Money Received from Driver')}</div>
            {RECEIVE_TYPES.map(tOption => <SelectItem key={tOption} value={tOption}>{t(tOption)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Date *')}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/50 border-white/10" required />
        </div>
        <div className="space-y-2">
          <Label>{t('Amount (₹) *')}</Label>
          <Input type="number" placeholder={t('e.g. 5000')} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background/50 border-white/10" required />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>{t('Notes / Description')}</Label>
        <Input placeholder={t('Optional write-up...')} value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background/50 border-white/10" />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); setIsEditOpen(false); resetForm(); }}>{t('Cancel')}</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {createMutation.isPending || updateMutation.isPending ? t('Saving...') : (isEdit ? t('Update Entry') : t('Save Entry'))}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('Driver Notes / Ledger')}
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('New Entry')}
          </Button>
        </div>
      </div>

      {/* DRIVER SUMMARY DASHBOARD */}
      {summaryList.length > 0 && (
        <Card className="glass border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('Driver Accounts Summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>{t('Driver Name')}</TableHead>
                    <TableHead>{t('Mobile')}</TableHead>
                    <TableHead className="text-right text-purple-400">{t('Salary (Monthly)')}</TableHead>
                    <TableHead className="text-right text-orange-400">{t('💸 Total Given')}</TableHead>
                    <TableHead className="text-right text-green-400">{t('💰 Total Received')}</TableHead>
                    <TableHead className="text-right">{t('Net Balance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryList.map((driver) => {
                    const netBalance = driver.totalGiven - driver.totalReceived;
                    const isSelected = selectedDriverFilter?.trim().toLowerCase() === driver.name.toLowerCase();
                    return (
                      <TableRow 
                        key={driver.name} 
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/15 border-primary/30' : 'hover:bg-white/5 border-white/10'}`}
                        onClick={() => setSelectedDriverFilter(isSelected ? null : driver.name)}
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {driver.name}
                          {isSelected && <Badge variant="default" className="ml-1 text-[10px]">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{driver.mobile || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-purple-400">{driver.salary ? formatCurrency(driver.salary) : '-'}</TableCell>
                        <TableCell className="text-right font-medium text-orange-400">{formatCurrency(driver.totalGiven)}</TableCell>
                        <TableCell className="text-right font-medium text-green-400">{formatCurrency(driver.totalReceived)}</TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={netBalance >= 0 ? 'text-orange-500' : 'text-green-500'}>
                            {netBalance >= 0 ? `${formatCurrency(netBalance)} (Payable)` : `${formatCurrency(Math.abs(netBalance))} (Receivable)`}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE DRIVER FILTER BANNER */}
      {selectedDriverFilter && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/25 text-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <Users className="h-4 w-4 text-primary" />
            <span>
              {t('Showing records for:')} <strong className="text-foreground">{selectedDriverFilter}</strong>
            </span>
            {activeDriverInfo?.salary ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-purple-400" /> {t('Monthly Salary:')} <strong className="text-purple-400">{formatCurrency(activeDriverInfo.salary)}</strong>
              </span>
            ) : null}
            {activeDriverInfo?.mobile ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" /> <strong className="text-foreground">{activeDriverInfo.mobile}</strong>
              </span>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDriverFilter(null)} className="h-7 text-xs hover:bg-white/10">
            {t('Show All Drivers')}
          </Button>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
            <Button variant={typeFilter === 'All' ? 'default' : 'ghost'} size="sm" onClick={() => setTypeFilter('All')} className={`rounded-full h-7 px-3 text-xs ${typeFilter === 'All' ? '' : 'text-muted-foreground hover:text-foreground hover:bg-white/20'}`}>{t('All')}</Button>
            <span className="text-[10px] text-muted-foreground mx-1">|</span>
            <span className="text-[10px] text-orange-400 mr-1">💸</span>
            {GIVE_TYPES.map(typeOpt => (
              <Button key={typeOpt} variant={typeFilter === typeOpt ? 'default' : 'ghost'} size="sm" onClick={() => setTypeFilter(typeOpt)} className={`rounded-full h-7 px-3 text-xs ${typeFilter === typeOpt ? '' : 'text-muted-foreground hover:text-foreground hover:bg-white/20'}`}>{t(typeOpt)}</Button>
            ))}
            <span className="text-[10px] text-muted-foreground mx-1">|</span>
            <span className="text-[10px] text-green-400 mr-1">💰</span>
            {RECEIVE_TYPES.map(typeOpt => (
              <Button key={typeOpt} variant={typeFilter === typeOpt ? 'default' : 'ghost'} size="sm" onClick={() => setTypeFilter(typeOpt)} className={`rounded-full h-7 px-3 text-xs ${typeFilter === typeOpt ? '' : 'text-muted-foreground hover:text-foreground hover:bg-white/20'}`}>{t(typeOpt)}</Button>
            ))}
          </div>
        </div>

        {selectedDriverFilter && (
          <Button variant="secondary" size="sm" onClick={() => setSelectedDriverFilter(null)} className="h-8">
            Clear Filter: {selectedDriverFilter}
          </Button>
        )}
      </div>

      {/* DETAILED LEDGER TABLE */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {selectedDriverFilter ? t(`${selectedDriverFilter}'s Ledger Entries`) : t('All Ledger Entries')}
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('Search notes...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Driver Name')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Notes')}</TableHead>
                  <TableHead className="text-right">{t('Amount')}</TableHead>
                  <TableHead className="text-center">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">{t('Loading entries...')}</TableCell></TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">{t('No entries found.')}</TableCell></TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {new Date(entry.date).toLocaleDateString('en-GB')}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {entry.driverName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_COLORS[entry.type] || 'border-slate-500/30 text-slate-500 bg-slate-500/10'}>
                          <Tag className="h-3 w-3 mr-1" />{t(entry.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.notes || '-'}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(entry)} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title={t('Edit')}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedEntry(entry); setIsDeleteOpen(true); }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title={t('Delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* MODALS */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader><DialogTitle>{t('New Standalone Entry')}</DialogTitle><DialogDescription>{t('Add a new independent driver ledger entry.')}</DialogDescription></DialogHeader>
          {renderForm(false, handleSubmit)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader><DialogTitle>{t('Edit Entry')}</DialogTitle><DialogDescription>{t('Update the details of this entry.')}</DialogDescription></DialogHeader>
          {renderForm(true, handleEditSubmit)}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Entry?')}</DialogTitle>
            <DialogDescription>
              {t('Delete this entry for ')}<strong>{selectedEntry?.driverName}</strong>{t('? This cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending} onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />{t('Delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
