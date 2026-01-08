# 7-Tage-Trial Implementierung - Übersicht

## ✅ Implementierte Features

Die CV-Builder-Anwendung wurde erfolgreich um eine 7-tägige Trial-Funktionalität erweitert:

### Kern-Features:
- ✅ **7-Tage kostenlose Testphase** ab Registrierung
- ✅ **Verpflichtende Zahlungsmethode** bei Registrierung (Kreditkarte oder SEPA)
- ✅ **Automatische Abbuchung** von 1,99€/Monat nach 7 Tagen
- ✅ **Kündigung während Trial** möglich (kein Charge am 8. Tag)
- ✅ **Sofortiger Premium-Zugang** nach Payment-Hinterlegung
- ✅ **Missbrauchsschutz** durch Stripe Payment-Fingerprinting

---

## 📁 Geänderte/Neue Dateien

### TypeScript Types
- `types/cv.ts` - Erweitert um Trial-Felder

### Backend APIs
- `app/api/stripe/trial-checkout/route.ts` *(NEU)* - Trial-Registrierung
- `app/api/stripe/webhook/route.ts` - Erweitert um Trial-Events
- `app/api/stripe/cancel-subscription/route.ts` *(NEU)* - Kündigung
- `app/api/stripe/customer-portal/route.ts` *(NEU)* - Stripe Portal

### Frontend Components
- `components/auth-context.tsx` - Trial-Helper-Funktionen
- `app/register/page.tsx` - Multi-Step Registration Flow
- `app/dashboard/page.tsx` - Trial-Banner + Badge
- `app/subscription/page.tsx` *(NEU)* - Abo-Verwaltung

---

## 🎯 User Flow

### Registrierung mit Trial:

```
1. Benutzer besucht /register
   ↓
2. Schritt 1: Email + Passwort eingeben
   ↓
3. Schritt 2: Trial-Info anzeigen
   - "0€ für 7 Tage, danach 1,99€/Monat"
   - Benefits anzeigen
   ↓
4. "Zahlungsmethode hinterlegen & starten" klicken
   ↓
5. Weiterleitung zu Stripe Checkout
   - Kreditkarte oder SEPA hinterlegen
   - Payment Method erforderlich, aber kein Charge
   ↓
6. Nach erfolgreicher Payment-Hinterlegung:
   - Webhook erstellt Firebase-Account
   - Premium-Subscription mit Trial-Status
   - User zu /dashboard weitergeleitet
   ↓
7. Dashboard zeigt:
   - Trial-Banner: "Noch X Tage kostenlos"
   - Premium-Badge: "Testphase (7d)"
   - Alle 7 Premium-Vorlagen verfügbar
```

### Trial-Ende Szenarien:

**Szenario A: User kündigt NICHT**
```
Tag 1-7: Premium-Zugang, keine Charge
Tag 8: Automatisch 1,99€ abgebucht
Status: Trial → Active Premium
```

**Szenario B: User kündigt während Trial**
```
Tag 1-5: User kündigt via /subscription
Tag 1-7: Premium-Zugang bleibt (bis Trial-Ende)
Tag 8: Keine Abbuchung, Downgrade zu Free
Status: Trial (canceled) → Free
```

---

## 🔧 Technische Details

### Stripe Integration

**Trial-Konfiguration:**
```typescript
subscription_data: {
  trial_period_days: 7,
  metadata: {
    isNewRegistration: "true",
    registrationEmail: email,
  }
}
```

**Unterstützte Payment Methods:**
- Kreditkarten (Visa, Mastercard, Amex, etc.)
- SEPA Direct Debit (für Deutschland)
- *Zukünftig:* PayPal, Amazon Pay

### Firestore Schema

```typescript
users/{userId} {
  subscription: {
    tier: "premium",
    status: "trialing",
    customerId: "cus_...",
    subscriptionId: "sub_...",
    trialStartDate: "2025-01-01T00:00:00Z",
    trialEndDate: "2025-01-08T00:00:00Z",
    cancelAtPeriodEnd: false,
    autoRenew: true,
    paymentMethodAttached: true
  },
  createdAt: "2025-01-01T00:00:00Z",
  registrationCompletedAt: "2025-01-01T00:00:00Z"
}
```

### Webhook Events

| Event | Beschreibung | Aktion |
|-------|-------------|---------|
| `checkout.session.completed` | Payment-Setup abgeschlossen | Firebase-User erstellen + Trial aktivieren |
| `customer.subscription.updated` | Subscription-Status geändert | Firestore aktualisieren (Trial → Active, etc.) |
| `customer.subscription.deleted` | Subscription gelöscht | Downgrade zu Free |
| `customer.subscription.trial_will_end` | 3 Tage vor Trial-Ende | Reminder-Email senden (TODO) |
| `invoice.payment_failed` | Zahlung fehlgeschlagen | Status auf "past_due" |

