import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Get config from Firebase Functions
const getConfig = () => functions.config().stripe;

// Initialize Stripe
const stripe = new Stripe(getConfig().secret_key, {
  apiVersion: '2024-12-18.acacia' as any,
});

// ======================
// Trial Checkout Function
// ======================
export const trialCheckout = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
      return;
    }

    // Check if email already exists
    try {
      await admin.auth().getUserByEmail(email);
      res.status(400).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
      return;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create temporary session
    const sessionId = `trial_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store registration data temporarily
    await db.collection('temp_registrations').doc(sessionId).set({
      email,
      password,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      line_items: [{
        price: getConfig().price_id,
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          registrationEmail: email,
          tempSessionId: sessionId,
          isNewRegistration: 'true',
        },
      },
      success_url: `${req.headers.origin}/dashboard?trial=started`,
      cancel_url: `${req.headers.origin}/register?canceled=true`,
      metadata: {
        registrationEmail: email,
        tempSessionId: sessionId,
        isNewRegistration: 'true',
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Trial checkout error:', error);
    res.status(500).json({ error: error.message || 'Fehler beim Erstellen der Checkout-Session' });
  }
});

// ======================
// Stripe Webhook Function
// ======================
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const signature = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      getConfig().webhook_secret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const isNewRegistration = session.metadata?.isNewRegistration === 'true';

        if (isNewRegistration && session.subscription) {
          const email = session.metadata?.registrationEmail;
          const tempSessionId = session.metadata?.tempSessionId;

          if (!email || !tempSessionId) {
            console.error('Missing registration data in metadata');
            break;
          }

          const tempDoc = await db.collection('temp_registrations').doc(tempSessionId).get();
          if (!tempDoc.exists) {
            console.error('Temporary registration data not found');
            break;
          }

          const { password } = tempDoc.data()!;

          const userRecord = await admin.auth().createUser({
            email,
            password,
            emailVerified: false,
          });

          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          await db.collection('users').doc(userRecord.uid).set({
            subscription: {
              tier: 'premium',
              subscriptionId: session.subscription as string,
              customerId: session.customer as string,
              status: 'trialing',
              trialStartDate: new Date(subscription.trial_start! * 1000).toISOString(),
              trialEndDate: new Date(subscription.trial_end! * 1000).toISOString(),
              autoRenew: true,
              paymentMethodAttached: true,
            },
            createdAt: new Date().toISOString(),
            registrationCompletedAt: new Date().toISOString(),
          });

          await db.collection('temp_registrations').doc(tempSessionId).delete();
          console.log(`✅ Trial subscription activated for new user: ${userRecord.uid}`);
        } else {
          const userId = session.metadata?.userId || session.client_reference_id;

          if (userId && session.subscription) {
            await db.collection('users').doc(userId).set({
              subscription: {
                tier: 'premium',
                subscriptionId: session.subscription as string,
                customerId: session.customer as string,
                status: 'active',
                startDate: new Date().toISOString(),
                autoRenew: true,
                paymentMethodAttached: true,
              },
            }, { merge: true });

            console.log(`✅ Premium subscription activated for user: ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const usersSnapshot = await db.collection('users')
          .where('subscription.subscriptionId', '==', subscription.id)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const tier = (subscription.status === 'active' || subscription.status === 'trialing')
            ? 'premium' : 'free';

          await userDoc.ref.set({
            subscription: {
              tier,
              subscriptionId: subscription.id,
              customerId: subscription.customer as string,
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              autoRenew: !subscription.cancel_at_period_end,
            },
          }, { merge: true });

          console.log(`✅ Subscription updated for user: ${userDoc.id}, status: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const usersSnapshot = await db.collection('users')
          .where('subscription.subscriptionId', '==', subscription.id)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];

          await userDoc.ref.set({
            subscription: {
              tier: 'free',
              status: 'canceled',
              subscriptionId: null,
              customerId: subscription.customer as string,
              endDate: new Date().toISOString(),
            },
          }, { merge: true });

          console.log(`✅ Subscription cancelled for user: ${userDoc.id}`);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const usersSnapshot = await db.collection('users')
          .where('subscription.subscriptionId', '==', subscription.id)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          console.log(`⏰ Trial ending soon for user: ${userDoc.id} (3 days remaining)`);

          await userDoc.ref.set({
            subscription: { trialReminderSent: true },
          }, { merge: true });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const usersSnapshot = await db.collection('users')
          .where('subscription.subscriptionId', '==', subscriptionId)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];

          await userDoc.ref.set({
            subscription: { status: 'past_due' },
          }, { merge: true });

          console.log(`⚠️ Payment failed for user: ${userDoc.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message || 'Webhook handler failed' });
  }
});

// ======================
// Cancel Subscription Function
// ======================
export const cancelSubscription = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID ist erforderlich' });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscription?.subscriptionId;

    if (!subscriptionId) {
      res.status(400).json({ error: 'Kein aktives Abonnement gefunden' });
      return;
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    await db.collection('users').doc(userId).set({
      subscription: {
        cancelAtPeriodEnd: true,
        autoRenew: false,
      },
    }, { merge: true });

    console.log(`✅ Subscription cancelled for user: ${userId}`);

    res.json({
      success: true,
      message: 'Abonnement erfolgreich gekündigt',
      cancelAt: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Fehler beim Kündigen des Abonnements' });
  }
});

// ======================
// Customer Portal Function
// ======================
export const customerPortal = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID ist erforderlich' });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    const userData = userDoc.data();
    const customerId = userData?.subscription?.customerId;

    if (!customerId) {
      res.status(400).json({ error: 'Kein Stripe-Customer gefunden' });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/subscription`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Customer portal error:', error);
    res.status(500).json({ error: error.message || 'Fehler beim Erstellen der Portal-Session' });
  }
});

// ======================
// Create Setup Intent (for embedded payment form)
// ======================
export const createSetupIntent = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
      return;
    }

    // Check if email already exists
    try {
      await admin.auth().getUserByEmail(email);
      res.status(400).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' });
      return;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create or get customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
      });
    }

    // Create temporary session
    const sessionId = `trial_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store registration data temporarily
    await db.collection('temp_registrations').doc(sessionId).set({
      email,
      password,
      customerId: customer.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    // Create Setup Intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card', 'sepa_debit'],
      metadata: {
        sessionId: sessionId,
        email: email,
      },
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      sessionId: sessionId,
    });
  } catch (error: any) {
    console.error('Setup intent error:', error);
    res.status(500).json({ error: error.message || 'Fehler beim Erstellen des Setup Intent' });
  }
});

