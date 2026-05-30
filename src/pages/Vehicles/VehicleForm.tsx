import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema } from './schema';
import type { VehicleFormValues } from './schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Driver } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

interface VehicleFormProps {
  initialData?: Partial<VehicleFormValues>;
  drivers: Driver[];
  onSubmit: (data: VehicleFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function VehicleForm({ initialData, drivers, onSubmit, onCancel, isSubmitting }: VehicleFormProps) {
  const { t } = usePreferences();
  const [uploadError, setUploadError] = useState('');
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      vehicleNumber: initialData?.vehicleNumber || '',
      vehicleType: initialData?.vehicleType || '',
      capacity: initialData?.capacity || '',
      insuranceExpiry: initialData?.insuranceExpiry ? new Date(initialData.insuranceExpiry).toISOString().split('T')[0] : '',
      fitnessExpiry: initialData?.fitnessExpiry ? new Date(initialData.fitnessExpiry).toISOString().split('T')[0] : '',
      permitExpiry: initialData?.permitExpiry ? new Date(initialData.permitExpiry).toISOString().split('T')[0] : '',
      pollutionExpiry: initialData?.pollutionExpiry ? new Date(initialData.pollutionExpiry).toISOString().split('T')[0] : '',
      driverId: initialData?.driverId || '',
      status: initialData?.status || 'Active',
      currentKms: initialData?.currentKms || 0,
      currentLocation: initialData?.currentLocation || '',
      rcImagePath: initialData?.rcImagePath || '',
      insuranceImagePath: initialData?.insuranceImagePath || '',
      fitnessImagePath: initialData?.fitnessImagePath || '',
      permitImagePath: initialData?.permitImagePath || '',
      notes: initialData?.notes || '',
    }
  });

  const rcImagePath = watch('rcImagePath');
  const insuranceImagePath = watch('insuranceImagePath');
  const fitnessImagePath = watch('fitnessImagePath');
  const permitImagePath = watch('permitImagePath');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof VehicleFormValues) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const ext = file.name.split('.').pop();
        const filename = `veh_doc_${Date.now()}.${ext}`;
        const res = await window.electronAPI.app?.saveImage({ base64Data, filename, subfolder: 'vehicle_docs' });
        if (res?.success && res.filePath) {
          setValue(fieldName, res.filePath);
          setUploadError('');
        } else {
          setUploadError(res?.error || 'Failed to save image');
        }
      } catch (err: any) { setUploadError(err.message); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {uploadError && <div className="bg-red-500/15 border border-red-500/30 text-red-500 text-sm p-3 rounded-lg">{uploadError}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicleNumber">{t('Registration Number *')}</Label>
          <Input id="vehicleNumber" {...register('vehicleNumber')} placeholder={t('e.g. MH 12 AB 1234')} className="bg-background/50 border-white/10 font-mono uppercase" />
          {errors.vehicleNumber && <p className="text-red-500 text-xs">{errors.vehicleNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleType">{t('Vehicle Type *')}</Label>
          <Input id="vehicleType" {...register('vehicleType')} placeholder={t('e.g. Trailer 40ft')} className="bg-background/50 border-white/10" />
          {errors.vehicleType && <p className="text-red-500 text-xs">{errors.vehicleType.message}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">{t('Capacity (e.g. 30 Tons)')}</Label>
          <Input id="capacity" {...register('capacity')} placeholder={t('e.g. 25 Tons')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverId">{t('Default Driver')}</Label>
          <select id="driverId" {...register('driverId')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
            <option value="">{t('Unassigned')}</option>
            {drivers.map(d => (<option key={d.id} value={d.id}>{d.driverName} ({d.mobileNumber})</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="space-y-2">
          <Label htmlFor="insuranceExpiry">{t('Insurance Expiry')}</Label>
          <Input id="insuranceExpiry" type="date" {...register('insuranceExpiry')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fitnessExpiry">{t('Fitness Expiry')}</Label>
          <Input id="fitnessExpiry" type="date" {...register('fitnessExpiry')} className="bg-background/50 border-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="permitExpiry">{t('National Permit Expiry')}</Label>
          <Input id="permitExpiry" type="date" {...register('permitExpiry')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pollutionExpiry">{t('Pollution (PUC) Expiry')}</Label>
          <Input id="pollutionExpiry" type="date" {...register('pollutionExpiry')} className="bg-background/50 border-white/10" />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <Label>{t('Document Vault (Upload Scans)')}</Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('RC Book')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" /> {rcImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'rcImagePath')} />
            </Label>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('Insurance')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" /> {insuranceImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'insuranceImagePath')} />
            </Label>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('Fitness')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" /> {fitnessImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'fitnessImagePath')} />
            </Label>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground">{t('Permit')}</span>
            <Label className="cursor-pointer flex items-center justify-center p-2 border border-white/10 rounded-md bg-white/5 hover:bg-white/10 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" /> {permitImagePath ? t('Uploaded') : t('Upload')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'permitImagePath')} />
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <Label htmlFor="status">{t('Status')}</Label>
        <select id="status" {...register('status')} className="w-full h-10 px-3 rounded-md bg-background/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground">
          <option value="Active">{t('Active')}</option>
          <option value="Maintenance">{t('Maintenance')}</option>
          <option value="Inactive">{t('Inactive')}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentKms">{t('Odometer (Current KMs)')}</Label>
          <Input id="currentKms" type="number" {...register('currentKms')} className="bg-background/50 border-white/10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentLocation">{t('Current Location')}</Label>
          <Input id="currentLocation" {...register('currentLocation')} placeholder={t('e.g. Base Station')} className="bg-background/50 border-white/10" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('Notes')}</Label>
        <Input id="notes" {...register('notes')} placeholder={t('e.g. Engine work completed in May')} className="bg-background/50 border-white/10" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>{t('Cancel')}</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {isSubmitting ? t('Saving...') : t('Save Vehicle')}
        </Button>
      </div>
    </form>
  );
}
