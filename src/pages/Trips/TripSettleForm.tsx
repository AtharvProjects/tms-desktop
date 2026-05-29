import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TripFormValues } from './schema';
import { usePreferences } from '@/contexts/PreferencesContext';

interface TripSettleFormProps {
  initialData: Partial<TripFormValues>;
  onSubmit: (data: Partial<TripFormValues>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TripSettleForm({ initialData, onSubmit, onCancel, isSubmitting }: TripSettleFormProps) {
  const { t } = usePreferences();
  const { register, handleSubmit, watch } = useForm<Partial<TripFormValues>>({
    defaultValues: {
      dieselAmount: initialData.dieselAmount || 0,
      liquidDiesel: initialData.liquidDiesel || 0,
      toll: initialData.toll || 0,
      maintenance: initialData.maintenance || 0,
      extraRunning: initialData.extraRunning || 0,
      extraCharges: initialData.extraCharges || 0,
      driverCash: initialData.driverCash || 0,
      notes: initialData.notes || '',
    }
  });

  const freightAmount = initialData.freightAmount || 0;
  const commission = initialData.commission || 0;
  
  const dieselAmount = watch('dieselAmount') || 0;
  const liquidDiesel = watch('liquidDiesel') || 0;
  const toll = watch('toll') || 0;
  const maintenance = watch('maintenance') || 0;
  const extraRunning = watch('extraRunning') || 0;
  const extraCharges = watch('extraCharges') || 0;
  const driverCash = watch('driverCash') || 0;

  const netProfit = freightAmount - commission - dieselAmount - liquidDiesel - driverCash - toll - maintenance - extraRunning - extraCharges;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Diesel Amount (₹)')}</Label><Input type="number" {...register('dieselAmount')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Liquid Diesel (₹)')}</Label><Input type="number" {...register('liquidDiesel')} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Fastag/Toll (₹)')}</Label><Input type="number" {...register('toll')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Maintenance (₹)')}</Label><Input type="number" {...register('maintenance')} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Extra Running (₹)')}</Label><Input type="number" {...register('extraRunning')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Extra Charges (₹)')}</Label><Input type="number" {...register('extraCharges')} className="bg-background/50 border-white/10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Driver Cash (₹)')}</Label><Input type="number" {...register('driverCash')} className="bg-background/50 border-white/10" /></div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex justify-between items-center h-full">
            <span className="text-xs text-muted-foreground font-medium">{t('Net Profit')}</span>
            <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netProfit)}
            </span>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        <Label>{t('Final Notes')}</Label>
        <Input {...register('notes')} placeholder="e.g. Unloading completed, trip settled" className="bg-background/50 border-white/10" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? t('Settling...') : t('Complete & Settle Trip')}
        </Button>
      </div>
    </form>
  );
}
