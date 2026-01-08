/**
 * Automatischer UI Review Loop
 *
 * Dieser Script koordiniert die Analyse und Fixes zwischen UI-Analyst und Web-Developer
 *
 * Verwendung in Claude Code:
 * 1. Starte localhost: npm run dev (Port 3009)
 * 2. Sage: "Starte den UI Review Loop" oder "Analysiere die Seite als UI-Analyst"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCALHOST_URL = 'http://localhost:3009';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const FEEDBACK_FILE = path.join(__dirname, '..', 'FEEDBACK.md');

// Erstelle Screenshot-Ordner falls nicht vorhanden
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Screenshot-Funktion
async function takeScreenshot(page = '', filename = 'screenshot.png') {
  const url = page ? `${LOCALHOST_URL}${page}` : LOCALHOST_URL;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  try {
    console.log(`Taking screenshot of ${url}...`);
    execSync(`npx playwright screenshot --wait-for-timeout=3000 "${url}" "${filepath}"`, {
      stdio: 'inherit'
    });
    console.log(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Screenshot failed:', error.message);
    return null;
  }
}

// Alle wichtigen Seiten screenshotten
async function screenshotAllPages() {
  const pages = [
    { path: '/', name: 'landing.png' },
    { path: '/login', name: 'login.png' },
    { path: '/register', name: 'register.png' },
    { path: '/dashboard', name: 'dashboard.png' },
    { path: '/upgrade', name: 'upgrade.png' },
  ];

  console.log('\\n=== Taking Screenshots of All Pages ===\\n');

  for (const page of pages) {
    await takeScreenshot(page.path, page.name);
  }

  console.log('\\n=== Screenshots Complete ===');
  console.log(`Screenshots saved in: ${SCREENSHOT_DIR}`);
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    await screenshotAllPages();
  } else if (args.length > 0) {
    await takeScreenshot(args[0], args[1] || 'screenshot.png');
  } else {
    console.log(`
UI Review Loop Helper

Verwendung:
  node review-loop.js                    # Zeigt diese Hilfe
  node review-loop.js /dashboard         # Screenshot einer Seite
  node review-loop.js --all              # Screenshots aller Seiten

Für den automatischen Loop in Claude Code sage:
  "Starte den UI Review Loop auf localhost:3009"

Claude wird dann:
  1. Screenshots machen
  2. Als UI-Analyst analysieren
  3. FEEDBACK.md aktualisieren
  4. Als Web-Developer Fixes machen
  5. Wiederholen bis fertig
`);
  }
}

main().catch(console.error);
