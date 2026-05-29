import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema } from './schema';
import type { TripFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Vehicle, Driver, Party } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

interface TripFormProps {
  initialData?: Partial<TripFormValues> & { tripNo?: string };
  vehicles: Vehicle[];
  drivers: Driver[];
  parties: Party[];
  onSubmit: (data: TripFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

export function TripForm({ initialData, vehicles, drivers, parties, onSubmit, onCancel, isSubmitting, isEdit }: TripFormProps) {
  const { t } = usePreferences();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: {
      tripNo: initialData?.tripNo || '',
      tripDate: initialData?.tripDate ? new Date(initialData.tripDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      vehicleId: initialData?.vehicleId || '',
      partyId: initialData?.partyId || '',
      driverId: initialData?.driverId || '',
      from: initialData?.from || '',
      to: initialData?.to || '',
      material: initialData?.material || '',
      sizeWeight: initialData?.sizeWeight || '',
      lrNumber: initialData?.lrNumber || '',
      billingType: initialData?.billingType || 'Fixed',
      freightAmount: initialData?.freightAmount || 0,
      dieselAmount: initialData?.dieselAmount || 0,
      liquidDiesel: initialData?.liquidDiesel || 0,
      driverCash: initialData?.driverCash || 0,
      toll: initialData?.toll || 0,
      partyAdvance: initialData?.partyAdvance || 0,
      driverAdvance: initialData?.driverAdvance || 0,
      commission: initialData?.commission || 0,
      maintenance: initialData?.maintenance || 0,
      extraRunning: initialData?.extraRunning || 0,
      detentionTime: initialData?.detentionTime || '',
      loadingDate: initialData?.loadingDate ? new Date(initialData.loadingDate).toISOString().split('T')[0] : '',
      unloadingDate: initialData?.unloadingDate ? new Date(initialData.unloadingDate).toISOString().split('T')[0] : '',
      reportDate: initialData?.reportDate ? new Date(initialData.reportDate).toISOString().split('T')[0] : '',
      extraCharges: initialData?.extraCharges || 0,
      status: initialData?.status || 'Scheduled',
      podStatus: initialData?.podStatus || 'Pending',
      paymentStatus: initialData?.paymentStatus || 'Pending',
      notes: initialData?.notes || '',
    }
  });

  const freightAmount = watch('freightAmount') || 0;
  const partyAdvance = watch('partyAdvance') || 0;
  const commission = watch('commission') || 0;
  const dieselAmount = watch('dieselAmount') || 0;
  const liquidDiesel = watch('liquidDiesel') || 0;
  const driverCash = watch('driverCash') || 0;
  const toll = watch('toll') || 0;
  const maintenance = watch('maintenance') || 0;
  const extraRunning = watch('extraRunning') || 0;
  const extraCharges = watch('extraCharges') || 0;

  const balance = freightAmount - partyAdvance;
  const netProfit = freightAmount - commission - dieselAmount - liquidDiesel - driverCash - toll - maintenance - extraRunning - extraCharges;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('Trip Number *')}</Label>
          <Input {...register('tripNo')} className="bg-background/50 border-white/10 font-mono font-bold" readOnly={isEdit} />
          {errors.tripNo && <p className="text-red-500 text-xs">{errors.tripNo.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Trip Date *')}</Label>
          <Input type="date" {...register('tripDate')} className="bg-background/50 border-white/10" />
          {errors.tripDate && <p className="text-red-500 text-xs">{errors.tripDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Report Date')}</Label>
          <Input type="date" {...register('reportDate')} className="bg-background/50 border-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('Loading Date')}</Label>
          <Input type="date" {...register('loadingDate')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label>{t('Unloading Date')}</Label>
          <Input type="date" {...register('unloadingDate')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label>{t('Vehicle *')}</Label>
          <select {...register('vehicleId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">{t('Select Vehicle')}</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} {isEdit && v.status !== 'Active' ? `(${v.status})` : ''}</option>)}
          </select>
          {errors.vehicleId && <p className="text-red-500 text-xs">{errors.vehicleId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('LR / Bilty Number')}</Label>
          <Input placeholder="e.g. LR-1001" {...register('lrNumber')} className="bg-background/50 border-white/10 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Customer Party *')}</Label>
          <select {...register('partyId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">{t('Select Customer')}</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
          </select>
          {errors.partyId && <p className="text-red-500 text-xs">{errors.partyId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Assigned Driver')}</Label>
          <select {...register('driverId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">{t('Select Driver')}</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.driverName}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2"><Label>{t('From Route Location *')}</Label><Input placeholder="Dispatch City" {...register('from')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('To Route Location *')}</Label><Input placeholder="Delivery Destination" {...register('to')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Material Cargo')}</Label><Input placeholder="e.g. Iron Coils" {...register('material')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Consignment Weight')}</Label><Input placeholder="e.g. 25 Tons" {...register('sizeWeight')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>{t('Billing Type')}</Label>
          <select {...register('billingType')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Fixed">{t('Fixed Price')}</option>
            <option value="Per Ton">{t('Per Ton')}</option>
            <option value="Per Trip">{t('Per Trip')}</option>
          </select>
        </div>
        <div className="space-y-2"><Label>{t('Freight Amount (₹) *')}</Label><Input type="number" {...register('freightAmount')} className="bg-background/50 border-white/10 font-semibold text-primary" /></div>
        <div className="space-y-2"><Label>{t('Commission (₹)')}</Label><Input type="number" {...register('commission')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>{t('Party Advance (₹)')}</Label><Input type="number" {...register('partyAdvance')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Driver Advance (₹)')}</Label><Input type="number" {...register('driverAdvance')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Driver Cash (₹)')}</Label><Input type="number" {...register('driverCash')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>{t('Fastag/Toll (₹)')}</Label><Input type="number" {...register('toll')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Diesel Amount (₹)')}</Label><Input type="number" {...register('dieselAmount')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Liquid Diesel (₹)')}</Label><Input type="number" {...register('liquidDiesel')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>{t('Maintenance (₹)')}</Label><Input type="number" {...register('maintenance')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Extra Running (₹)')}</Label><Input type="number" {...register('extraRunning')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Detention Time')}</Label><Input placeholder="e.g. 2 Days" {...register('detentionTime')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>{t('Extra Charges (₹)')}</Label><Input type="number" {...register('extraCharges')} className="bg-background/50 border-white/10" /></div>
        
        <Card className="bg-orange-500/10 border-orange-500/20 col-span-1">
          <CardContent className="p-3 flex justify-between items-center h-full">
            <span className="text-xs text-orange-500/80 font-medium">{t('Balance')}</span>
            <span className={`text-lg font-bold text-orange-500`}>
              {formatCurrency(balance)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 col-span-1">
          <CardContent className="p-3 flex justify-between items-center h-full">
            <span className="text-xs text-muted-foreground font-medium">{t('Net Profit')}</span>
            <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(netProfit)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>{t('Trip Status')}</Label>
          <select {...register('status')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Scheduled">{t('Scheduled')}</option>
            <option value="Loading">{t('Loading')}</option>
            <option value="In Transit">{t('In Transit')}</option>
            <option value="Unloading">{t('Unloading')}</option>
            <option value="Completed">{t('Completed')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('POD Status')}</Label>
          <select {...register('podStatus')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Pending">{t('Pending (On Road)')}</option>
            <option value="Received">{t('Received (Delivered)')}</option>
            <option value="Submitted">{t('Submitted (Billed)')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('Payment Status')}</Label>
          <select {...register('paymentStatus')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="Pending">{t('Pending')}</option>
            <option value="Partial">{t('Partial')}</option>
            <option value="Paid">{t('Paid')}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('Notes')}</Label>
        <Input {...register('notes')} placeholder="e.g. Unloading delay at party warehouse" className="bg-background/50 border-white/10" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? t('Saving...') : (isEdit ? t('Update Trip') : t('Save Trip'))}
        </Button>
      </div>
    </form>
  );
}
