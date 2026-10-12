/**
 * Centralized Financial Calculation Engine for JTT TMS
 * 
 * ALL financial formulas live here. No component should duplicate these.
 * 
 * Net Profit Formula:
 *   Freight Revenue
 *   - Commission
 *   - Diesel (Summary)
 *   - Liquid Diesel
 *   - Driver Cash
 *   - Toll (Summary)
 *   - Maintenance (Summary)
 *   - Extra Running
 *   - Extra Charges
 *   - Self Expenses (Kharch)
 *   - Labour Charges
 *   - Permission Charges
 */

// ─── Trip-level calculations ─────────────────────────────────────────────

export interface TripFinancials {
  freightAmount?: number | string | null;
  commission?: number | string | null;
  dieselAmount?: number | string | null;
  liquidDiesel?: number | string | null;
  driverCash?: number | string | null;
  toll?: number | string | null;
  maintenance?: number | string | null;
  extraRunning?: number | string | null;
  extraCharges?: number | string | null;
  labourCharges?: number | string | null;
  permissionCharges?: number | string | null;
  partyAdvance?: number | string | null;
  driverAdvance?: number | string | null;
  tollEntries?: Array<{ amount?: number | string | null }>;
  maintenanceEntries?: Array<{ amount?: number | string | null }>;
  dieselEntries?: Array<{ totalCost?: number | string | null }>;
  liquidEntries?: Array<{ totalCost?: number | string | null }>;
  driverAdvances?: Array<{ amount?: number | string | null }>;
}

/** Calculate total billable revenue for a trip (Freight Amount + Extra Charges) */
export function calcTripTotalRevenue(trip: TripFinancials): number {
  return (Number(trip.freightAmount) || 0) + (Number(trip.extraCharges) || 0);
}

/** Calculate total expenses for a trip (everything deducted from freight) */
export function calcTripExpenses(trip: TripFinancials): number {
  const toll = (trip.tollEntries && trip.tollEntries.length > 0)
    ? trip.tollEntries.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    : (Number(trip.toll) || 0);

  const dieselAmount = (trip.dieselEntries && trip.dieselEntries.length > 0)
    ? trip.dieselEntries.reduce((sum, d) => sum + (Number(d.totalCost) || 0), 0)
    : (Number(trip.dieselAmount) || 0);

  const maintenance = (trip.maintenanceEntries && trip.maintenanceEntries.length > 0)
    ? trip.maintenanceEntries.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
    : (Number(trip.maintenance) || 0);

  const liquidDiesel = (trip.liquidEntries && trip.liquidEntries.length > 0)
    ? trip.liquidEntries.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0)
    : (Number(trip.liquidDiesel) || 0);

  return (
    (Number(trip.commission) || 0) +
    dieselAmount +
    liquidDiesel +
    (Number(trip.driverCash) || 0) +
    toll +
    maintenance +
    (Number(trip.extraRunning) || 0) +
    (Number(trip.labourCharges) || 0) +
    (Number(trip.permissionCharges) || 0)
  );
}

/** Calculate net profit for a single trip */
export function calcTripNetProfit(trip: TripFinancials): number {
  return calcTripTotalRevenue(trip) - calcTripExpenses(trip);
}

/** Calculate balance (total revenue minus party advance) */
export function calcTripBalance(trip: TripFinancials): number {
  return calcTripTotalRevenue(trip) - (Number(trip.partyAdvance) || 0);
}

/** Calculate profit margin as percentage */
export function calcProfitMargin(revenue: number, profit: number): string {
  const rev = Number(revenue) || 0;
  const prof = Number(profit) || 0;
  if (rev <= 0) return '0.0';
  return ((prof / rev) * 100).toFixed(1);
}

// ─── Aggregation functions ───────────────────────────────────────────────

/** Calculate total freight across trips (Freight Amount + Extra Charges) */
export function calcTotalFreight(trips: TripFinancials[]): number {
  return trips.reduce((acc, t) => acc + calcTripTotalRevenue(t), 0);
}

/** Calculate total net profit across trips */
export function calcTotalNetProfit(trips: TripFinancials[]): number {
  return trips.reduce((acc, t) => acc + calcTripNetProfit(t), 0);
}

/** Calculate total outstanding (revenue - advance for unpaid trips) */
export function calcTotalOutstanding(trips: Array<TripFinancials & { paymentStatus?: string }>): number {
  return trips
    .filter(t => t.paymentStatus !== 'Paid')
    .reduce((acc, t) => acc + calcTripBalance(t), 0);
}

// ─── Invoice calculations ────────────────────────────────────────────────

export interface InvoiceFinancials {
  totalAmount?: number | null;
  amountPaid?: number | null;
  status?: string | null;
}

/** Calculate outstanding amount for a single invoice */
export function calcInvoiceOutstanding(invoice: InvoiceFinancials): number {
  return Math.max(0, (Number(invoice.totalAmount) || 0) - (Number(invoice.amountPaid) || 0));
}

