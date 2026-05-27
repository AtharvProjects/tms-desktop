import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import QRCode from 'qrcode'
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'

// Initialize Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || `file:${path.join(app.getPath('userData'), 'tms-database.db')}`
    }
  }
})

// Use environment variable during dev
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // macOS traffic lights
    vibrancy: 'under-window', // macOS glass effect
    visualEffectState: 'active',
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', async () => {
  await prisma.$disconnect()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handler for Prisma
ipcMain.handle('prisma:query', async (_, { model, operation, args }) => {
  try {
    // @ts-ignore - dynamic model access
    const result = await prisma[model][operation](args)
    return { data: result, error: null }
  } catch (error: any) {
    console.error(`Prisma Error [${model}.${operation}]:`, error)
    return { data: null, error: error.message }
  }
})

ipcMain.handle('app:path', (_, name: 'userData' | 'documents' | 'downloads') => {
  return app.getPath(name)
})

// --- WhatsApp Integration (whatsapp-web.js) ---
let whatsappClient: Client | null = null;
let whatsappStatus = 'disconnected'; // 'disconnected', 'loading', 'qr_ready', 'connected'

function getClient(): Client {
  if (!whatsappClient) {
    // Determine where to store session data
    const authPath = path.join(app.getPath('userData'), '.wwebjs_auth');
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: authPath
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
      }
    });

    whatsappClient.on('qr', async (qr) => {
      whatsappStatus = 'qr_ready';
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 5 });
        mainWindow?.webContents.send('whatsapp:qr', qrDataUrl);
        mainWindow?.webContents.send('whatsapp:status', 'qr_ready');
      } catch (err) {
        console.error('Failed to generate QR code data URL', err);
      }
    });

    whatsappClient.on('ready', () => {
      whatsappStatus = 'connected';
      mainWindow?.webContents.send('whatsapp:status', 'connected');
      console.log('WhatsApp Client is ready!');
    });

    whatsappClient.on('authenticated', () => {
      console.log('WhatsApp Authenticated!');
    });

    whatsappClient.on('auth_failure', msg => {
      console.error('WhatsApp Auth failure', msg);
      whatsappStatus = 'disconnected';
      mainWindow?.webContents.send('whatsapp:status', 'disconnected');
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log('WhatsApp Client was logged out', reason);
      whatsappStatus = 'disconnected';
      mainWindow?.webContents.send('whatsapp:status', 'disconnected');
      whatsappClient = null;
    });
  }
  return whatsappClient;
}

ipcMain.handle('whatsapp:init', async () => {
  if (whatsappStatus === 'connected' || whatsappStatus === 'loading') {
    return;
  }
  
  whatsappStatus = 'loading';
  mainWindow?.webContents.send('whatsapp:status', 'loading');
  
  try {
    const client = getClient();
    await client.initialize();
  } catch (error) {
    console.error('Failed to init whatsapp client:', error);
    whatsappStatus = 'disconnected';
    mainWindow?.webContents.send('whatsapp:status', 'disconnected');
  }
});

ipcMain.handle('whatsapp:status', () => {
  return whatsappStatus;
});

ipcMain.handle('whatsapp:disconnect', async () => {
  if (whatsappClient) {
    try {
      await whatsappClient.logout();
    } catch (e) {
      console.error('Logout error', e);
    }
    try {
      await whatsappClient.destroy();
    } catch (e) {
      console.error('Destroy error', e);
    }
    whatsappClient = null;
  }
  whatsappStatus = 'disconnected';
  mainWindow?.webContents.send('whatsapp:status', 'disconnected');
});

function formatPhoneToId(phone: string) {
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return `${cleanPhone}@c.us`;
}

ipcMain.handle('whatsapp:send', async (_, { phone, text }) => {
  if (!whatsappClient || whatsappStatus !== 'connected') {
    return { success: false, error: "WhatsApp is not connected." };
  }

  try {
    const chatId = formatPhoneToId(phone);
    await whatsappClient.sendMessage(chatId, text);
    return { success: true };
  } catch (err: any) {
    console.error('WhatsApp send error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('whatsapp:sendMedia', async (_, { phone, caption, base64Data, mimetype, filename }) => {
  if (!whatsappClient || whatsappStatus !== 'connected') {
    return { success: false, error: "WhatsApp is not connected." };
  }

  try {
    const chatId = formatPhoneToId(phone);
    // Remove data URL prefix if present
    const base64Str = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
    
    const media = new MessageMedia(mimetype, base64Str, filename);
    await whatsappClient.sendMessage(chatId, media, { caption });
    return { success: true };
  } catch (err: any) {
    console.error('WhatsApp sendMedia error:', err);
    return { success: false, error: err.message };
  }
});

// --- PDF Generation ---
ipcMain.handle('app:printToPdf', async (_, htmlContent: string) => {
  return new Promise((resolve, reject) => {
    // Create a hidden browser window to render HTML
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // We can load a basic HTML template with the provided content
    const htmlToLoad = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @media print {
            body { margin: 0; padding: 0; }
          }
          body { font-family: sans-serif; }
          /* Inject tailwind reset / base styles if needed here */
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlToLoad)}`);

    printWindow.webContents.on('did-finish-load', async () => {
      try {
        const pdfBuffer = await printWindow.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          marginType: 'printableArea'
        });
        
        printWindow.destroy();
        resolve(pdfBuffer.toString('base64'));
      } catch (error) {
        printWindow.destroy();
        reject(error);
      }
    });
  });
});
