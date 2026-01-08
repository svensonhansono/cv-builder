# Custom Domain Setup - www.lebenslauf-24.de

## Übersicht

Ihre Domain **www.lebenslauf-24.de** ist bei **All-Inkl** gehostet und soll mit **Firebase Hosting** (Projekt: lebenslauf-24) verbunden werden.

**Aktuelle URLs:**
- Firebase Standard: https://lebenslauf-24.web.app
- Ziel-Domain: https://www.lebenslauf-24.de

---

## Schritt 1: Domain in Firebase Hosting hinzufügen

### 1.1 Firebase Console öffnen

```bash
# Oder direkt im Browser:
https://console.firebase.google.com/project/lebenslauf-24/hosting/sites
```

### 1.2 Custom Domain hinzufügen

1. Klicken Sie auf **"Add custom domain"**
2. Geben Sie ein: `www.lebenslauf-24.de`
3. Klicken Sie **"Continue"**

Firebase zeigt Ihnen jetzt DNS-Einträge, die Sie bei All-Inkl eintragen müssen.

---

## Schritt 2: DNS-Einträge bei All-Inkl einrichten

### 2.1 All-Inkl KAS Login

1. Gehen Sie zu: https://kas.all-inkl.com/
2. Melden Sie sich an
3. Navigieren Sie zu: **Domain → Domain-Einstellungen**
4. Wählen Sie **lebenslauf-24.de**

### 2.2 DNS-Einträge hinzufügen

Firebase hat Ihnen wahrscheinlich **2 DNS-Einträge** angezeigt:

#### Option A: A-Record (empfohlen für www-Subdomain)

```
Type: A
Name: www
Value: [IP-Adresse von Firebase, z.B. 151.101.1.195 und 151.101.65.195]
TTL: 3600 (oder Standard)
```

**Bei All-Inkl:**
1. Klicken Sie **"DNS-Einstellungen bearbeiten"**
2. Fügen Sie einen **A-Record** hinzu:
   - **Hostname**: `www`
   - **Ziel**: Die IP-Adresse, die Firebase anzeigt (z.B. `151.101.1.195`)
   - Wiederholen Sie für alle IPs, die Firebase anzeigt
3. Speichern

#### Option B: CNAME (alternative Methode)

Falls Firebase einen CNAME vorschlägt:

```
Type: CNAME
Name: www
Value: lebenslauf-24.web.app (oder ähnlich)
TTL: 3600
```

**Bei All-Inkl:**
1. Fügen Sie einen **CNAME-Record** hinzu:
   - **Hostname**: `www`
   - **Ziel**: Der Wert, den Firebase anzeigt
2. Speichern

---

## Schritt 3: Verifizierung abwarten

### 3.1 DNS-Propagation

Nach dem Eintrag bei All-Inkl:

- **Wartezeit**: 5 Minuten bis 48 Stunden (meistens < 1 Stunde)
- Firebase prüft automatisch die DNS-Einträge
- Status wird in Firebase Console angezeigt

### 3.2 Status prüfen

In Firebase Console sehen Sie:

- ⏳ **Pending**: DNS-Einträge werden geprüft
- ✅ **Connected**: Domain ist verbunden
- ❌ **Error**: DNS-Einträge falsch oder nicht gefunden

---

## Schritt 4: SSL-Zertifikat (automatisch)

Firebase erstellt automatisch ein **kostenloses SSL-Zertifikat** über Let's Encrypt.

**Wartezeit**: 5-30 Minuten nach DNS-Verifizierung

**Status prüfen:**
- In Firebase Console unter "Hosting" → "Custom domains"
- Sobald grüner Haken: SSL aktiv
- `https://www.lebenslauf-24.de` sollte funktionieren

---

## Schritt 5: Root-Domain (lebenslauf-24.de) Weiterleitung

### Optional: Weiterleitung von lebenslauf-24.de → www.lebenslauf-24.de

Falls Nutzer `lebenslauf-24.de` (ohne www) eingeben:

#### Bei All-Inkl:

1. **Domain-Weiterleitungen** im KAS
2. Neue Weiterleitung erstellen:
   - **Von**: `lebenslauf-24.de`
   - **Nach**: `https://www.lebenslauf-24.de`
   - **Typ**: 301 (permanent)
   - **HTTPS**: Ja

**Alternativ:** Auch Root-Domain in Firebase hinzufügen:

1. In Firebase Console: "Add custom domain"
2. Eingeben: `lebenslauf-24.de` (ohne www)
3. DNS-Einträge ebenfalls bei All-Inkl eintragen
4. Firebase leitet automatisch auf www um

---

## Troubleshooting

### Problem: "DNS records not found"

**Lösung:**
1. Prüfen Sie DNS mit: https://dnschecker.org/#A/www.lebenslauf-24.de
2. Warten Sie 1-2 Stunden (DNS-Propagation)
3. Prüfen Sie Tippfehler in All-Inkl DNS-Einstellungen

### Problem: "SSL certificate pending"

**Lösung:**
1. Warten Sie bis zu 24 Stunden
2. Falls weiterhin Fehler: Domain entfernen und neu hinzufügen
3. Prüfen Sie dass DNS korrekt ist

### Problem: "Domain already in use"

**Lösung:**
1. Domain ist evtl. mit anderem Firebase-Projekt verbunden
2. Entfernen Sie sie dort zuerst
3. Oder bei All-Inkl: Prüfen Sie, ob Domain noch auf anderen Server zeigt

---

## Testing

### Nach erfolgreicher Einrichtung:

```bash
# DNS-Auflösung testen
nslookup www.lebenslauf-24.de

# HTTPS testen
curl -I https://www.lebenslauf-24.de
```

**Im Browser:**
1. Öffnen Sie: https://www.lebenslauf-24.de
2. Sie sollten Ihre CV-Builder-App sehen
3. HTTPS-Schloss sollte grün sein
4. Zertifikat sollte gültig sein

---

## Nach Domain-Setup: Stripe Webhooks aktualisieren

**Wichtig:** Sobald www.lebenslauf-24.de funktioniert:

1. Gehen Sie zu: https://dashboard.stripe.com/test/webhooks
2. Erstellen Sie Webhook mit URL: `https://www.lebenslauf-24.de/api/stripe/webhook`
3. Events auswählen (siehe FIREBASE_FUNCTIONS_DEPLOYMENT.md)
4. Webhook Secret kopieren
5. In Firebase setzen:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   firebase deploy --only functions
   ```

---

## Zusammenfassung

**Was Sie tun müssen:**

1. ✅ Firebase Console → "Add custom domain" → `www.lebenslauf-24.de`
2. ✅ Firebase zeigt DNS-Einträge an (A-Record oder CNAME)
3. ✅ All-Inkl KAS → DNS-Einstellungen → Einträge hinzufügen
4. ⏳ Warten (5 Min - 48 Std)
5. ✅ Firebase verifiziert automatisch
6. ✅ SSL wird automatisch erstellt
7. ✅ https://www.lebenslauf-24.de funktioniert!

**Dann:**
- Stripe Webhooks auf www.lebenslauf-24.de aktualisieren
- Testing durchführen
- Trial-Funktionalität ist live!

---

**Bei Fragen oder Problemen:**
- Firebase Console Logs: https://console.firebase.google.com/project/lebenslauf-24/hosting
- DNS-Checker: https://dnschecker.org
- All-Inkl Support: https://all-inkl.com/wichtig/anleitungen/
