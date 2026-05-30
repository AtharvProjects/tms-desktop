import { app, BrowserWindow, ipcMain, shell, session, dialog } from 'electron'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import QRCode from 'qrcode'
import pkg from 'whatsapp-web.js'
import { fileURLToPath } from 'url'
const { Client, LocalAuth, MessageMedia } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logPath = path.join('/Users/ashitosh/Downloads/tms-desktop', 'electron-debug.log');
fs.writeFileSync(logPath, '--- Electron Debug Log Start ---\n');
function logToFile(...args: any[]) {
  const msg = '[INFO] ' + args.map(arg => {
    if (arg instanceof Error) return arg.message + '\n' + arg.stack;
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ') + '\n';
  fs.appendFileSync(logPath, msg);
}
function errorToFile(...args: any[]) {
  const msg = '[ERROR] ' + args.map(arg => {
    if (arg instanceof Error) return arg.message + '\n' + arg.stack;
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ') + '\n';
  fs.appendFileSync(logPath, msg);
}

// IPC Handler for backup
ipcMain.handle('app:backup', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return { success: false, error: "No window context found." };

  try {
    let dbPath = '';
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      const relativePath = process.env.DATABASE_URL.replace('file:', '');
      dbPath = path.resolve(relativePath);
    } else {
      dbPath = path.join(app.getPath('userData'), 'tms-database.db');
    }

    if (!fs.existsSync(dbPath)) {
      return { success: false, error: `Active database file not found at: ${dbPath}` };
    }

    const { filePath, canceled } = await dialog.showSaveDialog(window, {
      title: 'Export Database Backup',
      defaultPath: path.join(app.getPath('downloads'), 'tms_backup.db'),
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, error: null };
    }

    fs.copyFileSync(dbPath, filePath);
    logToFile(`[Main] Database backup successfully exported to: ${filePath}`);
    return { success: true, filePath };
  } catch (error: any) {
    errorToFile('[Main] Database backup failed:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler for restore
ipcMain.handle('app:restore', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return { success: false, error: "No window context found." };

  try {
    let dbPath = '';
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
      const relativePath = process.env.DATABASE_URL.replace('file:', '');
      dbPath = path.resolve(relativePath);
    } else {
      dbPath = path.join(app.getPath('userData'), 'tms-database.db');
    }

    const { filePaths, canceled } = await dialog.showOpenDialog(window, {
      title: 'Select Backup Database File',
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite'] }
      ]
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, error: null };
    }

    const backupFilePath = filePaths[0];

    // Disconnect Prisma
    await prisma.$disconnect();

    // Copy backup file
    fs.copyFileSync(backupFilePath, dbPath);
    logToFile(`[Main] Database successfully restored from: ${backupFilePath}`);

    // Re-connect
    await prisma.$connect();

    return { success: true };
  } catch (error: any) {
    errorToFile('[Main] Database restore failed:', error);
    try {
      await prisma.$connect();
    } catch (e) {}
    return { success: false, error: error.message };
  }
});

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
      preload: path.join(__dirname, 'preload.cjs'),
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

ipcMain.handle('app:saveImage', async (_, { base64Data, filename, subfolder = 'documents' }) => {
  try {
    const folderPath = path.join(app.getPath('userData'), subfolder)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    const filePath = path.join(folderPath, filename)
    // base64Data can be data:image/png;base64,iVBORw0KGgo...
    const base64Str = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data
    fs.writeFileSync(filePath, Buffer.from(base64Str, 'base64'))
    return { success: true, filePath: `file://${filePath}` }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// --- WhatsApp Integration (whatsapp-web.js) ---
let whatsappClient: Client | null = null;
let whatsappStatus = 'disconnected'; // 'disconnected', 'loading', 'qr_ready', 'connected'
let lastQrDataUrl = '';

function getClient(): Client {
  if (!whatsappClient) {
    // Determine where to store session data
    const authPath = path.join(app.getPath('userData'), '.wwebjs_auth');
    logToFile('[Main] Creating WhatsApp Client instance at auth path:', authPath);
    
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
      logToFile('[Main] WhatsApp Client QR Code event fired!');
      whatsappStatus = 'qr_ready';
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 5 });
        lastQrDataUrl = qrDataUrl;
        mainWindow?.webContents.send('whatsapp:qr', qrDataUrl);
        mainWindow?.webContents.send('whatsapp:status', 'qr_ready');
        logToFile('[Main] Sent whatsapp:qr to renderer.');
      } catch (err) {
        errorToFile('[Main] Failed to generate QR code data URL', err);
      }
    });

    whatsappClient.on('ready', () => {
      whatsappStatus = 'connected';
      lastQrDataUrl = '';
      mainWindow?.webContents.send('whatsapp:status', 'connected');
      logToFile('[Main] WhatsApp Client is ready!');
    });

    whatsappClient.on('authenticated', () => {
      logToFile('[Main] WhatsApp Authenticated!');
    });

    whatsappClient.on('auth_failure', msg => {
      errorToFile('[Main] WhatsApp Auth failure', msg);
      whatsappStatus = 'disconnected';
      lastQrDataUrl = '';
      mainWindow?.webContents.send('whatsapp:status', 'disconnected');
    });

    whatsappClient.on('disconnected', (reason) => {
      logToFile('[Main] WhatsApp Client was logged out', reason);
      whatsappStatus = 'disconnected';
      lastQrDataUrl = '';
      mainWindow?.webContents.send('whatsapp:status', 'disconnected');
      whatsappClient = null;
    });
  }
  return whatsappClient;
}

ipcMain.handle('whatsapp:init', async () => {
  logToFile('[Main] whatsapp:init called. Current status:', whatsappStatus);
  
  if (whatsappStatus === 'qr_ready' && lastQrDataUrl) {
    logToFile('[Main] Re-sending stored QR code URL to renderer.');
    mainWindow?.webContents.send('whatsapp:qr', lastQrDataUrl);
    mainWindow?.webContents.send('whatsapp:status', 'qr_ready');
    return;
  }
  
  if (whatsappStatus === 'connected' || whatsappStatus === 'loading') {
    return;
  }
  
  whatsappStatus = 'loading';
  mainWindow?.webContents.send('whatsapp:status', 'loading');
  
  try {
    const client = getClient();
    logToFile('[Main] Calling client.initialize()...');
    await client.initialize();
    logToFile('[Main] client.initialize() returned.');
  } catch (error) {
    errorToFile('[Main] Failed to init whatsapp client:', error);
    whatsappStatus = 'disconnected';
    lastQrDataUrl = '';
    mainWindow?.webContents.send('whatsapp:status', 'disconnected');
  }
});

ipcMain.handle('whatsapp:status', () => {
  return whatsappStatus;
});

ipcMain.handle('whatsapp:lastQr', () => {
  return lastQrDataUrl;
});

ipcMain.handle('whatsapp:disconnect', async () => {
  logToFile('[Main] whatsapp:disconnect called.');
  if (whatsappClient) {
    try {
      logToFile('[Main] Logging out whatsapp client...');
      await whatsappClient.logout();
    } catch (e) {
      console.error('Logout error', e);
      logToFile('[Main] Logout error:', e);
    }
    try {
      logToFile('[Main] Destroying whatsapp client...');
      await whatsappClient.destroy();
    } catch (e) {
      console.error('Destroy error', e);
      logToFile('[Main] Destroy error:', e);
    }
    whatsappClient = null;
  }
  
  // Clear auth directory to force fresh QR next time
  const authPath = path.join(app.getPath('userData'), '.wwebjs_auth');
  try {
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      logToFile('[Main] Deleted .wwebjs_auth folder.');
    }
  } catch (err) {
    logToFile('[Main] Failed to delete .wwebjs_auth folder:', err);
  }

  whatsappStatus = 'disconnected';
  lastQrDataUrl = '';
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

    const trimmed = htmlContent.trim();
    const isFullHtml = trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html');

    // We can load a basic HTML template with the provided content
    const htmlToLoad = isFullHtml
      ? htmlContent
      : `
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

    const tempFilePath = path.join(app.getPath('temp'), `print_${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, htmlToLoad, 'utf-8');
    
    printWindow.loadFile(tempFilePath);

    printWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        if (printWindow.isDestroyed()) {
          reject(new Error("Window was destroyed before printing."));
          return;
        }
        try {
          const pdfBuffer = await printWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            marginType: 'printableArea'
          });
          
          if (!printWindow.isDestroyed()) {
            printWindow.destroy();
          }
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
          resolve(pdfBuffer.toString('base64'));
        } catch (error) {
          if (!printWindow.isDestroyed()) {
            printWindow.destroy();
          }
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
          reject(error);
        }
      }, 1000);
    });
  });
});
