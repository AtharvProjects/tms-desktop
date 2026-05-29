import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Car, Truck, User, ShieldAlert, Edit, Trash2, Wrench, RefreshCw, MoreVertical, MapPin, Gauge } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePrismaQuery, usePrismaMutation } from '@/hooks/usePrisma'
import type { Vehicle, Driver, MaintenanceLog } from '@prisma/client'
import { VehicleForm } from './VehicleForm'
import { MaintenanceModal } from './MaintenanceModal'
import type { VehicleFormValues } from './schema'
import { usePreferences } from '@/contexts/PreferencesContext'

type VehicleWithRelations = Vehicle & {
  driver: Driver | null;
  maintenanceLogs: MaintenanceLog[];
}

export default function Vehicles() {
  const { t } = usePreferences();
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  
  // Dialog States
  const [isOpen, setIsOpen] = useState(location.state && (location.state as any).openNew)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false)
  
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithRelations | null>(null)

  // Data Fetching
  const { data: vehicles = [], isLoading, refetch } = usePrismaQuery<VehicleWithRelations[]>(
    ['vehicles', 'all'],
    'vehicle',
    'findMany',
    { include: { driver: true, maintenanceLogs: { orderBy: { date: 'desc' } } }, orderBy: { vehicleNumber: 'asc' } }
  )

  const { data: drivers = [] } = usePrismaQuery<Driver[]>(
    ['drivers', 'all'],
    'driver',
    'findMany',
    { orderBy: { driverName: 'asc' } }
  )

  // Mutations
  const createMutation = usePrismaMutation<any, Vehicle>('vehicle', 'create', [['vehicles', 'all']])
  const updateMutation = usePrismaMutation<any, Vehicle>('vehicle', 'update', [['vehicles', 'all']])
  const deleteMutation = usePrismaMutation<any, Vehicle>('vehicle', 'delete', [['vehicles', 'all']])

  const getDaysRemaining = (dateStr: string | Date | null) => {
    if (!dateStr) return null
    const exp = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = exp.getTime() - today.getTime()
    return Math.ceil(diff / (24 * 60 * 60 * 1000))
  }

  const getExpiryStatus = (dateStr: string | Date | null) => {
    if (!dateStr) return { label: 'N/A', class: 'text-muted-foreground', days: null }
    const days = getDaysRemaining(dateStr)
    if (days === null) return { label: 'N/A', class: 'text-muted-foreground', days: null }
    const dateLabel = new Date(dateStr).toLocaleDateString()
    if (days < 0) {
      return { label: `${dateLabel}`, subLabel: `Expired ${Math.abs(days)}d ago`, class: 'text-red-500 font-extrabold animate-pulse', days }
    } else if (days <= 15) {
      return { label: dateLabel, subLabel: `In ${days} days`, class: 'text-orange-500 font-bold', days }
    } else if (days <= 30) {
      return { label: dateLabel, subLabel: `In ${days} days`, class: 'text-yellow-500 font-semibold', days }
    }
    return { label: dateLabel, subLabel: `In ${days} days`, class: 'text-green-500', days }
  }

  const isExpiredSoon = (dateStr: string | Date | null) => {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const diff = exp.getTime() - new Date().getTime()
    return diff < 30 * 24 * 60 * 60 * 1000
  }

  const handleCreate = (data: VehicleFormValues) => {
    createMutation.mutate({
      data: {
        ...data,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
        fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : null,
        permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
        pollutionExpiry: data.pollutionExpiry ? new Date(data.pollutionExpiry) : null,
        driverId: data.driverId || null,
        capacity: data.capacity || null,
        currentLocation: data.currentLocation || null,
        notes: data.notes || null,
      }
    }, {
      onSuccess: () => setIsOpen(false)
    })
  }

  const handleEdit = (data: VehicleFormValues) => {
    if (!selectedVehicle) return
    updateMutation.mutate({
      where: { id: selectedVehicle.id },
      data: {
        ...data,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
        fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : null,
        permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
        pollutionExpiry: data.pollutionExpiry ? new Date(data.pollutionExpiry) : null,
        driverId: data.driverId || null,
        capacity: data.capacity || null,
        currentLocation: data.currentLocation || null,
        notes: data.notes || null,
      }
    }, {
      onSuccess: () => setIsEditOpen(false)
    })
  }

  const handleDelete = () => {
    if (!selectedVehicle) return
    deleteMutation.mutate({ where: { id: selectedVehicle.id } }, {
      onSuccess: () => setIsDeleteOpen(false)
    })
  }

  const handleSetMaintenance = (vehicle: Vehicle) => {
    updateMutation.mutate({
      where: { id: vehicle.id },
      data: { status: vehicle.status === 'Maintenance' ? 'Active' : 'Maintenance' }
    })
  }

  const statusTabs = ['All', 'Active', 'On-Trip', 'Maintenance', 'Inactive']

  const filteredVehicles = vehicles
    .filter(v => statusFilter === 'All' || v.status === statusFilter)
    .filter(v =>
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleType.toLowerCase().includes(search.toLowerCase()) ||
      (v.driver && v.driver.driverName.toLowerCase().includes(search.toLowerCase()))
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">{t('Fleet Registry')}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-white/10"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setIsOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> {t('Add Vehicle')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('Loading vehicles...')}</div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Fleet Size')}</CardTitle>
                <Truck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">{vehicles.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{vehicles.filter(v => v.status === 'On-Trip').length} {t('on road now')}</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Available Vehicles')}</CardTitle>
                <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 border-green-500/30">{t('Ready')}</Badge>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">{vehicles.filter(v => v.status === 'Active').length}</div>
                <p className="text-xs text-muted-foreground mt-1">{vehicles.filter(v => v.status === 'Maintenance').length} {t('in maintenance')}</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldAlert className="w-16 h-16 text-red-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-red-400">{t('Compliance Alerts')}</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-red-500">
                  {vehicles.filter(v => isExpiredSoon(v.insuranceExpiry) || isExpiredSoon(v.fitnessExpiry) || isExpiredSoon(v.pollutionExpiry) || isExpiredSoon(v.permitExpiry)).length}
                </div>
                <p className="text-xs text-red-400 mt-1">{t('expiring within 30 days')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center space-x-2">
            {statusTabs.map(tab => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  statusFilter === tab
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}>
                {t(tab)} {tab !== 'All' && <span className="ml-1 text-xs opacity-70">({vehicles.filter(v => v.status === tab).length})</span>}
              </button>
            ))}
          </div>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">{t('Vehicles Status')}</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder={t('Search by registration number, type...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead>{t('Vehicle Registration')}</TableHead>
                      <TableHead>{t('Tracking')}</TableHead>
                      <TableHead>{t('Type & Capacity')}</TableHead>
                      <TableHead>{t('Assigned Driver')}</TableHead>
                      <TableHead>{t('Compliance (INS / FIT / PRM / PUC)')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Notes')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">{t('No vehicles found.')}</TableCell></TableRow>
                    ) : (
                      filteredVehicles.map((vehicle) => {
                        const ins = getExpiryStatus(vehicle.insuranceExpiry)
                        const fit = getExpiryStatus(vehicle.fitnessExpiry)
                        const permit = getExpiryStatus(vehicle.permitExpiry)
                        const puc = getExpiryStatus(vehicle.pollutionExpiry)
                        return (
                          <TableRow key={vehicle.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-semibold text-foreground">
                              <div className="flex items-center space-x-2">
                                <Car className="h-4 w-4 text-primary" />
                                <span className="font-mono uppercase">{vehicle.vehicleNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm min-w-[120px]">
                                <span className="flex items-center text-muted-foreground"><MapPin className="h-3 w-3 mr-1" /> <span className="truncate">{vehicle.currentLocation || t('Base Station')}</span></span>
                                <span className="flex items-center text-muted-foreground mt-0.5"><Gauge className="h-3 w-3 mr-1" /> {vehicle.currentKms?.toLocaleString() || '0'} km</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                <span>{vehicle.vehicleType}</span>
                                <span className="text-xs text-muted-foreground mt-0.5">{vehicle.capacity || t('N/A Capacity')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {vehicle.driver ? (
                                <div className="flex items-center space-x-1">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{vehicle.driver.driverName}</span>
                                </div>
                              ) : <span className="text-muted-foreground text-xs italic flex items-center"><User className="h-3.5 w-3.5 mr-1" />{t('Unassigned')}</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="grid grid-cols-2 gap-2 min-w-[150px]">
                                {[['INS', ins], ['FIT', fit], ['PRM', permit], ['PUC', puc]].map(([key, info]: any) => (
                                  <div key={key} className={`flex items-center justify-between px-2 py-1 rounded-md border bg-background/50 ${info.days !== null && info.days < 0 ? 'border-red-500/50 bg-red-500/10' : info.days !== null && info.days <= 30 ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10'}`}>
                                    <span className="font-semibold text-[10px] text-muted-foreground mr-1">{key}</span>
                                    <span className={info.class + ' text-[10px] font-medium'}>{info.days !== null && info.days < 0 ? t('EXPIRED') : info.days !== null && info.days <= 30 ? `${info.days}d` : info.label}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={vehicle.status === 'Active' ? 'border-green-500/30 text-green-500 bg-green-500/10' : vehicle.status === 'On-Trip' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : vehicle.status === 'Maintenance' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'}>
                                {t(vehicle.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{vehicle.notes || '-'}</TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] glass-panel border-white/10">
                                  <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setIsEditOpen(true); }} className="hover:bg-white/10 cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4" /> {t('Edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSetMaintenance(vehicle)} className="hover:bg-white/10 cursor-pointer">
                                    <RefreshCw className="mr-2 h-4 w-4" /> {vehicle.status === 'Maintenance' ? t('Set Active') : t('Set Maintenance')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setIsMaintenanceOpen(true); }} className="hover:bg-white/10 cursor-pointer text-orange-400 focus:text-orange-400">
                                    <Wrench className="mr-2 h-4 w-4" /> {t('Maintenance Log')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setIsDeleteOpen(true); }} className="hover:bg-red-500/20 text-red-400 focus:text-red-400 cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('Delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => setIsOpen(o)}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Add New Vehicle')}</DialogTitle>
            <DialogDescription>{t('Register a new truck or container to the fleet registry.')}</DialogDescription>
          </DialogHeader>
          <VehicleForm 
            drivers={drivers} 
            onSubmit={handleCreate} 
            onCancel={() => setIsOpen(false)} 
            isSubmitting={createMutation.isPending} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(o) => setIsEditOpen(o)}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Vehicle — ')}{selectedVehicle?.vehicleNumber}</DialogTitle>
            <DialogDescription>{t('Update vehicle details, compliance dates, and assignment.')}</DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <VehicleForm 
              initialData={selectedVehicle as Partial<VehicleFormValues>} 
              drivers={drivers} 
              onSubmit={handleEdit} 
              onCancel={() => setIsEditOpen(false)} 
              isSubmitting={updateMutation.isPending} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="glass-panel border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('Delete Vehicle?')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to permanently delete ')}<strong>{selectedVehicle?.vehicleNumber}</strong>{t('? This action cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>{t('Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />{deleteMutation.isPending ? t('Deleting...') : t('Delete Vehicle')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MaintenanceModal 
        vehicle={selectedVehicle} 
        isOpen={isMaintenanceOpen} 
        onOpenChange={setIsMaintenanceOpen} 
      />
    </div>
  )
}
