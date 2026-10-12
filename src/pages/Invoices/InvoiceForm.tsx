import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema } from './schema';
import type { InvoiceFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { Trip, Party, Vehicle } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { usePreferences } from '@/contexts/PreferencesContext';
import { toast } from 'sonner';

type TripWithRelations = Trip & { party: Party | null, vehicle: Vehicle | null };

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormValues> & { invoiceNumber?: string, subtotal?: number };
  trips: TripWithRelations[];
  onSubmit: (data: InvoiceFormValues, calculatedSubtotal: number, calculatedGst: number, calculatedTotal: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function InvoiceForm({ initialData, trips, onSubmit, onCancel, isSubmitting }: InvoiceFormProps) {
  const { t } = usePreferences();
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoiceNumber: initialData?.invoiceNumber || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      tripId: initialData?.tripId || (trips.length > 0 ? trips[0].id : 'none'),
      manualSubtotal: initialData?.manualSubtotal || initialData?.subtotal || 0,
      gstPercentage: initialData?.gstPercentage || 0,
      shortageAmount: initialData?.shortageAmount || 0,
      damageAmount: initialData?.damageAmount || 0,
      amountPaid: initialData?.amountPaid || 0,
      commissionAmount: initialData?.commissionAmount || 0,
      status: initialData?.status || 'Unpaid',
    }
  });

  const tripId = watch('tripId');
  const manualSubtotal = watch('manualSubtotal') || 0;
  const gstPercentage = watch('gstPercentage') || 0;
  const shortageAmount = watch('shortageAmount') || 0;
  const damageAmount = watch('damageAmount') || 0;
  const amountPaid = watch('amountPaid') || 0;
  const commissionAmount = watch('commissionAmount') || 0;

  const selectedTrip = tripId && tripId !== 'none' ? trips.find(t => t.id === tripId) : null;
  const calculatedSubtotal = selectedTrip ? (selectedTrip.freightAmount + (selectedTrip.extraCharges || 0)) : (Number(manualSubtotal) || 0);
  const calculatedGst = (calculatedSubtotal * (Number(gstPercentage) || 0)) / 100;
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedGst - (Number(shortageAmount) || 0) - (Number(damageAmount) || 0));
  const balanceDue = Math.max(0, calculatedTotal - (Number(amountPaid) || 0));
  const netReceivable = Math.max(0, balanceDue - (Number(commissionAmount) || 0));

  useEffect(() => {
    if (selectedTrip) {
      const advance = selectedTrip.partyAdvance || 0;
      const commission = selectedTrip.commission || 0;
      setValue('amountPaid', advance, { shouldValidate: true, shouldDirty: true });
      setValue('commissionAmount', commission, { shouldValidate: true, shouldDirty: true });
      
      const tripSubtotal = selectedTrip.freightAmount + (selectedTrip.extraCharges || 0);
      if (advance >= tripSubtotal && tripSubtotal > 0) {
        setValue('status', 'Paid', { shouldValidate: true, shouldDirty: true });
      } else if (advance > 0) {
        setValue('status', 'Partial', { shouldValidate: true, shouldDirty: true });
      } else {
        setValue('status', 'Unpaid', { shouldValidate: true, shouldDirty: true });
      }
    } else if (tripId === 'none') {
      setValue('amountPaid', 0, { shouldValidate: true, shouldDirty: true });
      setValue('commissionAmount', 0, { shouldValidate: true, shouldDirty: true });
      setValue('status', 'Unpaid', { shouldValidate: true, shouldDirty: true });
    }
  }, [tripId, selectedTrip]);

  const handleFormSubmit = (data: InvoiceFormValues) => {
    const finalSubtotal = selectedTrip ? (selectedTrip.freightAmount + (selectedTrip.extraCharges || 0)) : (Number(data.manualSubtotal) || 0);
    const finalGst = (finalSubtotal * (Number(data.gstPercentage) || 0)) / 100;
    const finalTotal = Math.max(0, finalSubtotal + finalGst - (Number(data.shortageAmount) || 0) - (Number(data.damageAmount) || 0));
    onSubmit(data, finalSubtotal, finalGst, finalTotal);
  };

  const handleFormError = (formErrors: any) => {
    console.error('[InvoiceForm] Validation errors:', formErrors);
    const msgs = Object.entries(formErrors)
      .map(([k, err]: [string, any]) => `${k}: ${err?.message || 'Invalid'}`)
      .join(', ');
    toast.error(t('Form input error') + (msgs ? `: ${msgs}` : ''));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit, handleFormError)} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Invoice Number *')}</Label>
          <Input {...register('invoiceNumber')} placeholder="Auto-generated if blank" className="bg-background border border-input dark:border-white/10 font-mono font-bold" />
          {errors.invoiceNumber && <p className="text-red-500 text-xs">{errors.invoiceNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Invoice Date *')}</Label>
          <Input type="date" {...register('date')} className="bg-background border border-input dark:border-white/10" />
          {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('Select Trip (Optional)')}</Label>
        <Controller
          name="tripId"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || 'none'}>
              <SelectTrigger className="w-full bg-background border border-input dark:border-white/10 h-10 shadow-sm">
                <SelectValue placeholder={t('-- Choose trip or Direct Manual Invoice --')} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none" className="py-2.5 px-3 cursor-pointer text-muted-foreground font-medium">
                  {t('Direct / Manual Billing (No Linked Trip)')}
                </SelectItem>
                {trips.map(t => (
                  <SelectItem key={t.id} value={t.id} className="py-2.5 px-3 cursor-pointer">
                    <div className="flex flex-col gap-0.5 text-left w-full">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono font-bold text-foreground text-sm">{t.tripNo}</span>
                        <span className="font-semibold text-primary text-xs">{formatCurrency(t.freightAmount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <span className="font-medium text-foreground/90">{t.party?.companyName || 'No Customer'}</span>
                        <span>•</span>
                        <span>{t.from} → {t.to}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {!selectedTrip && (
        <div className="space-y-2 p-3.5 bg-muted/40 rounded-lg border border-border">
          <Label className="text-sm font-semibold">{t('Freight / Subtotal Amount (₹) *')}</Label>
          <Input 
            type="number" 
            step="any"
            {...register('manualSubtotal')} 
            placeholder="Enter freight subtotal amount" 
            className="bg-background border border-input dark:border-white/10 font-semibold text-base" 
          />
        </div>
      )}

      <Card className="bg-card border border-border dark:bg-white/5 dark:border-white/10 shadow-sm">
        <CardContent className="p-4 space-y-3 text-sm">
          {selectedTrip && (
            <div className="flex justify-between text-muted-foreground"><span>{t('Route:')}</span><span className="font-medium text-foreground">{selectedTrip.from} → {selectedTrip.to}</span></div>
          )}
          <div className="flex justify-between font-medium"><span>{t('Freight Amount (Subtotal):')}</span><span className="font-bold text-foreground">{formatCurrency(calculatedSubtotal)}</span></div>
          
          <div className="flex items-center justify-between border-t border-border dark:border-white/10 pt-3">
            <Label className="flex items-center space-x-2">
              <span>{t('Add GST %:')}</span>
              <Input type="number" step="0.1" {...register('gstPercentage')} className="w-20 h-8 bg-background border border-input dark:border-white/10" />
            </Label>
            <span className="font-medium">{formatCurrency(calculatedGst)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border dark:border-white/10 pt-3">
            <div className="space-y-2">
              <Label className="text-xs text-orange-500 dark:text-orange-400">{t('Shortage Deduction (₹)')}</Label>
              <Input type="number" {...register('shortageAmount')} className="bg-background border border-input dark:border-white/10 h-8" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-orange-500 dark:text-orange-400">{t('Damage Deduction (₹)')}</Label>
              <Input type="number" {...register('damageAmount')} className="bg-background border border-input dark:border-white/10 h-8" />
            </div>
          </div>

          {/* Total → Advance → Balance breakdown */}
          <div className="border-t border-border dark:border-white/10 pt-3 space-y-2">
            <div className="flex justify-between text-lg font-bold text-primary"><span>{t('Total Amount:')}</span><span>{formatCurrency(calculatedTotal)}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-emerald-600 dark:text-green-400 font-medium">{t('Advance Received (₹)')}</Label>
                <Input type="number" {...register('amountPaid')} className="bg-background border border-input dark:border-white/10 h-8 font-semibold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Commission (₹)')}</Label>
                <Input type="number" {...register('commissionAmount')} className="bg-background border border-input dark:border-white/10 h-8 font-semibold" />
              </div>
            </div>
            <div className="flex justify-between font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
              <span>{t('Balance Due:')}</span><span>{formatCurrency(balanceDue)}</span>
            </div>
            {commissionAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground bg-muted/50 dark:bg-white/5 p-2 rounded-lg border border-border dark:border-white/10">
                <span>{t('Net Receivable (after commission):')}</span><span className="font-semibold text-foreground">{formatCurrency(netReceivable)}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Label className="text-xs">{t('Payment Status')}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={(val) => field.onChange(val || 'Unpaid')} 
                  value={field.value || 'Unpaid'}
                >
                  <SelectTrigger className="h-9 bg-background border border-input dark:border-white/10 text-xs">
                    <SelectValue placeholder={t('Payment Status')}>
                      {field.value === 'Paid' ? t('Fully Paid') : field.value === 'Partial' ? t('Partial') : t('Unpaid')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unpaid">{t('Unpaid')}</SelectItem>
                    <SelectItem value="Partial">{t('Partial')}</SelectItem>
                    <SelectItem value="Paid">{t('Fully Paid')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 cursor-pointer shadow-md"
        >
          {isSubmitting ? t('Saving...') : t('Generate Invoice')}
        </Button>
      </div>
    </form>
  );
}
