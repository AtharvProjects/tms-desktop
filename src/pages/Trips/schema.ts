import { z } from 'zod';

export const tripSchema = z.object({
  tripNo: z.string().optional().default(''),
  tripName: z.string().nullable().optional(),
  tripDate: z.string().optional().default(''),
  vehicleId: z.string().nullable().optional(),
  partyId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  sizeWeight: z.string().nullable().optional(),
  billingType: z.string().default('Fixed'),
  freightAmount: z.coerce.number().min(0).default(0),
  dieselAmount: z.coerce.number().min(0).default(0),
  liquidDiesel: z.coerce.number().min(0).default(0),
  driverCash: z.coerce.number().min(0).default(0),
  toll: z.coerce.number().min(0).default(0),
  partyAdvance: z.coerce.number().min(0).default(0),
  driverAdvance: z.coerce.number().min(0).default(0),
  commission: z.coerce.number().min(0).default(0),
  maintenance: z.coerce.number().min(0).default(0),
  extraRunning: z.coerce.number().min(0).default(0),
  detentionTime: z.string().nullable().optional(),
  loadingDate: z.string().nullable().optional(),
  unloadingDate: z.string().nullable().optional(),
  reportDate: z.string().nullable().optional(),
  extraCharges: z.coerce.number().min(0).default(0),
  labourCharges: z.coerce.number().min(0).default(0),
  permissionCharges: z.coerce.number().min(0).default(0),
  status: z.enum(['Draft', 'Scheduled', 'Loading', 'In Transit', 'Unloading', 'Completed', 'Cancelled']).default('Draft'),
  podStatus: z.enum(['Pending', 'Received', 'Submitted', 'Verified']).default('Pending'),
  paymentStatus: z.enum(['Pending', 'Partial', 'Paid', 'Overdue']).default('Pending'),
  notes: z.string().nullable().optional(),
  
  // Array Fields — all optional, default to empty
  directDrivers: z.array(z.object({
    driverName: z.string().min(1, "Name required")
  })).default([]),
  
  driverAdvances: z.array(z.object({
    amount: z.coerce.number().min(0).default(0),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  driverChanges: z.array(z.object({
    previousDriverId: z.string().nullable().optional(),
    newDriverId: z.string().nullable().optional(),
    changedAt: z.string()
  })).default([]),
  
  tollEntries: z.array(z.object({
    tollName: z.string().optional().default(''),
    amount: z.coerce.number().min(0).default(0),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  maintenanceEntries: z.array(z.object({
    maintenanceType: z.string().optional().default(''),
    amount: z.coerce.number().min(0).default(0),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  dieselEntries: z.array(z.object({
    fuelStation: z.string().nullable().optional(),
    litres: z.coerce.number().min(0).default(0),
    ratePerLitre: z.coerce.number().min(0).default(0),
    totalCost: z.coerce.number().min(0),
    date: z.string()
  })).default([]),
  
  liquidEntries: z.array(z.object({
    litres: z.coerce.number().min(0).default(0),
    ratePerLitre: z.coerce.number().min(0).default(0),
    totalCost: z.coerce.number().min(0),
    date: z.string()
  })).default([]),
  
  tripLinks: z.array(z.object({
    url: z.string().min(1, "URL required"),
    description: z.string().nullable().optional(),
    date: z.string()
  })).default([])
});

export type TripFormValues = z.infer<typeof tripSchema>;

