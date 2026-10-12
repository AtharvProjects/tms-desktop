import { create } from 'zustand';
import { toast } from 'sonner';

export type WhatsAppStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'QR_REQUIRED' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'SESSION_EXPIRED' 
  | 'ERROR';

export interface WhatsAppAccountInfo {
  phone: string;
  pushname: string;
  platform: string;
  lastConnected: string;
}

export interface WhatsAppStatusPayload {
  status: WhatsAppStatus;
  accountInfo: WhatsAppAccountInfo | null;
  qrDataUrl: string | null;
  qrExpiresAt: number | null;
  isQrExpired: boolean;
  error?: string | null;
}

export interface SendMessageParams {
  phone: string;
  message: string;
  recipientName?: string;
  messageType?: string;
  relatedId?: string;
}

export interface SendMediaParams {
  phone: string;
  caption?: string;
  base64Data: string;
  mimetype: string;
  filename: string;
  recipientName?: string;
  messageType?: string;
  relatedId?: string;
}

interface WhatsAppStoreState {
  status: WhatsAppStatus;
  accountInfo: WhatsAppAccountInfo | null;
  qrDataUrl: string | null;
  qrExpiresAt: number | null;
  isQrExpired: boolean;
  error: string | null;
  isActionLoading: boolean;
  isInitialized: boolean;

  // Actions
  setupListeners: () => () => void;
  fetchStatus: () => Promise<void>;
  connect: (forceFresh?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshQr: () => Promise<void>;
  sendText: (params: SendMessageParams) => Promise<boolean>;
  sendMedia: (params: SendMediaParams) => Promise<boolean>;
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) {
    const main = digits.slice(2);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }
  return `+${digits}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

export const useWhatsAppStore = create<WhatsAppStoreState>((set, get) => ({
  status: 'DISCONNECTED',
  accountInfo: null,
  qrDataUrl: null,
  qrExpiresAt: null,
  isQrExpired: false,
  error: null,
  isActionLoading: false,
  isInitialized: false,

  setupListeners: () => {
    if (!window.electronAPI?.whatsapp) {
      set({ status: 'DISCONNECTED', isInitialized: true });
      return () => {};
    }

    // Subscribe to real-time status updates from main process
    const cleanup = window.electronAPI.whatsapp.onStatus((payload) => {
      set({
        status: payload.status,
        accountInfo: payload.accountInfo,
        qrDataUrl: payload.qrDataUrl,
        qrExpiresAt: payload.qrExpiresAt,
        isQrExpired: payload.isQrExpired,
        error: payload.error || null,
        isInitialized: true
      });
    });

    // Initial status fetch
    get().fetchStatus();

    return cleanup;
  },

  fetchStatus: async () => {
    if (!window.electronAPI?.whatsapp) return;
    try {
      const payload = await window.electronAPI.whatsapp.getStatus();
      set({
        status: payload.status,
        accountInfo: payload.accountInfo,
        qrDataUrl: payload.qrDataUrl,
        qrExpiresAt: payload.qrExpiresAt,
        isQrExpired: payload.isQrExpired,
        error: payload.error || null,
        isInitialized: true
      });
    } catch (e: any) {
      console.error('[WhatsAppService] fetchStatus error:', e);
    }
  },

  connect: async (forceFresh = false) => {
    if (!window.electronAPI?.whatsapp) {
      toast.error('WhatsApp engine is only available in the desktop application.');
      return;
    }

    set({ isActionLoading: true, error: null });
    try {
      const payload = await window.electronAPI.whatsapp.init(forceFresh);
      set({
        status: payload.status,
        accountInfo: payload.accountInfo,
        qrDataUrl: payload.qrDataUrl,
        qrExpiresAt: payload.qrExpiresAt,
        isQrExpired: payload.isQrExpired,
        error: payload.error || null,
        isActionLoading: false
      });
    } catch (e: any) {
      set({ isActionLoading: false, error: e.message || 'Connection failed' });
      toast.error(`WhatsApp connection failed: ${e.message || 'Unknown error'}`);
    }
  },

  refreshQr: async () => {
    await get().connect(true);
  },

  disconnect: async () => {
    if (!window.electronAPI?.whatsapp) return;
    set({ isActionLoading: true });
    try {
      const payload = await window.electronAPI.whatsapp.disconnect();
      set({
        status: payload.status,
        accountInfo: null,
        qrDataUrl: null,
        qrExpiresAt: null,
        isQrExpired: false,
        error: null,
        isActionLoading: false
      });
      toast.info('WhatsApp disconnected successfully.');
    } catch (e: any) {
      set({ isActionLoading: false });
      toast.error(`Disconnect error: ${e.message || 'Failed'}`);
    }
  },

  sendText: async ({ phone, message, recipientName, messageType, relatedId }) => {
    if (!window.electronAPI?.whatsapp) {
      toast.error('WhatsApp API unavailable in browser mode.');
      return false;
    }

    const { status } = get();
    if (status !== 'CONNECTED') {
      toast.warning('WhatsApp is disconnected. Please connect in Settings before sending messages.');
      return false;
    }

    if (!isValidPhoneNumber(phone)) {
      toast.error('Please enter a valid 10-digit phone number.');
      return false;
    }

    if (!message || message.trim() === '') {
      toast.error('Message content cannot be empty.');
      return false;
    }

    try {
      const res = await window.electronAPI.whatsapp.send({
        phone,
        text: message,
        recipientName,
        messageType,
        relatedId
      });

      if (res && res.error) {
        toast.error(`Unable to send message: ${res.error}`);
        return false;
      }

      toast.success(`Message sent successfully to ${recipientName || formatPhoneDisplay(phone)}!`);
      return true;
    } catch (err: any) {
      toast.error(`Send error: ${err.message || 'Unknown failure'}`);
      return false;
    }
  },

  sendMedia: async ({ phone, caption, base64Data, mimetype, filename, recipientName, messageType, relatedId }) => {
    if (!window.electronAPI?.whatsapp) {
      toast.error('WhatsApp API unavailable in browser mode.');
      return false;
    }

    const { status } = get();
    if (status !== 'CONNECTED') {
      toast.warning('WhatsApp is disconnected. Please connect in Settings before sending messages.');
      return false;
    }

    if (!isValidPhoneNumber(phone)) {
      toast.error('Please enter a valid 10-digit phone number.');
      return false;
    }

    try {
      const res = await window.electronAPI.whatsapp.sendMedia({
        phone,
        caption,
        base64Data,
        mimetype,
        filename,
        recipientName,
        messageType,
        relatedId
      });

      if (res && res.error) {
        toast.error(`Unable to send document: ${res.error}`);
        return false;
      }

      toast.success(`${filename} sent via WhatsApp to ${recipientName || formatPhoneDisplay(phone)}!`);
      return true;
    } catch (err: any) {
      toast.error(`Media send error: ${err.message || 'Unknown failure'}`);
      return false;
    }
  }
}));
