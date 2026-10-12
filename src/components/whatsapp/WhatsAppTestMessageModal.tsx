import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWhatsAppStore, cleanPhoneNumber, isValidPhoneNumber } from '@/services/whatsappService';
import { createTestMessage } from '@/lib/whatsappTemplates';
import { usePreferences } from '@/contexts/PreferencesContext';

interface WhatsAppTestMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppTestMessageModal({ open, onOpenChange }: WhatsAppTestMessageModalProps) {
  const { t } = usePreferences();
  const { sendText, status } = useWhatsAppStore();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(createTestMessage());
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSend = async () => {
    setFeedback(null);
    const cleaned = cleanPhoneNumber(phone);

    if (!isValidPhoneNumber(cleaned)) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid 10-digit Indian phone number (e.g. 9876543210).'
      });
      return;
    }

    if (!message.trim()) {
      setFeedback({
        type: 'error',
        message: 'Test message cannot be empty.'
      });
      return;
    }

    setIsSending(true);
    const success = await sendText({
      phone: cleaned,
      message,
      recipientName: 'Test Recipient',
      messageType: 'Test'
    });
    setIsSending(false);

    if (success) {
      setFeedback({
        type: 'success',
        message: 'Test message sent successfully! Check WhatsApp on the recipient device.'
      });
      setTimeout(() => {
        onOpenChange(false);
        setFeedback(null);
      }, 2500);
    } else {
      setFeedback({
        type: 'error',
        message: 'Unable to deliver test message. Verify that WhatsApp is linked and the number is on WhatsApp.'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setFeedback(null); }}>
      <DialogContent className="sm:max-w-[480px] glass-panel border-border dark:border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-foreground">
              {t('Send WhatsApp Test Message')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('Verify that your connected WhatsApp session can successfully dispatch outgoing communications.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('Recipient Phone Number (India)')} *</Label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 h-10 border border-r-0 border-input dark:border-white/10 bg-muted text-muted-foreground text-xs font-mono font-medium rounded-l-lg select-none">
                +91
              </span>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="98765 43210"
                maxLength={14}
                className="rounded-l-none font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('Enter 10-digit mobile number with or without spaces.')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('Test Message Preview')}</Label>
            <Textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              rows={4}
              className="text-xs font-sans resize-none leading-relaxed bg-background/50 border-input dark:border-white/10"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('Sending...')}
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('Send Test Message')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
