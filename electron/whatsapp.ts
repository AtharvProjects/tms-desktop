import path from 'path';
import fs from 'fs';
import { app, BrowserWindow } from 'electron';
import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;

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

export class WhatsAppConnectionManager {
  private client: Client | null = null;
  private status: WhatsAppStatus = 'DISCONNECTED';
  private accountInfo: WhatsAppAccountInfo | null = null;
  private qrDataUrl: string | null = null;
  private qrExpiresAt: number | null = null;
  private qrTimer: NodeJS.Timeout | null = null;
  private isQrExpired: boolean = false;
  private lastError: string | null = null;
  private getMainWindow: () => BrowserWindow | null;
  private prisma: any;
  private logToFile: (...args: any[]) => void;
  private errorToFile: (...args: any[]) => void;

  constructor(
    getMainWindow: () => BrowserWindow | null,
    prisma: any,
    logToFile: (...args: any[]) => void,
    errorToFile: (...args: any[]) => void
  ) {
    this.getMainWindow = getMainWindow;
    this.prisma = prisma;
    this.logToFile = logToFile;
    this.errorToFile = errorToFile;

    // Load cached account info if exists
    this.loadCachedAccountInfo();
  }

  private getAuthPath(): string {
    return path.join(app.getPath('userData'), '.wwebjs_auth');
  }

  private getAccountInfoPath(): string {
    return path.join(app.getPath('userData'), 'whatsapp_account.json');
  }

