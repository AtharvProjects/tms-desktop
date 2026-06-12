import { chromium } from 'playwright';
import path from 'path';

(async () => {
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  
  // Create a new context with video recording enabled
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: 'demo-video/',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  
  // Helper to wait for a few seconds
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log("🎬 Starting recording...");
  
  try {
    // 1. Dashboard
    console.log("Navigating to Dashboard...");
    await page.goto('http://localhost:5173/');
    await wait(4000); // Wait on dashboard for 4 seconds

    // 2. Trips
    console.log("Navigating to Trips...");
    await page.goto('http://localhost:5173/trips');
    await wait(3000);
    
    // 3. Vehicles
    console.log("Navigating to Vehicles...");
    await page.goto('http://localhost:5173/vehicles');
    await wait(3000);

    // 4. Drivers
    console.log("Navigating to Drivers...");
    await page.goto('http://localhost:5173/drivers');
    await wait(3000);

    // 5. Parties
    console.log("Navigating to Parties...");
    await page.goto('http://localhost:5173/parties');
    await wait(3000);

    // 6. Diesel
    console.log("Navigating to Diesel...");
    await page.goto('http://localhost:5173/diesel');
    await wait(3000);

    // 7. Expenses
    console.log("Navigating to Expenses...");
    await page.goto('http://localhost:5173/expenses');
    await wait(3000);

    // 8. Invoices
    console.log("Navigating to Invoices...");
    await page.goto('http://localhost:5173/invoices');
    await wait(3000);

    // 9. Settings
    console.log("Navigating to Settings...");
    await page.goto('http://localhost:5173/settings');
    await wait(3000);

    console.log("✅ Finished navigating!");

  } catch (err) {
    console.error("Error during recording:", err);
  } finally {
    // Close context and browser to save the video
    await context.close();
    await browser.close();
    console.log("🎥 Video saved in the 'demo-video' folder!");
  }
})();
