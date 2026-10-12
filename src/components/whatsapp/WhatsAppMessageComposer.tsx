import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, RefreshCw, Send, FileText, AlertCircle, QrCode } from 'lucide-react';
import {
  useWhatsAppStore,
  cleanPhoneNumber,
  isValidPhoneNumber
} from '@/services/whatsappService';
import {
  createInvoiceMessage,
  createPaymentReminder,
  createCustomerBalanceMessage,
  createTripStatusMessage,
  createDriverAssignmentMessage,
  createDriverSettlementMessage,
  getSystemCompanyName
} from '@/lib/whatsappTemplates';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useNavigate } from 'react-router-dom';

export interface WhatsAppAttachment {
  filename: string;
  mimetype: string;
  base64Data: string;
}

export type TemplateType =
  | 'Invoice'
  | 'Payment Reminder'
  | 'Customer Balance'
  | 'Trip Update'
  | 'Driver Assignment'
  | 'Driver Settlement'
  | 'Custom Message';

export interface WhatsAppMessageComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  phone: string;
  defaultTemplate?: TemplateType;
  invoiceData?: any;
  partyData?: any;
  tripData?: any;
  driverData?: any;
  settlementData?: any;
  attachment?: WhatsAppAttachment | null;
  relatedId?: string;
  onSuccess?: () => void;
}

export function WhatsAppMessageComposer({
  open,
  onOpenChange,
  recipientName,
  phone: initialPhone,
  defaultTemplate = 'Custom Message',
  invoiceData,
  partyData,
  tripData,
  driverData,
  settlementData,
  attachment,
  relatedId,
  onSuccess
}: WhatsAppMessageComposerProps) {
  const { t } = usePreferences();
  const navigate = useNavigate();
  const { status, sendText, sendMedia } = useWhatsAppStore();

  const [phone, setPhone] = useState(initialPhone || '');
  const [template, setTemplate] = useState<TemplateType>(defaultTemplate);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Compute template text when data or template type changes
  const generateMessageForTemplate = (selectedType: TemplateType): string => {
    const company = getSystemCompanyName();
    switch (selectedType) {
      case 'Invoice':
        return invoiceData ? createInvoiceMessage(invoiceData, { companyName: company }) : '';
      case 'Payment Reminder':
        return invoiceData ? createPaymentReminder(invoiceData, { companyName: company }) : '';
      case 'Customer Balance':
        return partyData ? createCustomerBalanceMessage(partyData, { companyName: company }) : '';
      case 'Trip Update':
        return tripData ? createTripStatusMessage(tripData, undefined, { companyName: company }) : '';
      case 'Driver Assignment':
        return tripData ? createDriverAssignmentMessage(tripData, { companyName: company }) : '';
      case 'Driver Settlement':
        return settlementData && driverData ? createDriverSettlementMessage(settlementData, driverData, { companyName: company }) : '';
      case 'Custom Message':
      default:
        return `Hello ${recipientName || 'there'},\n\nRegarding our logistics operations with ${company}.\n\nThank you,\n${company}`;
    }
  };

  useEffect(() => {
    setPhone(initialPhone || '');
  }, [initialPhone, open]);

  useEffect(() => {
    setTemplate(defaultTemplate);
    setMessage(generateMessageForTemplate(defaultTemplate));
    setErrorFeedback(null);
  }, [defaultTemplate, open, invoiceData, partyData, tripData, driverData, settlementData]);

  const handleTemplateChange = (val: TemplateType) => {
    setTemplate(val);
    setMessage(generateMessageForTemplate(val));
  };

  const handleSend = async () => {
    setErrorFeedback(null);
    const cleaned = cleanPhoneNumber(phone);

    if (!isValidPhoneNumber(cleaned)) {
      setErrorFeedback(t('Please enter a valid 10-digit Indian phone number (e.g. 9876543210).'));
      return;
    }

    if (!message.trim()) {
      setErrorFeedback(t('Message content cannot be empty.'));
      return;
    }

    setIsSending(true);

    let ok = false;
    if (attachment && attachment.base64Data) {
      ok = await sendMedia({
        phone: cleaned,
        caption: message,
        base64Data: attachment.base64Data,
        mimetype: attachment.mimetype,
        filename: attachment.filename,
        recipientName,
        messageType: template,
        relatedId
      });
    } else {
      ok = await sendText({
        phone: cleaned,
        message,
        recipientName,
        messageType: template,
        relatedId
      });
    }

    setIsSending(false);

    if (ok) {
      onOpenChange(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] glass-panel border-border dark:border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-foreground">
              {t('Send via WhatsApp')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('Compose, review, and dispatch business communications directly to the recipient.')}
          </DialogDescription>
        </DialogHeader>

        {status !== 'CONNECTED' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{t('WhatsApp is disconnected. Please link your session in Settings to send.')}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate('/settings');
              }}
              className="h-7 text-xs border-amber-500/30 gap-1 flex-shrink-0"
            >
              <QrCode className="h-3 w-3" />
              {t('Connect')}
            </Button>
          </div>
        )}

        {errorFeedback && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorFeedback}</span>
          </div>
        )}

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('Recipient Customer / Contact')}</Label>
              <Input
                type="text"
                value={recipientName}
                readOnly
                className="bg-muted/40 font-medium text-xs h-9 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('Phone Number')} *</Label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 h-9 border border-r-0 border-input dark:border-white/10 bg-muted text-muted-foreground text-xs font-mono select-none rounded-l-lg">
                  +91
                </span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  placeholder="98765 43210"
                  maxLength={14}
                  className="rounded-l-none font-mono text-xs h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('Message Template')}</Label>
            <Select value={template} onValueChange={(val) => handleTemplateChange(val as TemplateType)}>
              <SelectTrigger className="h-9 text-xs bg-background border-input dark:border-white/10">
                <SelectValue placeholder={t('Select template')} />
              </SelectTrigger>
              <SelectContent>
                {invoiceData && <SelectItem value="Invoice">{t('Invoice Summary Template')}</SelectItem>}
                {invoiceData && <SelectItem value="Payment Reminder">{t('Payment Reminder Template')}</SelectItem>}
                {partyData && <SelectItem value="Customer Balance">{t('Customer Balance Statement Template')}</SelectItem>}
                {tripData && <SelectItem value="Trip Update">{t('Trip Status Update Template')}</SelectItem>}
                {tripData && <SelectItem value="Driver Assignment">{t('Driver Trip Assignment Template')}</SelectItem>}
                {settlementData && <SelectItem value="Driver Settlement">{t('Driver Settlement Template')}</SelectItem>}
                <SelectItem value="Custom Message">{t('Custom Freeform Message')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">{t('Message Content (Editable)')}</Label>
              <span className="text-[10px] text-muted-foreground">
                {message.length} {t('characters')}
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              rows={6}
              className="text-xs font-sans resize-none leading-relaxed bg-background/50 border-input dark:border-white/10"
              placeholder={t('Type your WhatsApp message here...')}
            />
          </div>

          {attachment && (
            <div className="p-3 bg-muted/40 dark:bg-white/5 border border-border/80 dark:border-white/10 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-[280px]">
                    {attachment.filename}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">
                    {attachment.mimetype.split('/')[1] || 'document'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {t('Ready to Attach')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || status !== 'CONNECTED'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-5 gap-2 shadow-xs"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('Sending WhatsApp...')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('Send WhatsApp')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