// ======================
// Complete Registration (after payment method attached)
// ======================
export const completeRegistration = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { sessionId, setupIntentId } = req.body;

    if (!sessionId || !setupIntentId) {
      res.status(400).json({ error: 'Session ID und Setup Intent ID erforderlich' });
      return;
    }

    // Get temp registration data
    const tempDoc = await db.collection('temp_registrations').doc(sessionId).get();
    if (!tempDoc.exists) {
      res.status(404).json({ error: 'Registrierungsdaten nicht gefunden' });
      return;
    }

    const { email, password, customerId } = tempDoc.data()!;

    // Get setup intent to verify payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== 'succeeded') {
      res.status(400).json({ error: 'Zahlungsmethode nicht verifiziert' });
      return;
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: getConfig().price_id }],
      payment_settings: {
        payment_method_types: ['card', 'sepa_debit'],
      },
      default_payment_method: setupIntent.payment_method as string,
      trial_period_days: 7,
      metadata: {
        registrationEmail: email,
        tempSessionId: sessionId,
        isNewRegistration: 'true',
      },
    });

    // Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });

    // Create Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      subscription: {
        tier: 'premium',
        subscriptionId: subscription.id,
        customerId: customerId,
        status: 'trialing',
        trialStartDate: new Date(subscription.trial_start! * 1000).toISOString(),
        trialEndDate: new Date(subscription.trial_end! * 1000).toISOString(),
        autoRenew: true,
        paymentMethodAttached: true,
      },
      createdAt: new Date().toISOString(),
      registrationCompletedAt: new Date().toISOString(),
    });

    // Delete temp registration
    await db.collection('temp_registrations').doc(sessionId).delete();

    // Create custom token for login
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      success: true,
      customToken: customToken,
      userId: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Complete registration error:', error);
    res.status(500).json({ error: error.message || 'Fehler beim Abschließen der Registrierung' });
  }
});

// ======================
// Fetch Jobs from Arbeitsagentur (Scheduled - runs every hour)
// ======================
// Helper function for job fetching logic
const fetchAndSaveJobs = async () => {
    try {
      console.log('🔄 Starting job fetch from Arbeitsagentur API...');

      // Fetch jobs from Arbeitsagentur API
      const response = await axios.get(
        'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
        {
          headers: {
            'X-API-Key': 'jobboerse-jobsuche',
            'User-Agent': 'LebenslaufBuilder/1.0'
          },
          params: {
            was: 'Landwirtschaft',  // Berufsfeld
            wo: 'Deutschland',       // Ort
            angebotsart: 1,          // 1 = Arbeit, 2 = Ausbildung
            size: 100,               // Max 100 results
            page: 1
          }
        }
      );

      const jobs = response.data.stellenangebote || [];
      console.log(`📊 Found ${jobs.length} jobs`);

      // Save jobs to Firestore
      const batch = db.batch();
      let savedCount = 0;

      for (const job of jobs) {
        // Use refNr as ID, or generate one if not available
        const jobId = job.refNr || job.hashId || `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const jobRef = db.collection('jobs').doc(jobId);

        batch.set(jobRef, {
          hashId: job.hashId || jobId,
          titel: job.titel || 'Unbekannt',
          arbeitgeber: job.arbeitgeber || 'Unbekannt',
          arbeitsort: job.arbeitsort || {},
          arbeitsorte: job.arbeitsorte || [],
          beschreibung: job.beschreibung || '',
          url: job.externeUrl || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refNr || jobId}`,
          berufsfeld: 'Landwirtschaft',
          veroeffentlicht: job.aktuelleVeroeffentlichungsdatum || new Date().toISOString(),
          modifikationsTimestamp: job.modifikationsTimestamp || new Date().toISOString(),
          arbeitszeit: job.arbeitszeit || '',
          befristung: job.befristung || '',
          aktualisiert: new Date().toISOString(),
          refNr: job.refNr || ''
        }, { merge: true });

        savedCount++;

        // Firestore batch limit is 500
        if (savedCount % 500 === 0) {
          await batch.commit();
          console.log(`✅ Committed batch of ${savedCount} jobs`);
        }
      }

      // Commit remaining jobs
      if (savedCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`✅ Successfully saved ${savedCount} jobs to Firestore`);

      // Optional: Clean up old jobs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldJobsSnapshot = await db.collection('jobs')
        .where('aktualisiert', '<', thirtyDaysAgo.toISOString())
        .limit(100)
        .get();

      if (!oldJobsSnapshot.empty) {
        const deleteBatch = db.batch();
        oldJobsSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
        console.log(`🗑️ Deleted ${oldJobsSnapshot.size} old jobs`);
      }

      return { success: true, count: savedCount };
    } catch (error: any) {
      console.error('❌ Error fetching jobs:', error.message);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
};

// Scheduled job fetch (runs every hour)
export const fetchJobsScheduled = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    await fetchAndSaveJobs();
    return null;
  });

