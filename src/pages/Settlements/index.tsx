import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';
import { formatCurrency } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Label } from '@/components/ui/label';

export default function Settlements() {
  const { t } = usePreferences();
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  
  const [amountGiven, setAmountGiven] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [remarks, setRemarks] = useState('');

  const { data: drivers = [], isLoading, refetch } = usePrismaQuery<any[]>(
    ['settlements', 'drivers'],
    'driver',
    'findMany',
    { 
      include: { 
        trips: {
          include: { tollEntries: true, maintenanceEntries: true, driverAdvances: true }
        }, 
        settlements: true,
        advances: true
      },
      orderBy: { driverName: 'asc' } 
    }
  );

  const createSettlement = usePrismaMutation<any, any>('driverSettlement', 'create', [['settlements', 'drivers']]);

  const calculateDriverBalance = (driver: any) => {
    let companyOwesDriver = 0; // Dene
    let driverOwesCompany = 0; // Ghene

    // Calculate from trips
    driver.trips.forEach((trip: any) => {
      companyOwesDriver += trip.commission || 0; // Assuming commission acts as driver pay per trip
      companyOwesDriver += trip.toll || 0;
      companyOwesDriver += trip.maintenance || 0;
      companyOwesDriver += trip.selfExpenses || 0;
      
      driverOwesCompany += trip.driverAdvance || 0;
      driverOwesCompany += trip.driverCash || 0;
      driverOwesCompany += trip.driverSavings || 0;
      
      // Nested arrays
      trip.tollEntries?.forEach((t: any) => companyOwesDriver += t.amount);
      trip.maintenanceEntries?.forEach((m: any) => companyOwesDriver += m.amount);
      trip.driverAdvances?.forEach((a: any) => driverOwesCompany += a.amount);
    });

    // Standalone driver advances
    driver.advances?.forEach((a: any) => driverOwesCompany += a.amount);

    // Settlements previously made
    driver.settlements?.forEach((s: any) => {
      companyOwesDriver += s.amountReceived; // Company received money from driver (reduces driver debt)
      driverOwesCompany += s.amountGiven;    // Company gave money to driver (increases driver debt)
    });

    const netBalance = companyOwesDriver - driverOwesCompany;
    return netBalance; // Positive = Company owes driver (Dene), Negative = Driver owes company (Ghene)
  };

  const filteredDrivers = drivers.filter(d => d.driverName.toLowerCase().includes(search.toLowerCase()));

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;

    createSettlement.mutate({
      data: {
        driverId: selectedDriverId,
        amountGiven: parseFloat(amountGiven) || 0,
        amountReceived: parseFloat(amountReceived) || 0,
        remarks: remarks || null,
      }
    }, {
      onSuccess: () => {
        setIsSettleOpen(false);
        setAmountGiven('');
        setAmountReceived('');
        setRemarks('');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">{t('Driver Settlements')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('Manage Ghene/Dene, advances, and trip settlements.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-background/50 border-white/10">{t('Refresh')}</Button>
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">{t('Drivers Ledger')}</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('Search drivers...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Driver Name')}</TableHead>
                  <TableHead>{t('Total Trips')}</TableHead>
                  <TableHead>{t('Net Balance')}</TableHead>
                  <TableHead className="text-center">{t('Status')}</TableHead>
                  <TableHead className="text-right">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">{t('Loading...')}</TableCell></TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">{t('No drivers found')}</TableCell></TableRow>
                ) : (
                  filteredDrivers.map(driver => {
                    const balance = calculateDriverBalance(driver);
                    return (
                      <TableRow key={driver.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-foreground">{driver.driverName}</TableCell>
                        <TableCell>{driver.trips?.length || 0}</TableCell>
                        <TableCell>
                          <div className={`font-bold ${balance > 0 ? 'text-red-400' : balance < 0 ? 'text-green-400' : 'text-foreground'}`}>
                            {formatCurrency(Math.abs(balance))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {balance > 0 ? t('To Pay (Dene)') : balance < 0 ? t('To Receive (Ghene)') : t('Cleared')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={balance === 0 ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : (balance > 0 ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-green-500/30 text-green-500 bg-green-500/10')}>
                            {balance === 0 ? t('Settled') : t('Pending')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedDriverId(driver.id); setIsSettleOpen(true); }} className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20">
                            <Wallet className="h-4 w-4 mr-2" /> {t('Settle')}
                          </Button>
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

      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('New Settlement Transaction')}</DialogTitle>
            <DialogDescription>{t('Record a payment given to or received from the driver.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Amount Given (Paid to Driver)')}</Label>
                <Input type="number" value={amountGiven} onChange={e => setAmountGiven(e.target.value)} placeholder="0" className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>{t('Amount Received (From Driver)')}</Label>
                <Input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} placeholder="0" className="bg-background/50 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Remarks / Notes')}</Label>
              <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={t('e.g. Final settlement for Trip 1001')} className="bg-background/50 border-white/10" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setIsSettleOpen(false)} disabled={createSettlement.isPending}>{t('Cancel')}</Button>
              <Button type="submit" disabled={createSettlement.isPending || (!amountGiven && !amountReceived)} className="bg-primary text-primary-foreground">
                {createSettlement.isPending ? t('Saving...') : t('Save Settlement')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