---

## 🚀 Setup & Deployment

### 1. Environment Variables

Stellen Sie sicher, dass alle erforderlichen Variablen gesetzt sind:

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (bereits vorhanden)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 2. Stripe Webhooks konfigurieren

**Siehe:** `STRIPE_WEBHOOK_SETUP.md` für detaillierte Anleitung

**Kurz:**
1. https://dashboard.stripe.com/webhooks
2. Endpoint hinzufügen: `https://ihre-domain.com/api/stripe/webhook`
3. Events auswählen (siehe oben)
4. Webhook-Secret kopieren und in `.env.local` einfügen

### 3. Lokales Testing

**Mit Stripe CLI:**
```bash
# Terminal 1: Webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 2: Dev Server
npm run dev

# Terminal 3: Test-Event auslösen
stripe trigger checkout.session.completed
```

**Ohne Stripe CLI:**
- Verwenden Sie Stripe Dashboard "Send test webhook"
- Oder führen Sie manuelle Test-Registrierung durch

### 4. Production Deployment

**Deployment-Schritte:**

1. **Code deployen**
   ```bash
   git add .
   git commit -m "Add 7-day trial functionality"
   git push
   ```

2. **Environment Variables setzen** (Vercel Beispiel)
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

3. **Stripe Webhooks für Production konfigurieren**
   - Production Webhook-URL: `https://ihre-domain.com/api/stripe/webhook`
   - Neues Webhook-Secret für Production

4. **Test-Modus → Live-Modus**
   - Stripe Dashboard auf "Live mode" umschalten
   - Live API Keys verwenden
   - Echte Test-Registrierung durchführen

---

## 🧪 Testing-Checkliste

### Lokales Testing

- [ ] Stripe CLI installiert und authentifiziert
- [ ] Webhook forwarding läuft
- [ ] Development Server läuft auf Port 3000
- [ ] Webhook-Secret in `.env.local` korrekt

### Registrierungs-Flow

- [ ] Registrierungsseite zeigt Multi-Step Flow
- [ ] Schritt 1: Email/Passwort funktioniert
- [ ] Schritt 2: Trial-Info wird angezeigt
- [ ] Stripe Checkout öffnet sich
- [ ] Test-Karte `4242 4242 4242 4242` funktioniert
- [ ] Nach Success: Redirect zu Dashboard

### Trial-Status

- [ ] Firebase-User wurde erstellt
- [ ] Firestore enthält korrekte Subscription-Daten
- [ ] Dashboard zeigt Trial-Banner
- [ ] Premium-Badge zeigt "Testphase (Xd)"
- [ ] Alle 7 CV-Vorlagen sind verfügbar
- [ ] PDF-Export funktioniert für alle Templates

### Subscription-Verwaltung

- [ ] `/subscription` Seite zeigt Trial-Status
- [ ] Verbleibende Tage korrekt angezeigt
- [ ] "Abo kündigen" Button funktioniert
- [ ] Nach Kündigung: Status aktualisiert
- [ ] Zugang bleibt bis Trial-Ende

### Webhook-Events

- [ ] `checkout.session.completed` erstellt User
- [ ] `customer.subscription.updated` aktualisiert Status
- [ ] `customer.subscription.deleted` downgradet zu Free
- [ ] Alle Events loggen korrekt in Console

### Edge Cases

- [ ] Doppelte Email-Registrierung blockiert
- [ ] Abbruch bei Stripe Checkout funktioniert
- [ ] "Zurück" Button in Step 2 funktioniert
- [ ] Payment-Fehler werden angezeigt
- [ ] Session-Timeout behandelt

---

## 📊 Monitoring & Analytics

### Wichtige Metriken

**Conversion Funnel:**
1. Registrierung gestartet (Step 1)
2. Payment-Step erreicht (Step 2)
3. Stripe Checkout geöffnet
4. Payment-Method hinterlegt
5. Trial gestartet
6. Trial → Paid Conversion

**KPIs:**
- Trial Sign-up Rate
- Trial Completion Rate (7 Tage genutzt)
- Trial-to-Paid Conversion Rate
- Churn Rate während Trial
- Payment Failure Rate

### Log-Überwachung

**Stripe Dashboard:**
- Webhooks: https://dashboard.stripe.com/webhooks
- Events: https://dashboard.stripe.com/events
- Customers: https://dashboard.stripe.com/customers

**Server Logs:**
```bash
# Webhook-Events tracken
✅ Trial subscription activated for new user: {userId}
✅ Subscription updated for user: {userId}, status: trialing
⏰ Trial ending soon for user: {userId}
⚠️ Payment failed for user: {userId}
```

---

## 🔮 Zukünftige Erweiterungen

### Email-Service (Priorität: Hoch)