// HTTP endpoint to manually trigger job fetch
export const fetchJobsNow = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const result = await fetchAndSaveJobs();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ======================
// Manual Job Fetch (HTTP Endpoint for testing)
// ======================
export const fetchJobsManual = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('🔄 Manual job fetch triggered...');

    const berufsfeld = req.query.berufsfeld as string || 'Landwirtschaft';
    const ort = req.query.ort as string || 'Deutschland';

    const response = await axios.get(
      'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs',
      {
        headers: {
          'X-API-Key': 'jobboerse-jobsuche',
          'User-Agent': 'LebenslaufBuilder/1.0'
        },
        params: {
          was: berufsfeld,
          wo: ort,
          angebotsart: 1,
          size: 100,
          page: 1
        }
      }
    );

    const jobs = response.data.stellenangebote || [];

    res.json({
      success: true,
      count: jobs.length,
      berufsfeld,
      ort,
      jobs: jobs.map((job: any) => ({
        hashId: job.hashId,
        titel: job.titel,
        arbeitgeber: job.arbeitgeber,
        arbeitsort: job.arbeitsort?.ort || 'Unbekannt',
        url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.hashId}`
      }))
    });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// ======================
// Search Jobs (Live API for frontend)
// ======================
export const searchJobs = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const was = req.query.was as string || '';
    const wo = req.query.wo as string || '';
    const umkreis = req.query.umkreis as string || '';
    const page = parseInt(req.query.page as string || '1');
    const size = parseInt(req.query.size as string || '50');

    console.log('🔍 Searching jobs via APP API (no CAPTCHA):', { was, wo, umkreis, page, size });

    const response = await axios.get(
      'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs',
      {
        headers: {
          'X-API-Key': 'jobboerse-jobsuche',
          'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4'
        },
        params: {
          ...(was && { was }),
          ...(wo && { wo }),
          ...(umkreis && { umkreis }),
          angebotsart: 1,
          page: page.toString(),
          size: size.toString()
        }
      }
    );

    console.log('✅ Jobs loaded:', response.data.stellenangebote?.length || 0);

    res.json({
      success: true,
      maxErgebnisse: response.data.maxErgebnisse || 0,
      facetten: response.data.facetten || [],
      stellenangebote: response.data.stellenangebote || []
    });
  } catch (error: any) {
    console.error('Job search error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message,
      details: error.response?.data
    });
  }
});

// ======================
// JOB DETAILS - Try APP API first, fallback to web scraping
// ======================
export const getJobDetails = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const refNr = req.query.refNr as string;

    if (!refNr) {
      res.status(400).json({
        success: false,
        error: 'refNr parameter is required'
      });
      return;
    }

    console.log('🔍 Trying APP API for job details (may include contact data):', refNr);

    // Try APP API first - it might include contact data without CAPTCHA!
    try {
      const appResponse = await axios.get(
        `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs/${refNr}`,
        {
          headers: {
            'X-API-Key': 'jobboerse-jobsuche',
            'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4'
          },
          timeout: 10000
        }
      );

      console.log('✅ APP API response received');
      console.log('📋 Data keys:', Object.keys(appResponse.data || {}));

      // Check if response contains contact data
      const jobData = appResponse.data;

      const jobDetails: any = {
        stellenbeschreibung: jobData.stellenangebotsBeschreibung || jobData.beschreibung,
        beruf: jobData.hauptberuf || jobData.beruf,
        verguetung: jobData.festgehalt ? `${jobData.festgehalt} €/Std.` : undefined,
      };

      // Check for contact data in APP API response
      if (jobData.arbeitgeberAdresse || jobData.kontakt || jobData.ansprechpartner) {
        console.log('🎉 APP API includes contact data - NO CAPTCHA NEEDED!');
        jobDetails.kontaktdaten = {
          name: jobData.ansprechpartner?.name || jobData.arbeitgeberdarstellung?.name,
          telefon: jobData.kontakt?.telefon || jobData.ansprechpartner?.telefon,
          email: jobData.kontakt?.email || jobData.ansprechpartner?.email,
          anschrift: jobData.arbeitgeberAdresse
        };
      }

      res.json({
        success: true,
        jobDetails,
        source: 'app_api'
      });
      return;

    } catch (appApiError: any) {
      console.log('⚠️ APP API failed, falling back to web scraping:', appApiError.message);
    }

    // Fallback: Web scraping
    console.log('🌐 Falling back to web scraping');
    const url = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract JSON data from ng-state script tag
    const ngStateScript = $('script#ng-state').html();
    if (!ngStateScript) {
      throw new Error('Job details not found on page');
    }

    const ngState = JSON.parse(ngStateScript);
    const jobData = ngState.jobdetail;

    // Transform to our format
    const jobDetails: any = {
      stellenbeschreibung: jobData.stellenangebotsBeschreibung,
      beruf: jobData.hauptberuf,
      verguetung: jobData.festgehalt ? `${jobData.festgehalt} €/Std.` : undefined,
    };

    res.json({
      success: true,
      jobDetails,
      source: 'web_scraping'
    });
  } catch (error: any) {
    console.error('Job details error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get job details',
      message: error.message
    });
  }
});

// ======================
// CONTACT CAPTCHA HANDLER
// ======================
// Sessions are stored in Firestore for persistence across function instances
// Collection: captcha_sessions/{sessionId}

export const getContactCaptcha = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '1GB' as any
  })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    let browser;
    try {
      const refNr = req.query.refNr as string;

      if (!refNr) {
        res.status(400).json({
          success: false,
          error: 'refNr parameter is required'
        });
        return;
      }

      console.log(`Starting browser for refNr: ${refNr}`);

      // Launch Puppeteer browser with serverless Chromium
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Navigate to the job detail page
      const applyUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
      console.log(`Navigating to: ${applyUrl}`);

      await page.goto(applyUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log(`Page loaded, title: ${await page.title()}`);
      console.log(`Final URL: ${page.url()}`);

      // Wait a bit for JavaScript to execute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Debug: Check page content
      const pageDebug = await page.evaluate(() => {
        const result: any = {
          hasSicherheitsabfrageText: document.body.textContent?.includes('Sicherheitsabfrage') || false,
          allImages: Array.from(document.querySelectorAll('img')).map((img: any) => ({
            src: img.src,
            alt: img.alt
          })),
          forms: document.querySelectorAll('form').length
        };
        return result;
      });

      console.log('Page debug info:', JSON.stringify(pageDebug));

      // Check if CAPTCHA is present
      const captchaExists = await page.evaluate(() => {
        const img = document.querySelector('img[alt*="Sicherheitsabfrage"], img[src*="captcha"], img[alt*="captcha"]');
        return !!img;
      });

      if (!captchaExists) {
        console.log('No CAPTCHA found, checking for direct contact data');

        // Try to extract contact data from the page
        const kontaktdaten = await page.evaluate(() => {
          const result: any = {};

          // Look for mailto links
          const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
          if (mailtoLinks.length > 0) {
            const href = mailtoLinks[0].getAttribute('href');
            if (href) result.email = href.replace('mailto:', '');
          }

          // Look for tel links
          const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
          if (telLinks.length > 0) {
            const href = telLinks[0].getAttribute('href');
            if (href) result.telefon = href.replace('tel:', '');
          }

          // Look for email in text
          const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
          const bodyText = document.body.textContent || '';
          const emailMatch = bodyText.match(emailPattern);
          if (emailMatch && !result.email) {
            result.email = emailMatch[0];
          }

          return result;
        });

        await browser.close();

        if (kontaktdaten.email || kontaktdaten.telefon) {
          res.json({
            success: true,
            captchaRequired: false,
            kontaktdaten
          });
          return;
        }

        res.json({
          success: false,
          error: 'Keine Kontaktdaten oder CAPTCHA gefunden. Möglicherweise ist für dieses Stellenangebot eine externe Bewerbung erforderlich.'
        });
        return;
      }

      console.log('CAPTCHA found, extracting...');

      // Extract CAPTCHA image as base64 and CAPTCHA ID
      const captchaData = await page.evaluate(() => {
        const img = document.querySelector('img[alt*="Sicherheitsabfrage"], img[src*="captcha"], img[alt*="captcha"]') as HTMLImageElement;
        if (!img) return null;

        // Extract CAPTCHA ID from image URL
        const captchaUrl = img.src;
        const captchaIdMatch = captchaUrl.match(/\/captcha\/([A-F0-9-]+)/i);
        const captchaId = captchaIdMatch ? captchaIdMatch[1] : '';

        // Create canvas to convert image to data URL
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0);
        return {
          imageData: canvas.toDataURL('image/png'),
          captchaId: captchaId,
          captchaUrl: captchaUrl
        };
      });

      if (!captchaData || !captchaData.imageData) {
        await browser.close();
        res.json({
          success: false,
          error: 'CAPTCHA gefunden, aber Bild konnte nicht extrahiert werden'
        });
        return;
      }

      console.log('📸 CAPTCHA extracted:');
      console.log('  CAPTCHA ID:', captchaData.captchaId);
      console.log('  CAPTCHA URL:', captchaData.captchaUrl);

      // Extract form data (enhanced for Angular forms)
      const formData = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;

        const result: any = {
          action: form.getAttribute('action') || '',
          method: form.getAttribute('method') || 'POST',
          formId: form.getAttribute('id') || '',
          ngSubmit: form.getAttribute('(ngSubmit)') || '',
          hiddenFields: {},
          captchaInputName: '',
          formControlName: '',
          allInputs: [],
          formHTML: form.outerHTML.substring(0, 2000) // First 2000 chars for debugging
        };

        // Get all hidden inputs
        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach((input: any) => {
          if (input.name) {
            result.hiddenFields[input.name] = input.value || '';
          }
        });

        // Get CAPTCHA input field (check both name and formControlName)
        const textInput = form.querySelector('input[type="text"]');
        if (textInput) {
          result.captchaInputName = (textInput as HTMLInputElement).name || 'captcha';
          result.formControlName = textInput.getAttribute('formControlName') || '';
        }

        // Get all inputs for debugging
        const allInputs = form.querySelectorAll('input, textarea, select');
        allInputs.forEach((input: any) => {
          result.allInputs.push({
            type: input.type,
            name: input.name,
            id: input.id,
            formControlName: input.getAttribute('formControlName'),
            placeholder: input.placeholder,
            value: input.value
          });
        });

        return result;
      });

      // Get cookies
      const cookies = await page.cookies();

      // INTERCEPT NETWORK REQUESTS TO FIND API ENDPOINT
      console.log('🔍 Intercepting network requests to find CAPTCHA submit API...');

      const apiRequests: any[] = [];

      // Enable request interception
      await page.setRequestInterception(true);

      page.on('request', (request: any) => {
        const url = request.url();
        const method = request.method();

        // Capture all POST/PUT requests to arbeitsagentur APIs
        if ((method === 'POST' || method === 'PUT') && url.includes('arbeitsagentur.de')) {
          apiRequests.push({
            url,
            method,
            headers: request.headers(),
            postData: request.postData()
          });
          console.log('📡 Captured API Request:', method, url);
        }

        request.continue();
      });

      // Try to submit the form with a dummy value to trigger API call
      try {
        await page.type('#kontaktdaten-captcha-input', 'DUMMY', { delay: 50 });

        // Click submit button
        const submitButton = await page.$('button[type="submit"], button[id*="submit"]');
        if (submitButton) {
          console.log('🖱️ Clicking submit button...');
          await Promise.all([
            submitButton.click(),
            page.waitForResponse(response => response.url().includes('captcha'), { timeout: 5000 }).catch(() => null)
          ]);

          // Wait a bit for requests to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e: any) {
        console.log('⚠️ Could not trigger submit (this is OK):', e.message);
      }

      console.log('📡 Total API requests captured:', apiRequests.length);
      if (apiRequests.length > 0) {
        console.log('API REQUESTS:', JSON.stringify(apiRequests, null, 2));
      }

      await browser.close();

      if (!formData) {
        res.json({
          success: false,
          error: 'CAPTCHA-Formular konnte nicht gefunden werden'
        });
        return;
      }

      // Log extracted form details for debugging
      console.log('📋 EXTRACTED FORM DETAILS:');
      console.log('  Form ID:', formData.formId);
      console.log('  Form Action:', formData.action);
      console.log('  Form Method:', formData.method);
      console.log('  ngSubmit:', formData.ngSubmit);
      console.log('  CAPTCHA Input Name:', formData.captchaInputName);
      console.log('  CAPTCHA formControlName:', formData.formControlName);
      console.log('  Hidden Fields:', JSON.stringify(formData.hiddenFields));
      console.log('  All Inputs:', JSON.stringify(formData.allInputs, null, 2));
      console.log('  Form HTML (first 2000 chars):', formData.formHTML);

      // Generate session ID and store session data in Firestore
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sessionData = {
        refNr,
        applyUrl,
        captchaId: captchaData.captchaId,
        captchaUrl: captchaData.captchaUrl,
        formAction: formData.action,
        formMethod: formData.method,
        formId: formData.formId,
        ngSubmit: formData.ngSubmit,
        hiddenFields: formData.hiddenFields,
        captchaInputName: formData.captchaInputName,
        formControlName: formData.formControlName,
        allInputs: formData.allInputs,
        apiRequests: apiRequests, // Captured API requests
        cookies: cookies.map(c => `${c.name}=${c.value}`),
        timestamp: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes TTL
      };

      // Store session in Firestore
      await db.collection('captcha_sessions').doc(sessionId).set(sessionData);

      console.log('CAPTCHA successfully extracted');

      res.json({
        success: true,
        captchaRequired: true,
        captchaImage: captchaData.imageData,
        sessionId
      });

    } catch (error: any) {
      console.error('CAPTCHA loading error:', error.message);
      if (browser) {
        await browser.close().catch(console.error);
      }
      res.status(500).json({
        success: false,
        error: 'Failed to load CAPTCHA',
        message: error.message
      });
    }
  });

// ======================
// SUBMIT CAPTCHA SOLUTION
// ======================
export const submitContactCaptcha = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '2GB'
  })
  .https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { refNr, sessionId, captchaSolution } = req.body;

    if (!refNr || !sessionId || !captchaSolution) {
      console.error('400: Missing required parameters', { refNr: !!refNr, sessionId: !!sessionId, captchaSolution: !!captchaSolution });
      res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
      return;
    }

    console.log('🔍 [v2] CAPTCHA submission attempt', { refNr, sessionId: sessionId.substring(0, 20) + '...' });

    // Retrieve session data from Firestore
    const sessionDoc = await db.collection('captcha_sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      console.error('400: Session not found in Firestore', { sessionId });
      res.status(400).json({
        success: false,
        error: 'Invalid or expired session'
      });
      return;
    }

    const sessionData = sessionDoc.data();

    // Check if session data exists
    if (!sessionData) {
      console.error('400: Session data is null', { sessionId });
      res.status(400).json({
        success: false,
        error: 'Invalid session data'
      });
      return;
    }

    console.log('Session found successfully');

    // Check if session has expired
    if (sessionData.expiresAt < Date.now()) {
      // Delete expired session
      console.error('400: Session expired', { sessionId, expiresAt: new Date(sessionData.expiresAt), now: new Date() });
      await db.collection('captcha_sessions').doc(sessionId).delete();
      res.status(400).json({
        success: false,
        error: 'Session expired. Please reload CAPTCHA.'
      });
      return;
    }

    console.log('✅ SESSION VALID - SUBMITTING CAPTCHA VIA API');
    console.log('📋 CAPTCHA ID:', sessionData.captchaId);
    console.log('📋 Solution:', captchaSolution);

    // Submit CAPTCHA directly to the API with cookies from session
    let browser;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Restore cookies from session
      const cookies = sessionData.cookies.map((cookieStr: string) => {
        const [name, value] = cookieStr.split('=');
        return {
          name,
          value,
          domain: '.arbeitsagentur.de',
          path: '/'
        };
      });
      await page.setCookie(...cookies);

      console.log('🌐 Navigating to:', sessionData.applyUrl);
      await page.goto(sessionData.applyUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Type solution and submit via JavaScript (bypass Angular validation issues)
      console.log('⌨️ Injecting CAPTCHA solution and submitting...');
      await page.evaluate((solution) => {
        const input = document.querySelector('#kontaktdaten-captcha-input') as HTMLInputElement;
        if (input) {
          input.value = solution;
          // Trigger input event for Angular
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, captchaSolution);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Submit form
      const submitButton = await page.$('button[type="submit"], button[id*="submit"], input[type="submit"]');
      if (submitButton) {
        console.log('🔘 Clicking submit button...');
        await submitButton.click();

        // Wait for Angular to process CAPTCHA
        console.log('⏳ Waiting for Angular to update DOM...');

        // Wait for CAPTCHA text to disappear AND contact data to appear
        try {
          await page.waitForFunction(
            () => {
              const containerText = document.querySelector('#jobdetails-kontaktdaten-container')?.textContent || '';
              // Wait until "Sicherheitsabfrage" text is gone (means CAPTCHA processed)
              const captchaGone = !containerText.includes('Sicherheitsabfrage');
              // AND contact data has appeared (mailto or tel links)
              const hasContactData = document.querySelector('a[href^="mailto:"], a[href^="tel:"]') !== null;

              return captchaGone && hasContactData;
            },
            { timeout: 20000 } // 20 seconds timeout
          );
          console.log('✅ Contact data appeared!');
        } catch (e) {
          console.log('⚠️ Timeout waiting for contact data, checking anyway...');
        }

        // Check if contact container is visible
        const contactVisible = await page.evaluate(() => {
          const container = document.querySelector('#jobdetails-kontaktdaten-container, .kontaktdaten');
          if (container) {
            const style = window.getComputedStyle(container);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
          return false;
        });

        console.log(`📊 Contact container visible: ${contactVisible}`);
      }

      // Extract contact data from page
      const jobData = await page.evaluate((refNr) => {
        const result: any = { kontakt: {}, debug: {} };
        const pageText = document.body.textContent || '';

        // DEBUG: Log first 5000 chars of page text
        result.debug.pageTextPreview = pageText.substring(0, 5000);
        result.debug.hasKontaktContainer = !!document.querySelector('#jobdetails-kontaktdaten-container');
        result.debug.mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a: any) => a.href);
        result.debug.telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]')).map((a: any) => a.href);

        // Extract email - TRY ALL METHODS
        // Method 1: mailto links
        const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
        if (mailtoLinks.length > 0) {
          const href = mailtoLinks[0].getAttribute('href');
          if (href) result.kontakt.email = href.replace('mailto:', '').trim();
        }

        // Method 2: Email pattern with label
        if (!result.kontakt.email) {
          const emailPattern = /E-?Mail:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
          const emailMatch = pageText.match(emailPattern);
          if (emailMatch && emailMatch.length > 0) {
            const email = emailMatch[0].replace(/E-?Mail:\s*/i, '').trim();
            if (!email.includes('example.com') && !email.includes('test.de')) {
              result.kontakt.email = email;
            }
          }
        }

        // Method 3: Email pattern without label
        if (!result.kontakt.email) {
          const emailPatternGeneric = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
          const emails = pageText.match(emailPatternGeneric) || [];
          for (const email of emails) {
            if (!email.includes('example.com') && !email.includes('test.de') && !email.includes('@arbeitsagentur')) {
              result.kontakt.email = email;
              break;
            }
          }
        }

        // Extract phone - TRY ALL METHODS
        // Method 1: tel links
        const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
        if (telLinks.length > 0) {
          const href = telLinks[0].getAttribute('href');
          if (href) {
            const phone = href.replace('tel:', '').trim();
            if (!phone.includes(refNr)) {
              result.kontakt.telefon = phone;
            }
          }
        }

        // Method 2: Phone pattern with label
        if (!result.kontakt.telefon) {
          const phonePatternLabeled = /(Mobil|Telefon|Tel|Fon|Phone):\s*([\+\d][\d\s\/-]+)/gi;
          const labeledMatch = pageText.match(phonePatternLabeled);
          if (labeledMatch && labeledMatch.length > 0) {
            const phone = labeledMatch[0].replace(/(Mobil|Telefon|Tel|Fon|Phone):\s*/gi, '').trim();
            if (!phone.includes(refNr) && phone.length >= 8) {
              result.kontakt.telefon = phone;
            }
          }
        }

        // Method 3: Extract ALL text from contact container
        const kontaktContainer = document.querySelector('#jobdetails-kontaktdaten-container');
        if (kontaktContainer) {
          const containerText = kontaktContainer.textContent || '';
          result.debug.containerText = containerText;

          // Try to find email in container
          if (!result.kontakt.email) {
            const emailMatch = containerText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) result.kontakt.email = emailMatch[1];
          }

          // Try to find phone in container
          if (!result.kontakt.telefon) {
            const phoneMatch = containerText.match(/(\+49[\s\d-]+|\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/);
            if (phoneMatch && !phoneMatch[1].includes(refNr)) {
              result.kontakt.telefon = phoneMatch[1].trim();
            }
          }
        }

        // Extract contact address block
        const addressPattern = /Kontaktadresse[:\s]+([\s\S]{0,300}?)(?=Bewerben Sie sich|Kontaktaufnahme|Sonstige Angaben|$)/i;
        const addressMatch = pageText.match(addressPattern);
        if (addressMatch && addressMatch.length > 1) {
          const addressBlock = addressMatch[1];
          const lines = addressBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            result.kontakt.name = lines.slice(0, 2).join(' ');
          }

          const plzPattern = /(\d{5})\s+([A-Za-zäöüß\s-]+)/;
          const plzMatch = addressBlock.match(plzPattern);
          if (plzMatch) {
            result.kontakt.anschrift = {
              plz: plzMatch[1],
              ort: plzMatch[2].trim()
            };

            const streetMatch = addressBlock.match(/([A-Za-zäöüß\s]+\.\s*\d+)/);
            if (streetMatch) {
              result.kontakt.anschrift.strasse = streetMatch[1].trim();
            }
          }
        }

        return result;
      }, refNr);

      await browser.close();

      console.log('📋 EXTRACTED DATA:', JSON.stringify(jobData.kontakt));
      console.log('🐛 DEBUG INFO:', JSON.stringify(jobData.debug, null, 2));

      // Clean up session from Firestore
      await db.collection('captcha_sessions').doc(sessionId).delete();

      if (jobData.kontakt.email || jobData.kontakt.telefon) {
        console.log('✅ SUCCESS - RETURNING CONTACT DATA');
        res.json({
          success: true,
          kontaktdaten: jobData.kontakt
        });
        return;
      } else {
        console.error('❌ NO CONTACT DATA FOUND AFTER CAPTCHA');
        res.json({
          success: false,
          error: 'Kontaktdaten konnten nicht extrahiert werden. Möglicherweise war die CAPTCHA-Lösung falsch.'
        });
        return;
      }
    } catch (submissionError: any) {
      console.error('❌ PUPPETEER SUBMISSION ERROR:', submissionError.message);
      if (browser) {
        await browser.close().catch(console.error);
      }
      res.json({
        success: false,
        error: 'Fehler beim Senden der CAPTCHA-Lösung: ' + submissionError.message
      });
      return;
    }
  } catch (error: any) {
    console.error('CAPTCHA submission error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit CAPTCHA',
      message: error.message
    });
  }
});

// ======================
// COMPREHENSIVE PROXY FOR ARBEITSAGENTUR
// ======================
// Proxies entire Arbeitsagentur page including all assets (CSS, JS, images, CAPTCHA)
// Rewrites URLs to go through this proxy to bypass X-Frame-Options and CORS
export const proxyArbeitsagentur = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '2GB'
  })
  .https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Parse path-based proxy URL: /proxyArbeitsagentur/https/domain.com/path
    // OR query-based for refNr: /proxyArbeitsagentur?refNr=xxx
    const refNr = req.query.refNr as string;
    const urlPath = req.path.replace('/proxyArbeitsagentur', ''); // Remove function name

    let targetUrl: string;

    if (refNr) {
      // Initial request with refNr - use Puppeteer for full page rendering
      targetUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;

      console.log('🔄 Proxying with Puppeteer:', targetUrl);

      // Use Puppeteer to get fully rendered page
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 1024 },
        executablePath: await chromium.executablePath(),
        headless: true
      });

      const page = await browser.newPage();
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Scroll to bottom to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      // Wait for key elements to ensure page is fully loaded
      await page.waitForSelector('form', { timeout: 10000 }).catch(() => null);
      await page.waitForSelector('img[alt*="Sicherheitsabfrage"]', { timeout: 10000 }).catch(() => null);

      // Extra wait for all dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get the fully rendered HTML
      let content = await page.content();

      await browser.close();

      // Rewrite URLs to go through proxy using PATH-based format
      const proxyUrl = 'https://us-central1-lebenslauf-24.cloudfunctions.net/proxyArbeitsagentur';

      // Inject interceptor as external script to avoid CSP issues
      const interceptScript = `<script type="text/javascript">
(function(){
var p='${proxyUrl}';
function r(u){if(!u||typeof u!=='string'||u.indexOf('cloudfunctions.net')>-1)return u;if(u[0]==='/')return p+'/https/www.arbeitsagentur.de'+u;if(u.indexOf('http://')===0)return p+'/http/'+u.substring(7);if(u.indexOf('https://')===0)return p+'/https/'+u.substring(8);return u;}
var f=window.fetch;window.fetch=function(u,o){return f(r(u),o);};
var x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var a=[].slice.call(arguments,2);return x.apply(this,[m,r(u)].concat(a));};
console.log('Proxy OK');
})();
</script>`;

      // Inject right after opening head tag
      content = content.replace(/<head>/i, '<head>' + interceptScript);

      // Set base href to proxy URL
      content = content.replace(/<base\s+href=["'][^"']*["']\s*>/gi, `<base href="${proxyUrl}/https/www.arbeitsagentur.de/jobsuche/" />`);

      // Rewrite absolute arbeitsagentur URLs to path-based proxy format
      content = content.replace(/https:\/\/(www|rest|web|idaas)\.arbeitsagentur\.de/g, (match: string) => {
        return `${proxyUrl}/https/${match.substring(8)}`;
      });

      // Rewrite relative URLs to path-based format
      content = content.replace(/href=["']\/jobsuche\/([^"']*)["']/g, `href="${proxyUrl}/https/www.arbeitsagentur.de/jobsuche/$1"`);
      content = content.replace(/src=["']\/jobsuche\/([^"']*)["']/g, `src="${proxyUrl}/https/www.arbeitsagentur.de/jobsuche/$1"`);
      content = content.replace(/href=["']\/([^"':][^"']*)["']/g, `href="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);
      content = content.replace(/src=["']\/([^"':][^"']*)["']/g, `src="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);
      content = content.replace(/action=["']\/([^"']*)["']/g, `action="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);

      // Rewrite relative script/link tags without leading slash
      content = content.replace(/src=["']([^"':/]+\.js[^"']*)["']/g, (match, file) => {
        if (!file.startsWith('http')) {
          return `src="${proxyUrl}/https/www.arbeitsagentur.de/jobsuche/${file}"`;
        }
        return match;
      });
      content = content.replace(/href=["']([^"':/]+\.css[^"']*)["']/g, (match, file) => {
        if (!file.startsWith('http')) {
          return `href="${proxyUrl}/https/www.arbeitsagentur.de/jobsuche/${file}"`;
        }
        return match;
      });

      // Rewrite CSS url() references to path-based format
      content = content.replace(/url\(["']?\/([^"')]+)["']?\)/g, `url("${proxyUrl}/https/www.arbeitsagentur.de/$1")`);

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(content);
      return;

    } else if (urlPath && urlPath.length > 1) {
      // Path-based proxy: /https/www.arbeitsagentur.de/path or /http/domain.com/path
      const pathMatch = urlPath.match(/^\/(https?)\/(.*)/);

      if (pathMatch) {
        const protocol = pathMatch[1]; // 'http' or 'https'
        const restOfUrl = pathMatch[2]; // 'domain.com/path'
        targetUrl = `${protocol}://${restOfUrl}`;
      } else {
        res.status(400).send('Invalid proxy path format. Use /https/domain.com/path');
        return;
      }

      console.log('🔄 Proxying asset:', targetUrl);

      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Referer': 'https://www.arbeitsagentur.de/',
        'Origin': 'https://www.arbeitsagentur.de'
      };

      if (req.headers.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }

      const response = await axios({
        method: (req.method || 'GET') as any,
        url: targetUrl,
        headers,
        data: req.method === 'POST' ? req.body : undefined,
        responseType: 'arraybuffer',
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 10000
      }).catch((err: any) => {
        console.error('❌ Axios error for asset:', targetUrl, err.message);
        throw err;
      });

      console.log(`✅ Asset loaded: ${targetUrl} - Status: ${response.status}`);

      // Forward response headers
      const contentType = response.headers['content-type'] || '';
      res.set('Content-Type', contentType);

      // Forward cookies
      if (response.headers['set-cookie']) {
        res.set('Set-Cookie', response.headers['set-cookie']);
      }

      // If it's HTML or CSS, rewrite URLs to go through proxy (path-based)
      // DON'T rewrite JavaScript - send as-is
      if (contentType.includes('text/html') || contentType.includes('text/css')) {
        let content = response.data.toString('utf-8');

        const proxyUrl = 'https://us-central1-lebenslauf-24.cloudfunctions.net/proxyArbeitsagentur';

        // Rewrite absolute URLs to path-based proxy format
        content = content.replace(/https:\/\/(www|rest|web|idaas)\.arbeitsagentur\.de/g, (match: string) => {
          return `${proxyUrl}/https/${match.substring(8)}`;
        });
        content = content.replace(/https:\/\/([a-zA-Z0-9-]+\.arbeitsagentur\.de)/g, (match: string) => {
          return `${proxyUrl}/https/${match.substring(8)}`;
        });

        // Rewrite protocol-relative URLs
        content = content.replace(/\/\/(www|rest|web|idaas)\.arbeitsagentur\.de/g, (match: string) => {
          return `${proxyUrl}/https/${match.substring(2)}`;
        });

        // Rewrite relative URLs to path-based format
        content = content.replace(/href=["']\/([^"':][^"']*)["']/g, `href="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);
        content = content.replace(/src=["']\/([^"':][^"']*)["']/g, `src="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);
        content = content.replace(/action=["']\/([^"']*)["']/g, `action="${proxyUrl}/https/www.arbeitsagentur.de/$1"`);

        // Rewrite CSS url() references to path-based format
        content = content.replace(/url\(["']?\/([^"')]+)["']?\)/g, `url("${proxyUrl}/https/www.arbeitsagentur.de/$1")`);
        content = content.replace(/url\(["']?https:\/\/([a-zA-Z0-9.-]+\.arbeitsagentur\.de)([^"')]+)["']?\)/g, `url("${proxyUrl}/https/$1$2")`);

        res.status(response.status).send(content);
      } else {
        // For JavaScript, binary content (images, fonts, etc.), send as-is without rewriting
        res.status(response.status).send(response.data);
      }
    } else {
      res.status(400).send('Missing path or refNr parameter');
    }
  } catch (error: any) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).send(`Failed to load: ${error.message}`);
  }
});

