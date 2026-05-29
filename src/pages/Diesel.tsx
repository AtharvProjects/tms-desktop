import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Fuel, Calendar, DollarSign, Gauge, Trash2, Filter, RefreshCw, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import type { DieselLog, Vehicle, Trip } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

type DieselLogWithVehicle = DieselLog & { vehicle?: Vehicle };

export default function Diesel() {
  const { t } = usePreferences();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(location.state && (location.state as any).openNew);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DieselLogWithVehicle | null>(null);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelStation, setFuelStation] = useState('');
  const [litres, setLitres] = useState('');
  const [ratePerLitre, setRatePerLitre] = useState('');
  const [odometer, setOdometer] = useState('');
  const [tripReference, setTripReference] = useState('');
  const [error, setError] = useState('');

  const { data: logs = [], isLoading, refetch } = usePrismaQuery<DieselLogWithVehicle[]>(
    ['dieselLogs', 'all'],
    'dieselLog',
    'findMany',
    { include: { vehicle: true }, orderBy: { date: 'desc' } }
  );

  const { data: vehicles = [] } = usePrismaQuery<Vehicle[]>(
    ['vehicles', 'all'],
    'vehicle',
    'findMany',
    { orderBy: { vehicleNumber: 'asc' } }
  );

  const { data: trips = [] } = usePrismaQuery<Trip[]>(
    ['trips', 'all'],
    'trip',
    'findMany',
    { orderBy: { tripNo: 'desc' } }
  );

  const createMutation = usePrismaMutation<any, DieselLog>('dieselLog', 'create', [['dieselLogs', 'all']]);
  const deleteMutation = usePrismaMutation<any, DieselLog>('dieselLog', 'delete', [['dieselLogs', 'all']]);

  const getMileage = (log: DieselLogWithVehicle, index: number) => {
    if (!log.odometer) return null;
    const prevLog = logs.slice(index + 1).find(l => l.vehicleId === log.vehicleId && l.odometer);
    if (!prevLog || !prevLog.odometer || prevLog.odometer >= log.odometer) return null;
    const dist = log.odometer - prevLog.odometer;
    const mileage = dist / log.litres;
    return mileage.toFixed(2);
  };

  const calculatedTotalCost = (parseFloat(litres) || 0) * (parseFloat(ratePerLitre) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!vehicleId || !litres || !ratePerLitre) {
      setError(t('Vehicle, Litres, and Rate per Litre are required'));
      return;
    }
    createMutation.mutate({
      data: {
        vehicleId,
        date: new Date(date),
        fuelStation: fuelStation || null,
        litres: parseFloat(litres),
        ratePerLitre: parseFloat(ratePerLitre),
        totalCost: calculatedTotalCost,
        odometer: odometer ? parseInt(odometer) : null
      }
    }, {
      onSuccess: () => {
        setIsOpen(false);
        resetForm();
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const handleDelete = () => {
    if (!selectedLog) return;
    deleteMutation.mutate({ where: { id: selectedLog.id } }, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedLog(null);
      },
      onError: (err: any) => setError(err.message)
    });
  };

  const resetForm = () => {
    setVehicleId('');
    setDate(new Date().toISOString().split('T')[0]);
    setFuelStation('');
    setLitres('');
    setRatePerLitre('');
    setOdometer('');
    setTripReference('');
    setError('');
  };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const filteredLogs = logs.filter(log => {
    const matchesVehicle = vehicleFilter === 'All' || log.vehicleId === vehicleFilter;
    const matchesSearch = log.vehicle?.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (log.fuelStation && log.fuelStation.toLowerCase().includes(search.toLowerCase()));
    const logDate = new Date(log.date);
    const matchesMonth = monthFilter === 'all' ||
      (monthFilter === 'this' && logDate >= thisMonthStart) ||
      (monthFilter === 'last' && logDate >= lastMonthStart && logDate <= lastMonthEnd);
    return matchesVehicle && matchesSearch && matchesMonth;
  });

  const totalSpend = filteredLogs.reduce((acc, log) => acc + (log.totalCost || 0), 0);
  const totalLitresFilled = filteredLogs.reduce((acc, log) => acc + (log.litres || 0), 0);
  const averageRate = filteredLogs.length > 0 ? (filteredLogs.reduce((acc, log) => acc + (log.ratePerLitre || 0), 0) / filteredLogs.length) : 0;
  const thisMonthSpend = logs.filter(l => new Date(l.date) >= thisMonthStart).reduce((acc, l) => acc + (l.totalCost || 0), 0);

  // Per-vehicle average mileage
  const vehicleMileages: Record<string, { total: number; count: number; vehicleNumber: string }> = {};
  logs.forEach((log, index) => {
    const mileage = getMileage(log, index);
    if (mileage && log.vehicle) {
      if (!vehicleMileages[log.vehicleId]) {
        vehicleMileages[log.vehicleId] = { total: 0, count: 0, vehicleNumber: log.vehicle.vehicleNumber };
      }
      vehicleMileages[log.vehicleId].total += parseFloat(mileage);
      vehicleMileages[log.vehicleId].count += 1;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('Fuel & Diesel Logging')}
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('Add Fuel Log')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Fuel Expense')}</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(thisMonthSpend)}{t(' this month')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Litres Filled')}</CardTitle>
            <Fuel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLitresFilled.toLocaleString('en-IN')} L</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredLogs.length}{t(' fill-ups recorded')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Avg Price / Litre')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(averageRate)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('across ')}{filteredLogs.length}{t(' entries')}</p>
          </CardContent>
        </Card>
      </div>

      {Object.values(vehicleMileages).length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Gauge className="h-4 w-4 mr-2 text-green-500" />
              {t('Fleet Mileage Efficiency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.values(vehicleMileages).map(vm => (
                <div key={vm.vehicleNumber} className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <span className="font-mono text-sm font-semibold">{vm.vehicleNumber}</span>
                  <span className="text-green-500 font-bold text-sm">{(vm.total / vm.count).toFixed(2)}{t(' km/L avg')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
        >
          <option value="All">{t('All Vehicles')}</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
        </select>
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {[['all', t('All Time')], ['this', t('This Month')], ['last', t('Last Month')]].map(([val, label]) => (
            <button key={val} onClick={() => setMonthFilter(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${monthFilter === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">{t('Diesel Refueling Logs')}</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('Search by truck number or station...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Vehicle')}</TableHead>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Fuel Station')}</TableHead>
                  <TableHead className="text-right">{t('Volume (L)')}</TableHead>
                  <TableHead className="text-right">{t('Rate / L')}</TableHead>
                  <TableHead className="text-right">{t('Total Cost')}</TableHead>
                  <TableHead className="text-right">{t('Odometer')}</TableHead>
                  <TableHead className="text-center">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">{t('Loading fuel logs...')}</TableCell></TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">{t('No fuel logs recorded yet.')}</TableCell></TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold font-mono text-foreground">{log.vehicle?.vehicleNumber}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>{log.fuelStation || t('N/A Station')}</TableCell>
                      <TableCell className="text-right font-medium">{log.litres.toLocaleString('en-IN')} L</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(log.ratePerLitre)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(log.totalCost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.odometer ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center justify-end font-semibold">
                              <Gauge className="h-3 w-3 mr-1 text-muted-foreground" />
                              {log.odometer.toLocaleString('en-IN')}{t(' km')}
                            </span>
                            {(() => {
                              const mileage = getMileage(log, index);
                              return mileage ? (
                                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1.5 py-0.5 rounded mt-0.5">
                                  {mileage}{t(' km/L')}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedLog(log); setIsDeleteOpen(true); }}
                          className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                          title={t('Delete Log')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLogs.length > 0 && (
            <div className="flex justify-between items-center mt-3 px-2 py-2 bg-primary/5 rounded-lg border border-primary/10">
              <span className="text-sm text-muted-foreground">{t('Total (')}{filteredLogs.length}{t(' entries)')}</span>
              <div className="flex items-center space-x-4 text-sm font-bold">
                <span>{totalLitresFilled.toFixed(1)} L {t('total')}</span>
                <span className="text-primary">{formatCurrency(totalSpend)} {t('total')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('Log Fuel Entry')}</DialogTitle>
            <DialogDescription>{t('Record diesel filling details for fuel tracking and trip reconciliation.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{error}</div>}
            
            <div className="space-y-2">
              <Label htmlFor="vehicleId">{t('Vehicle / Truck *')}</Label>
              <select id="vehicleId" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground" required>
                <option value="">{t('Select Vehicle')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('Refuel Date *')}</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/50 border-white/10" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer">{t('Odometer (km)')}</Label>
                <Input id="odometer" type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder={t('Current km reading')} className="bg-background/50 border-white/10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelStation">{t('Fuel Station / Vendor Name')}</Label>
              <Input id="fuelStation" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} placeholder={t('e.g. HP Petrol Pump, Reliance NH4')} className="bg-background/50 border-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="litres">{t('Fuel Litres Filled *')}</Label>
                <Input id="litres" type="number" step="0.01" value={litres} onChange={(e) => setLitres(e.target.value)} placeholder={t('e.g. 150')} className="bg-background/50 border-white/10" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">{t('Price per Litre *')}</Label>
                <Input id="rate" type="number" step="0.01" value={ratePerLitre} onChange={(e) => setRatePerLitre(e.target.value)} placeholder={t('e.g. 91.50')} className="bg-background/50 border-white/10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripReference">{t('Link to Trip (Optional)')}</Label>
              <select id="tripReference" value={tripReference} onChange={(e) => setTripReference(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
                <option value="">{t('None')}</option>
                {trips.map(t => <option key={t.id} value={t.tripNo}>{t.tripNo} ({t.from} → {t.to})</option>)}
              </select>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">{t('Estimated Total Cost:')}</span>
                <span className="text-lg font-bold text-primary font-mono">{formatCurrency(calculatedTotalCost)}</span>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">{t('Log Diesel Entry')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Fuel Log?')}</DialogTitle>
            <DialogDescription>
              {t('Delete this fuel entry for ')}<strong>{selectedLog?.vehicle?.vehicleNumber}</strong>{t(' on ')}{selectedLog && new Date(selectedLog.date).toLocaleDateString()} ({selectedLog?.litres}L — {formatCurrency(selectedLog?.totalCost || 0)}){t('? Cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending} onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />{t('Delete Entry')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
