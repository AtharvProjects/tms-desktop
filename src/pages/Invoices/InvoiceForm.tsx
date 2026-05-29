import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema } from './schema';
import type { InvoiceFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { Trip, Party, Vehicle } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { usePreferences } from '@/contexts/PreferencesContext';

type TripWithRelations = Trip & { party: Party | null, vehicle: Vehicle | null };

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormValues> & { invoiceNumber?: string };
  trips: TripWithRelations[];
  onSubmit: (data: InvoiceFormValues, calculatedSubtotal: number, calculatedGst: number, calculatedTotal: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function InvoiceForm({ initialData, trips, onSubmit, onCancel, isSubmitting }: InvoiceFormProps) {
  const { t } = usePreferences();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoiceNumber: initialData?.invoiceNumber || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      tripId: initialData?.tripId || '',
      gstPercentage: initialData?.gstPercentage || 0,
      shortageAmount: initialData?.shortageAmount || 0,
      damageAmount: initialData?.damageAmount || 0,
      amountPaid: initialData?.amountPaid || 0,
      status: initialData?.status || 'Unpaid',
    }
  });

  const tripId = watch('tripId');
  const gstPercentage = watch('gstPercentage') || 0;
  const shortageAmount = watch('shortageAmount') || 0;
  const damageAmount = watch('damageAmount') || 0;

  const selectedTrip = trips.find(t => t.id === tripId);
  const calculatedSubtotal = selectedTrip ? selectedTrip.freightAmount : 0;
  const calculatedGst = (calculatedSubtotal * gstPercentage) / 100;
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedGst - shortageAmount - damageAmount);

  const handleFormSubmit = (data: InvoiceFormValues) => {
    onSubmit(data, calculatedSubtotal, calculatedGst, calculatedTotal);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Invoice Number *')}</Label>
          <Input {...register('invoiceNumber')} className="bg-background/50 border-white/10 font-mono font-bold" />
          {errors.invoiceNumber && <p className="text-red-500 text-xs">{errors.invoiceNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Invoice Date *')}</Label>
          <Input type="date" {...register('date')} className="bg-background/50 border-white/10" />
          {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('Select Completed Trip to Bill *')}</Label>
        <select {...register('tripId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
          <option value="">{t('-- Choose a trip pending invoice --')}</option>
          {trips.map(t => (
            <option key={t.id} value={t.id}>
              {t.tripNo} - {t.party?.companyName} ({formatCurrency(t.freightAmount)})
            </option>
          ))}
        </select>
        {errors.tripId && <p className="text-red-500 text-xs">{errors.tripId.message}</p>}
        {trips.length === 0 && (
          <p className="text-xs text-orange-400 mt-1">{t('No completed trips available to invoice. Make sure trip POD is received.')}</p>
        )}
      </div>

      {selectedTrip && (
        <Card className="bg-white/5 border-white/10 shadow-none">
          <CardContent className="p-4 space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{t('Route:')}</span><span>{selectedTrip.from} → {selectedTrip.to}</span></div>
            <div className="flex justify-between font-medium"><span>{t('Freight Amount (Subtotal):')}</span><span>{formatCurrency(calculatedSubtotal)}</span></div>
            
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <Label className="flex items-center space-x-2">
                <span>{t('Add GST %:')}</span>
                <Input type="number" step="0.1" {...register('gstPercentage')} className="w-20 h-8 bg-background/50 border-white/10" />
              </Label>
              <span>{formatCurrency(calculatedGst)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
              <div className="space-y-2">
                <Label className="text-xs text-orange-400">{t('Shortage Deduction (₹)')}</Label>
                <Input type="number" {...register('shortageAmount')} className="bg-background/50 border-white/10 h-8" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-orange-400">{t('Damage Deduction (₹)')}</Label>
                <Input type="number" {...register('damageAmount')} className="bg-background/50 border-white/10 h-8" />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-3 text-lg font-bold text-primary">
              <span>{t('Total Bill Amount:')}</span>
              <span>{formatCurrency(calculatedTotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">{t('Initial Payment Received (₹)')}</Label>
                <Input type="number" {...register('amountPaid')} className="bg-background/50 border-white/10 h-8" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('Payment Status')}</Label>
                <select {...register('status')} className="w-full h-8 px-2 rounded-md bg-background/50 border border-white/10 focus:outline-none text-xs text-foreground">
                  <option value="Unpaid">{t('Unpaid')}</option>
                  <option value="Partial">{t('Partial')}</option>
                  <option value="Paid">{t('Fully Paid')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button type="submit" disabled={isSubmitting || !tripId} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? t('Saving...') : t('Generate Invoice')}
        </Button>
      </div>
    </form>
  );
}
