/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    prisma: {
      query: (model: string, operation: string, args?: any) => Promise<{ data: any; error: string | null }>;
    };
    getPath: (name: string) => Promise<string>;
    app?: {
      printToPdf: (htmlContent: string) => Promise<string>;
    };
    whatsapp?: {
      init: () => Promise<void>;
      getStatus: () => Promise<string>;
      send: (phone: string, text: string) => Promise<{ success: boolean; error: string | null }>;
      sendMedia: (args: { phone: string, caption?: string, base64Data: string, mimetype: string, filename: string }) => Promise<{ success: boolean; error: string | null }>;
      disconnect: () => Promise<void>;
      onQr: (callback: (qr: string) => void) => () => void;
      onStatus: (callback: (status: string) => void) => () => void;
    };
  };
}
