# Firebase Functions Deployment - Anleitung

## ✅ Was wurde eingerichtet:

Die Stripe API Routes wurden erfolgreich als **Firebase Cloud Functions** implementiert:

- ✅ `trialCheckout` - Registrierung mit 7-Tage-Trial
- ✅ `stripeWebhook` - Webhook-Event-Handler
- ✅ `cancelSubscription` - Abo-Kündigung
- ✅ `customerPortal` - Stripe Customer Portal

Die URLs werden automatisch so gemappt:
- `https://www.lebenslauf-24.de/api/stripe/trial-checkout` → Cloud Function `trialCheckout`
- `https://www.lebenslauf-24.de/api/stripe/webhook` → Cloud Function `stripeWebhook`
- etc.

---

## 🚀 Deployment-Schritte

### 1. Firebase CLI einloggen

```bash
firebase login
```

**Wählen Sie Ihr Google-Konto** (das mit Firebase Projekt "lebenslauf-24" verbunden ist)

### 2. Environment Variables für Functions setzen

**Wichtig:** Firebase Functions brauchen Ihre Stripe Keys!

```bash
# In C:\Users\watzl\Bewerbungstool\cv-builder ausführen

firebase functions:config:set stripe.secret_key="sk_test_IHR_STRIPE_SECRET_KEY"
firebase functions:config:set stripe.price_id="price_IHR_PRICE_ID"
firebase functions:config:set stripe.webhook_secret="whsec_IHR_WEBHOOK_SECRET"
```

**Wo finde ich diese Werte?**

**Stripe Secret Key:**
1. https://dashboard.stripe.com/test/apikeys
2. Kopieren Sie den "Secret key" (beginnt mit `sk_test_...`)

**Price ID:**
1. https://dashboard.stripe.com/test/products
2. Klicken Sie auf Ihr Premium-Produkt
3. Kopieren Sie die Price ID (beginnt mit `price_...`)

**Webhook Secret:**
- Erhalten Sie nach Webhook-Einrichtung im nächsten Schritt

### 3. Functions kompilieren

```bash
cd functions
npm run build
```

**Erwartete Ausgabe:**
```
Successfully compiled TypeScript to JavaScript
```

### 4. Functions deployen

```bash
cd ..
firebase deploy --only functions
```

**Das deployed alle 4 Functions:**
- ✅ trialCheckout
- ✅ stripeWebhook
- ✅ cancelSubscription
- ✅ customerPortal

**Deployment dauert:** 2-5 Minuten

**Erfolgs-Ausgabe:**
```
✔ functions[trialCheckout(us-central1)] Successful create operation.
✔ functions[stripeWebhook(us-central1)] Successful create operation.
✔ functions[cancelSubscription(us-central1)] Successful create operation.
✔ functions[customerPortal(us-central1)] Successful create operation.
```

### 5. Hosting deployen

```bash
npm run build
firebase deploy --only hosting
```

### 6. Stripe Webhooks konfigurieren

**Jetzt wo die Functions live sind:**

1. Gehen Sie zu: https://dashboard.stripe.com/test/webhooks
2. Klicken Sie "+ Add endpoint"
3. **Endpoint URL:** `https://www.lebenslauf-24.de/api/stripe/webhook`
4. **Events auswählen:**
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.trial_will_end`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`
5. Klicken Sie "Add endpoint"
6. **Webhook Secret kopieren:**
   - Klicken Sie auf den neuen Endpoint
   - Klicken Sie "Reveal" neben "Signing secret"
   - Kopieren Sie das Secret (beginnt mit `whsec_...`)

7. **Secret zu Firebase Functions hinzufügen:**
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_DAS_KOPIERTE_SECRET"
   ```

8. **Functions neu deployen** (damit neues Secret aktiv wird):
   ```bash
   firebase deploy --only functions
   ```

---

## 🧪 Testing

### Lokales Testing (optional)

**Firebase Emulators starten:**
```bash
cd functions
npm run serve
```

**Functions laufen lokal auf:**
- http://localhost:5001/lebenslauf-24/us-central1/trialCheckout
- http://localhost:5001/lebenslauf-24/us-central1/stripeWebhook
- etc.

### Production Testing

1. **Test-Registrierung:**
   - Gehen Sie zu: https://www.lebenslauf-24.de/register
   - Email: test@example.com
   - Passwort: test123
   - Weiter zu Schritt 2
   - Klicken Sie "Zahlungsmethode hinterlegen"
   - **Test-Karte:** `4242 4242 4242 4242`
   - Beliebiges Datum & CVV

2. **Prüfen Sie:**
   - ✅ Redirect zu Dashboard nach Zahlung
   - ✅ Trial-Banner wird angezeigt
   - ✅ "Noch 7 Tage kostenlos" sichtbar
   - ✅ Alle Premium-Templates verfügbar

3. **Firebase Console prüfen:**
   - https://console.firebase.google.com/project/lebenslauf-24/firestore
   - Prüfen Sie ob neuer User in `users` Collection existiert
   - Prüfen Sie `subscription.status === "trialing"`

4. **Stripe Dashboard prüfen:**
   - https://dashboard.stripe.com/test/customers
   - Neuer Customer sollte existieren
   - Subscription mit Trial sollte sichtbar sein

5. **Function Logs prüfen:**
   ```bash
   firebase functions:log
   ```

   Sie sollten sehen:
   ```
   ✅ Trial subscription activated for new user: {userId}
   ```

---

## 🔧 Troubleshooting

### Problem: "Function deployment failed"

**Lösung:**
```bash
# Prüfen Sie Firebase Billing
https://console.firebase.google.com/project/lebenslauf-24/usage

