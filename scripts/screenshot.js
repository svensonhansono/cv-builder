const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot() {
  const url = process.argv[2] || 'http://localhost:3009';
  const filename = process.argv[3] || 'screenshot.png';

  console.log(`Taking screenshot of ${url}...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate and wait for network to be idle
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Extra wait for React hydration
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Scroll down slowly to trigger all whileInView animations
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Wait for animations to complete
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(resolve => setTimeout(resolve, 500));

  // Take screenshot
  const filepath = path.join(__dirname, '..', 'screenshots', filename);
  await page.screenshot({
    path: filepath,
    fullPage: true
  });

  console.log(`Screenshot saved: ${filepath}`);

  await browser.close();
}

takeScreenshot().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
