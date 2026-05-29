import { z } from 'zod';

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice Number is required'),
  date: z.string().min(1, 'Invoice Date is required'),
  tripId: z.string().min(1, 'Trip is required'),
  gstPercentage: z.coerce.number().min(0).default(0),
  shortageAmount: z.coerce.number().min(0).default(0),
  damageAmount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  status: z.enum(['Unpaid', 'Partial', 'Paid']).default('Unpaid'),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
