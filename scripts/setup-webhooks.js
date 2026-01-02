/**
 * Stripe Webhook Setup Script
 *
 * Dieses Skript konfiguriert automatisch alle benötigten Webhooks
 * für die Trial-Subscription-Funktionalität.
 *
 * Verwendung:
 *   node scripts/setup-webhooks.js
 */

const Stripe = require('stripe');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔧 Stripe Webhook Setup\n');
  console.log('Dieses Skript konfiguriert automatisch Ihre Stripe Webhooks.\n');

  // 1. Stripe Secret Key abfragen
  console.log('📍 Schritt 1: Stripe Secret Key');
  console.log('Holen Sie Ihren Secret Key von:');
  console.log('https://dashboard.stripe.com/test/apikeys\n');

  const secretKey = await question('Geben Sie Ihren Stripe Secret Key ein (sk_test_...): ');

  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    console.error('❌ Ungültiger Secret Key. Muss mit sk_test_ oder sk_live_ beginnen.');
    rl.close();
    return;
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  // 2. Webhook URL abfragen
  console.log('\n📍 Schritt 2: Webhook URL');
  console.log('Für lokales Testing: http://localhost:3000/api/stripe/webhook');
  console.log('Für Production: https://ihre-domain.com/api/stripe/webhook\n');

  const webhookUrl = await question('Geben Sie Ihre Webhook URL ein: ');

  // 3. Events definieren
  const events = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
  ];

  console.log('\n📍 Schritt 3: Webhook erstellen');
  console.log(`URL: ${webhookUrl}`);
  console.log(`Events: ${events.length} Event(s)\n`);

  try {
    // Prüfen ob Webhook bereits existiert
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const existing = existingWebhooks.data.find(wh => wh.url === webhookUrl);

    if (existing) {
      console.log('⚠️  Webhook existiert bereits!');
      const update = await question('Möchten Sie ihn aktualisieren? (y/n): ');

      if (update.toLowerCase() === 'y') {
        await stripe.webhookEndpoints.update(existing.id, {
          enabled_events: events,
        });
        console.log('\n✅ Webhook erfolgreich aktualisiert!');
        console.log(`ID: ${existing.id}`);
        console.log(`\n🔑 Webhook Secret: ${existing.secret}`);
      } else {
        console.log('\n❌ Abgebrochen.');
      }
    } else {
      // Neuen Webhook erstellen
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: events,
        api_version: '2024-12-18.acacia',
      });

      console.log('\n✅ Webhook erfolgreich erstellt!');
      console.log(`ID: ${webhook.id}`);
      console.log(`URL: ${webhook.url}`);
      console.log(`\n🔑 Webhook Secret: ${webhook.secret}`);
      console.log('\n📋 Nächste Schritte:');
      console.log('1. Kopieren Sie das Webhook Secret oben');
      console.log('2. Fügen Sie es in Ihre .env.local ein:');
      console.log(`   STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
      console.log('3. Starten Sie Ihren Development Server neu');
    }

  } catch (error) {
    console.error('\n❌ Fehler beim Erstellen des Webhooks:');
    console.error(error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Tipp: Überprüfen Sie, ob Ihr Secret Key korrekt ist.');
    }
  }

  rl.close();
}

main().catch(error => {
  console.error('Fehler:', error);
  rl.close();
});
