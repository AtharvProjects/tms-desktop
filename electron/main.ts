import { app, BrowserWindow, ipcMain, shell, session, dialog } from 'electron'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { WhatsAppConnectionManager } from './whatsapp'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Windows / Packaged App: Set up Prisma engine paths ────────────────────────
// When the app is packaged (asar=false), Prisma binaries land in resources/
const isPkg = app.isPackaged;
if (isPkg) {
  const resourcesPath = process.resourcesPath;
  // Possible engine file names by platform/arch
  const engineCandidates: string[] = [];
  if (process.platform === 'win32') {
    engineCandidates.push(
      'query_engine-windows-arm64.dll.node',   // Windows ARM64
      'query_engine-windows.dll.node',          // Windows x64
    );
  } else if (process.platform === 'darwin') {
    engineCandidates.push(
      'libquery_engine-darwin-arm64.dylib.node',
      'libquery_engine-darwin.dylib.node',
    );
  } else {
    engineCandidates.push('libquery_engine-linux-musl.so.node');
  }
  const prismaClientDir = path.join(resourcesPath, 'node_modules', '.prisma', 'client');
  for (const candidate of engineCandidates) {
    const fullPath = path.join(prismaClientDir, candidate);
    if (fs.existsSync(fullPath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = fullPath;
      break;
    }
  }
  process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = 'library';
}
// ─────────────────────────────────────────────────────────────────────────────

const logPath = path.join(app.getPath('userData'), 'electron-debug.log');
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

// Initialize Prisma DB file path in writeable userData directory
const userDbPath = path.join(app.getPath('userData'), 'tms-database.db');
if (!fs.existsSync(userDbPath)) {
  const candidates = [
    path.join(process.resourcesPath, 'app', 'prisma', 'dev.db'),
    path.join(process.resourcesPath, 'prisma', 'dev.db'),
    path.join(__dirname, '../prisma/dev.db'),
    path.join(process.cwd(), 'prisma', 'dev.db')
  ];
  
  let templateDbPath = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      templateDbPath = p;
      break;
    }
  }

  if (templateDbPath) {
    fs.copyFileSync(templateDbPath, userDbPath);
    logToFile('[Main] Copied template dev.db to userData from: ' + templateDbPath);
  } else {
    logToFile('[Main] Template dev.db not found! Checked: ' + candidates.join(', '));
  }
}

// Active database in Electron is ALWAYS userDbPath
process.env.DATABASE_URL = `file:${userDbPath.replace(/\\/g, '/')}`;
logToFile('[Main] Set DATABASE_URL to:', process.env.DATABASE_URL);

// IPC Handler for backup
ipcMain.handle('app:backup', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return { success: false, error: "No window context found." };

  try {
    if (!fs.existsSync(userDbPath)) {
      return { success: false, error: `Active database file not found at: ${userDbPath}` };
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

    fs.copyFileSync(userDbPath, filePath);
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

    // Ensure target folder exists
    const targetDir = path.dirname(userDbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Disconnect Prisma
    await prisma.$disconnect();

    // Remove any leftover WAL / SHM files
    try { if (fs.existsSync(userDbPath + '-wal')) fs.unlinkSync(userDbPath + '-wal'); } catch (e) {}
    try { if (fs.existsSync(userDbPath + '-shm')) fs.unlinkSync(userDbPath + '-shm'); } catch (e) {}

    // Copy backup file directly into active userDbPath
    fs.copyFileSync(backupFilePath, userDbPath);
    logToFile(`[Main] Database successfully restored from: ${backupFilePath} to: ${userDbPath}`);

    // Re-connect and ensure schemas
    await prisma.$connect();
    await ensureDbSchema();

    return { success: true };
  } catch (error: any) {
    errorToFile('[Main] Database restore failed:', error);
    try {
      await prisma.$connect();
    } catch (e) {}
    return { success: false, error: error.message };
  }
});

// When packaged, also set the engine path relative to resources
if (isPkg) {
  const resourcesPath = process.resourcesPath;
  const prismaClientDir = path.join(resourcesPath, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(prismaClientDir)) {
    const candidates = [
      path.join(prismaClientDir, 'query_engine-windows-arm64.dll.node'), // Windows ARM64
      path.join(prismaClientDir, 'query_engine-windows.dll.node'),        // Windows x64
      path.join(prismaClientDir, 'libquery_engine-darwin-arm64.dylib.node'),
      path.join(prismaClientDir, 'libquery_engine-darwin.dylib.node'),
    ];
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = candidates.find(p => fs.existsSync(p)) || '';
    logToFile('[Main] PRISMA_QUERY_ENGINE_LIBRARY:', process.env.PRISMA_QUERY_ENGINE_LIBRARY);
  }
}

// Initialize Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || `file:${userDbPath}`
    }
  }
})

// Use environment variable during dev
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // macOS-only: traffic lights + vibrancy (ignored on Windows)
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      transparent: true,
      backgroundColor: '#00000000',
    } : {
      // Windows: standard frame with custom background
      frame: true,
      backgroundColor: '#0f172a',
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Remove default menu on Windows for cleaner look
  if (isWindows) {
    mainWindow.removeMenu();
  }

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

async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD COLUMN "commissionAmount" REAL DEFAULT 0;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD COLUMN "gstPercentage" REAL DEFAULT 0;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "DieselLog" ADD COLUMN "vehicleId" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsAppLog" (
        "id" TEXT PRIMARY KEY,
        "recipient" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "messageType" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "attachment" TEXT,
        "status" TEXT NOT NULL DEFAULT 'Sent',
        "error" TEXT,
        "relatedId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {}
}

