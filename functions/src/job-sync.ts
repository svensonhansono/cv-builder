import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { Solver } from '2captcha';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const db = admin.firestore();
const solver = new Solver(process.env.TWOCAPTCHA_API_KEY || '');

interface JobSearchResult {
  refnr: string;
  titel: string;
  arbeitgeber?: string;
  arbeitsort?: {
    ort?: string;
    plz?: string;
    koordinaten?: {
      lat: number;
      lon: number;
    };
  };
}

interface JobDetails {
  refnr: string;
  titel: string;
  arbeitgeber?: string;
  arbeitsort?: any;
  stellenbeschreibung?: string;
  fertigkeiten?: any[];
  verguetung?: string;
  befristung?: string;
  aktuelleVeroeffentlichungsdatum?: string;
  eintrittsdatum?: string;
}

interface ContactInfo {
  name?: string;
  telefon?: string;
  email?: string;
  anschrift?: any;
}

interface JobWithContact extends JobDetails {
  kontakt?: ContactInfo;
}

// Täglicher Job-Sync (scheduled für 2 Uhr nachts)
export const dailyJobSync = functions
  .runWith({
    timeoutSeconds: 540, // 9 Minuten
    memory: '2GB'
  })
  .pubsub.schedule('0 2 * * *')
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    console.log('🔄 Starting daily job sync...');

    try {
      // Schritt 1: Jobs suchen
      const jobs = await searchJobs();
      console.log(`✅ Found ${jobs.length} jobs`);

      // Schritt 2: Speichere ALLE Jobs OHNE CAPTCHA (nur Basisdaten!)
      let successCount = 0;
      let errorCount = 0;

      console.log(`💾 Speichere ${jobs.length} Jobs in Firestore (OHNE Kontaktdaten)...`);

      for (const job of jobs) {
        try {
          // Hole erweiterte Job-Details von der API (OHNE Puppeteer!)
          let jobDetails;
          try {
            const response = await axios.get(
              `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs/${job.refnr}`,
              {
                headers: {
                  'User-Agent': 'LebenslaufBuilder/1.0',
                  'X-API-Key': 'jobboerse-jobsuche',
                }
              }
            );
            jobDetails = response.data;
          } catch (err) {
            // Falls API fehlschlägt, nutze Basis-Daten aus Search
            console.log(`⚠️ Could not get details for ${job.refnr}, using search data`);
            jobDetails = {
              refnr: job.refnr,
              titel: job.titel,
              arbeitgeber: job.arbeitgeber,
              arbeitsort: job.arbeitsort
            };
          }

          // Speichere Job OHNE Kontaktdaten
          await saveJobToFirestore({
            ...jobDetails,
            kontakt: null // Kontaktdaten werden ON-DEMAND geholt!
          });

          successCount++;

          if (successCount % 100 === 0) {
            console.log(`✅ Gespeichert: ${successCount}/${jobs.length} Jobs`);
          }

          // Rate limiting
          await sleep(100);
        } catch (error: any) {
          errorCount++;
          console.error(`❌ Error processing job ${job.refnr}:`, error.message);
        }
      }

      console.log(`🎉 Daily sync complete: ${successCount} success, ${errorCount} errors`);

      return {
        success: true,
        processed: jobs.length,
        saved: successCount,
        errors: errorCount
      };

    } catch (error: any) {
      console.error('❌ Daily sync failed:', error.message);
      throw error;
    }
  });