// ======================
// Search Company Contact Info via Google
// ======================
export const searchCompanyContact = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const company = req.query.company as string;
    const location = req.query.location as string;

    if (!company) {
      res.status(400).json({ error: 'Company is required' });
      return;
    }

    console.log('🔍 Searching Google for company contact:', company, location);

    let allContacts = {
      emails: [] as string[],
      phones: [] as string[],
      websites: [] as string[],
      address: '' as string
    };

    // Step 1: Try DuckDuckGo HTML search (doesn't block like Google)
    const searchQuery = `${company} ${location || ''}`.trim();
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery + ' kontakt telefon')}`;

    try {
      const searchResponse = await axios.get(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(searchResponse.data);

      // Extract URLs from DuckDuckGo results
      $('.result__url').each((_, el) => {
        const urlText = $(el).text().trim();
        if (urlText && !urlText.includes('duckduckgo') &&
            !urlText.includes('google') &&
            !urlText.includes('facebook') &&
            !urlText.includes('wikipedia')) {
          const cleanUrl = urlText.startsWith('http') ? urlText : 'https://' + urlText;
          allContacts.websites.push(cleanUrl.split('/')[0] + '//' + cleanUrl.split('/')[2]);
        }
      });

      // Also extract from href
      $('a.result__a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('uddg=')) {
          try {
            const urlMatch = href.match(/uddg=([^&]+)/);
            if (urlMatch) {
              const url = decodeURIComponent(urlMatch[1]);
              if (!url.includes('duckduckgo') &&
                  !url.includes('google') &&
                  !url.includes('facebook') &&
                  !url.includes('wikipedia') &&
                  !url.includes('arbeitsagentur')) {
                allContacts.websites.push(url);
              }
            }
          } catch (e) {}
        }
      });

      // Extract phone numbers from search result snippets
      const pageText = $.text();
      const phonePatterns = [
        /(?:Telefon|Tel\.?|Fon)[:\s]*([0-9\s\-\/\(\)]{8,20})/gi,
        /(\+49[\s\-]?[0-9\s\-\/]{8,})/g,
        /(0[0-9]{2,5}[\s\-\/]?[0-9]{3,}[\s\-\/]?[0-9]{2,})/g
      ];

      for (const pattern of phonePatterns) {
        const matches = pageText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const cleanPhone = match.replace(/(?:Telefon|Tel\.?|Fon)[:\s]*/i, '').trim();
            if (cleanPhone.length >= 8 && cleanPhone.length <= 20 && /\d{4,}/.test(cleanPhone)) {
              allContacts.phones.push(cleanPhone);
            }
          }
        }
      }

      console.log('✅ DuckDuckGo search completed, found:', {
        phones: allContacts.phones.length,
        websites: allContacts.websites.length
      });

    } catch (ddgErr: any) {
      console.log('DuckDuckGo search failed:', ddgErr.message);
    }

    // Step 2: If we found a website, try to get more contact info from it
    if (allContacts.websites.length > 0 && (allContacts.phones.length === 0 || allContacts.emails.length === 0)) {
      const websiteUrl = allContacts.websites[0];
      try {
        console.log('Fetching company website:', websiteUrl);
        const siteResponse = await axios.get(websiteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 8000,
          maxRedirects: 3
        });

        const contacts = extractContactInfoFromHTML(siteResponse.data);
        allContacts.emails.push(...contacts.emails);
        allContacts.phones.push(...contacts.phones);

        // Also try /kontakt or /impressum page
        const baseUrl = new URL(websiteUrl).origin;
        for (const path of ['/kontakt', '/impressum', '/contact', '/about']) {
          try {
            const subResponse = await axios.get(baseUrl + path, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 5000
            });
            const subContacts = extractContactInfoFromHTML(subResponse.data);
            allContacts.emails.push(...subContacts.emails);
            allContacts.phones.push(...subContacts.phones);
          } catch (e) {
            // Ignore errors for subpages
          }
        }
      } catch (siteErr: any) {
        console.log('Website fetch failed:', siteErr.message);
      }
    }

    // Step 3: Fallback - try direct URL guessing
    if (allContacts.phones.length === 0 && allContacts.emails.length === 0) {
      // Extract just the main company name (first word or before GmbH/AG etc)
      const companyParts = company.split(/\s+/);
      const mainName = companyParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');

      const possibleUrls = [
        `https://www.${mainName}.de`,
        `https://${mainName}.de`,
      ];

      for (const url of possibleUrls) {
        try {
          const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
          });
          if (response.status === 200) {
            const contacts = extractContactInfoFromHTML(response.data);
            if (contacts.emails.length > 0 || contacts.phones.length > 0) {
              allContacts.emails.push(...contacts.emails);
              allContacts.phones.push(...contacts.phones);
              allContacts.websites.unshift(url);
              break;
            }
          }
        } catch (err) {
          // Continue
        }
      }
    }

    // SIMPLIFIED OUTPUT: Only 1 phone, no emails, 1 website

    // No emails - too unreliable
    allContacts.emails = [];

    // Only keep the FIRST valid phone number
    const normalizePhone = (phone: string) => phone.replace(/[\s\-\/\(\)]/g, '');
    let firstValidPhone = '';
    for (const phone of allContacts.phones) {
      const normalized = normalizePhone(phone);
      // Must be at least 10 digits for a valid German phone number with area code
      // And must start with 0 or + (valid German format)
      if (normalized.length >= 10 && (normalized.startsWith('0') || normalized.startsWith('+'))) {
        firstValidPhone = phone;
        break;
      }
    }
    allContacts.phones = firstValidPhone ? [firstValidPhone] : [];

    // Only keep the FIRST valid company website (not directories)
    const directoryDomains = [
      'gelbeseiten', '11880', 'cylex', 'yelp', 'golocal', 'meinestadt',
      'bizdb', 'oeffnungszeitenbuch', 'aktivbruecke', 'branchen', 'firmenfinden',
      'wlw.de', 'firmenwissen', 'handwerk.de', 'klicktel', 'hotfrog', 'branchenbuch',
      'kununu', 'xing', 'linkedin', 'indeed', 'stepstone', 'monster', 'gartenbau.org',
      'haendlerschutz', 'trustpilot', 'provenexpert', 'google', 'bing', 'yahoo',
      'firmania', 'northdata', 'unternehmensverzeichnis', 'firmenabc', 'kompany',
      'dnb.com', 'creditreform', 'hoppenstedt', 'firmeneintrag', 'stadtbranchenbuch'
    ];

    let firstValidWebsite = '';
    for (const url of [...new Set(allContacts.websites)]) {
      const isDirectory = directoryDomains.some(domain => url.toLowerCase().includes(domain));
      if (!isDirectory) {
        firstValidWebsite = url;
        break;
      }
    }
    allContacts.websites = firstValidWebsite ? [firstValidWebsite] : [];

    res.json({
      success: true,
      query: searchQuery,
      contacts: {
        phone: allContacts.phones[0] || null,
        website: allContacts.websites[0] || null
      }
    });

  } catch (error: any) {
    console.error('Search company contact error:', error);
    res.status(500).json({ error: 'Failed to search for contact information', details: error.message });
  }
});

