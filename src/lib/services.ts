import { toast } from 'sonner';

const OFFLINE_PRINT_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 16px; font-size: 11px; color: #0f172a; background: #fff; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; word-wrap: break-word; font-size: 10px; }
  th { background-color: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .border-b { border-bottom: 1px solid #e2e8f0; }
  .pb-6 { padding-bottom: 1.5rem; }
  .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-6 { margin-top: 1.5rem; }
  .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .font-black { font-weight: 900; }
  .uppercase { text-transform: uppercase; }
  .tracking-tight { letter-spacing: -0.025em; }
  .text-2xl { font-size: 1.5rem; }
  .text-xl { font-size: 1.25rem; }
  .text-lg { font-size: 1.125rem; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }
  .text-slate-900 { color: #0f172a; }
  .text-slate-800 { color: #1e293b; }
  .text-slate-600 { color: #475569; }
  .text-slate-500 { color: #64748b; }
  .text-slate-400 { color: #94a3b8; }
  .text-orange-600 { color: #ea580c; }
  .text-orange-800 { color: #9a3412; }
  .bg-orange-50 { background-color: #fff7ed; }
  .border-orange-100 { border-color: #ffedd5; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-xl { border-radius: 0.75rem; }
  .w-full { width: 100%; }
  .bg-gray-200 { background-color: #e2e8f0; }
  .bg-gray-50 { background-color: #f8fafc; }
  .bg-white { background-color: #ffffff; }
`;

export async function generatePdf(containerSelector: string, fileName: string) {
  if (!window.electronAPI?.app?.printToPdf) {
    toast.error("PDF generation is not supported in this environment.");
    return false;
  }
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container ${containerSelector} not found`);
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${OFFLINE_PRINT_STYLES}</style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `;

  try {
    const base64Pdf = await window.electronAPI.app.printToPdf(htmlContent);
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64Pdf}`;
    link.download = fileName;
    link.click();
    toast.success(`PDF downloaded: ${fileName}`);
    return true;
  } catch (err: any) {
    console.error("Failed to generate PDF", err);
    toast.error(`Failed to generate PDF: ${err?.message || err}`);
    return false;
  }
}

export async function generatePdfBase64(containerSelector: string): Promise<string | null> {
  if (!window.electronAPI?.app?.printToPdf) {
    return null;
  }
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container ${containerSelector} not found`);
    return null;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${OFFLINE_PRINT_STYLES}</style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `;

  try {
    return await window.electronAPI.app.printToPdf(htmlContent);
  } catch (err) {
    console.error("Failed to generate PDF base64:", err);
    return null;
  }
}

export async function sendWhatsAppPdf(phone: string, containerSelector: string, fileName: string, caption: string) {
  if (!window.electronAPI?.whatsapp) {
    toast.error("WhatsApp integration is available in the desktop application.");
    return false;
  }

  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container ${containerSelector} not found`);
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${OFFLINE_PRINT_STYLES}</style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `;

  try {
    const pdfBase64 = await window.electronAPI.app!.printToPdf(htmlContent);
    const res = await window.electronAPI.whatsapp.sendMedia({
      phone,
      caption,
      base64Data: pdfBase64,
      mimetype: 'application/pdf',
      filename: fileName
    });

    if (res && res.error) {
      toast.error('Error sending WhatsApp message: ' + res.error);
      return false;
    }
    toast.success('Document sent via WhatsApp successfully!');
    return true;
  } catch (err: any) {
    toast.error('WhatsApp send failed: ' + err.message);
    return false;
  }
}
