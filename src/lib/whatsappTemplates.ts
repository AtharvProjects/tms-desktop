import { formatCurrency } from './utils';

export interface WhatsAppTemplateOptions {
  companyName?: string;
  companyPhone?: string;
}

export function getSystemCompanyName(): string {
  return localStorage.getItem('companyName') || 'JTT Logistics & Transport';
}

/**
 * Generates dynamic invoice sharing message for a customer.
 */
export function createInvoiceMessage(
  invoice: any,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const customerName = invoice?.trip?.party?.companyName || invoice?.party?.companyName || 'Valued Customer';
  const invNo = invoice?.invoiceNumber || 'INV';
  const total = formatCurrency(invoice?.totalAmount || 0);
  const paid = formatCurrency(invoice?.amountPaid || 0);
  const balance = formatCurrency(Math.max(0, (invoice?.totalAmount || 0) - (invoice?.amountPaid || 0)));
  const route = invoice?.trip?.from && invoice?.trip?.to ? `${invoice.trip.from} → ${invoice.trip.to}` : '';
  const vehicle = invoice?.trip?.vehicle?.vehicleNumber || '';

  let msg = `Dear ${customerName},\n\n`;
  msg += `Please find attached your invoice ${invNo} from ${company}.\n\n`;
  msg += `════════════════════════\n`;
  msg += `INVOICE SUMMARY\n`;
  msg += `════════════════════════\n`;
  msg += `• Invoice No: ${invNo}\n`;
  if (route) msg += `• Route: ${route}\n`;
  if (vehicle) msg += `• Vehicle: ${vehicle}\n`;
  msg += `• Total Amount: ${total}\n`;
  msg += `• Advance Received: ${paid}\n`;
  msg += `• Balance Due: ${balance}\n`;
  msg += `════════════════════════\n\n`;
  msg += `Kindly process the outstanding payment at your earliest convenience.\n\n`;
  msg += `Thank you,\n${company}`;

  return msg;
}

/**
 * Generates payment reminder message for unpaid or partially paid invoices.
 */
export function createPaymentReminder(
  invoice: any,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const customerName = invoice?.trip?.party?.companyName || invoice?.party?.companyName || 'Valued Customer';
  const invNo = invoice?.invoiceNumber || 'INV';
  const total = formatCurrency(invoice?.totalAmount || 0);
  const paid = formatCurrency(invoice?.amountPaid || 0);
  const balance = formatCurrency(Math.max(0, (invoice?.totalAmount || 0) - (invoice?.amountPaid || 0)));
  const invDate = invoice?.date ? new Date(invoice.date).toLocaleDateString('en-GB') : '';

  let msg = `Dear ${customerName},\n\n`;
  msg += `This is a friendly payment reminder from ${company} regarding invoice ${invNo}`;
  if (invDate) msg += ` dated ${invDate}`;
  msg += `.\n\n`;
  msg += `• Total Amount: ${total}\n`;
  msg += `• Amount Paid: ${paid}\n`;
  msg += `• Outstanding Due: ${balance}\n\n`;
  msg += `Please arrange the payment at your earliest convenience. If already paid, kindly share the payment reference or ignore this reminder.\n\n`;
  msg += `Thank you for your business,\n${company}`;

  return msg;
}

/**
 * Generates customer total outstanding balance statement message.
 */
export function createCustomerBalanceMessage(
  party: any,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const customerName = party?.companyName || 'Valued Customer';
  const balance = formatCurrency(party?.outstandingBalance || 0);

  let msg = `Dear ${customerName},\n\n`;
  msg += `Greetings from ${company}.\n\n`;
  msg += `Your current outstanding account balance is:\n`;
  msg += `★ ${balance}\n\n`;
  msg += `Please contact our accounts desk if you require an itemized statement or have any billing queries.\n\n`;
  msg += `Thank you,\n${company}`;

  return msg;
}

/**
 * Generates trip status notification for clients or dispatchers.
 */
export function createTripStatusMessage(
  trip: any,
  statusLabel?: string,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const tripNo = trip?.tripNo || 'TRP';
  const route = trip?.from && trip?.to ? `${trip.from} → ${trip.to}` : (trip?.route || 'Route details attached');
  const vehicle = trip?.vehicle?.vehicleNumber || 'Assigned Vehicle';
  const driver = trip?.driver?.driverName || 'Driver';
  const currentStatus = statusLabel || trip?.status || 'In Transit';

  let msg = `Trip Update — ${tripNo}\n\n`;
  msg += `• Status: ${currentStatus}\n`;
  msg += `• Route: ${route}\n`;
  msg += `• Vehicle No: ${vehicle}\n`;
  msg += `• Driver: ${driver}\n`;
  if (trip?.material) msg += `• Cargo: ${trip.material} (${trip.sizeWeight || 'Standard load'})\n`;
  msg += `\nFor updates, please reach out to ${company} dispatch operations.\n\n`;
  msg += `${company}`;

  return msg;
}

/**
 * Generates driver trip assignment notification.
 */
export function createDriverAssignmentMessage(
  trip: any,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const driverName = trip?.driver?.driverName || 'Driver';
  const tripNo = trip?.tripNo || 'TRP';
  const route = `${trip?.from || 'Loading point'} → ${trip?.to || 'Destination'}`;
  const vehicle = trip?.vehicle?.vehicleNumber || 'Assigned Vehicle';
  const reportDate = trip?.loadingDate || trip?.reportDate || trip?.tripDate;
  const dateStr = reportDate ? new Date(reportDate).toLocaleDateString('en-GB') : 'Immediate';

  let msg = `Trip Assignment — ${tripNo}\n\n`;
  msg += `Hello ${driverName},\n`;
  msg += `You have been assigned to trip ${tripNo}.\n\n`;
  msg += `• Route: ${route}\n`;
  msg += `• Vehicle: ${vehicle}\n`;
  msg += `• Reporting / Loading Date: ${dateStr}\n`;
  if (trip?.material) msg += `• Material: ${trip.material}\n`;
  if (trip?.driverAdvance > 0) msg += `• Approved Advance: ${formatCurrency(trip.driverAdvance)}\n`;
  msg += `\nPlease inspect the vehicle and report on time.\n\n`;
  msg += `${company}`;

  return msg;
}

/**
 * Generates driver financial settlement receipt message.
 */
export function createDriverSettlementMessage(
  settlement: any,
  driver: any,
  options?: WhatsAppTemplateOptions
): string {
  const company = options?.companyName || getSystemCompanyName();
  const driverName = driver?.driverName || 'Driver';
  const given = formatCurrency(settlement?.amountGiven || 0);
  const received = formatCurrency(settlement?.amountReceived || 0);
  const balance = formatCurrency(settlement?.balance || 0);
  const txDate = settlement?.transactionDate ? new Date(settlement.transactionDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let msg = `Driver Settlement Statement\n\n`;
  msg += `Driver: ${driverName}\n`;
  msg += `Date: ${txDate}\n\n`;
  msg += `• Amount Given: ${given}\n`;
  msg += `• Amount Received: ${received}\n`;
  msg += `• Net Advance Balance: ${balance}\n`;
  if (settlement?.remarks) msg += `• Remarks: ${settlement.remarks}\n`;
  msg += `\nRecorded in ${company} accounts ledger.`;

  return msg;
}

/**
 * Generates standardized test message.
 */
export function createTestMessage(options?: WhatsAppTemplateOptions): string {
  const company = options?.companyName || getSystemCompanyName();
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `Hello! This is a verified test message sent from ${company} via JTT WhatsApp Gateway at ${timestamp}. The communication channel is active and operational.`;
}
