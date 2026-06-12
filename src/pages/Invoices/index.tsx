import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, MessageSquare, IndianRupee, Printer, Calendar, ShieldCheck, Trash2, Filter, RefreshCw, CheckCircle } from 'lucide-react';
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
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma';
import { generatePdf, sendWhatsAppPdf } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { InvoiceForm } from './InvoiceForm';
import type { InvoiceFormValues } from './schema';
import type { Invoice, Trip, Party, Vehicle } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

type TripWithRelations = Trip & { party: Party | null, vehicle: Vehicle | null };
type InvoiceWithRelations = Invoice & { trip: TripWithRelations | null };

export default function Invoices() {
  const { t } = usePreferences();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('all');
  
  const [isNewOpen, setIsNewOpen] = useState(location.state && (location.state as any).openNew);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // System Config
  const systemCompanyName = localStorage.getItem('companyName') || 'TMS Logistics Pro';
  const systemCompanySub = localStorage.getItem('companySub') || 'Reliable Cargo & Transportation Services';
  const systemCompanyGst = localStorage.getItem('companyGst') || '27GTA12345Z678';
  const systemCompanyAddr = localStorage.getItem('companyAddr') || 'Mumbai, Maharashtra';
  const systemCompanyBank = localStorage.getItem('companyBank') || 'HDFC Bank, Ac: 50100000000000, IFSC: HDFC0000001';

  const { data: invoices = [], isLoading, refetch } = usePrismaQuery<InvoiceWithRelations[]>(
    ['invoices', 'all'],
    'invoice',
    'findMany',
    { include: { trip: { include: { party: true, vehicle: true } } }, orderBy: { date: 'desc' } }
  );

  const { data: allTrips = [] } = usePrismaQuery<TripWithRelations[]>(
    ['trips', 'completed'],
    'trip',
    'findMany',
    { where: { podStatus: { in: ['Received', 'Submitted'] } }, include: { party: true }, orderBy: { tripNo: 'desc' } }
  );

  const existingTripIds = invoices.map(i => i.tripId);
  const tripsAvailableForInvoice = allTrips.filter(t => !existingTripIds.includes(t.id));

  const createMutation = usePrismaMutation<any, Invoice>('invoice', 'create', [['invoices', 'all']]);
  const updateMutation = usePrismaMutation<any, Invoice>('invoice', 'update', [['invoices', 'all']]);
  const deleteMutation = usePrismaMutation<any, Invoice>('invoice', 'delete', [['invoices', 'all']]);
  const updateTripMutation = usePrismaMutation<any, Trip>('trip', 'update', [['trips', 'completed']]);
  const updatePartyMutation = usePrismaMutation<any, Party>('party', 'update');

  const generateNextInvoiceNo = () => {
    if (invoices.length === 0) return 'INV-2001';
    const numbers = invoices.map(i => parseInt(i.invoiceNumber.replace('INV-', ''))).filter(num => !isNaN(num));
    if (numbers.length === 0) return 'INV-2001';
    return `INV-${Math.max(...numbers) + 1}`;
  };

  const handleOpenNew = () => {
    setSelectedInvoice(null);
    setIsNewOpen(true);
  };

  const handleCreateInvoice = async (data: InvoiceFormValues, calculatedSubtotal: number, calculatedGst: number, calculatedTotal: number) => {
    const { gstPercentage, ...restData } = data;
    createMutation.mutate({
      data: {
        ...restData,
        date: new Date(data.date),
        subtotal: calculatedSubtotal,
        gstAmount: calculatedGst,
        totalAmount: calculatedTotal,
      }
    }, {
      onSuccess: async () => {
        await updateTripMutation.mutateAsync({
          where: { id: data.tripId },
          data: { podStatus: 'Submitted' }
        });
        
        const outstandingAddition = calculatedTotal - data.amountPaid;
        if (outstandingAddition > 0) {
          const trip = tripsAvailableForInvoice.find(t => t.id === data.tripId);
          if (trip && trip.party) {
            await updatePartyMutation.mutateAsync({
              where: { id: trip.partyId },
              data: { outstandingBalance: trip.party.outstandingBalance + outstandingAddition }
            });
          }
        }
        setIsNewOpen(false);
      }
    });
  };

  const handleTogglePaid = async (invoice: InvoiceWithRelations) => {
    const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    const newAmountPaid = newStatus === 'Paid' ? invoice.totalAmount : 0;
    
    updateMutation.mutate({
      where: { id: invoice.id },
      data: {
        status: newStatus,
        amountPaid: newAmountPaid
      }
    }, {
      onSuccess: async () => {
        await updateTripMutation.mutateAsync({
          where: { id: invoice.tripId },
          data: { paymentStatus: newStatus === 'Paid' ? 'Paid' : 'Pending' }
        });
        
        const balanceChange = newStatus === 'Paid' ? -invoice.totalAmount : invoice.totalAmount;
        if (invoice.trip?.party) {
          await updatePartyMutation.mutateAsync({
            where: { id: invoice.trip.party.id },
            data: { outstandingBalance: Math.max(0, invoice.trip.party.outstandingBalance + balanceChange) }
          });
        }
      }
    });
  };

  const handleDelete = () => {
    if (!selectedInvoice) return;
    deleteMutation.mutate({ where: { id: selectedInvoice.id } }, {
      onSuccess: async () => {
        await updateTripMutation.mutateAsync({
          where: { id: selectedInvoice.tripId },
          data: { podStatus: 'Received' }
        });
        
        if (selectedInvoice.status !== 'Paid' && selectedInvoice.trip?.party) {
          const revertAmount = selectedInvoice.totalAmount - selectedInvoice.amountPaid;
          await updatePartyMutation.mutateAsync({
            where: { id: selectedInvoice.trip.party.id },
            data: { outstandingBalance: Math.max(0, selectedInvoice.trip.party.outstandingBalance - revertAmount) }
          });
        }
        setIsDeleteOpen(false);
      }
    });
  };

  const handlePrint = async () => {
    setIsGeneratingPdf(true);
    await generatePdf('#printable-invoice', `${selectedInvoice?.invoiceNumber}.pdf`);
    setIsGeneratingPdf(false);
  };

  const handleWhatsApp = async (invoice: InvoiceWithRelations) => {
    const phone = invoice.trip?.party?.phone;
    if (!phone) { alert(t('No phone number registered for this party.')); return; }
    
    setSelectedInvoice(invoice);
    setIsSendingWA(true);
    
    setTimeout(async () => {
      const text = `${t('Dear ')}${invoice.trip?.party?.companyName}${t(',\n\nPlease find attached the invoice ')}${invoice.invoiceNumber}${t(' for the recent trip from ')}${invoice.trip?.from}${t(' to ')}${invoice.trip?.to}${t('.\n\nTotal Amount: Rs. ')}${invoice.totalAmount.toLocaleString('en-IN')}${t('\n\nPlease process the payment at your earliest convenience.\n\nThank you!')}`;
      await sendWhatsAppPdf(phone, '#hidden-invoice-capture > div', `${invoice.invoiceNumber}.pdf`, text);
      setIsSendingWA(false);
    }, 400);
  };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.trip?.party?.companyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.trip?.tripNo.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    const invDate = new Date(inv.date);
    const matchesMonth = monthFilter === 'all' ||
      (monthFilter === 'this' && invDate >= thisMonthStart) ||
      (monthFilter === 'last' && invDate >= lastMonthStart && invDate <= lastMonthEnd);

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalBilled = filteredInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalCollected = filteredInvoices.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
  const totalOutstanding = filteredInvoices.filter(i => i.status !== 'Paid').reduce((acc, i) => acc + (i.totalAmount - i.amountPaid), 0);

  const renderInvoiceContent = (invoice: InvoiceWithRelations | null) => {
    if (!invoice) return null;
    return (
      <div id="printable-invoice" className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-sm font-sans">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase">{systemCompanyName}</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{systemCompanySub}</p>
            <p className="text-xs text-slate-500 mt-1">GSTIN: {systemCompanyGst}</p>
            <p className="text-xs text-slate-500 max-w-[250px]">{systemCompanyAddr}</p>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold uppercase text-slate-200 tracking-wider">Invoice</h1>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-500 text-right">{t('Invoice No:')}</span>
              <span className="font-bold">{invoice.invoiceNumber}</span>
              <span className="text-slate-500 text-right">{t('Date:')}</span>
              <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
              <span className="text-slate-500 text-right">{t('Trip Ref')}</span>
              <span className="font-mono">{invoice.trip?.tripNo}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-8">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('Billed To:')}</p>
            <p className="font-bold text-slate-800 text-lg">{invoice.trip?.party?.companyName}</p>
            </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('Trip Details:')}</p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div className="flex justify-between mb-1"><span className="text-slate-500">{t('Route:')}</span><span className="font-medium">{invoice.trip?.from} {t('to')} {invoice.trip?.to}</span></div>
              <div className="flex justify-between mb-1"><span className="text-slate-500">{t('Vehicle:')}</span><span className="font-mono">{invoice.trip?.vehicle?.vehicleNumber}</span></div>
              <div className="flex justify-between mb-1"><span className="text-slate-500">{t('Material:')}</span><span>{invoice.trip?.material || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('Weight:')}</span><span>{invoice.trip?.sizeWeight || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-10 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">{t('Description of Service')}</th>
                <th className="p-4 text-center">{t('Billing Type')}</th>
                <th className="p-4 text-right">{t('Amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 text-center text-slate-500">1</td>
                <td className="p-4 font-medium text-slate-800">{t('Transportation Freight Charges')}<br/><span className="text-xs text-slate-500 font-normal mt-1 block">{t('From ')}{invoice.trip?.from} {t('to')} {invoice.trip?.to}</span></td>
                <td className="p-4 text-center text-slate-600">{invoice.trip?.billingType}</td>
                <td className="p-4 text-right font-mono font-medium">{formatCurrency(invoice.subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-start mt-6">
          <div className="w-1/2 pr-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('Bank Details:')}</p>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-xs text-slate-600 whitespace-pre-line">
              {systemCompanyBank}
            </div>
          </div>
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('Subtotal:')}</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.gstAmount > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-500">{t('GST:')}</span><span className="font-mono">{formatCurrency(invoice.gstAmount)}</span></div>
            )}
            {(invoice.shortageAmount || 0) > 0 && (
              <div className="flex justify-between text-sm text-red-500"><span>{t('Shortage Ded.:')}</span><span className="font-mono">-{formatCurrency(invoice.shortageAmount)}</span></div>
            )}
            {(invoice.damageAmount || 0) > 0 && (
              <div className="flex justify-between text-sm text-red-500"><span>{t('Damage Ded.:')}</span><span className="font-mono">-{formatCurrency(invoice.damageAmount)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-primary"><span>{t('Total:')}</span><span className="font-mono">{formatCurrency(invoice.totalAmount)}</span></div>
            {(invoice.amountPaid || 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600 border-t border-slate-100 pt-2"><span>{t('Amount Paid')}</span><span className="font-mono">-{formatCurrency(invoice.amountPaid)}</span></div>
            )}
            {(invoice.amountPaid || 0) > 0 && (
              <div className="flex justify-between text-sm font-bold text-orange-600 bg-orange-50 p-2 rounded"><span>{t('Balance Due:')}</span><span className="font-mono">{formatCurrency(invoice.totalAmount - invoice.amountPaid)}</span></div>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end">
          <div className="text-xs text-slate-400">
            <p>1. Subject to local jurisdiction.</p>
            <p>2. Payment strictly due within 15 days.</p>
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-400 h-10 mb-2"></div>
            <p className="text-xs font-semibold text-slate-600">{t('Authorized Signatory')}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('Billing & Invoices')}
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('Create Invoice')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Billed')}</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBilled)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredInvoices.length}{t(' invoices generated')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Collected')}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('from ')}{filteredInvoices.filter(i => i.status === 'Paid').length}{t(' paid invoices')}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Outstanding Revenue')}</CardTitle>
            <IndianRupee className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('from ')}{filteredInvoices.filter(i => i.status !== 'Paid').length}{t(' unpaid invoices')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {[['all', 'All Time'], ['this', 'This Month'], ['last', 'Last Month']].map(([val, label]) => (
            <button key={val} onClick={() => setMonthFilter(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${monthFilter === val ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-1 bg-white/5 rounded-full p-1">
          {['All', 'Unpaid', 'Partial', 'Paid'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {status === 'All' ? t('All') : t(status)}
            </button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">{t('Invoice Records')}</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('Search invoice, customer, trip...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead>{t('Invoice Details')}</TableHead>
                  <TableHead>{t('Customer / Party')}</TableHead>
                  <TableHead>{t('Trip Ref')}</TableHead>
                  <TableHead className="text-right">{t('Total Amount')}</TableHead>
                  <TableHead className="text-right">{t('Amount Paid')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="text-center">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">{t('Loading invoices...')}</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">{t('No invoices generated yet.')}</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-foreground">{invoice.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />{new Date(invoice.date).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{invoice.trip?.party?.companyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
                          {invoice.trip?.tripNo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right">
                        {invoice.amountPaid > 0 ? (
                          <span className="font-medium text-green-500">{formatCurrency(invoice.amountPaid)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          invoice.status === 'Paid' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          invoice.status === 'Partial' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' :
                          'border-orange-500/30 text-orange-500 bg-orange-500/10 animate-pulse'
                        }>
                          {t(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleTogglePaid(invoice)}
                            className={`h-8 w-8 p-0 ${invoice.status === 'Paid' ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'}`} 
                            title={invoice.status === 'Paid' ? t('Mark Unpaid') : t('Mark Full Paid')}
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true) }} className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400" title={t('View / Print')}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(invoice)} disabled={isSendingWA && selectedInvoice?.id === invoice.id} className="h-8 w-8 p-0 hover:bg-green-500/20 hover:text-green-400" title={t('Send WhatsApp')}>
                            {isSendingWA && selectedInvoice?.id === invoice.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-green-400" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400" title={t('Delete')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{t('Generate New Invoice')}</DialogTitle>
            <DialogDescription>{t('Select a completed trip to bill the customer.')}</DialogDescription>
          </DialogHeader>
          <InvoiceForm 
            initialData={{ invoiceNumber: generateNextInvoiceNo() }}
            trips={tripsAvailableForInvoice}
            onSubmit={handleCreateInvoice}
            onCancel={() => setIsNewOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass-panel border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>{t('Invoice Preview')}</DialogTitle>
              <DialogDescription>{t('Review and print or share this invoice.')}</DialogDescription>
            </div>
            <div className="flex items-center space-x-2 mr-6">
              <Button onClick={() => { if (selectedInvoice) handleWhatsApp(selectedInvoice); }} disabled={isSendingWA} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                <MessageSquare className="mr-2 h-4 w-4" /> {isSendingWA ? t('Sending...') : t('Send WhatsApp')}
              </Button>
              <Button onClick={handlePrint} disabled={isGeneratingPdf} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                <Printer className="mr-2 h-4 w-4" /> {isGeneratingPdf ? t('Generating...') : t('Print / PDF')}
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 bg-slate-100 rounded-lg overflow-x-auto my-4">
            {renderInvoiceContent(selectedInvoice)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Invoice?')}</DialogTitle>
            <DialogDescription>{t('Permanently delete invoice ')}<strong>{selectedInvoice?.invoiceNumber}</strong>{t('? The associated trip will be reverted to \'Received\' (unbilled) status. Outstanding balances will be recalculated. Cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t('Deleting...') : <><Trash2 className="h-4 w-4 mr-2" />{t('Delete Invoice')}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div id="hidden-invoice-capture" className="absolute left-[-9999px] top-[-9999px] bg-white text-slate-900" style={{ width: '800px' }}>
        {selectedInvoice && renderInvoiceContent(selectedInvoice)}
      </div>
    </div>
  );
}
