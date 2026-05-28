const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Initializing client...');
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('QR Code Received!');
  qrcode.generate(qr, { small: true });
  process.exit(0);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('auth_failure', (msg) => {
  console.error('Auth failure:', msg);
});

client.initialize().catch(err => {
  console.error('Init error:', err);
  process.exit(1);
});
