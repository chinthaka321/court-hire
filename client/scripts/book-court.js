const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../state.json');

async function getRowValue(page, label) {
  return await page.locator(`div:has(span:text-is("${label}")) > span.font-semibold`).innerText().catch(() => 'N/A');
}

async function run() {
  const args = process.argv.slice(2);
  const headless = args.includes('--headless');

  if (!fs.existsSync(STATE_FILE)) {
    console.log('\n🔑 No active session state found. Launching browser for manual sign-in...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:5173');

    console.log('\n==================================================================');
    console.log('👉 ACTION REQUIRED: Please sign in manually in the opened browser.');
    console.log('==================================================================\n');

    // Wait for the user button component to appear, indicating Clerk sign-in is complete
    try {
      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 120000 });
      console.log('✅ Logged in successfully! Saving browser state...');
      await context.storageState({ path: STATE_FILE });
      console.log(`💾 Session saved to: ${STATE_FILE}`);
    } catch (e) {
      console.error('❌ Sign-in timed out (120 seconds) or failed.');
    } finally {
      await browser.close();
    }
    return;
  }

  console.log('\n🚀 Session state found. Starting booking automation...');
  const browser = await chromium.launch({ headless: headless });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  try {
    console.log('🌐 Opening website...');
    await page.goto('http://localhost:5173');

    // Wait for calendar to load
    await page.waitForSelector('text=Book a Court', { timeout: 10000 });
    console.log('📅 Calendar loaded.');

    // Wait a brief moment for availability slots to render
    await page.waitForTimeout(2000);

    const slotsGrid = page.locator('div.bg-white.rounded-2xl.border');
    await slotsGrid.waitFor({ state: 'visible' });

    // Look for first available slot cell (using the "Book" button text)
    const bookButtons = page.locator('text=Book');
    const count = await bookButtons.count();

    if (count === 0) {
      console.log('❌ No available slots found for today.');
      await browser.close();
      return;
    }

    console.log(`💡 Found ${count} available slots. Booking the first available slot...`);
    await bookButtons.first().click();

    // Confirm booking page
    console.log('📝 Navigating to confirmation page...');
    await page.waitForURL(/\/book\//, { timeout: 10000 });

    const payButton = page.locator('text=Pay Now');
    await payButton.waitFor({ state: 'visible' });

    console.log('💳 Clicking "Pay Now" (processing mock payment)...');
    await payButton.click();

    // Wait for success screen
    console.log('⏳ Waiting for transaction confirmation...');
    await page.waitForURL(/\/booking\/confirmed\//, { timeout: 30000 });

    console.log('🎉 Booking confirmed!');

    // Extract details from confirmation screen
    const courtName = await getRowValue(page, 'Court');
    const dateTime = await getRowValue(page, 'Date & Time');
    const amount = await getRowValue(page, 'Amount Paid');
    const bookingId = await getRowValue(page, 'Booking ID');

    console.log('\n=============================================');
    console.log('✨ RESERVATION SUCCESSFUL');
    console.log(`🏟️  Court:      ${courtName}`);
    console.log(`📅  Time:       ${dateTime}`);
    console.log(`💵  Paid:       ${amount}`);
    console.log(`🆔  Booking ID: ${bookingId}`);
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Automation failed:', err.message || err);
  } finally {
    await browser.close();
  }
}

run();
