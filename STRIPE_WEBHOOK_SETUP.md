# Stripe Webhook Setup - Anleitung

## Option 1: Lokales Testing mit Stripe CLI (Empfohlen für Entwicklung)

### 1. Stripe CLI installieren

**Download:**
1. Besuchen Sie: https://github.com/stripe/stripe-cli/releases/latest
2. Laden Sie `stripe_X.X.X_windows_x86_64.zip` herunter
3. Entpacken Sie die Datei
4. Verschieben Sie `stripe.exe` nach `C:\Program Files\Stripe\` (oder einen anderen Ordner)
5. Fügen Sie den Ordner zu Ihrem PATH hinzu

**Alternative Installation via Scoop:**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### 2. Stripe CLI authentifizieren

Öffnen Sie eine neue Kommandozeile und führen Sie aus:

```bash
stripe login
```

Dies öffnet Ihren Browser zur Authentifizierung. Melden Sie sich mit Ihrem Stripe-Account an.

### 3. Webhook-Forwarding starten

Im Projektverzeichnis ausführen:

```bash
cd C:\Users\watzl\Bewerbungstool\cv-builder
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Wichtig:** Kopieren Sie das angezeigte Webhook-Secret (beginnt mit `whsec_...`)

### 4. Webhook Secret in .env.local speichern

Fügen Sie das Secret zu Ihrer `.env.local` hinzu:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...das_secret_von_stripe_listen
```

### 5. Development Server starten

In einem neuen Terminal:

```bash
npm run dev
```

### 6. Webhooks testen

Jetzt empfängt Ihre lokale Anwendung alle Stripe-Events!

**Test-Ereignis manuell auslösen:**

```bash
# Test: Checkout Session completed
stripe trigger checkout.session.completed

# Test: Subscription updated
stripe trigger customer.subscription.updated

# Test: Trial ending
stripe trigger customer.subscription.trial_will_end
```

---

## Option 2: Production Webhooks einrichten

### 1. Stripe Dashboard öffnen

Gehen Sie zu: https://dashboard.stripe.com/webhooks

### 2. Neuen Endpoint hinzufügen

1. Klicken Sie auf **"+ Add endpoint"**
2. Geben Sie Ihre URL ein: `https://ihre-domain.com/api/stripe/webhook`
   - Ersetzen Sie `ihre-domain.com` mit Ihrer tatsächlichen Domain
   - Beispiel: `https://cv-builder.vercel.app/api/stripe/webhook`

### 3. Events auswählen

Wählen Sie folgende Events aus:

**Customer Events:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.trial_will_end`

**Checkout Events:**
- ✅ `checkout.session.completed`

**Invoice Events:**
- ✅ `invoice.payment_failed`
- ✅ `invoice.payment_succeeded`

### 4. Webhook-Secret kopieren

Nach dem Erstellen des Endpoints:

1. Klicken Sie auf den neuen Endpoint
2. Klicken Sie auf **"Reveal"** neben "Signing secret"
3. Kopieren Sie das Secret (beginnt mit `whsec_...`)

### 5. Secret zu Production-Umgebung hinzufügen

**Für Vercel:**
```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Paste das Secret wenn gefragt
```

**Für andere Hosting-Provider:**
Fügen Sie die Environment Variable im Dashboard hinzu:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. Webhook testen

Zurück im Stripe Dashboard:

1. Gehen Sie zu Ihrem Webhook-Endpoint
2. Klicken Sie auf **"Send test webhook"**
3. Wählen Sie `checkout.session.completed`
4. Klicken Sie auf **"Send test webhook"**
5. Überprüfen Sie, ob Status **"succeeded"** zeigt

---

## Troubleshooting

### Webhook empfängt keine Events

**Prüfen Sie:**

1. **Webhook-URL ist erreichbar:**
   ```bash
   curl -X POST https://ihre-domain.com/api/stripe/webhook
   ```
   Sollte einen 400-Fehler zurückgeben (das ist OK - bedeutet der Endpoint existiert)

2. **Webhook-Secret ist korrekt:**
   - Vergleichen Sie das Secret im Stripe Dashboard mit Ihrer `.env.local`
   - Achten Sie auf führende/nachfolgende Leerzeichen

3. **Events sind ausgewählt:**
   - Im Stripe Dashboard unter "Events to send" prüfen

### Signature Verification Failed

**Lösung:**
1. Holen Sie sich ein neues Webhook-Secret vom Stripe Dashboard
2. Aktualisieren Sie `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Starten Sie den Server neu

### Lokale Webhooks funktionieren nicht

**Prüfen Sie:**

1. **Stripe CLI läuft:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Port ist korrekt:**
   - Development Server läuft auf Port 3000
   - Stripe CLI forwarded zu `localhost:3000`

3. **Webhook-Secret von `stripe listen` verwenden:**
   - NICHT das Secret vom Dashboard für lokales Testing
   - Verwenden Sie das Secret das `stripe listen` ausgibt

---

## Webhook-Events im Detail

### `checkout.session.completed`
- **Wann:** Nach erfolgreicher Zahlung/Payment-Setup
- **Aktion:** Erstellt Firebase-User + setzt Trial-Subscription

### `customer.subscription.updated`
- **Wann:** Subscription-Status ändert sich
- **Aktion:** Updated Firestore (status, cancelAtPeriodEnd, etc.)

### `customer.subscription.deleted`
- **Wann:** Subscription wird vollständig gelöscht
- **Aktion:** Downgrade zu Free Tier

### `customer.subscription.trial_will_end`
- **Wann:** 3 Tage vor Trial-Ende
- **Aktion:** Reminder-Email (TODO: Email-Service einrichten)

### `invoice.payment_failed`
- **Wann:** Zahlung schlägt fehl
- **Aktion:** Setzt status auf "past_due", sendet Notification

### `invoice.payment_succeeded`
- **Wann:** Zahlung erfolgreich
- **Aktion:** Bestätigt aktive Subscription

---

## Testing-Checklist

Nach dem Einrichten der Webhooks:

- [ ] Test-Registrierung durchführen
- [ ] Prüfen ob Firebase-User erstellt wurde
- [ ] Prüfen ob Trial-Status korrekt ist (7 Tage)
- [ ] Dashboard zeigt Trial-Banner
- [ ] Premium-Badge zeigt "Testphase (7d)"
- [ ] Subscription-Page zeigt korrekte Daten
- [ ] Kündigung funktioniert
- [ ] Nach 7 Tagen (oder manuell via Stripe) wird zur aktiven Subscription

---

## Nächste Schritte

1. ✅ Webhooks einrichten (Sie sind hier!)
2. ⬜ Email-Service für Trial-Reminder einrichten (optional)
3. ⬜ PayPal/Amazon Pay Integration (optional)
4. ⬜ Analytics/Monitoring einrichten
5. ⬜ In Production deployen
6. ⬜ Mit echten Zahlungen testen (Test-Mode → Live-Mode)

---

## Support

Bei Problemen:

1. **Stripe Dashboard Logs:** https://dashboard.stripe.com/logs
2. **Server-Logs:** Prüfen Sie die Console-Ausgaben
3. **Webhook-Logs:** https://dashboard.stripe.com/webhooks → Ihr Endpoint → "Recent events"

**Wichtige Links:**
- Stripe CLI Docs: https://stripe.com/docs/stripe-cli
- Webhook Testing: https://stripe.com/docs/webhooks/test
- Event Types: https://stripe.com/docs/api/events/types