function extractContactInfoFromHTML(html: string) {
  const contacts: {
    emails: string[];
    phones: string[];
    websites: string[];
  } = {
    emails: [],
    phones: [],
    websites: []
  };

  // Extract emails
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emailMatches = html.match(emailPattern) || [];
  contacts.emails = [...new Set(emailMatches)].filter(email =>
    !email.includes('google.com') &&
    !email.includes('gstatic.com') &&
    !email.includes('schema.org') &&
    !email.includes('example.com')
  ).slice(0, 5);

  // Extract phone numbers (German format)
  const phonePattern = /(?:\+49|0)\s?(?:\d{2,5}[\s\/.-]?\d{3,}[\s\/.-]?\d{3,})/g;
  const phoneMatches = html.match(phonePattern) || [];
  contacts.phones = [...new Set(phoneMatches)].slice(0, 5);

  // Extract websites
  const websitePattern = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.(?:de|com|org|net|info))/g;
  const websiteMatches = html.match(websitePattern) || [];
  contacts.websites = [...new Set(websiteMatches)]
    .filter(url =>
      !url.includes('google.com') &&
      !url.includes('gstatic.com') &&
      !url.includes('youtube.com') &&
      !url.includes('facebook.com')
    )
    .slice(0, 5);

  return contacts;
}

export { getCaptchaImage } from './captcha-proxy';
export { getJobDetailsAPI, solveCaptchaAPI } from './job-details-api';
export { dailyJobSync, triggerJobSync, getJobContact } from './job-sync';
