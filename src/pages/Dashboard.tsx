import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, AlertCircle, Clock, MapPin, Plus, 
  TrendingUp, TrendingDown, DollarSign, Wallet, FileText,
  RefreshCw, CheckCircle, AlertTriangle, Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { usePrismaQuery } from '@/hooks/usePrisma';
import { formatCurrency } from '@/lib/utils';
import type { Vehicle, Party, Expense, DieselLog } from '@prisma/client';
import { usePreferences } from '../contexts/PreferencesContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [chartDateRange, setChartDateRange] = useState('6M'); // 6M, 1M, All
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { data: vehicles = [], refetch: refetchVehicles } = usePrismaQuery<Vehicle[]>(
    ['vehicles', 'all'], 'vehicle', 'findMany', { orderBy: { vehicleNumber: 'asc' } }
  );
  
  const { data: trips = [], refetch: refetchTrips } = usePrismaQuery<any[]>(
    ['trips', 'all'], 'trip', 'findMany', { include: { vehicle: true, driver: true, party: true }, orderBy: { createdAt: 'desc' } }
  );
  
  const { data: invoices = [], refetch: refetchInvoices } = usePrismaQuery<any[]>(
    ['invoices', 'all'], 'invoice', 'findMany', { include: { trip: { include: { party: true } } }, orderBy: { date: 'desc' } }
  );
  
  const { data: parties = [], refetch: refetchParties } = usePrismaQuery<Party[]>(
    ['parties', 'all'], 'party', 'findMany', { orderBy: { companyName: 'asc' } }
  );
  
  const { data: expenses = [], refetch: refetchExpenses } = usePrismaQuery<Expense[]>(
    ['expenses', 'all'], 'expense', 'findMany', { orderBy: { date: 'desc' } }
  );
  
  const { data: dieselLogs = [], refetch: refetchDieselLogs } = usePrismaQuery<DieselLog[]>(
    ['dieselLogs', 'all'], 'dieselLog', 'findMany', { orderBy: { date: 'desc' } }
  );

  const loadDashboardData = () => {
    refetchVehicles();
    refetchTrips();
    refetchInvoices();
    refetchParties();
    refetchExpenses();
    refetchDieselLogs();
  };

  useEffect(() => {
    // Keyboard shortcuts listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      
      if (e.key === '?') { setShowShortcuts(true); e.preventDefault(); }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n') { navigate('/trips', { state: { openNew: true } }); e.preventDefault(); }
        if (e.key === 'i') { navigate('/invoices', { state: { openNew: true } }); e.preventDefault(); }
        if (e.key === 'e') { navigate('/expenses', { state: { openNew: true } }); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [navigate]);

  const isExpiredSoon = (dateStr: string | Date | null) => {
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    const diff = exp.getTime() - new Date().getTime();
    return diff < 30 * 24 * 60 * 60 * 1000;
  };

  const complianceAlerts = vehicles.filter(v => 
    isExpiredSoon(v.insuranceExpiry) || 
    isExpiredSoon(v.fitnessExpiry) || 
    isExpiredSoon(v.pollutionExpiry) ||
    isExpiredSoon(v.permitExpiry)
  );

  const unpaidInvoices = invoices.filter(i => i.status !== 'Paid');
  
  // Pending POD logic (Overdue > 5 days)
  const pendingPODs = trips.filter(t => t.podStatus === 'Pending' && (new Date().getTime() - new Date(t.tripDate).getTime() > 5 * 24 * 60 * 60 * 1000));
  
  // Today's active trips
  const activeTrips = trips.filter(t => t.podStatus === 'Pending');

  // Monthly stats calculations
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthTrips = trips.filter(t => new Date(t.tripDate) >= thisMonthStart);
  const lastMonthTrips = trips.filter(t => new Date(t.tripDate) >= lastMonthStart && new Date(t.tripDate) <= lastMonthEnd);

  const thisMonthRevenue = thisMonthTrips.reduce((acc, t) => acc + (t.freightAmount || 0), 0);
  const lastMonthRevenue = lastMonthTrips.reduce((acc, t) => acc + (t.freightAmount || 0), 0);
  
  const thisMonthExpenses = expenses.filter(e => new Date(e.date) >= thisMonthStart).reduce((acc, e) => acc + (e.amount || 0), 0);
  const thisMonthDiesel = dieselLogs.filter(d => new Date(d.date) >= thisMonthStart).reduce((acc, d) => acc + (d.totalCost || 0), 0);
  
  // Profit = Freight - Diesel - Expenses
  const thisMonthProfit = thisMonthRevenue - thisMonthDiesel - thisMonthExpenses;

  const revenueGrowth = lastMonthRevenue === 0 ? 100 : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  // Chart Data generation
  const monthlyData = useMemo(() => {
    const data = [];
    const monthsToShow = chartDateRange === '6M' ? 6 : chartDateRange === '1M' ? 1 : 12;
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short' });
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const r = trips.filter(t => new Date(t.tripDate) >= mStart && new Date(t.tripDate) <= mEnd).reduce((acc, t) => acc + (t.freightAmount || 0), 0);
      const dExp = dieselLogs.filter(log => new Date(log.date) >= mStart && new Date(log.date) <= mEnd).reduce((acc, l) => acc + (l.totalCost || 0), 0);
      const oExp = expenses.filter(exp => new Date(exp.date) >= mStart && new Date(exp.date) <= mEnd).reduce((acc, e) => acc + (e.amount || 0), 0);
      
      const p = r - dExp - oExp;
      data.push({ name: monthStr, revenue: r, profit: Math.max(0, p) });
    }
    return data;
  }, [trips, dieselLogs, expenses, chartDateRange]);

  const handleWhatsAppReminder = async (invoice: any) => {
    const phone = invoice.trip?.party?.phone;
    if (!phone) { alert("No phone number registered for this party."); return; }
    const text = `Dear ${invoice.trip.party.companyName},\n\nThis is a gentle reminder that invoice ${invoice.invoiceNumber} for Rs. ${invoice.totalAmount.toLocaleString('en-IN')} is still pending.\n\nPlease arrange for the payment at the earliest.\n\nThank you!`;
    
    if (window.electronAPI?.whatsapp) {
      const isConnected = localStorage.getItem('whatsappConnected') === 'true';
      if (isConnected) {
        try {
          const res = await window.electronAPI.whatsapp.send(phone, text);
          if (res && res.error) { alert('Error sending WhatsApp reminder: ' + res.error); } 
          else { alert(`WhatsApp reminder sent to ${invoice.trip.party.companyName}!`); }
        } catch (err: any) { alert('WhatsApp send failed: ' + err.message); }
        return;
      }
    }
    
    alert("Please connect WhatsApp in Settings to send messages automatically.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('Command Center')}
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="hover:bg-white/10 text-muted-foreground" title={t("Keyboard Shortcuts (?)")}>
            <Keyboard className="h-4 w-4 mr-1" /> {t('Shortcuts')}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadDashboardData} className="hover:bg-white/10">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/trips', { state: { openNew: true } })} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('New Trip')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/trips')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Est. Net Profit')}</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${thisMonthProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatCurrency(thisMonthProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-primary mr-1">{t('This Month')}</span> {t('(Freight - Fuel - Exp)')}
            </p>
          </CardContent>
        </Card>
        <Card className="glass relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/trips')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Monthly Freight Revenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> : <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
              <span className={revenueGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(revenueGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">{t('vs last month')}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="glass relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate('/vehicles')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Active Vehicles')}</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.filter(v => v.status === 'Active' || v.status === 'On-Trip').length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              {t('out of')} {vehicles.length} {t('total fleet')}
            </p>
          </CardContent>
        </Card>
        <Card className="glass relative overflow-hidden group hover:border-orange-500/50 transition-colors cursor-pointer" onClick={() => navigate('/parties')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Pending Collect')}</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(parties.reduce((acc, p) => acc + (p.outstandingBalance || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('across')} {parties.filter(p => (p.outstandingBalance || 0) > 0).length} {t('customers')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="glass md:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('Financial Overview')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t('Revenue vs Est. Profit')}</p>
            </div>
            <div className="flex bg-white/5 rounded-full p-1">
              {['1M', '6M', 'All'].map(range => (
                <button key={range} onClick={() => setChartDateRange(range)} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${chartDateRange === range ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {range}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(267, 100%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(267, 100%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" name={t('Revenue')} dataKey="revenue" stroke="hsl(267, 100%, 60%)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name={t('Est. Profit')} dataKey="profit" stroke="hsl(142, 71%, 45%)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-400" /> {t("Today's Active Trips")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('Currently on road')}</p>
          </CardHeader>
          <CardContent>
            {activeTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-10 w-10 text-green-500/50 mb-3" />
                <p className="text-muted-foreground">{t('All trips are completed!')}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {activeTrips.map(trip => (
                  <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{trip.tripNo} <span className="text-muted-foreground font-normal ml-1">({trip.vehicle?.vehicleNumber})</span></p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {trip.from} → {trip.to}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">{t('On Road')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-5 w-5" /> {t('Pending POD Alerts')}
            </CardTitle>
            <p className="text-sm text-red-400/80 mt-1">{t('Trips unbilled for >5 days')}</p>
          </CardHeader>
          <CardContent>
            {pendingPODs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">{t('No overdue PODs')}</p>
            ) : (
              <div className="space-y-3">
                {pendingPODs.slice(0, 4).map(trip => (
                  <div key={trip.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-red-500/20 cursor-pointer hover:bg-white/10" onClick={() => navigate('/trips')}>
                    <div>
                      <p className="font-semibold text-sm">{trip.tripNo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(trip.tripDate).toLocaleDateString()}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30">{t('Action Needed')}</Badge>
                  </div>
                ))}
                {pendingPODs.length > 4 && (
                  <Button variant="link" className="w-full text-red-400 text-xs" onClick={() => navigate('/trips')}>{t('View all')} {pendingPODs.length} {t('overdue PODs...')}</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="glass border-orange-500/20 bg-orange-500/5 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-orange-500">
                <AlertCircle className="mr-2 h-5 w-5" /> {t('Action Items')}
              </CardTitle>
              <p className="text-sm text-orange-400/80 mt-1">{t('Require immediate attention')}</p>
            </div>
            <Button variant="outline" size="sm" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20" onClick={() => navigate('/invoices')}>{t('Go to Invoices')}</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('Compliance Expiring')}</h4>
                {complianceAlerts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('All documents up to date')}</p>
                ) : (
                  complianceAlerts.slice(0, 3).map(v => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10" onClick={() => navigate('/vehicles')}>
                      <span className="font-mono text-sm">{v.vehicleNumber}</span>
                      <span className="text-xs text-orange-400">{t('Review docs')}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('Unpaid Invoices')}</h4>
                {unpaidInvoices.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('All invoices paid')}</p>
                ) : (
                  unpaidInvoices.slice(0, 3).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10" onClick={() => navigate('/invoices')}>
                      <div>
                        <p className="font-mono text-sm font-semibold">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground truncate w-24">{inv.trip?.party?.companyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-400">{formatCurrency(inv.totalAmount - inv.amountPaid)}</p>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-400 hover:bg-green-500/20 hover:text-green-300 mt-1" onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(inv); }}>{t('Remind')}</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary"><Keyboard className="mr-2 h-5 w-5" /> {t('Keyboard Shortcuts')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { key: 'Ctrl + N', desc: t('Create New Trip') },
              { key: 'Ctrl + I', desc: t('Create New Invoice') },
              { key: 'Ctrl + E', desc: t('Log New Expense') },
              { key: '?', desc: t('Show this shortcuts menu') }
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                <span className="text-sm text-foreground">{s.desc}</span>
                <kbd className="px-2 py-1 bg-black/50 border border-white/20 rounded font-mono text-xs text-primary font-bold shadow-inner">{s.key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
