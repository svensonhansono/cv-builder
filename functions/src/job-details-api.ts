import * as functions from 'firebase-functions';
import axios from 'axios';

// Job-Details von Arbeitsagentur API holen
export const getJobDetailsAPI = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');

  const refNr = req.query.refNr as string;

  if (!refNr) {
    res.status(400).json({ error: 'refNr required' });
    return;
  }

  try {
    const apiUrl = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs/${refNr}`;

    const response = await axios({
      method: 'GET',
      url: apiUrl,
      headers: {
        'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1570; iOS 15.1.1) Alamofire/5.4.4',
        'Host': 'rest.arbeitsagentur.de',
        'Accept': '*/*',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    });

    console.log('✅ Job-Details erfolgreich geholt für:', refNr);
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Fehler beim Laden der Job-Details:', error.message);
    res.status(500).json({ error: 'Failed to load job details' });
  }
});

// CAPTCHA lösen und Kontaktdaten holen
export const solveCaptchaAPI = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { refNr, solution } = req.body;

  if (!refNr || !solution) {
    res.status(400).json({ error: 'refNr and solution required' });
    return;
  }

  try {
    const apiUrl = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v1/jobs/${refNr}/kontakt`;

    const response = await axios({
      method: 'POST',
      url: apiUrl,
      headers: {
        'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1570; iOS 15.1.1) Alamofire/5.4.4',
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      data: { captcha: solution },
    });

    console.log('✅ CAPTCHA erfolgreich gelöst für:', refNr);
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ CAPTCHA-Fehler:', error.message);
    res.status(400).json({ error: 'CAPTCHA falsch oder abgelaufen' });
  }
});