**Implementierung:**
- SendGrid, AWS SES, oder Resend
- Templates für:
  - Willkommens-Email nach Registrierung
  - Trial-Reminder (3 Tage vor Ende)
  - Erste Zahlung erfolgreich
  - Zahlung fehlgeschlagen

**Webhook-Integration:**
```typescript
case "customer.subscription.trial_will_end":
  await sendEmail({
    to: userData.email,
    template: "trial-ending-soon",
    data: { daysRemaining: 3 }
  });
```

### PayPal Integration (Priorität: Mittel)

**Optionen:**
1. Stripe + PayPal (einfacher, Stripe handhabt alles)
2. Direkte PayPal SDK Integration (mehr Kontrolle)

### Amazon Pay (Priorität: Niedrig)

Separate Integration erforderlich, ähnlicher Flow wie Stripe.

### Analytics Dashboard (Priorität: Mittel)

- Google Analytics / Plausible Integration
- Custom Dashboard für Trial-Metriken
- Cohort-Analyse

### Referral Program (Priorität: Niedrig)

- Trial-Verlängerung bei erfolgreicher Empfehlung
- Discount-Codes für Referrals

---

## 🐛 Bekannte Limitierungen

1. **Email-Verifizierung optional**
   - User können sich ohne Email-Verifizierung anmelden
   - Empfehlung: Für Password-Reset erforderlich machen

2. **Keine Email-Notifications**
   - Trial-Reminder nicht implementiert
   - Payment-Failure-Notifications fehlen

3. **Single Currency**
   - Nur EUR (1,99€)
   - Für internationale User ggf. USD/GBP/etc. anbieten

4. **Keine Refunds**
   - Automatische Refund-Logik nicht implementiert
   - Manuell via Stripe Dashboard

5. **Test-Mode Warnings**
   - Im Test-Mode sichtbare Stripe-Hinweise
   - Vor Live-Schaltung auf Production umstellen

---

## 📞 Support & Troubleshooting

### Häufige Probleme

**Problem:** "Webhook signature verification failed"
**Lösung:**
- Webhook-Secret prüfen
- Für lokales Testing: Secret von `stripe listen` verwenden
- Für Production: Secret vom Dashboard verwenden

**Problem:** "Subscription not created after payment"
**Lösung:**
- Webhook-Logs im Stripe Dashboard prüfen
- Server-Logs prüfen (Firebase-User-Erstellung)
- Temporäre Registration-Daten in Firestore prüfen

**Problem:** "Trial-Banner nicht sichtbar"
**Lösung:**
- Firestore Subscription-Daten prüfen (`status: "trialing"`)
- Browser-Cache leeren
- `isInTrial()` Funktion prüfen

### Debug-Tipps

**Firestore-Daten prüfen:**
```javascript
// In Browser Console auf Dashboard-Seite
const { user, subscription } = window.__NEXT_DATA__.props.pageProps;
console.log("User:", user);
console.log("Subscription:", subscription);
```

**Stripe-Daten prüfen:**
```bash
# Subscription abrufen
stripe subscriptions retrieve sub_...

# Customer abrufen
stripe customers retrieve cus_...
```

---

## ✅ Checkliste: Bereit für Production

### Code
- [ ] Alle Features implementiert und getestet
- [ ] Error-Handling implementiert
- [ ] Loading-States überall vorhanden
- [ ] Mobile-Responsive Design geprüft
- [ ] Browser-Kompatibilität getestet

### Stripe
- [ ] Live-Mode API Keys gesetzt
- [ ] Production Webhooks konfiguriert
- [ ] Alle Events ausgewählt
- [ ] Webhook-Secret gespeichert
- [ ] Payment Methods aktiviert (Card, SEPA)

### Firebase
- [ ] Production Firestore Rules gesetzt
- [ ] Security Rules für Trial-Subscriptions
- [ ] Indexes erstellt (falls nötig)

### Deployment
- [ ] Environment Variables gesetzt
- [ ] Domain konfiguriert
- [ ] SSL-Zertifikat aktiv
- [ ] Monitoring eingerichtet

### Legal
- [ ] AGB aktualisiert (Trial-Bedingungen)
- [ ] Datenschutz aktualisiert (Stripe-Daten)
- [ ] Widerrufsbelehrung
- [ ] Impressum

### Testing
- [ ] Kompletter Registrierungs-Flow getestet
- [ ] Kündigung während Trial getestet
- [ ] Automatische Abbuchung nach 7 Tagen getestet
- [ ] Payment-Failure-Szenario getestet

---

## 📚 Weiterführende Ressourcen

- [Stripe Subscriptions Docs](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Trial Periods](https://stripe.com/docs/billing/subscriptions/trials)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Implementiert am:** 2025-12-28
**Version:** 1.0.0
**Entwickelt mit:** Claude Sonnet 4.5
