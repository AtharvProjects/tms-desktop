import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema } from './schema';
import type { TripFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
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
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<TripFormValues>({
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
      route: initialData?.route || '',
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
      driverSavings: initialData?.driverSavings || 0,
      selfExpenses: initialData?.selfExpenses || 0,
      status: initialData?.status || 'Scheduled',
      podStatus: initialData?.podStatus || 'Pending',
      paymentStatus: initialData?.paymentStatus || 'Pending',
      notes: initialData?.notes || '',
      directDrivers: initialData?.directDrivers || [],
      driverAdvances: initialData?.driverAdvances?.map((a: any) => ({...a, date: new Date(a.date).toISOString().split('T')[0]})) || [],
      driverChanges: initialData?.driverChanges?.map((c: any) => ({...c, changedAt: new Date(c.changedAt).toISOString().split('T')[0]})) || [],
      tollEntries: initialData?.tollEntries?.map((t: any) => ({...t, date: new Date(t.date).toISOString().split('T')[0]})) || [],
      maintenanceEntries: initialData?.maintenanceEntries?.map((m: any) => ({...m, date: new Date(m.date).toISOString().split('T')[0]})) || [],
      dieselEntries: initialData?.dieselEntries?.map((d: any) => ({...d, date: new Date(d.date).toISOString().split('T')[0]})) || [],
      tripLinks: initialData?.tripLinks?.map((l: any) => ({...l, date: new Date(l.date).toISOString().split('T')[0]})) || [],
    }
  });

  const { fields: directDriversFields, append: appendDirectDriver, remove: removeDirectDriver } = useFieldArray({ control, name: 'directDrivers' });
  const { fields: advanceFields, append: appendAdvance, remove: removeAdvance } = useFieldArray({ control, name: 'driverAdvances' });
  const { fields: changeFields, append: appendChange, remove: removeChange } = useFieldArray({ control, name: 'driverChanges' });
  const { fields: tollFields, append: appendToll, remove: removeToll } = useFieldArray({ control, name: 'tollEntries' });
  const { fields: maintFields, append: appendMaint, remove: removeMaint } = useFieldArray({ control, name: 'maintenanceEntries' });
  const { fields: dieselFields, append: appendDiesel, remove: removeDiesel } = useFieldArray({ control, name: 'dieselEntries' });
  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({ control, name: 'tripLinks' });

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
  const selfExpenses = watch('selfExpenses') || 0;
  
  // Also calculate total from dynamic rows if applicable, but user might enter summary values directly.
  // We'll stick to the summary fields for net profit calculation as requested originally.
  
  const balance = freightAmount - partyAdvance;
  const netProfit = freightAmount - commission - dieselAmount - liquidDiesel - driverCash - toll - maintenance - extraRunning - extraCharges - selfExpenses;

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
          <Label>{t('Assigned Driver (Registered)')}</Label>
          <select {...register('driverId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">{t('Select Driver')}</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.driverName}</option>)}
          </select>
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
                <select {...register(`driverChanges.${index}.previousDriverId`)} className="w-full h-8 px-2 rounded-md bg-background/50 border border-white/10 text-xs">
                  <option value="">{t('None')}</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.driverName}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('New Driver')}</Label>
                <select {...register(`driverChanges.${index}.newDriverId`)} className="w-full h-8 px-2 rounded-md bg-background/50 border border-white/10 text-xs">
                  <option value="">{t('None')}</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.driverName}</option>)}
                </select>
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

      <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2"><Label>{t('From Route Location *')}</Label><Input placeholder="Dispatch City" {...register('from')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('To Route Location *')}</Label><Input placeholder="Delivery Destination" {...register('to')} className="bg-background/50 border-white/10" /></div>
        <div className="space-y-2"><Label>{t('Via / Route Points')}</Label><Input placeholder="e.g. Surat - Vadodara" {...register('route')} className="bg-background/50 border-white/10" /></div>
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
        <div className="space-y-2"><Label>{t('Driver Savings (Bachat)')}</Label><Input type="number" {...register('driverSavings')} className="bg-background/50 border-white/10 text-green-400" /></div>
        <div className="space-y-2"><Label>{t('Self Expenses (Kharch)')}</Label><Input type="number" {...register('selfExpenses')} className="bg-background/50 border-white/10 text-orange-400" /></div>
      </div>

      <Card className="bg-background/20 border-white/10 mt-4">
        <CardHeader className="py-3"><CardTitle className="text-sm">{t('Toll Entries')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tollFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-[1.5] space-y-1"><Label className="text-xs">{t('Toll Name')}</Label><Input {...register(`tollEntries.${index}.tollName`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Amount')}</Label><Input type="number" {...register(`tollEntries.${index}.amount`)} className="h-8 bg-background/50" /></div>
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
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Station')}</Label><Input {...register(`dieselEntries.${index}.fuelStation`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Litres')}</Label><Input type="number" {...register(`dieselEntries.${index}.litres`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Rate')}</Label><Input type="number" {...register(`dieselEntries.${index}.ratePerLitre`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Total')}</Label><Input type="number" {...register(`dieselEntries.${index}.totalCost`)} className="h-8 bg-background/50" /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">{t('Date')}</Label><Input type="date" {...register(`dieselEntries.${index}.date`)} className="h-8 bg-background/50" /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDiesel(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => appendDiesel({ fuelStation: '', litres: 0, ratePerLitre: 0, totalCost: 0, date: new Date().toISOString().split('T')[0] })} className="mt-2 h-8 text-xs"><Plus className="w-3 h-3 mr-1"/> {t('Add Diesel')}</Button>
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

      {/* Main Totals used for legacy fields just in case */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div className="space-y-2"><Label>{t('Total Summary Diesel (₹)')}</Label><Input type="number" {...register('dieselAmount')} className="bg-background/50" /></div>
        <div className="space-y-2"><Label>{t('Total Summary Toll (₹)')}</Label><Input type="number" {...register('toll')} className="bg-background/50" /></div>
        <div className="space-y-2"><Label>{t('Total Summary Maintenance (₹)')}</Label><Input type="number" {...register('maintenance')} className="bg-background/50" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="space-y-2"><Label>{t('Extra Charges (₹)')}</Label><Input type="number" {...register('extraCharges')} className="bg-background/50" /></div>
        
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
          <select {...register('status')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10">
            <option value="Scheduled">{t('Scheduled')}</option>
            <option value="Loading">{t('Loading')}</option>
            <option value="In Transit">{t('In Transit')}</option>
            <option value="Unloading">{t('Unloading')}</option>
            <option value="Completed">{t('Completed')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('POD Status')}</Label>
          <select {...register('podStatus')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10">
            <option value="Pending">{t('Pending')}</option>
            <option value="Received">{t('Received')}</option>
            <option value="Submitted">{t('Submitted')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('Payment Status')}</Label>
          <select {...register('paymentStatus')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10">
            <option value="Pending">{t('Pending')}</option>
            <option value="Partial">{t('Partial')}</option>
            <option value="Paid">{t('Paid')}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('Notes')}</Label>
        <Input {...register('notes')} placeholder="e.g. Unloading delay" className="bg-background/50 border-white/10" />
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
