import { z } from 'zod';

export const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Registration Number is required').toUpperCase(),
  vehicleType: z.string().min(1, 'Vehicle Type is required'),
  capacity: z.string().nullable().optional(),
  insuranceExpiry: z.string().nullable().optional(),
  fitnessExpiry: z.string().nullable().optional(),
  permitExpiry: z.string().nullable().optional(),
  pollutionExpiry: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  status: z.enum(['Active', 'Maintenance', 'Inactive', 'On-Trip']).default('Active'),
  currentKms: z.coerce.number().min(0).default(0),
  currentLocation: z.string().nullable().optional(),
  rcImagePath: z.string().nullable().optional(),
  insuranceImagePath: z.string().nullable().optional(),
  fitnessImagePath: z.string().nullable().optional(),
  permitImagePath: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

export const maintenanceSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  cost: z.coerce.number().min(0, 'Cost must be positive'),
  odometer: z.coerce.number().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
