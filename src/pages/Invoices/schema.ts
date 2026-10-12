import { z } from 'zod';

const safeNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}, z.number().default(0));

const safeStatus = z.preprocess((val) => {
  if (val === 'Paid' || val === 'Partial' || val === 'Unpaid') return val;
  return 'Unpaid';
}, z.string().default('Unpaid'));

export const invoiceSchema = z.object({
  invoiceNumber: z.preprocess((val) => (typeof val === 'string' ? val.trim() : ''), z.string().default('')),
  date: z.preprocess((val) => (typeof val === 'string' && val ? val : new Date().toISOString().split('T')[0]), z.string().default('')),
  tripId: z.preprocess((val) => (typeof val === 'string' ? val : ''), z.string().default('')),
  manualSubtotal: safeNumber,
  gstPercentage: safeNumber,
  shortageAmount: safeNumber,
  damageAmount: safeNumber,
  amountPaid: safeNumber, // This represents Advance Received
  commissionAmount: safeNumber,
  status: safeStatus,
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