// Manueller Sync-Trigger (über HTTP-Endpoint)
export const triggerJobSync = functions
  .runWith({
    timeoutSeconds: 540, // 9 Minuten
    memory: '2GB'
  })
  .https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  // TODO: Add authentication check here
  // Only allow admin users to trigger manual sync

  console.log('🔄 Manual job sync triggered...');

  try {
    // Für Manual-Sync: Lade nur 1 Seite (100 Jobs) zum Testen
    const jobs = await searchJobs(1);
    console.log(`✅ Found ${jobs.length} jobs`);

    const jobsToProcess = jobs;
    console.log(`📝 Processing ${jobsToProcess.length} jobs for testing...`);

    let successCount = 0;
    let errorCount = 0;

    for (const job of jobsToProcess) {
      try {
        // Hole Job-Details von API (OHNE Puppeteer!)
        let jobDetails;
        try {
          const response = await axios.get(
            `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs/${job.refnr}`,
            {
              headers: {
                'User-Agent': 'LebenslaufBuilder/1.0',
                'X-API-Key': 'jobboerse-jobsuche',
              }
            }
          );
          jobDetails = response.data;
        } catch (err) {
          jobDetails = {
            refnr: job.refnr,
            titel: job.titel,
            arbeitgeber: job.arbeitgeber,
            arbeitsort: job.arbeitsort
          };
        }

        await saveJobToFirestore({
          ...jobDetails,
          kontakt: null // Kontaktdaten ON-DEMAND!
        });

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`✅ Saved ${successCount}/${jobsToProcess.length} jobs`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Error: ${job.refnr}:`, error.message);
      }

      await sleep(100);
    }

    res.json({
      success: true,
      processed: jobsToProcess.length,
      saved: successCount,
      errors: errorCount
    });

  } catch (error: any) {
    console.error('❌ Manual sync failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// On-Demand: Hole Kontaktdaten für einen spezifischen Job (mit CAPTCHA!)
export const getJobContact = functions
  .runWith({
    timeoutSeconds: 120, // 2 Minuten
    memory: '2GB'
  })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const refNr = req.query.refnr as string || req.body.refnr;

    if (!refNr) {
      res.status(400).json({ error: 'refnr parameter required' });
      return;
    }

    console.log(`🔍 Getting contact info for job: ${refNr}`);

    try {
      // Löse CAPTCHA und hole Kontaktdaten mit Puppeteer
      const contactInfo = await solveCaptchaWithPuppeteer(refNr);

      // Versuche Firestore zu aktualisieren (falls Job existiert), aber ignoriere Fehler
      try {
        const jobDoc = await db.collection('jobs').doc(refNr).get();
        if (jobDoc.exists) {
          await db.collection('jobs').doc(refNr).update({
            kontakt: contactInfo.kontakt || {},
            lastContactFetch: new Date().toISOString()
          });
          console.log('✅ Updated Firestore job with contact info');
        }
      } catch (firestoreError) {
        console.log('ℹ️ Job not in Firestore, skipping update');
      }

      res.json({
        success: true,
        kontakt: contactInfo.kontakt || {}
      });
    } catch (error: any) {
      console.error(`❌ Failed to get contact for ${refNr}:`, error.message);
      res.status(500).json({
        error: error.message,
        success: false
      });
    }
  });

// Helper: Jobs suchen (mit Pagination für ALLE Jobs!)
async function searchJobs(maxPages?: number): Promise<JobSearchResult[]> {
  const pageSize = 100; // Max pro Seite
  let allJobs: JobSearchResult[] = [];
  let totalJobs = 0;

  // Erste Seite holen, um Gesamtanzahl zu erfahren
  const firstResponse = await axios.get(
    'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
    {
      headers: {
        'X-API-Key': 'jobboerse-jobsuche',
        'User-Agent': 'LebenslaufBuilder/1.0'
      },
      params: {
        angebotsart: 1,
        page: '1',
        size: pageSize.toString()
      }
    }
  );

  // Jobs von erster Seite speichern
  const firstPageJobs = firstResponse.data.stellenangebote || [];
  allJobs.push(...firstPageJobs);

  // Gesamtanzahl ermitteln
  totalJobs = firstResponse.data.maxErgebnisse || firstPageJobs.length;
  const totalPages = Math.ceil(totalJobs / pageSize);

  // Begrenze auf maxPages falls angegeben
  const pagesToFetch = maxPages ? Math.min(totalPages, maxPages) : totalPages;

  console.log(`📊 Insgesamt ${totalJobs} Jobs verfügbar auf ${totalPages} Seiten`);
  console.log(`📥 Lade ${pagesToFetch} Seite(n)...`);

  // Restliche Seiten holen (ab Seite 2)
  for (let page = 2; page <= pagesToFetch; page++) {
    console.log(`📥 Lade Seite ${page}/${pagesToFetch}...`);

    const response = await axios.get(
      'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
      {
        headers: {
          'X-API-Key': 'jobboerse-jobsuche',
          'User-Agent': 'LebenslaufBuilder/1.0'
        },
        params: {
          angebotsart: 1,
          page: page.toString(),
          size: pageSize.toString()
        }
      }
    );

    const pageJobs = response.data.stellenangebote || [];
    allJobs.push(...pageJobs);

    // Rate limiting zwischen API-Calls
    await sleep(200);
  }

  console.log(`✅ Insgesamt ${allJobs.length} Jobs geladen`);
  return allJobs;
}


// Helper: CAPTCHA lösen mit Puppeteer und 2Captcha + Job-Details extrahieren
async function solveCaptchaWithPuppeteer(refNr: string): Promise<JobWithContact> {
  let browser;
  try {
    console.log('🌐 Starting Puppeteer browser...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Schritt 1: Lade Job-Details Seite
    const jobUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
    console.log(`📥 Loading page: ${jobUrl}`);
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Prüfe ob CAPTCHA-Bild vorhanden ist (nicht immer der Fall!)
    const hasCaptcha = await page.$('img[alt*="Sicherheitsabfrage"], img[src*="captcha"]').then(el => !!el);

    if (hasCaptcha) {
      console.log('🔒 CAPTCHA detected, solving...');

      // Schritt 2: Extrahiere CAPTCHA-Bild als Base64
      const captchaData = await page.evaluate(() => {
        const img = document.querySelector('img[alt*="Sicherheitsabfrage"], img[src*="captcha"]') as HTMLImageElement;
        if (!img) return null;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      });

      if (captchaData) {
        // Convert to Base64 (remove data:image/png;base64, prefix)
        const base64Image = captchaData.replace(/^data:image\/png;base64,/, '');
        console.log('✅ CAPTCHA image extracted');

        // Schritt 3: CAPTCHA mit 2Captcha lösen
        console.log('🔍 Solving CAPTCHA with 2Captcha...');
        const result = await solver.imageCaptcha(base64Image);
        const captchaSolution = result.data;
        console.log(`✅ CAPTCHA solved: ${captchaSolution}`);

        // Schritt 4: CAPTCHA-Lösung in Form eingeben
        const inputField = await page.$('#kontaktdaten-captcha-input, input[type="text"]');
        if (inputField) {
          await inputField.click({ clickCount: 3 }); // Select all existing text
          await page.keyboard.press('Backspace'); // Clear field
          await inputField.type(captchaSolution, { delay: 100 });
          console.log(`📝 Entered CAPTCHA solution: ${captchaSolution}`);

          // Verify input was entered
          const enteredValue = await page.evaluate(() => {
            const input = document.querySelector('#kontaktdaten-captcha-input, input[type="text"]') as HTMLInputElement;
            return input?.value || '';
          });
          console.log(`✔️ Verified input value: ${enteredValue}`);
        }

        // Submit Form - Find and click submit button
        const buttonInfo = await page.evaluate(() => {
          // Try standard selectors first
          let btn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          if (btn) {
            btn.setAttribute('data-found-by', 'type-submit');
            return { found: true, text: btn.textContent?.trim() || '', selector: '[data-found-by="type-submit"]' };
          }

          // Find button with "Absenden" text
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => b.textContent?.includes('Absenden')) as HTMLElement;
          if (btn) {
            btn.setAttribute('data-found-by', 'text-absenden');
            return { found: true, text: btn.textContent?.trim() || '', selector: '[data-found-by="text-absenden"]' };
          }

          // Find button with submit in ID
          btn = document.querySelector('button[id*="submit"]') as HTMLElement;
          if (btn) {
            btn.setAttribute('data-found-by', 'id-submit');
            return { found: true, text: btn.textContent?.trim() || '', selector: '[data-found-by="id-submit"]' };
          }

          return { found: false, text: '', selector: '' };
        });

        if (buttonInfo.found) {
          console.log(`🔘 Clicking submit button: "${buttonInfo.text}"...`);

          // Click and wait for navigation or response
          await Promise.all([
            page.click(buttonInfo.selector),
            page.waitForResponse(response =>
              response.url().includes('arbeitsagentur') && response.status() === 200,
              { timeout: 5000 }
            ).catch(() => console.log('⚠️ No HTTP response detected'))
          ]);

          console.log('✅ Submit button clicked');

          // Warte auf Verschwinden des CAPTCHA-Formulars (Angular-Update)
          console.log('⏳ Waiting for CAPTCHA form to disappear...');
          try {
            await page.waitForFunction(
              () => {
                const bodyText = document.body.textContent || '';
                return !bodyText.includes('Sicherheitsabfrage');
              },
              { timeout: 10000 }
            );
            console.log('✅ CAPTCHA form disappeared');
          } catch (e) {
            console.log('⚠️ CAPTCHA form still visible after 10s');
          }

          // Warte extra Zeit für Angular DOM-Updates
          console.log('⏳ Waiting 5 seconds for Angular to update DOM with contact data...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Screenshot machen um zu sehen was auf der Seite ist
          try {
            const screenshotBuffer = await page.screenshot();
            console.log('📸 Screenshot taken, size:', screenshotBuffer.length, 'bytes');
          } catch (e) {
            console.log('⚠️ Screenshot failed:', e);
          }

          // Prüfe ob Kontaktdaten-Container jetzt sichtbar ist
          const contactVisible = await page.evaluate(() => {
            const container = document.querySelector('#jobdetails-kontaktdaten-container, .kontaktdaten');
            if (container) {
              const style = window.getComputedStyle(container);
              return style.display !== 'none' && style.visibility !== 'hidden';
            }
            return false;
          });

          console.log(`📊 Contact container visible: ${contactVisible}`);

          // Log einen Teil des Seiteninhalts für Debugging
          const debugInfo = await page.evaluate(() => {
            const bodyText = document.body.textContent || '';

            // Prüfe ob CAPTCHA noch sichtbar ist
            const captchaStillVisible = bodyText.includes('Sicherheitsabfrage') ||
                                       bodyText.includes('dargestellten Zeichen');

            // Suche nach allen Buttons und Links
            const buttons = Array.from(document.querySelectorAll('button, a[href*="pdf"], a[href*="kontakt"]'));
            const buttonTexts = buttons.map(b => b.textContent?.trim() || b.getAttribute('href')).filter(t => t);

            // Suche nach "Kontakt" im Text
            let preview = '';
            const kontaktIdx = bodyText.indexOf('Kontakt');
            if (kontaktIdx > -1) {
              preview = bodyText.substring(kontaktIdx, kontaktIdx + 800);
            } else {
              preview = bodyText.substring(Math.max(0, bodyText.length - 800));
            }

            return {
              captchaStillVisible,
              buttonTexts: buttonTexts.slice(0, 20),
              preview
            };
          });

          console.log('📄 Page debug info:');
          console.log('   CAPTCHA still visible?', debugInfo.captchaStillVisible);
          console.log('   Buttons/Links found:', debugInfo.buttonTexts);
          console.log('   Content preview:', debugInfo.preview.substring(0, 400));

          // Wenn CAPTCHA noch sichtbar, bedeutet das, dass wir einen weiteren Schritt brauchen
          if (debugInfo.captchaStillVisible) {
            console.log('⚠️ CAPTCHA still visible - looking for additional action needed...');

            // Suche nach "Kontaktdaten", "PDF", oder ähnlichen Buttons
            const actionButton = await page.evaluate(() => {
              const allButtons = Array.from(document.querySelectorAll('button, a'));
              const kontaktButton = allButtons.find(b => {
                const text = b.textContent?.toLowerCase() || '';
                return text.includes('kontakt') ||
                       text.includes('pdf') ||
                       text.includes('anzeigen') ||
                       text.includes('laden');
              });

              if (kontaktButton) {
                (kontaktButton as HTMLElement).setAttribute('data-action-button', 'true');
                return {
                  found: true,
                  text: kontaktButton.textContent?.trim() || '',
                  selector: '[data-action-button="true"]'
                };
              }
              return { found: false, text: '', selector: '' };
            });

            if (actionButton.found) {
              console.log(`🔘 Found action button after CAPTCHA: "${actionButton.text}" - clicking...`);

              try {
                // Try JavaScript click first (works better for links)
                await page.evaluate((sel) => {
                  const element = document.querySelector(sel) as HTMLElement;
                  if (element) {
                    element.click();
                    return true;
                  }
                  return false;
                }, actionButton.selector);

                console.log('✅ Action button clicked (JS)');
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Check if we're on a new page or PDF
                const currentUrl = page.url();
                console.log('📍 Current URL after click:', currentUrl);

              } catch (clickError: any) {
                console.log('⚠️ Click failed:', clickError.message);
              }
            } else {
              console.log('❌ No action button found - CAPTCHA might be incorrect');
            }
          }

          // Falls nicht sichtbar, versuche Seite neu zu laden
          if (!contactVisible) {
            console.log('🔄 Contact not visible, reloading page...');
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          console.log('✅ Ready to extract contact data');
        }
      }
    } else {
      console.log('ℹ️ No CAPTCHA found, extracting data directly...');
    }

    // Schritt 5: Extrahiere Job-Details UND Kontaktdaten von der Seite
    const jobData = await page.evaluate((refNr) => {
      const result: any = {
        kontakt: {},
        debug: {
          mailtoLinks: 0,
          telLinks: 0,
          pageTextLength: 0,
          hasKontaktadresse: false
        }
      };

      // Hole den gesamten Seitentext
      const pageText = document.body.textContent || '';
      result.debug.pageTextLength = pageText.length;

      // Debug: Log first 500 chars of contact section
      const kontaktIdx = pageText.indexOf('Kontaktadresse');
      if (kontaktIdx > -1) {
        result.debug.hasKontaktadresse = true;
        result.debug.kontaktPreview = pageText.substring(kontaktIdx, kontaktIdx + 500);
      }

      // Extrahiere Kontaktdaten - Email (mit mailto-Links)
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
      result.debug.mailtoLinks = mailtoLinks.length;
      if (mailtoLinks.length > 0) {
        const href = mailtoLinks[0].getAttribute('href');
        if (href) result.kontakt.email = href.replace('mailto:', '').trim();
      }

      // Extrahiere Kontaktdaten - Telefon (mit tel-Links)
      const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
      result.debug.telLinks = telLinks.length;
      if (telLinks.length > 0) {
        const href = telLinks[0].getAttribute('href');
        if (href) {
          const phone = href.replace('tel:', '').trim();
          // Filter out refNr
          if (!phone.includes(refNr)) {
            result.kontakt.telefon = phone;
          }
        }
      }

      // Fallback: Suche Email im Text (case insensitive)
      if (!result.kontakt.email) {
        // Try "E-Mail:" pattern first
        const emailPattern1 = /E-?Mail:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        const emailMatch1 = pageText.match(emailPattern1);
        if (emailMatch1 && emailMatch1.length > 0) {
          const email = emailMatch1[0].replace(/E-?Mail:\s*/i, '').trim();
          if (!email.includes('example.com') && !email.includes('test.de') && !email.includes('@w3.org')) {
            result.kontakt.email = email;
          }
        }
      }

      // Fallback: Suche nach ANY email address in page
      if (!result.kontakt.email) {
        const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
        const emailMatches = pageText.match(emailPattern);
        if (emailMatches && emailMatches.length > 0) {
          const validEmails = emailMatches.filter(email =>
            !email.toLowerCase().includes('example') &&
            !email.toLowerCase().includes('test.de') &&
            !email.toLowerCase().includes('@w3.org') &&
            !email.toLowerCase().includes('noreply') &&
            email.length > 5
          );
          if (validEmails.length > 0) {
            result.kontakt.email = validEmails[0];
          }
        }
      }

      // Fallback: Suche Telefonnummer mit "Mobil:" Pattern
      if (!result.kontakt.telefon) {
        const phonePatternLabeled = /(Mobil|Telefon|Tel|Fon|Phone):\s*([\+\d][\d\s\/-]{7,})/gi;
        const labeledMatch = pageText.match(phonePatternLabeled);
        if (labeledMatch && labeledMatch.length > 0) {
          let phone = labeledMatch[0].replace(/(Mobil|Telefon|Tel|Fon|Phone):\s*/gi, '').trim();
          // Clean up whitespace
          phone = phone.replace(/\s+/g, ' ');
          // Filter out refNr
          if (!phone.includes(refNr) && phone.length >= 8 && phone.length < 30) {
            result.kontakt.telefon = phone;
          }
        }
      }

      // Weitere Fallback: Suche nach +49 Format anywhere
      if (!result.kontakt.telefon) {
        const phonePattern = /\+49\s*\d+\s*\d+\s*\d+/g;
        const phoneMatches = pageText.match(phonePattern);
        if (phoneMatches && phoneMatches.length > 0) {
          let phone = phoneMatches[0].trim().replace(/\s+/g, ' ');
          // Filter out refNr and ensure reasonable length
          if (!phone.includes(refNr) && phone.length >= 10 && phone.length < 25) {
            result.kontakt.telefon = phone;
          }
        }
      }

      // Suche Kontaktadresse und Name
      const addressPattern = /Kontaktadresse\s+([\s\S]{10,400}?)(?=Bewerben Sie sich|Kontaktaufnahme|Sonstige Angaben|Bewerbungsform|$)/i;
      const addressMatch = pageText.match(addressPattern);
      if (addressMatch && addressMatch.length > 1) {
        const addressBlock = addressMatch[1];
        result.debug.addressBlock = addressBlock.substring(0, 200);

        // Extract name (usually first 1-2 lines after "Kontaktadresse")
        const lines = addressBlock.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 100);
        if (lines.length > 0) {
          // Take first line as company, second as name
          const nameParts = [];
          for (let i = 0; i < Math.min(2, lines.length); i++) {
            const line = lines[i];
            // Skip lines that are just email or phone
            if (!line.includes('@') && !line.includes('Mobil:') && !line.includes('Tel:') && !line.includes('+49')) {
              nameParts.push(line);
            }
          }
          if (nameParts.length > 0) {
            result.kontakt.name = nameParts.join(' - ');
          }
        }

        // Extract PLZ + Ort
        const plzPattern = /\b(\d{5})\s+([A-Za-zäöüß][A-Za-zäöüß\s-]+)/;
        const plzMatch = addressBlock.match(plzPattern);
        if (plzMatch) {
          result.kontakt.anschrift = {
            plz: plzMatch[1],
            ort: plzMatch[2].trim()
          };

          // Try to find street (pattern: "Word(s). Number" or "Word(s) Number")
          const streetPattern = /([A-Za-zäöüß][A-Za-zäöüß\s]+\.?\s+\d+[a-zA-Z]?)\s*\n/;
          const streetMatch = addressBlock.match(streetPattern);
          if (streetMatch) {
            result.kontakt.anschrift.strasse = streetMatch[1].trim();
          }
        }
      }

      return result;
    }, refNr);

    await browser.close();

    console.log('✅ Job data extracted:', JSON.stringify(jobData, null, 2));
    console.log('📊 Debug Info:', {
      mailtoLinks: jobData.debug?.mailtoLinks || 0,
      telLinks: jobData.debug?.telLinks || 0,
      hasKontaktadresse: jobData.debug?.hasKontaktadresse || false,
      pageTextLength: jobData.debug?.pageTextLength || 0
    });

    if (jobData.debug?.kontaktPreview) {
      console.log('📋 Kontaktadresse Preview:', jobData.debug.kontaktPreview);
    }

    if (jobData.debug?.addressBlock) {
      console.log('📋 Address Block:', jobData.debug.addressBlock);
    }

    // Return job with contact info
    return {
      refnr: refNr,
      titel: jobData.titel || '',
      arbeitgeber: jobData.arbeitgeber,
      stellenbeschreibung: jobData.stellenbeschreibung,
      kontakt: jobData.kontakt
    };

  } catch (error: any) {
    if (browser) await browser.close().catch(() => {});
    console.error('❌ CAPTCHA solving with Puppeteer failed:', error.message);
    throw error;
  }
}


// Helper: Remove undefined values from object
function removeUndefined(obj: any): any {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helper: Job in Firestore speichern
async function saveJobToFirestore(jobData: any): Promise<void> {
  const now = new Date().toISOString();

  const job = removeUndefined({
    id: jobData.refnr,
    refnr: jobData.refnr,
    titel: jobData.titel || 'Unbekannter Titel',
    arbeitgeber: jobData.arbeitgeber,
    arbeitsort: jobData.arbeitsort,
    stellenbeschreibung: jobData.stellenbeschreibung,
    fertigkeiten: jobData.fertigkeiten || [],
    verguetung: jobData.verguetung,
    befristung: jobData.befristung,
    aktuelleVeroeffentlichungsdatum: jobData.aktuelleVeroeffentlichungsdatum,
    eintrittsdatum: jobData.eintrittsdatum,
    kontakt: jobData.kontakt || null,
    logoUrl: jobData.arbeitgeberlogo?.url,
    updatedAt: now,
    lastSyncedAt: now
  });

  // Check if job already exists
  const existingJob = await db.collection('jobs').doc(job.refnr).get();

  if (existingJob.exists) {
    // Update existing job
    await db.collection('jobs').doc(job.refnr).update(removeUndefined({
      ...job,
      createdAt: existingJob.data()?.createdAt || now
    }));
  } else {
    // Create new job
    await db.collection('jobs').doc(job.refnr).set(removeUndefined({
      ...job,
      createdAt: now
    }));
  }
}

// Helper: Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
