import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  prisma: {
    query: (model: string, operation: string, args: any) =>
      ipcRenderer.invoke('prisma:query', { model, operation, args }),
  },
  getPath: (name: string) => ipcRenderer.invoke('app:path', name),
  app: {
    printToPdf: (htmlContent: string) => ipcRenderer.invoke('app:printToPdf', htmlContent),
    saveImage: (args: { base64Data: string, filename: string, subfolder?: string }) => ipcRenderer.invoke('app:saveImage', args),
    backup: () => ipcRenderer.invoke('app:backup'),
    restore: () => ipcRenderer.invoke('app:restore'),
    resetDatabase: () => ipcRenderer.invoke('app:resetDatabase')
  },
  whatsapp: {
    init: (forceFresh?: boolean) => ipcRenderer.invoke('whatsapp:init', forceFresh),
    getStatus: () => ipcRenderer.invoke('whatsapp:status'),
    disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
    send: (argsOrPhone: any, text?: string) => {
      const payload = typeof argsOrPhone === 'string' ? { phone: argsOrPhone, text: text || '' } : argsOrPhone;
      return ipcRenderer.invoke('whatsapp:send', payload);
    },
    sendMedia: (args: { phone: string; caption?: string; base64Data: string; mimetype: string; filename: string; recipientName?: string; messageType?: string; relatedId?: string }) => 
      ipcRenderer.invoke('whatsapp:sendMedia', args),
    onStatus: (callback: (payload: any) => void) => {
      const listener = (_: any, payload: any) => callback(payload);
      ipcRenderer.on('whatsapp:status', listener);
      return () => {
        ipcRenderer.removeListener('whatsapp:status', listener);
      };
    }
  }
})
