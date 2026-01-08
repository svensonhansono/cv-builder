import * as functions from 'firebase-functions';
import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// CAPTCHA-Bild mit Puppeteer laden
export const getCaptchaImage = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '1GB'
  })
  .https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');

  const refNr = req.query.refNr as string;

  if (!refNr) {
    res.status(400).send('refNr required');
    return;
  }

  try {
    console.log('🔄 Loading CAPTCHA with Puppeteer for:', refNr);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 800, height: 600 },
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    // Lade die Job-Detail Seite die das CAPTCHA enthält
    const jobUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
    await page.goto(jobUrl, { waitUntil: 'networkidle0', timeout: 20000 });

    // Warte auf CAPTCHA-Bild
    await page.waitForSelector('img[alt*="Sicherheitsabfrage"], img[src*="captcha"]', { timeout: 10000 });

    // Finde das CAPTCHA-Bild
    const captchaImage = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="Sicherheitsabfrage"], img[src*="captcha"]') as HTMLImageElement;
      if (img) {
        // Erstelle Canvas und konvertiere zu Base64
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL('image/png');
        }
      }
      return null;
    });

    await browser.close();

    if (captchaImage) {
      // Entferne data:image/png;base64, prefix
      const base64Data = captchaImage.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      res.set('Content-Type', 'image/png');
      res.send(buffer);
      console.log('✅ CAPTCHA erfolgreich geladen');
    } else {
      throw new Error('CAPTCHA-Bild nicht gefunden');
    }

  } catch (error: any) {
    console.error('❌ CAPTCHA fetch error:', error.message);
    res.status(500).send('Failed to load CAPTCHA');
  }
});
