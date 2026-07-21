import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, Edit, Trash2, Tag, Filter, RefreshCw, BookOpen, Users } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { StandaloneDriverLedger } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';

const ENTRY_TYPES = [
  'Driver cash',
  'Driver kharch',
  'Driver bachat multiple',
  'Driver Salary',
  'Driver thene dene'
];

const TYPE_COLORS: Record<string, string> = {
  'Driver cash': 'border-green-500/30 text-green-500 bg-green-500/10',
  'Driver kharch': 'border-orange-500/30 text-orange-500 bg-orange-500/10',
  'Driver bachat multiple': 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  'Driver Salary': 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  'Driver thene dene': 'border-red-500/30 text-red-500 bg-red-500/10'
};

export default function DriverNotes() {
  const { t } = usePreferences();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string | null>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StandaloneDriverLedger | null>(null);

  // Form State
  const [driverName, setDriverName] = useState('');
  const [type, setType] = useState(ENTRY_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

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
    setDriverName('');
    setType(ENTRY_TYPES[0]);
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
        setIsOpen(false);
        resetForm();
      },
      onError: (err: any) => setError(err.message)
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
        setIsEditOpen(false);
        resetForm();
      },
      onError: (err: any) => setError(err.message)
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
        setIsDeleteOpen(false);
        setSelectedEntry(null);
      },
      onError: (err: any) => setError(err.message)
    });
  };

  // Group entries by driver
  const driverSummaries = entries.reduce((acc: any, entry: StandaloneDriverLedger) => {
    if (!acc[entry.driverName]) {
      acc[entry.driverName] = {
        name: entry.driverName,
        cash: 0,
        kharch: 0,
        bachat: 0,
        salary: 0,
        theneDene: 0,
      };
    }
    const val = entry.amount || 0;
    if (entry.type === 'Driver cash') acc[entry.driverName].cash += val;
    else if (entry.type === 'Driver kharch') acc[entry.driverName].kharch += val;
    else if (entry.type === 'Driver bachat multiple') acc[entry.driverName].bachat += val;
    else if (entry.type === 'Driver Salary') acc[entry.driverName].salary += val;
    else if (entry.type === 'Driver thene dene') acc[entry.driverName].theneDene += val;
    
    return acc;
  }, {});

  const summaryList: any[] = Object.values(driverSummaries);

  const filteredEntries = entries.filter((entry: StandaloneDriverLedger) => {
    const matchesType = typeFilter === 'All' || entry.type === typeFilter;
    const matchesDriver = selectedDriverFilter ? entry.driverName === selectedDriverFilter : true;
    const matchesSearch = 
      entry.driverName.toLowerCase().includes(search.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(search.toLowerCase()));
    
    return matchesType && matchesDriver && matchesSearch;
  });

  const renderForm = (isEdit: boolean, onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4 py-4">
      {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
      
      <div className="space-y-2">
        <Label>{t('Driver Name *')}</Label>
        <Input placeholder={t('Enter driver name manually...')} value={driverName} onChange={(e) => setDriverName(e.target.value)} className="bg-background/50 border-white/10" required autoFocus />
      </div>

      <div className="space-y-2">
        <Label>{t('Entry Type *')}</Label>
        <Select value={type} onValueChange={setType} required>
          <SelectTrigger className="bg-background/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRY_TYPES.map(tOption => <SelectItem key={tOption} value={tOption}>{t(tOption)}</SelectItem>)}
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
                    <TableHead className="text-right text-purple-400">{t('Salary')}</TableHead>
                    <TableHead className="text-right text-orange-400">{t('Kharcha')}</TableHead>
                    <TableHead className="text-right text-blue-400">{t('Bachat')}</TableHead>
                    <TableHead className="text-right text-green-400">{t('Cash')}</TableHead>
                    <TableHead className="text-right text-red-400">{t('Thene Dene')}</TableHead>
                    <TableHead className="text-right">{t('Net Balance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryList.map((driver) => {
                    const netBalance = (driver.salary + driver.bachat) - (driver.cash + driver.kharch);
                    return (
                      <TableRow 
                        key={driver.name} 
                        className={`cursor-pointer transition-colors ${selectedDriverFilter === driver.name ? 'bg-primary/10' : 'hover:bg-white/5 border-white/10'}`}
                        onClick={() => setSelectedDriverFilter(selectedDriverFilter === driver.name ? null : driver.name)}
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {driver.name}
                          {selectedDriverFilter === driver.name && <Badge variant="default" className="ml-2 text-[10px]">Filtering</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-medium text-purple-400">{formatCurrency(driver.salary)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-400">{formatCurrency(driver.kharch)}</TableCell>
                        <TableCell className="text-right font-medium text-blue-400">{formatCurrency(driver.bachat)}</TableCell>
                        <TableCell className="text-right font-medium text-green-400">{formatCurrency(driver.cash)}</TableCell>
                        <TableCell className="text-right font-medium text-red-400">{formatCurrency(driver.theneDene)}</TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={netBalance >= 0 ? 'text-primary' : 'text-red-500'}>
                            {formatCurrency(netBalance)}
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

      {/* FILTER CONTROLS */}
      <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
            {['All', ...ENTRY_TYPES].map(typeOpt => (
              <Button
                key={typeOpt}
                variant={typeFilter === typeOpt ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter(typeOpt)}
                className={`rounded-full h-7 px-3 text-xs ${typeFilter === typeOpt ? '' : 'text-muted-foreground hover:text-foreground hover:bg-white/20'}`}
              >
                {t(typeOpt)}
              </Button>
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