/** Calculate party outstanding from their invoices (derived, not stored) */
export function calcPartyOutstandingFromInvoices(invoices: InvoiceFinancials[]): number {
  return invoices
    .filter(i => i.status !== 'Paid')
    .reduce((acc, i) => acc + calcInvoiceOutstanding(i), 0);
}

// ─── Driver Settlement calculations ─────────────────────────────────────

export interface DriverTripSettlement {
  commission?: number | null;
  toll?: number | null;
  maintenance?: number | null;
  driverAdvance?: number | null;
  driverCash?: number | null;
  tollEntries?: Array<{ amount?: number | null }>;
  maintenanceEntries?: Array<{ amount?: number | null }>;
  driverAdvances?: Array<{ amount?: number | null }>;
}

export interface DriverSettlementData {
  trips?: DriverTripSettlement[];
  advances?: Array<{ amount?: number | null }>;
  settlements?: Array<{ amountGiven?: number | null; amountReceived?: number | null }>;
}

/**
 * Calculate net balance for a driver (Dene vs Ghene)
 * Avoids double-counting between trip summary fields and nested entries.
 * Positive = Company owes driver (Dene)
 * Negative = Driver owes company (Ghene)
 */
export function calcDriverSettlementBalance(driver: DriverSettlementData): number {
  let companyOwesDriver = 0; // Dene
  let driverOwesCompany = 0; // Ghene

  driver.trips?.forEach((trip) => {
    companyOwesDriver += Number(trip.commission) || 0;

    // Toll: Use entries if present, else summary field (prevents double counting)
    if (trip.tollEntries && trip.tollEntries.length > 0) {
      companyOwesDriver += trip.tollEntries.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    } else {
      companyOwesDriver += Number(trip.toll) || 0;
    }

    // Maintenance: Use entries if present, else summary field
    if (trip.maintenanceEntries && trip.maintenanceEntries.length > 0) {
      companyOwesDriver += trip.maintenanceEntries.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    } else {
      companyOwesDriver += Number(trip.maintenance) || 0;
    }

    // Driver Advances: Use entries if present, else summary field
    if (trip.driverAdvances && trip.driverAdvances.length > 0) {
      driverOwesCompany += trip.driverAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    } else {
      driverOwesCompany += Number(trip.driverAdvance) || 0;
    }

    driverOwesCompany += Number(trip.driverCash) || 0;
  });

  // Standalone advances given to driver
  driver.advances?.forEach((a) => {
    driverOwesCompany += Number(a.amount) || 0;
  });

  // Historical settlements
  driver.settlements?.forEach((s) => {
    companyOwesDriver += Number(s.amountReceived) || 0;
    driverOwesCompany += Number(s.amountGiven) || 0;
  });

  return companyOwesDriver - driverOwesCompany;
}

// ─── Diesel calculations ─────────────────────────────────────────────────

export interface FuelEntry {
  litres?: number | null;
  ratePerLitre?: number | null;
}

/** Calculate fuel cost from litres × rate */
export function calcFuelTotal(entry: FuelEntry): number {
  return (entry.litres || 0) * (entry.ratePerLitre || 0);
}

/** Calculate fuel efficiency (km/litre) */
export function calcFuelEfficiency(distanceKm: number, litres: number): number | null {
  if (litres <= 0 || distanceKm <= 0) return null;
  return Number((distanceKm / litres).toFixed(2));
}

// ─── Currency formatting ─────────────────────────────────────────────────

/** Format as Indian Rupee with proper grouping (₹1,25,000.00) */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Status helpers ──────────────────────────────────────────────────────

export const TRIP_STATUSES = ['Draft', 'Scheduled', 'Loading', 'In Transit', 'Unloading', 'Completed', 'Cancelled'] as const;
export const POD_STATUSES = ['Pending', 'Received', 'Submitted', 'Verified'] as const;
export const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid', 'Overdue'] as const;
export const INVOICE_STATUSES = ['Unpaid', 'Partial', 'Paid'] as const;
export const VEHICLE_STATUSES = ['Active', 'On Trip', 'Maintenance', 'Inactive'] as const;
export const DRIVER_STATUSES = ['Active', 'On Trip', 'Inactive'] as const;
export const PARTY_STATUSES = ['Active', 'Inactive'] as const;

export type TripStatus = typeof TRIP_STATUSES[number];
export type PodStatus = typeof POD_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

/** Check if a date is expired or expiring within N days */
export function getExpiryStatus(dateStr: string | Date | null | undefined, thresholdDays = 30): 'ok' | 'warning' | 'expired' | 'unknown' {
  if (!dateStr) return 'unknown';
  const exp = new Date(dateStr);
  if (isNaN(exp.getTime())) return 'unknown';
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays < thresholdDays) return 'warning';
  return 'ok';
}
