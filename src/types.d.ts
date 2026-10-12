/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    prisma: {
      query: (model: string, operation: string, args?: any) => Promise<{ data: any; error: string | null }>;
    };
    getPath: (name: string) => Promise<string>;
    app?: {
      printToPdf: (htmlContent: string) => Promise<string>;
      saveImage: (args: { base64Data: string, filename: string, subfolder?: string }) => Promise<{ success: boolean; filePath?: string; error: string | null }>;
      backup: () => Promise<{ success: boolean; filePath?: string; error: string | null }>;
      restore: () => Promise<{ success: boolean; error: string | null }>;
      resetDatabase: () => Promise<{ success: boolean; error: string | null }>;
    };
    whatsapp?: {
      init: (forceFresh?: boolean) => Promise<{
        status: 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'CONNECTED' | 'RECONNECTING' | 'SESSION_EXPIRED' | 'ERROR';
        accountInfo: { phone: string; pushname: string; platform: string; lastConnected: string } | null;
        qrDataUrl: string | null;
        qrExpiresAt: number | null;
        isQrExpired: boolean;
        error?: string | null;
      }>;
      getStatus: () => Promise<{
        status: 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'CONNECTED' | 'RECONNECTING' | 'SESSION_EXPIRED' | 'ERROR';
        accountInfo: { phone: string; pushname: string; platform: string; lastConnected: string } | null;
        qrDataUrl: string | null;
        qrExpiresAt: number | null;
        isQrExpired: boolean;
        error?: string | null;
      }>;
      disconnect: () => Promise<any>;
      send: (args: { phone: string; text: string; recipientName?: string; messageType?: string; relatedId?: string } | string, text?: string) => Promise<{ success: boolean; error?: string }>;
      sendMedia: (args: { phone: string; caption?: string; base64Data: string; mimetype: string; filename: string; recipientName?: string; messageType?: string; relatedId?: string }) => Promise<{ success: boolean; error?: string }>;
      onStatus: (callback: (payload: {
        status: 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'CONNECTED' | 'RECONNECTING' | 'SESSION_EXPIRED' | 'ERROR';
        accountInfo: { phone: string; pushname: string; platform: string; lastConnected: string } | null;
        qrDataUrl: string | null;
        qrExpiresAt: number | null;
        isQrExpired: boolean;
        error?: string | null;
      }) => void) => () => void;
    };
  };
}
