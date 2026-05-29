import { useState } from 'react';
import { usePrismaMutation } from '@/hooks/usePrisma';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, MaintenanceLog } from '@prisma/client';
import { usePreferences } from '@/contexts/PreferencesContext';

type VehicleWithLogs = Vehicle & { maintenanceLogs: MaintenanceLog[] };

interface MaintenanceModalProps {
  vehicle: VehicleWithLogs | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceModal({ vehicle, isOpen, onOpenChange }: MaintenanceModalProps) {
  const { t } = usePreferences();
  const [maintType, setMaintType] = useState('Tyre');
  const [maintCost, setMaintCost] = useState('');
  const [maintOdo, setMaintOdo] = useState('');
  const [maintDesc, setMaintDesc] = useState('');

  const addMaintenanceMutation = usePrismaMutation('maintenanceLog', 'create', [['vehicles', 'all']]);
  const updateVehicleMutation = usePrismaMutation('vehicle', 'update', [['vehicles', 'all']]);

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    addMaintenanceMutation.mutate({
      data: {
        vehicleId: vehicle.id,
        type: maintType,
        cost: parseFloat(maintCost) || 0,
        odometer: parseInt(maintOdo, 10) || null,
        description: maintDesc || null
      }
    }, {
      onSuccess: () => {
        // Optional: Auto-update vehicle's current KMS if higher
        if (parseInt(maintOdo, 10) > (vehicle.currentKms || 0)) {
          updateVehicleMutation.mutate({
            where: { id: vehicle.id },
            data: { currentKms: parseInt(maintOdo, 10) }
          });
        }
        setMaintCost('');
        setMaintDesc('');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Maintenance Log — ')}{vehicle?.vehicleNumber}</DialogTitle>
          <DialogDescription>{t('Track tyre replacements, oil changes, and repairs.')}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <form onSubmit={handleAddMaintenance} className="grid grid-cols-5 gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 items-end">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">{t('Type')}</Label>
              <select value={maintType} onChange={(e) => setMaintType(e.target.value)} className="w-full h-8 px-2 rounded-md bg-background/50 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="Tyre">{t('Tyre')}</option>
                <option value="Oil">{t('Oil')}</option>
                <option value="Repair">{t('Repair')}</option>
                <option value="Spares">{t('Spares')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </div>
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">{t('Cost (₹)')}</Label>
              <Input value={maintCost} onChange={(e) => setMaintCost(e.target.value)} type="number" className="h-8 text-xs bg-background/50 border-white/10" required />
            </div>
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">{t('Odometer')}</Label>
              <Input value={maintOdo} onChange={(e) => setMaintOdo(e.target.value)} type="number" className="h-8 text-xs bg-background/50 border-white/10" />
            </div>
            <div className="space-y-1 col-span-1">
              <Label className="text-xs">{t('Details/Serial No')}</Label>
              <Input value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} className="h-8 text-xs bg-background/50 border-white/10" required />
            </div>
            <div className="col-span-1">
              <Button type="submit" disabled={addMaintenanceMutation.isPending} size="sm" className="w-full h-8 bg-primary hover:bg-primary/90 text-xs">
                {addMaintenanceMutation.isPending ? t('Adding...') : t('Add Log')}
              </Button>
            </div>
          </form>

          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-white/5 border-white/10">
                  <TableHead className="py-2 text-xs">{t('Date')}</TableHead>
                  <TableHead className="py-2 text-xs">{t('Type')}</TableHead>
                  <TableHead className="py-2 text-xs">{t('Cost')}</TableHead>
                  <TableHead className="py-2 text-xs">{t('Odometer')}</TableHead>
                  <TableHead className="py-2 text-xs">{t('Details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicle?.maintenanceLogs && vehicle.maintenanceLogs.length > 0 ? (
                  vehicle.maintenanceLogs.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-white/5 border-white/10">
                      <TableCell className="py-2 text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString()}</TableCell>
                      <TableCell className="py-2 text-xs">
                        <Badge variant="outline" className="text-[10px] py-0">{t(log.type)}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-xs font-bold text-orange-400">₹{log.cost.toLocaleString()}</TableCell>
                      <TableCell className="py-2 text-xs">{log.odometer || '-'}</TableCell>
                      <TableCell className="py-2 text-xs">{log.description}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-xs text-muted-foreground">{t('No maintenance logs recorded.')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