  private loadCachedAccountInfo() {
    try {
      const p = this.getAccountInfoPath();
      if (fs.existsSync(p)) {
        this.accountInfo = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (e) {
      this.accountInfo = null;
    }
  }

  private saveCachedAccountInfo(info: WhatsAppAccountInfo | null) {
    this.accountInfo = info;
    try {
      const p = this.getAccountInfoPath();
      if (info) {
        fs.writeFileSync(p, JSON.stringify(info, null, 2), 'utf-8');
      } else if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch (e) {
      this.errorToFile('[WhatsApp] Failed to save account info:', e);
    }
  }

  public hasStoredSession(): boolean {
    const authPath = this.getAuthPath();
    if (!fs.existsSync(authPath)) return false;
    try {
      const files = fs.readdirSync(authPath);
      return files.length > 0;
    } catch (e) {
      return false;
    }
  }

  private emitStatus() {
    const payload = this.getStatusPayload();
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('whatsapp:status', payload);
    }
  }

  public getStatusPayload(): WhatsAppStatusPayload {
    return {
      status: this.status,
      accountInfo: this.accountInfo,
      qrDataUrl: this.isQrExpired ? null : this.qrDataUrl,
      qrExpiresAt: this.qrExpiresAt,
      isQrExpired: this.isQrExpired,
      error: this.lastError
    };
  }

  private resolveBrowserExecutable(): string | undefined {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    if (app.isPackaged) {
      possiblePaths.unshift(
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'puppeteer', '.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'puppeteer-core', '.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'whatsapp-web.js', 'node_modules', 'puppeteer', '.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe'),
        path.join(process.resourcesPath, 'node_modules', 'puppeteer', '.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe')
      );
    } else {
      possiblePaths.unshift(
        path.join(__dirname, '../node_modules/puppeteer/.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe'),
        path.join(__dirname, '../node_modules/whatsapp-web.js/node_modules/puppeteer/.local-chromium', 'win64-' + process.arch, 'chrome-win', 'chrome.exe')
      );
    }

    const found = possiblePaths.find(p => fs.existsSync(p));
    if (found) {
      this.logToFile('[WhatsApp] Using browser executable at:', found);
    } else {
      this.logToFile('[WhatsApp] WARNING: Could not find custom Chromium path. Relying on Puppeteer default.');
    }
    return found;
  }

  public async initialize(forceFreshQr: boolean = false): Promise<WhatsAppStatusPayload> {
    this.logToFile('[WhatsApp] initialize() requested. Current status:', this.status);

    if (this.status === 'CONNECTED' && this.client) {
      return this.getStatusPayload();
    }

    if (this.status === 'CONNECTING' && this.client) {
      return this.getStatusPayload();
    }

    if (this.status === 'QR_REQUIRED' && this.qrDataUrl && !this.isQrExpired && !forceFreshQr) {
      return this.getStatusPayload();
    }

    // Set connecting state
    this.status = 'CONNECTING';
    this.lastError = null;
    this.isQrExpired = false;
    this.emitStatus();

    try {
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (e) {}
        this.client = null;
      }

      const authPath = this.getAuthPath();
      const puppeteerExecPath = this.resolveBrowserExecutable();

      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: authPath }),
        webVersionCache: { type: 'none' },
        puppeteer: {
          headless: true,
          ...(puppeteerExecPath ? { executablePath: puppeteerExecPath } : {}),
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      this.client.on('qr', async (qr) => {
        this.logToFile('[WhatsApp] Event: qr code received');
        this.status = 'QR_REQUIRED';
        this.isQrExpired = false;
        
        try {
          this.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          this.qrExpiresAt = Date.now() + 30000; // 30s expiry

          if (this.qrTimer) clearTimeout(this.qrTimer);
          this.qrTimer = setTimeout(() => {
            this.logToFile('[WhatsApp] QR code expired.');
            this.isQrExpired = true;
            this.emitStatus();
          }, 30000);

          this.emitStatus();
        } catch (err: any) {
          this.errorToFile('[WhatsApp] Failed to generate QR data URL:', err);
        }
      });

      this.client.on('authenticated', () => {
        this.logToFile('[WhatsApp] Event: authenticated');
        this.status = 'CONNECTING';
        this.lastError = null;
        if (this.qrTimer) clearTimeout(this.qrTimer);
        this.qrDataUrl = null;
        this.qrExpiresAt = null;
        this.isQrExpired = false;
        this.emitStatus();
      });

      this.client.on('ready', async () => {
        this.logToFile('[WhatsApp] Event: ready! Client is connected.');
        this.status = 'CONNECTED';
        this.lastError = null;
        this.qrDataUrl = null;
        this.qrExpiresAt = null;
        this.isQrExpired = false;

        // Retrieve real phone and pushname from client.info
        let phone = '';
        let pushname = 'Connected Device';
        let platform = 'WhatsApp Web';

        try {
          if (this.client?.info) {
            const rawUser = this.client.info.wid?.user || '';
            phone = rawUser ? `+${rawUser}` : '';
            pushname = this.client.info.pushname || 'Connected WhatsApp Account';
            platform = this.client.info.platform || 'WhatsApp Web';
          }
        } catch (e) {
          this.errorToFile('[WhatsApp] Failed to read client.info:', e);
        }

        const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        this.saveCachedAccountInfo({
          phone: phone || (this.accountInfo?.phone || '+91 Linked Account'),
          pushname,
          platform,
          lastConnected: `Today, ${nowStr}`
        });

        this.emitStatus();

        // Inject runtime resilience patch for WhatsApp Web MobX memoizer
        try {
          await (this.client as any)?.pupPage?.evaluate(() => {
            try {
              const SendMsgChatAction = (window as any).require?.('WAWebSendMsgChatAction');
              if (SendMsgChatAction && !SendMsgChatAction.__memoizePatched) {
                SendMsgChatAction.__memoizePatched = true;
                const origAddAndSend = SendMsgChatAction.addAndSendMsgToChat;
                SendMsgChatAction.addAndSendMsgToChat = function(chat: any, message: any) {
                  if (message) {
                    delete message.__x_id;
                    if (message.id && typeof message.id === 'object') {
                      delete message.id.__x_id;
                    }
                  }
                  return origAddAndSend.apply(this, arguments);
                };
              }
            } catch (e) {}
          });
        } catch (patchErr) {}
      });

      this.client.on('auth_failure', (msg) => {
        this.errorToFile('[WhatsApp] Event: auth_failure:', msg);
        this.status = 'SESSION_EXPIRED';
        this.lastError = `Session expired: ${msg || 'Authentication failed'}. Please scan QR code again.`;
        this.qrDataUrl = null;
        this.emitStatus();
      });

      this.client.on('disconnected', (reason) => {
        this.logToFile('[WhatsApp] Event: disconnected. Reason:', reason);
        this.status = 'DISCONNECTED';
        this.lastError = `WhatsApp was logged out: ${reason}`;
        this.qrDataUrl = null;
        this.client = null;
        this.emitStatus();
      });

      this.client.on('change_state', (state) => {
        this.logToFile('[WhatsApp] Event: change_state:', state);
        if (state === 'CONFLICT' || state === 'UNPAIRED' || state === 'UNLAUNCHED') {
          this.status = 'SESSION_EXPIRED';
          this.emitStatus();
        } else if (state === 'TIMEOUT') {
          this.status = 'RECONNECTING';
          this.emitStatus();
        }
      });

      this.logToFile('[WhatsApp] Calling client.initialize()...');
      await this.client.initialize();
      this.logToFile('[WhatsApp] client.initialize() returned successfully.');
      return this.getStatusPayload();
    } catch (err: any) {
      this.errorToFile('[WhatsApp] Initialization failed:', err);
      this.status = 'ERROR';
      this.lastError = err.message || 'Failed to initialize WhatsApp browser.';
      this.emitStatus();
      return this.getStatusPayload();
    }
  }

  public async disconnect(): Promise<WhatsAppStatusPayload> {
    this.logToFile('[WhatsApp] disconnect() called.');
    if (this.qrTimer) clearTimeout(this.qrTimer);

    if (this.client) {
      try {
        await this.client.logout();
      } catch (e) {}
      try {
        await this.client.destroy();
      } catch (e) {}
      this.client = null;
    }

    // Clear auth directory to guarantee clean disconnected state
    const authPath = this.getAuthPath();
    try {
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        this.logToFile('[WhatsApp] Removed .wwebjs_auth folder.');
      }
    } catch (err) {
      this.errorToFile('[WhatsApp] Error deleting auth folder:', err);
    }

    this.saveCachedAccountInfo(null);
    this.status = 'DISCONNECTED';
    this.qrDataUrl = null;
    this.qrExpiresAt = null;
    this.isQrExpired = false;
    this.lastError = null;
    this.emitStatus();
    return this.getStatusPayload();
  }

  public formatPhoneToChatId(phone: string): { chatId: string; cleanPhone: string } {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits; // Standardize 10 digit Indian numbers
    }
    return {
      chatId: `${digits}@c.us`,
      cleanPhone: digits
    };
  }

  public async sendMessage(params: {
    phone: string;
    text: string;
    recipientName?: string;
    messageType?: string;
    relatedId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.client) {
      return {
        success: false,
        error: 'WhatsApp is disconnected. Please connect WhatsApp in Settings before sending this message.'
      };
    }

    const { phone, text, recipientName = 'Recipient', messageType = 'Custom', relatedId } = params;
    const { chatId, cleanPhone } = this.formatPhoneToChatId(phone);

    if (cleanPhone.length < 10) {
      return { success: false, error: 'Invalid phone number. Must contain at least 10 digits.' };
    }

    // Resolve registered WhatsApp contact ID
    let targetChatId = chatId;
    try {
      const numberId = await this.client.getNumberId(cleanPhone);
      if (!numberId) {
        return {
          success: false,
          error: `Phone number +91 ${cleanPhone.slice(-10)} is not registered on WhatsApp.`
        };
      }
      // CRITICAL ARCHITECTURAL FIX:
      // Always use the canonical @c.us JID, NEVER an internal privacy @lid.
      // WhatsApp Web message dispatch fails when using @lid without a pre-existing contact record.
      const serialized = (numberId as any)._serialized;
      if (serialized && serialized.endsWith('@c.us')) {
        targetChatId = serialized;
      } else {
        targetChatId = `${cleanPhone}@c.us`;
      }
    } catch (checkErr) {
      this.logToFile('[WhatsApp] getNumberId pre-check notice:', checkErr);
      targetChatId = `${cleanPhone}@c.us`;
    }

    try {
      this.logToFile(`[WhatsApp] Sending text message to ${targetChatId}...`);
      await this.client.sendMessage(targetChatId, text);
      this.logToFile(`[WhatsApp] Text message sent successfully to ${targetChatId}.`);

      // Log to database
      try {
        await this.prisma.whatsAppLog.create({
          data: {
            recipient: recipientName,
            phone: cleanPhone,
            messageType,
            message: text,
            status: 'Sent',
            relatedId
          }
        });
      } catch (logErr) {
        this.errorToFile('[WhatsApp] Could not save log entry to database:', logErr);
      }

      return { success: true };
    } catch (err: any) {
      this.errorToFile('[WhatsApp] Failed to send text message:', err);
      let errorMsg = err.message || 'Failed to send message via WhatsApp.';
      if (errorMsg.includes('memoize') || errorMsg.includes('rsrc.php')) {
        errorMsg = 'WhatsApp Web could not initialize the contact. Please ensure the phone number is valid and registered on WhatsApp.';
      }

      try {
        await this.prisma.whatsAppLog.create({
          data: {
            recipient: recipientName,
            phone: cleanPhone,
            messageType,
            message: text,
            status: 'Failed',
            error: errorMsg,
            relatedId
          }
        });
      } catch (logErr) {}

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sends a media message (document, image, etc.) via WhatsApp.
   *
   * Architecture note:
   *   1. targetChatId MUST ALWAYS use the canonical phone JID ending in @c.us.
   *      Modern WhatsApp returns privacy LIDs (@lid) from getNumberId(), but
   *      WhatsApp Web's media upload and document pipeline crashes with:
   *      "Data passed to getter must include an id property (it's how we memoize) but got undefined"
   *      when passed a @lid JID!
   *   2. When a caption (such as a customer balance statement or invoice text)
   *      is provided, dispatching this text message FIRST:
   *        - Delivers the formatted statement to the customer (documents don't support multi-line captions).
   *        - Immediately boots and memoizes the chat thread in WhatsApp Web's memory store.
   *   3. The document attachment is then dispatched into the now fully-active chat thread.
   */
  public async sendMedia(params: {
    phone: string;
    caption?: string;
    base64Data: string;
    mimetype: string;
    filename: string;
    recipientName?: string;
    messageType?: string;
    relatedId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.client) {
      return {
        success: false,
        error: 'WhatsApp is disconnected. Please connect WhatsApp in Settings before sending this message.'
      };
    }

    const {
      phone,
      caption = '',
      base64Data,
      mimetype,
      filename,
      recipientName = 'Recipient',
      messageType = 'Document',
      relatedId
    } = params;

    const { chatId, cleanPhone } = this.formatPhoneToChatId(phone);

    if (cleanPhone.length < 10) {
      return { success: false, error: 'Invalid phone number. Must contain at least 10 digits.' };
    }

    // Helper: promisified delay
    const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

    // Step 1: Verify phone number registration on WhatsApp
    let targetChatId = chatId;
    try {
      const numberId = await this.client.getNumberId(cleanPhone);
      if (!numberId) {
        return {
          success: false,
          error: `Phone number +91 ${cleanPhone.slice(-10)} is not registered on WhatsApp.`
        };
      }
      // CRITICAL ARCHITECTURAL FIX:
      // Never use @lid! Always prioritize @c.us JID.
      const serialized = (numberId as any)._serialized;
      if (serialized && serialized.endsWith('@c.us')) {
        targetChatId = serialized;
      } else {
        targetChatId = `${cleanPhone}@c.us`;
      }
    } catch (checkErr) {
      this.logToFile('[WhatsApp] getNumberId check notice:', checkErr);
      targetChatId = `${cleanPhone}@c.us`;
    }

    this.logToFile(`[WhatsApp] Target contact resolved to canonical JID: ${targetChatId}`);

    // Step 2: Ensure chat thread is initialized in WhatsApp Web's store.
    // If a caption exists (e.g. statement or invoice message), send it as a text message first.
    // This avoids document-caption rendering issues and guarantees the chat is memoized.
    const isDocument = !mimetype.startsWith('image/') && !mimetype.startsWith('video/');
    let captionAlreadySent = false;

    if (caption && caption.trim()) {
      try {
        this.logToFile(`[WhatsApp] Dispatching statement text to ${targetChatId} before document attachment...`);
        await this.client.sendMessage(targetChatId, caption.trim());
        this.logToFile(`[WhatsApp] Statement text delivered. Waiting 1500ms before sending document...`);
        captionAlreadySent = true;
        await delay(1500);
      } catch (textErr: any) {
        this.logToFile('[WhatsApp] Pre-message text dispatch notice:', textErr);
      }
    } else {
      // Check if chat is already active in memory without using broken getChats()
      let isChatActive = false;
      try {
        isChatActive = await (this.client as any).pupPage.evaluate((widStr: string) => {
          try {
            const wid = (window as any).require('WAWebWidFactory').createWid(widStr);
            const chat = (window as any).require('WAWebCollections').Chat.get(wid);
            return Boolean(chat && chat.msgs && chat.msgs.length > 0);
          } catch {
            return false;
          }
        }, targetChatId);
      } catch (e) {
        isChatActive = false;
      }

      if (!isChatActive) {
        try {
          this.logToFile(`[WhatsApp] Priming new contact ${targetChatId} with document notice...`);
          await this.client.sendMessage(targetChatId, `📄 Document: ${filename}`);
          captionAlreadySent = true;
          await delay(1500);
        } catch (primerErr) {
          this.logToFile('[WhatsApp] Primer notice:', primerErr);
        }
      }
    }

    // Step 3: Build media object and send document
    const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
    const media = new MessageMedia(mimetype, cleanBase64, filename);
    const sendOptions: any = {};

    if (isDocument) {
      sendOptions.sendMediaAsDocument = true;
    } else if (!captionAlreadySent && caption) {
      sendOptions.caption = caption;
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Ensure WA Web message sanitizer is active
        try {
          await (this.client as any)?.pupPage?.evaluate(() => {
            try {
              const SendMsgChatAction = (window as any).require?.('WAWebSendMsgChatAction');
              if (SendMsgChatAction && !SendMsgChatAction.__memoizePatched) {
                SendMsgChatAction.__memoizePatched = true;
                const origAddAndSend = SendMsgChatAction.addAndSendMsgToChat;
                SendMsgChatAction.addAndSendMsgToChat = function(chat: any, message: any) {
                  if (message) {
                    delete message.__x_id;
                    if (message.id && typeof message.id === 'object') {
                      delete message.id.__x_id;
                    }
                  }
                  return origAddAndSend.apply(this, arguments);
                };
              }
            } catch (e) {}
          });
        } catch (e) {}

        this.logToFile(`[WhatsApp] Sending media (${filename}) to ${targetChatId} — attempt ${attempt}/${MAX_RETRIES}...`);
        await this.client.sendMessage(targetChatId, media, sendOptions);
        this.logToFile(`[WhatsApp] Media sent successfully to ${targetChatId} on attempt ${attempt}.`);

        // Log success to DB
        try {
          await this.prisma.whatsAppLog.create({
            data: {
              recipient: recipientName,
              phone: cleanPhone,
              messageType,
              message: caption || `Attachment: ${filename}`,
              attachment: filename,
              status: 'Sent',
              relatedId
            }
          });
        } catch (logErr) {
          this.errorToFile('[WhatsApp] Could not save log entry to database:', logErr);
        }

        return { success: true };
      } catch (err: any) {
        lastError = err;
        const errMsg: string = err?.message || '';
        this.logToFile(`[WhatsApp] Attempt ${attempt} failed with error: ${errMsg}`);

        if (attempt < MAX_RETRIES) {
          const backoffMs = attempt * 1500;
          this.logToFile(`[WhatsApp] Retrying in ${backoffMs}ms...`);
          await delay(backoffMs);
          continue;
        }

        break;
      }
    }

    // All attempts failed
    this.errorToFile('[WhatsApp] Failed to send media after all retries:', lastError);
    let errorMsg = lastError?.message || 'Failed to send attachment via WhatsApp.';
    if (
      errorMsg.includes('memoize') ||
      errorMsg.includes('rsrc.php') ||
      errorMsg.includes('id property')
    ) {
      errorMsg = `WhatsApp Web was unable to attach the document. Please try again.`;
    }

    try {
      await this.prisma.whatsAppLog.create({
        data: {
          recipient: recipientName,
          phone: cleanPhone,
          messageType,
          message: caption || `Attachment: ${filename}`,
          attachment: filename,
          status: 'Failed',
          error: errorMsg,
          relatedId
        }
      });
    } catch (logErr) {}

    return { success: false, error: errorMsg };
  }
}
