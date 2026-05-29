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
    restore: () => ipcRenderer.invoke('app:restore')
  },
  whatsapp: {
    init: () => ipcRenderer.invoke('whatsapp:init'),
    getStatus: () => ipcRenderer.invoke('whatsapp:status'),
    getLastQr: () => ipcRenderer.invoke('whatsapp:lastQr'),
    send: (phone: string, text: string) => ipcRenderer.invoke('whatsapp:send', { phone, text }),
    sendMedia: (args: { phone: string, caption?: string, base64Data: string, mimetype: string, filename: string }) => 
      ipcRenderer.invoke('whatsapp:sendMedia', args),
    disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
    onQr: (callback: (qr: string) => void) => {
      const listener = (_: any, qr: string) => callback(qr);
      ipcRenderer.on('whatsapp:qr', listener);
      return () => {
        ipcRenderer.removeListener('whatsapp:qr', listener);
      };
    },
    onStatus: (callback: (status: string) => void) => {
      const listener = (_: any, status: string) => callback(status);
      ipcRenderer.on('whatsapp:status', listener);
      return () => {
        ipcRenderer.removeListener('whatsapp:status', listener);
      };
    }
  }
})