let whatsappManager: WhatsAppConnectionManager;

app.commandLine.appendSwitch('lang', 'en-GB');
app.whenReady().then(async () => {
  await ensureDbSchema();
  whatsappManager = new WhatsAppConnectionManager(
    () => mainWindow,
    prisma,
    logToFile,
    errorToFile
  );
  createWindow();

  // Auto-restore session if previously linked and active
  if (whatsappManager.hasStoredSession()) {
    logToFile('[Main] Stored WhatsApp session detected. Auto-restoring in background...');
    whatsappManager.initialize().catch(err => {
      logToFile('[Main] Auto-restore session error:', err);
    });
  }
});

let isAppQuitting = false;
app.on('before-quit', async (event) => {
  if (!isAppQuitting) {
    isAppQuitting = true;
    event.preventDefault();
    try {
      if (whatsappManager) {
        await whatsappManager.cleanupOnExit();
      }
    } catch (err) {
      errorToFile('[Main] Error during app before-quit cleanup:', err);
    } finally {
      app.quit();
    }
  }
});

app.on('window-all-closed', async () => {
  await prisma.$disconnect();
  if (whatsappManager) {
    try {
      await whatsappManager.cleanupOnExit();
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handler for Prisma
ipcMain.handle('prisma:query', async (_, { model, operation, args }) => {
  try {
    // Special resilient handling for invoice create
    if (model === 'invoice' && operation === 'create' && args?.data) {
      if (!args.data.tripId || args.data.tripId === 'none' || args.data.tripId === '') {
        delete args.data.tripId;
      }
      ['subtotal', 'gstAmount', 'gstPercentage', 'shortageAmount', 'damageAmount', 'commissionAmount', 'totalAmount', 'amountPaid'].forEach(field => {
        if (args.data[field] !== undefined) {
          args.data[field] = Number(args.data[field]) || 0;
        }
      });
      if (!args.data.invoiceNumber || String(args.data.invoiceNumber).trim() === '') {
        args.data.invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      }
    }

    // @ts-ignore - dynamic model access
    const result = await prisma[model][operation](args)
    return { data: result, error: null }
  } catch (error: any) {
    console.error(`Prisma Error [${model}.${operation}]:`, error)

    // Resilient fallback for invoice create if unique constraint or error occurs
    if (model === 'invoice' && operation === 'create') {
      try {
        const fallbackNo = `${args?.data?.invoiceNumber || 'INV'}-${Math.floor(1000 + Math.random() * 9000)}`;
        logToFile('[Main] Retrying invoice creation with unique fallback number:', fallbackNo);
        const retryArgs = {
          ...args,
          data: {
            ...args.data,
            invoiceNumber: fallbackNo
          }
        };
        // @ts-ignore
        const retryResult = await prisma.invoice.create(retryArgs);
        return { data: retryResult, error: null };
      } catch (retryError: any) {
        errorToFile('[Main] Retry invoice creation failed:', retryError);
      }
    }

    return { data: null, error: error.message }
  }
})

// IPC Handler to completely reset all data
ipcMain.handle('app:resetDatabase', async () => {
  try {
    const tableNames = [
      'TripLink', 'LiquidEntry', 'StandaloneDriverLedger', 'MaintenanceEntry', 'TollEntry',
      'DriverSettlement', 'DriverChangeHistory', 'DriverAdvance', 'DirectDriver',
      'PartyLedger', 'DriverLedger', 'MaintenanceLog', 'Invoice', 'Expense',
      'DieselLog', 'Trip', 'Vehicle', 'Driver', 'Party'
    ];
    for (const table of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
      } catch (e) {}
    }
    try {
      await prisma.$executeRawUnsafe(`VACUUM;`);
    } catch (e) {}
    logToFile('[Main] All database tables successfully cleared and vacuumed');
    return { success: true };
  } catch (error: any) {
    errorToFile('[Main] Database reset failed:', error);
    return { success: false, error: error.message };
  }
});

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

// --- WhatsApp Integration (Delegated to WhatsAppConnectionManager) ---
ipcMain.handle('whatsapp:init', async (_, forceFresh?: boolean) => {
  return await whatsappManager.initialize(forceFresh);
});

ipcMain.handle('whatsapp:status', () => {
  return whatsappManager.getStatusPayload();
});

ipcMain.handle('whatsapp:disconnect', async () => {
  return await whatsappManager.disconnect();
});

ipcMain.handle('whatsapp:send', async (_, params: { phone: string; text: string; recipientName?: string; messageType?: string; relatedId?: string }) => {
  return await whatsappManager.sendMessage(params);
});

ipcMain.handle('whatsapp:sendMedia', async (_, params: { phone: string; caption?: string; base64Data: string; mimetype: string; filename: string; recipientName?: string; messageType?: string; relatedId?: string }) => {
  return await whatsappManager.sendMedia(params);
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
