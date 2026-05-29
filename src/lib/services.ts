export async function generatePdf(containerSelector: string, fileName: string) {
  if (!window.electronAPI.app?.printToPdf) {
    alert("PDF generation is not supported in this environment.");
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
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 16px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; border: 1px solid black; text-align: center; }
          th, td { border: 1px solid black; padding: 4px; word-wrap: break-word; }
          .bg-gray-200 { background-color: #e5e7eb; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-white { background-color: white; }
          .font-bold { font-weight: bold; }
          .italic { font-style: italic; }
          .not-italic { font-style: normal; }
          .font-normal { font-weight: normal; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .uppercase { text-transform: uppercase; }
          .text-left { text-align: left; }
          .align-top { vertical-align: top; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .break-words { word-break: break-word; }
          th.w-\\[8\\%\\] { width: 8%; }
          th.w-\\[11\\%\\] { width: 11%; }
          th.w-\\[14\\%\\] { width: 14%; }
          th.w-\\[10\\%\\] { width: 10%; }
          th.w-\\[7\\%\\] { width: 7%; }
          th.w-\\[5\\%\\] { width: 5%; }
          th.w-\\[4\\%\\] { width: 4%; }
        </style>
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
    return true;
  } catch (err) {
    console.error("Failed to generate PDF", err);
    return false;
  }
}

export async function sendWhatsAppPdf(phone: string, containerSelector: string, fileName: string, caption: string) {
  if (!window.electronAPI?.whatsapp) {
    alert("WhatsApp API not available.");
    return false;
  }
  const isConnected = localStorage.getItem('whatsappConnected') === 'true';
  if (!isConnected) {
    alert("Please connect WhatsApp in Settings to send files automatically.");
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
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 16px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; border: 1px solid black; text-align: center; }
          th, td { border: 1px solid black; padding: 4px; word-wrap: break-word; }
          .bg-gray-200 { background-color: #e5e7eb; }
        </style>
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
      alert('Error sending WhatsApp message: ' + res.error);
      return false;
    }
    return true;
  } catch (err: any) {
    alert('WhatsApp send failed: ' + err.message);
    return false;
  }
}
