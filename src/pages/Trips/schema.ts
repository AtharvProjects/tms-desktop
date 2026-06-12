import { z } from 'zod';

export const tripSchema = z.object({
  tripNo: z.string().min(1, 'Trip Number is required'),
  tripDate: z.string().min(1, 'Trip Date is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  partyId: z.string().min(1, 'Party is required'),
  driverId: z.string().nullable().optional(),
  from: z.string().min(1, 'Route From is required'),
  to: z.string().min(1, 'Route To is required'),
  material: z.string().nullable().optional(),
  sizeWeight: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
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
  driverSavings: z.coerce.number().min(0).default(0),
  selfExpenses: z.coerce.number().min(0).default(0),
  status: z.enum(['Scheduled', 'Loading', 'In Transit', 'Unloading', 'Completed']).default('Scheduled'),
  podStatus: z.enum(['Pending', 'Received', 'Submitted']).default('Pending'),
  paymentStatus: z.enum(['Pending', 'Partial', 'Paid']).default('Pending'),
  notes: z.string().nullable().optional(),
  
  // New Array Fields
  directDrivers: z.array(z.object({
    driverName: z.string().min(1, "Name required")
  })).default([]),
  
  driverAdvances: z.array(z.object({
    amount: z.coerce.number().min(1, "Amount required"),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  driverChanges: z.array(z.object({
    previousDriverId: z.string().nullable().optional(),
    newDriverId: z.string().nullable().optional(),
    changedAt: z.string()
  })).default([]),
  
  tollEntries: z.array(z.object({
    tollName: z.string().min(1, "Name required"),
    amount: z.coerce.number().min(1, "Amount required"),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  maintenanceEntries: z.array(z.object({
    maintenanceType: z.string().min(1, "Type required"),
    amount: z.coerce.number().min(1, "Amount required"),
    date: z.string(),
    remarks: z.string().nullable().optional()
  })).default([]),
  
  dieselEntries: z.array(z.object({
    fuelStation: z.string().nullable().optional(),
    litres: z.coerce.number().min(1, "Litres required"),
    ratePerLitre: z.coerce.number().min(1, "Rate required"),
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
