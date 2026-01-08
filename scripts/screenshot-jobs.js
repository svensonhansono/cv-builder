const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeJobsScreenshots() {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Starting browser in headed mode...');
  console.log('Please log in when the browser opens, then the screenshots will be taken automatically.');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Go to login page
  console.log('Opening login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // Wait for user to log in (detect redirect to dashboard or jobs page)
  console.log('Waiting for login... Please log in now.');

  try {
    await page.waitForURL('**/dashboard**', { timeout: 120000 });
    console.log('Login successful! Redirected to dashboard.');
  } catch (e) {
    console.log('Timeout waiting for login, continuing anyway...');
  }

  // Navigate to jobs page
  console.log('Navigating to jobs page...');
  await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle' });

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Take screenshot of initial state (with loading indicator if visible)
  console.log('Taking screenshot of jobs page...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'jobs-page-initial.png'),
    fullPage: false
  });
  console.log('Saved: jobs-page-initial.png');

  // Wait for contact data loading to potentially show
  await page.waitForTimeout(2000);

  // Take another screenshot
  await page.screenshot({
    path: path.join(screenshotsDir, 'jobs-page-loading.png'),
    fullPage: false
  });
  console.log('Saved: jobs-page-loading.png');

  // Wait for sorting to complete (up to 30 seconds)
  console.log('Waiting for contact data sorting to complete...');
  await page.waitForTimeout(15000);

  // Take final screenshot
  await page.screenshot({
    path: path.join(screenshotsDir, 'jobs-page-final.png'),
    fullPage: false
  });
  console.log('Saved: jobs-page-final.png');

  // Take a full page screenshot
  await page.screenshot({
    path: path.join(screenshotsDir, 'jobs-page-fullpage.png'),
    fullPage: true
  });
  console.log('Saved: jobs-page-fullpage.png');

  console.log('\nAll screenshots saved to:', screenshotsDir);

  await browser.close();
}

takeJobsScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
