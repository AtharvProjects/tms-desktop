import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema } from './schema';
import type { TripFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { calcTripNetProfit, calcTripBalance, calcTripTotalRevenue } from '@/lib/calculations';
import type { Vehicle, Driver, Party } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Plus, Trash2 } from 'lucide-react';

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
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema) as any,
    defaultValues: {
      tripNo: initialData?.tripNo || '',
      tripName: initialData?.tripName || '',
      tripDate: initialData?.tripDate ? new Date(initialData.tripDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      vehicleId: initialData?.vehicleId || '',
      partyId: initialData?.partyId || '',
      driverId: initialData?.driverId || '',
      from: initialData?.from || '',
      to: initialData?.to || '',
      material: initialData?.material || '',
      sizeWeight: initialData?.sizeWeight || '',
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
      labourCharges: initialData?.labourCharges || 0,
      permissionCharges: initialData?.permissionCharges || 0,
      status: initialData?.status || 'Draft',
      podStatus: initialData?.podStatus || 'Pending',
      paymentStatus: initialData?.paymentStatus || 'Pending',
      notes: initialData?.notes || '',
      directDrivers: initialData?.directDrivers || [],
      driverAdvances: initialData?.driverAdvances?.map((a: any) => ({...a, date: new Date(a.date).toISOString().split('T')[0]})) || [],
      driverChanges: initialData?.driverChanges?.map((c: any) => ({...c, changedAt: new Date(c.changedAt).toISOString().split('T')[0]})) || [],
      tollEntries: initialData?.tollEntries?.map((t: any) => ({...t, date: new Date(t.date).toISOString().split('T')[0]})) || [],
      maintenanceEntries: initialData?.maintenanceEntries?.map((m: any) => ({...m, date: new Date(m.date).toISOString().split('T')[0]})) || [],
      dieselEntries: initialData?.dieselEntries?.map((d: any) => ({...d, date: new Date(d.date).toISOString().split('T')[0]})) || [],
      liquidEntries: initialData?.liquidEntries?.map((l: any) => ({...l, date: new Date(l.date).toISOString().split('T')[0]})) || [],
      tripLinks: initialData?.tripLinks?.map((l: any) => ({...l, date: new Date(l.date).toISOString().split('T')[0]})) || [],
    }
  });

  const { fields: directDriversFields, append: appendDirectDriver, remove: removeDirectDriver } = useFieldArray({ control, name: 'directDrivers' });
  const { fields: advanceFields, append: appendAdvance, remove: removeAdvance } = useFieldArray({ control, name: 'driverAdvances' });
  const { fields: changeFields, append: appendChange, remove: removeChange } = useFieldArray({ control, name: 'driverChanges' });
  const { fields: tollFields, append: appendToll, remove: removeToll } = useFieldArray({ control, name: 'tollEntries' });
  const { fields: maintFields, append: appendMaint, remove: removeMaint } = useFieldArray({ control, name: 'maintenanceEntries' });
  const { fields: dieselFields, append: appendDiesel, remove: removeDiesel } = useFieldArray({ control, name: 'dieselEntries' });
  const { fields: liquidFields, append: appendLiquid, remove: removeLiquid } = useFieldArray({ control, name: 'liquidEntries' });
  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: 'tripLinks' });

  // Watched line-item entries
  const watchedTollEntries = watch('tollEntries') || [];
  const watchedDieselEntries = watch('dieselEntries') || [];
  const watchedMaintEntries = watch('maintenanceEntries') || [];
  const watchedLiquidEntries = watch('liquidEntries') || [];
  const watchedDriverAdvances = watch('driverAdvances') || [];

  // Live sum from entries
  const tollFromEntries = watchedTollEntries.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dieselFromEntries = watchedDieselEntries.reduce((sum, d) => sum + (Number(d.totalCost) || 0), 0);
  const maintFromEntries = watchedMaintEntries.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const liquidFromEntries = watchedLiquidEntries.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);
  const advanceFromEntries = watchedDriverAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Sync entries to summary fields whenever entries change
  useEffect(() => {
    if (watchedTollEntries.length > 0) {
      setValue('toll', tollFromEntries);
    }
  }, [tollFromEntries, watchedTollEntries.length, setValue]);

  useEffect(() => {
    if (watchedDieselEntries.length > 0) {
      setValue('dieselAmount', dieselFromEntries);
    }
  }, [dieselFromEntries, watchedDieselEntries.length, setValue]);

  useEffect(() => {
    if (watchedMaintEntries.length > 0) {
      setValue('maintenance', maintFromEntries);
    }
  }, [maintFromEntries, watchedMaintEntries.length, setValue]);

  useEffect(() => {
    if (watchedLiquidEntries.length > 0) {
      setValue('liquidDiesel', liquidFromEntries);
    }
  }, [liquidFromEntries, watchedLiquidEntries.length, setValue]);

  useEffect(() => {
    if (watchedDriverAdvances.length > 0) {
      setValue('driverAdvance', advanceFromEntries);
    }
  }, [advanceFromEntries, watchedDriverAdvances.length, setValue]);

  // Watched financial inputs strictly coerced to numbers
  const freightAmount = Number(watch('freightAmount')) || 0;
  const partyAdvance = Number(watch('partyAdvance')) || 0;
  const commission = Number(watch('commission')) || 0;
  const dieselAmount = watchedDieselEntries.length > 0 ? dieselFromEntries : (Number(watch('dieselAmount')) || 0);
  const liquidDiesel = watchedLiquidEntries.length > 0 ? liquidFromEntries : (Number(watch('liquidDiesel')) || 0);
  const driverCash = Number(watch('driverCash')) || 0;
  const toll = watchedTollEntries.length > 0 ? tollFromEntries : (Number(watch('toll')) || 0);
  const maintenance = watchedMaintEntries.length > 0 ? maintFromEntries : (Number(watch('maintenance')) || 0);
  const extraRunning = Number(watch('extraRunning')) || 0;
  const extraCharges = Number(watch('extraCharges')) || 0;
  const labourCharges = Number(watch('labourCharges')) || 0;
  const permissionCharges = Number(watch('permissionCharges')) || 0;
  
  const totalFreight = calcTripTotalRevenue({ freightAmount, extraCharges });
  const balance = calcTripBalance({ freightAmount, extraCharges, partyAdvance });
  const netProfit = calcTripNetProfit({
    freightAmount,
    extraCharges,
    commission,
    dieselAmount,
    liquidDiesel,
    driverCash,
    toll,
    maintenance,
    extraRunning,
    labourCharges,
    permissionCharges
  });

  const handleFormSubmit = (data: TripFormValues) => {
    const finalData: TripFormValues = {
      ...data,
      freightAmount: Number(data.freightAmount) || 0,
      partyAdvance: Number(data.partyAdvance) || 0,
      commission: Number(data.commission) || 0,
      toll: watchedTollEntries.length > 0 ? tollFromEntries : (Number(data.toll) || 0),
      dieselAmount: watchedDieselEntries.length > 0 ? dieselFromEntries : (Number(data.dieselAmount) || 0),
      maintenance: watchedMaintEntries.length > 0 ? maintFromEntries : (Number(data.maintenance) || 0),
      liquidDiesel: watchedLiquidEntries.length > 0 ? liquidFromEntries : (Number(data.liquidDiesel) || 0),
      driverAdvance: watchedDriverAdvances.length > 0 ? advanceFromEntries : (Number(data.driverAdvance) || 0),
      driverCash: Number(data.driverCash) || 0,
      extraRunning: Number(data.extraRunning) || 0,
      extraCharges: Number(data.extraCharges) || 0,
      labourCharges: Number(data.labourCharges) || 0,
      permissionCharges: Number(data.permissionCharges) || 0,
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 max-h-[75vh] overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
        <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>{t('Trip Number')}</Label>
          <Input {...register('tripNo')} className="bg-background/50 border-white/10 font-mono font-bold" placeholder={t('Auto-generated')} readOnly={isEdit} />
          {errors.tripNo && <p className="text-red-500 text-xs">{errors.tripNo.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Trip Name')}</Label>
          <Input {...register('tripName')} className="bg-background/50 border-white/10" placeholder="e.g. Mumbai Delivery" />
        </div>
        <div className="space-y-2">
          <Label>{t('Trip Date')}</Label>
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
          <Label>{t('Vehicle')}</Label>
          <Controller
            name="vehicleId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder={t('Select Vehicle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('— None —')}</SelectItem>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber} {isEdit && v.status !== 'Active' ? `(${v.status})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {errors.vehicleId && <p className="text-red-500 text-xs">{errors.vehicleId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Customer Party')}</Label>
          <Controller
            name="partyId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder={t('Select Customer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('— None —')}</SelectItem>
                  {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {errors.partyId && <p className="text-red-500 text-xs">{errors.partyId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('Assigned Driver (Registered)')}</Label>
          <Controller
            name="driverId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder={t('Select Driver')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('Select Driver')}</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.driverName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Dynamic Sections */}
      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Direct Drivers')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {directDriversFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Driver Name')}</Label>
                <Input {...register(`directDrivers.${index}.driverName`)} className="h-8 bg-background/50 border-white/10" placeholder="Driver Name" />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDirectDriver(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendDirectDriver({ driverName: '' })} className="mt-2 h-8 text-xs border-dashed"><Plus className="w-3 h-3 mr-1"/> {t('Add Direct Driver')}</Button>
        </CardContent>
      </Card>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Driver Advances')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {advanceFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Amount')}</Label>
                <Input type="number" {...register(`driverAdvances.${index}.amount`)} className="h-8 bg-background/50 border-white/10" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Date')}</Label>
                <Input type="date" {...register(`driverAdvances.${index}.date`)} className="h-8 bg-background/50 border-white/10" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Remarks')}</Label>
                <Input {...register(`driverAdvances.${index}.remarks`)} className="h-8 bg-background/50 border-white/10" placeholder="Optional" />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAdvance(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendAdvance({ amount: 0, date: new Date().toISOString().split('T')[0], remarks: '' })} className="mt-2 h-8 text-xs border-dashed"><Plus className="w-3 h-3 mr-1"/> {t('Add Advance')}</Button>
        </CardContent>
      </Card>
      
      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Driver Changes')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {changeFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Previous Driver')}</Label>
                <Controller
                  name={`driverChanges.${index}.previousDriverId`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                      <SelectTrigger className="h-8 bg-background/50 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('None')}</SelectItem>
                        {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.driverName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('New Driver')}</Label>
                <Controller
                  name={`driverChanges.${index}.newDriverId`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                      <SelectTrigger className="h-8 bg-background/50 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('None')}</SelectItem>
                        {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.driverName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Date')}</Label>
                <Input type="date" {...register(`driverChanges.${index}.changedAt`)} className="h-8 bg-background/50 border-white/10" />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeChange(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendChange({ previousDriverId: '', newDriverId: '', changedAt: new Date().toISOString().split('T')[0] })} className="mt-2 h-8 text-xs border-dashed"><Plus className="w-3 h-3 mr-1"/> {t('Record Change')}</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2"><Label>{t('From')}</Label><Input placeholder="Dispatch City" {...register('from')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('To')}</Label><Input placeholder="Delivery Destination" {...register('to')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t('Material Cargo')}</Label><Input placeholder="e.g. Iron Coils" {...register('material')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Consignment Weight')}</Label><Input placeholder="e.g. 25 Tons" {...register('sizeWeight')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>{t('Billing Type')}</Label>
          <Controller
            name="billingType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">{t('Fixed Price')}</SelectItem>
                  <SelectItem value="Per Ton">{t('Per Ton')}</SelectItem>
                  <SelectItem value="Per Trip">{t('Per Trip')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2"><Label>{t('Freight Amount (₹)')}</Label><Input type="number" {...register('freightAmount')} className="bg-background/50 border-white/10 font-semibold text-primary" /></div>
        <div className="space-y-2"><Label>{t('Commission (₹)')}</Label><Input type="number" {...register('commission')} className="bg-background/50 border-white/10" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>{t('Party Advance (₹)')}</Label><Input type="number" {...register('partyAdvance')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Labour Charges (₹)')}</Label><Input type="number" {...register('labourCharges')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Permission Charges (₹)')}</Label><Input type="number" {...register('permissionCharges')} className="bg-background/50 border-white/10" /></div>
      </div>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Fastag / Toll Entries')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tollFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Amount (₹)')}</Label><Input type="number" {...register(`tollEntries.${index}.amount`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Date')}</Label><Input type="date" {...register(`tollEntries.${index}.date`)} className="h-8 bg-background/50" /></div>
              <div className="flex-[1.5] space-y-1"><Label className="text-xs">{t('Remarks')}</Label><Input {...register(`tollEntries.${index}.remarks`)} className="h-8 bg-background/50" placeholder="Optional" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeToll(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendToll({ tollName: '', amount: 0, date: new Date().toISOString().split('T')[0], remarks: '' })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Toll')}</Button>
        </CardContent>
      </Card>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Maintenance Entries')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {maintFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Type')}</Label><Input {...register(`maintenanceEntries.${index}.maintenanceType`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Amount')}</Label><Input type="number" {...register(`maintenanceEntries.${index}.amount`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Date')}</Label><Input type="date" {...register(`maintenanceEntries.${index}.date`)} className="h-8 bg-background/50" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeMaint(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendMaint({ maintenanceType: '', amount: 0, date: new Date().toISOString().split('T')[0], remarks: '' })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Maintenance')}</Button>
        </CardContent>
      </Card>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Diesel Entries')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dieselFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-[1.5] space-y-1">
                <Label className="text-xs">{t('Diesel (Quantity)')}</Label>
                <Input
                  type="number"
                  {...register(`dieselEntries.${index}.litres`, {
                    onChange: (e) => {
                      const litres = parseFloat(e.target.value) || 0;
                      const rate = watch(`dieselEntries.${index}.ratePerLitre`) || 0;
                      setValue(`dieselEntries.${index}.totalCost`, Math.round(litres * rate * 100) / 100);
                    }
                  })}
                  className="h-8 bg-background/50"
                />
              </div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Date')}</Label><Input type="date" {...register(`dieselEntries.${index}.date`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Price')}</Label>
                <Input
                  type="number"
                  {...register(`dieselEntries.${index}.ratePerLitre`, {
                    onChange: (e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const litres = watch(`dieselEntries.${index}.litres`) || 0;
                      setValue(`dieselEntries.${index}.totalCost`, Math.round(litres * rate * 100) / 100);
                    }
                  })}
                  className="h-8 bg-background/50"
                />
              </div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Total')}</Label><Input type="number" {...register(`dieselEntries.${index}.totalCost`)} className="h-8 bg-background/50" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDiesel(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendDiesel({ fuelStation: '', litres: 0, ratePerLitre: 0, totalCost: 0, date: new Date().toISOString().split('T')[0] })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Diesel')}</Button>
        </CardContent>
      </Card>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Liquid Entries')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {liquidFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-[1.5] space-y-1">
                <Label className="text-xs">{t('Liquid (Quantity)')}</Label>
                <Input
                  type="number"
                  {...register(`liquidEntries.${index}.litres`, {
                    onChange: (e) => {
                      const litres = parseFloat(e.target.value) || 0;
                      const rate = watch(`liquidEntries.${index}.ratePerLitre`) || 0;
                      setValue(`liquidEntries.${index}.totalCost`, Math.round(litres * rate * 100) / 100);
                    }
                  })}
                  className="h-8 bg-background/50"
                />
              </div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Date')}</Label><Input type="date" {...register(`liquidEntries.${index}.date`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('Price')}</Label>
                <Input
                  type="number"
                  {...register(`liquidEntries.${index}.ratePerLitre`, {
                    onChange: (e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const litres = watch(`liquidEntries.${index}.litres`) || 0;
                      setValue(`liquidEntries.${index}.totalCost`, Math.round(litres * rate * 100) / 100);
                    }
                  })}
                  className="h-8 bg-background/50"
                />
              </div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Total')}</Label><Input type="number" {...register(`liquidEntries.${index}.totalCost`)} className="h-8 bg-background/50" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLiquid(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendLiquid({ litres: 0, ratePerLitre: 0, totalCost: 0, date: new Date().toISOString().split('T')[0] })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Liquid')}</Button>
        </CardContent>
      </Card>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Trip Links / Documents')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {linkFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-[2] space-y-1"><Label className="text-xs">{t('URL')}</Label><Input {...register(`tripLinks.${index}.url`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Desc')}</Label><Input {...register(`tripLinks.${index}.description`)} className="h-8 bg-background/50" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLink(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendLink({ url: '', description: '', date: new Date().toISOString().split('T')[0] })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Link')}</Button>
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Total Summary')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t('Total Diesel (₹)')}</Label>
                {watchedDieselEntries.length > 0 && <span className="text-[10px] text-primary">({t('from entries')})</span>}
              </div>
              <Input type="number" {...register('dieselAmount')} readOnly={watchedDieselEntries.length > 0} className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t('Total Toll (₹)')}</Label>
                {watchedTollEntries.length > 0 && <span className="text-[10px] text-primary">({t('from entries')})</span>}
              </div>
              <Input type="number" {...register('toll')} readOnly={watchedTollEntries.length > 0} className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t('Total Maintenance (₹)')}</Label>
                {watchedMaintEntries.length > 0 && <span className="text-[10px] text-primary">({t('from entries')})</span>}
              </div>
              <Input type="number" {...register('maintenance')} readOnly={watchedMaintEntries.length > 0} className="bg-background/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>{t('Extra Charges (₹)')}</Label><Input type="number" {...register('extraCharges')} className="bg-background/50" /></div>
            <div className="space-y-2"><Label>{t('Driver Cash (₹)')}</Label><Input type="number" {...register('driverCash')} className="bg-background/50" /></div>
            <div className="space-y-2"><Label>{t('Extra Running (₹)')}</Label><Input type="number" {...register('extraRunning')} className="bg-background/50" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 flex flex-col items-center">
                <span className="text-xs text-muted-foreground">{t('Total Freight')}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totalFreight)}</span>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-3 flex flex-col items-center">
                <span className="text-xs text-green-500/80">{t('Advance Received')}</span>
                <span className="text-lg font-bold text-green-500">{formatCurrency(partyAdvance)}</span>
              </CardContent>
            </Card>
            <Card className="bg-orange-500/10 border-orange-500/20">
              <CardContent className="p-3 flex flex-col items-center">
                <span className="text-xs text-orange-500/80">{t('Balance Due')}</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(balance)}</span>
              </CardContent>
            </Card>
          </div>
          <Card className={`${netProfit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <CardContent className="p-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-medium">{t('Net Profit')}</span>
              <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(netProfit)}
              </span>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label>{t('Trip Status')}</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">{t('Draft')}</SelectItem>
                  <SelectItem value="Scheduled">{t('Scheduled')}</SelectItem>
                  <SelectItem value="Loading">{t('Loading')}</SelectItem>
                  <SelectItem value="In Transit">{t('In Transit')}</SelectItem>
                  <SelectItem value="Unloading">{t('Unloading')}</SelectItem>
                  <SelectItem value="Completed">{t('Completed')}</SelectItem>
                  <SelectItem value="Cancelled">{t('Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('POD Status')}</Label>
          <Controller
            name="podStatus"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">{t('Pending')}</SelectItem>
                  <SelectItem value="Received">{t('Received')}</SelectItem>
                  <SelectItem value="Submitted">{t('Submitted')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('Payment Status')}</Label>
          <Controller
            name="paymentStatus"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">{t('Pending')}</SelectItem>
                  <SelectItem value="Partial">{t('Partial')}</SelectItem>
                  <SelectItem value="Paid">{t('Paid')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('Notes')}</Label>
        <Input {...register('notes')} placeholder="e.g. Unloading delay" className="bg-background/50 border-white/10" />
      </div>

      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-2 bg-background/80 backdrop-blur-sm sticky bottom-0 z-10">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? t('Saving...') : (isEdit ? t('Update Trip') : t('Save Trip'))}
        </Button>
      </div>
    </form>
  );
}
