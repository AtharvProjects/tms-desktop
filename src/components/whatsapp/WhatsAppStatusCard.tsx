import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  RefreshCw,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Send,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useWhatsAppStore } from '@/services/whatsappService';
import { WhatsAppTestMessageModal } from './WhatsAppTestMessageModal';
import { usePrismaQuery } from '@/hooks/usePrisma';
import { usePreferences } from '@/contexts/PreferencesContext';

export function WhatsAppStatusCard() {
  const { t } = usePreferences();
  const {
    status,
    accountInfo,
    qrDataUrl,
    qrExpiresAt,
    isQrExpired,
    error,
    isActionLoading,
    connect,
    disconnect,
    refreshQr,
    fetchStatus,
    setupListeners
  } = useWhatsAppStore();

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');
  const [countdown, setCountdown] = useState<number>(0);

  // Set up listeners once
  useEffect(() => {
    const unsub = setupListeners();
    return unsub;
  }, [setupListeners]);

  // Handle countdown timer for QR code expiry
  useEffect(() => {
    if (status !== 'QR_REQUIRED' || !qrExpiresAt || isQrExpired) {
      setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((qrExpiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [status, qrExpiresAt, isQrExpired]);

  // Query message logs for audit history
  const { data: logs = [], refetch: refetchLogs } = usePrismaQuery<any[]>(
    ['whatsAppLogs', 'recent'],
    'whatsAppLog',
    'findMany',
    { orderBy: { createdAt: 'desc' }, take: 20 },
    { enabled: activeTab === 'history' }
  );

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('Connected')}
          </Badge>
        );
      case 'CONNECTING':
        return (
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {t('Connecting...')}
          </Badge>
        );
      case 'QR_REQUIRED':
        return (
          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {t('Waiting for QR Scan')}
          </Badge>
        );
      case 'RECONNECTING':
        return (
          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {t('Reconnecting')}
          </Badge>
        );
      case 'SESSION_EXPIRED':
        return (
          <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            {t('Session Expired')}
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            {t('Error')}
          </Badge>
        );
      case 'DISCONNECTED':
      default:
        return (
          <Badge variant="outline" className="bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {t('Disconnected')}
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="glass border-border dark:border-white/10 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50 dark:border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                {t('WhatsApp Integration')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('Enterprise communication module for direct invoices, reminders & updates')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  activeTab === 'status'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('Connection')}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('history'); refetchLogs(); }}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="h-3 w-3" />
                {t('Log History')}
              </button>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-4">
          {activeTab === 'history' ? (
            /* Message History Tab */
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{t('Recent WhatsApp messages sent from this system')}</span>
                <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" /> {t('Refresh')}
                </Button>
              </div>

              {logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs border border-dashed rounded-xl">
                  {t('No message activity recorded yet.')}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-muted/40 dark:bg-white/5 rounded-xl border border-border/60 dark:border-white/5 text-xs flex justify-between items-start gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{log.recipient}</span>
                          <span className="font-mono text-muted-foreground">+{log.phone}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {log.messageType}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground truncate max-w-md">{log.message}</p>
                        {log.attachment && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary font-mono">
                            <FileText className="h-3 w-3" /> {log.attachment}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            log.status === 'Sent'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-500'
                          }
                        >
                          {log.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Connection Tab */
            <div className="space-y-4">
              {/* CONNECTED STATE */}
              {status === 'CONNECTED' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">
                            {accountInfo?.pushname || t('WhatsApp Business Account')}
                          </span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        </div>
                        <p className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {accountInfo?.phone || t('Active Phone')}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{t('Last connected:')} {accountInfo?.lastConnected || t('Today')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTestModalOpen(true)}
                        className="h-9 px-3 text-xs font-semibold rounded-lg gap-1.5 border-border dark:border-white/15"
                      >
                        <Send className="h-3.5 w-3.5 text-emerald-500" />
                        {t('Send Test Message')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchStatus()}
                        disabled={isActionLoading}
                        className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title={t('Refresh Status')}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDisconnectConfirmOpen(true)}
                        disabled={isActionLoading}
                        className="h-9 px-3 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg gap-1.5"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        {t('Disconnect')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONNECTING STATE */}
              {status === 'CONNECTING' && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 bg-muted/20 rounded-xl border border-border/60">
                  <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm text-foreground">
                      {t('Initializing WhatsApp Session...')}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {t('Verifying existing credentials and launching managed background engine. This typically takes 5–15 seconds.')}
                    </p>
                  </div>
                </div>
              )}

              {/* QR_REQUIRED STATE */}
              {status === 'QR_REQUIRED' && (
                <div className="grid md:grid-cols-2 gap-6 items-center p-4 bg-muted/30 dark:bg-white/5 rounded-xl border border-border/80 dark:border-white/10">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">
                        {t('Scan this QR code with WhatsApp')}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t('Link your device to allow sending invoices, LR documents, and reminders directly from the application.')}
                      </p>
                    </div>

                    <ol className="list-decimal pl-4 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                      <li>{t('Open WhatsApp on your mobile phone')}</li>
                      <li>{t('Tap')} <strong>{t('Settings')}</strong> {t('(or 3 dots menu on Android)')}</li>
                      <li>{t('Select')} <strong>{t('Linked Devices')}</strong></li>
                      <li>{t('Tap')} <strong>{t('Link a Device')}</strong></li>
                      <li>{t('Point your camera at this QR code')}</li>
                    </ol>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => refreshQr()}
                        disabled={isActionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 rounded-lg gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                        {t('Refresh QR')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect()}
                        disabled={isActionLoading}
                        className="text-xs h-9 text-muted-foreground hover:text-foreground"
                      >
                        {t('Cancel')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-background dark:bg-slate-900 border border-border rounded-xl shadow-xs relative">
                    {isQrExpired ? (
                      <div className="h-44 w-44 flex flex-col items-center justify-center text-center p-4 space-y-2.5 bg-muted/40 rounded-lg">
                        <AlertCircle className="h-8 w-8 text-amber-500" />
                        <span className="text-xs font-semibold text-foreground">
                          {t('QR code expired')}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => refreshQr()}
                          className="text-xs h-8 bg-primary text-primary-foreground"
                        >
                          {t('Generate New QR')}
                        </Button>
                      </div>
                    ) : qrDataUrl ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <img
                          src={qrDataUrl}
                          alt="WhatsApp Link QR"
                          className="h-44 w-44 object-contain rounded-lg p-1 bg-white border border-slate-200 shadow-xs"
                        />
                        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>{t('QR expires in:')} <strong>{countdown}s</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 w-44 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RECONNECTING STATE */}
              {status === 'RECONNECTING' && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{t('Reconnecting session...')}</p>
                      <p className="text-xs text-muted-foreground">{t('Network connection dropped. Attempting automated reconnection.')}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => connect(true)}
                    className="text-xs"
                  >
                    {t('Force Reconnect')}
                  </Button>
                </div>
              )}

              {/* SESSION_EXPIRED OR ERROR STATE */}
              {(status === 'SESSION_EXPIRED' || status === 'ERROR') && (
                <div className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">
                        {status === 'SESSION_EXPIRED' ? t('Session Expired') : t('Connection Error')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error || (status === 'SESSION_EXPIRED'
                          ? t('Your phone unlinked this computer or the authentication key expired. Please scan a new QR code.')
                          : t('Unable to initialize the WhatsApp engine. Ensure Chromium/browser dependencies are present.'))}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => connect(true)}
                      disabled={isActionLoading}
                      className="bg-primary text-primary-foreground text-xs font-semibold h-8"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                      {status === 'SESSION_EXPIRED' ? t('Reconnect WhatsApp') : t('Retry Connection')}
                    </Button>
                  </div>
                </div>
              )}

              {/* DISCONNECTED STATE */}
              {status === 'DISCONNECTED' && (
                <div className="p-5 bg-muted/20 border border-border/80 dark:border-white/5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="font-semibold text-sm text-foreground">
                      {t('WhatsApp is not connected')}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                      {t('Connect your account to send automated invoices, payment reminders, and transport updates directly from the application.')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => connect()}
                    disabled={isActionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 rounded-xl shadow-xs flex-shrink-0 gap-2"
                  >
                    {isActionLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {t('Connecting...')}
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4" />
                        {t('Connect WhatsApp')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Modal */}
      <Dialog open={isDisconnectConfirmOpen} onOpenChange={setIsDisconnectConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] glass-panel border-border">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('Disconnect WhatsApp?')}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {t('This will end the active WhatsApp Web session on this computer. You will need to scan the QR code again to reconnect.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDisconnectConfirmOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                setIsDisconnectConfirmOpen(false);
                await disconnect();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {t('Disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Message Modal */}
      <WhatsAppTestMessageModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
      />
    </>
  );
}