# Firebase Functions benötigen "Blaze Plan" (Pay-as-you-go)
# Erste 2 Millionen Aufrufe/Monat sind kostenlos!
```

### Problem: "Environment variables not found"

**Lösung:**
```bash
# Environment Vars anzeigen
firebase functions:config:get

# Sollte zeigen:
{
  "stripe": {
    "secret_key": "sk_test_...",
    "price_id": "price_...",
    "webhook_secret": "whsec_..."
  }
}

# Falls leer, erneut setzen:
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase deploy --only functions
```

### Problem: "Webhook signature verification failed"

**Lösung:**
1. Prüfen Sie dass Webhook-Secret korrekt gesetzt ist
2. Webhook-Secret muss von Stripe Dashboard kommen (NICHT von `stripe listen`)
3. Neu deployen nach Secret-Änderung

### Problem: "CORS error" beim API Call

**Lösung:**
Die Functions haben bereits CORS-Header. Falls Problem besteht:
```bash
# Functions neu deployen
firebase deploy --only functions --force
```

---

## 📊 Monitoring

### Function Logs anzeigen

**Live-Logs:**
```bash
firebase functions:log --only trialCheckout
```

**Im Browser:**
https://console.firebase.google.com/project/lebenslauf-24/functions/logs

### Metriken prüfen

**Firebase Console:**
https://console.firebase.google.com/project/lebenslauf-24/functions/list

Sie sehen:
- Anzahl der Aufrufe
- Fehlerrate
- Ausführungszeit
- Kosten

---

## 💰 Kosten

**Firebase Functions Pricing:**

**Kostenlos (Blaze Plan):**
- 2.000.000 Aufrufe/Monat
- 400.000 GB-Sekunden/Monat
- 200.000 CPU-Sekunden/Monat

**Danach:**
- $0.40 pro Million Aufrufe
- $0.0000025 pro GB-Sekunde
- $0.00001 pro CPU-Sekunde

**Für Ihre App:**
- ~100 Registrierungen/Monat = **0€**
- ~1000 Webhook-Events/Monat = **0€**
- **Sehr wahrscheinlich komplett kostenlos!**

---

## 🔄 Updates & Änderungen

### Functions aktualisieren

1. **Code ändern** in `functions/src/index.ts`
2. **Kompilieren:**
   ```bash
   cd functions
   npm run build
   ```
3. **Deployen:**
   ```bash
   cd ..
   firebase deploy --only functions
   ```

### Nur eine Function deployen

```bash
firebase deploy --only functions:trialCheckout
```

### Alle Functions löschen (falls nötig)

```bash
firebase functions:delete trialCheckout
firebase functions:delete stripeWebhook
firebase functions:delete cancelSubscription
firebase functions:delete customerPortal
```

---

## ✅ Deployment Checkliste

Nach dem Deployment prüfen:

- [ ] Firebase CLI eingeloggt
- [ ] Environment Variables gesetzt (`firebase functions:config:get`)
- [ ] Functions kompiliert (`npm run build` in functions/)
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] Hosting deployed (`firebase deploy --only hosting`)
- [ ] Stripe Webhooks konfiguriert (https://www.lebenslauf-24.de/api/stripe/webhook)
- [ ] Webhook-Secret in Functions gesetzt
- [ ] Test-Registrierung erfolgreich
- [ ] Firebase User erstellt
- [ ] Firestore Subscription-Daten korrekt
- [ ] Trial-Banner im Dashboard sichtbar
- [ ] Function Logs zeigen keine Fehler

---

## 🎯 Nächste Schritte

1. **Deployment durchführen** (siehe Schritte oben)
2. **Testen, testen, testen!**
3. **Stripe auf Live-Mode umstellen** wenn bereit:
   - Live API Keys verwenden
   - Neue Webhooks für Production
   - `firebase functions:config:set` mit Live Keys

4. **Optional: Domain SSL prüfen**
   - https://www.lebenslauf-24.de sollte HTTPS sein
   - All-Inkl sollte automatisch SSL bereitstellen

---

**Sie sind bereit! 🚀**

Die Functions sind konfiguriert und bereit für Deployment. Folgen Sie den Schritten oben und Ihre Trial-Funktionalität wird live gehen!

Bei Problemen:
- Firebase Functions Logs: `firebase functions:log`
- Stripe Dashboard Logs: https://dashboard.stripe.com/test/logs
- Firebase Console: https://console.firebase.google.com/project/lebenslauf-24
