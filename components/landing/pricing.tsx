"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, X } from "lucide-react";
import Link from "next/link";

const freeFeatures = [
  "1 Lebenslauf-Vorlage (L1)",
  "1 Anschreiben-Vorlage (A1)",
  "PDF-Export für Free-Templates",
  "Cloud-Speicherung",
  "Live-Vorschau",
  "Auto-Speicherung",
];

const premiumFeatures = [
  "Alle 7 Lebenslauf-Vorlagen (L1-L7)",
  "Alle 7 Anschreiben-Vorlagen (A1-A7)",
  "Unbegrenzte PDF-Exporte",
  "Cloud-Speicherung",
  "Live-Vorschau",
  "Anpassbare Farben & Schriften",
  "Digitale Unterschrift",
  "Auto-Speicherung",
  "Neue Templates zuerst",
  "Prioritäts-Support",
];

export function Pricing() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold gradient-text">
            Einfach. Transparent. Fair.
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Starte kostenlos oder upgrade für alle Features
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="glass rounded-3xl p-8 relative overflow-hidden h-full flex flex-col">
              {/* Badge */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  Kostenlos
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8 pt-4">
                <h3 className="text-3xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold gradient-text">0€</span>
                  <span className="text-foreground/60">/Monat</span>
                </div>
                <p className="text-foreground/60 mt-2">Keine Kreditkarte erforderlich</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 flex-1">
                {freeFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-foreground/80 text-sm">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href="/register">
                <Button size="lg" className="w-full text-lg py-6" variant="outline">
                  Kostenlos starten
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative overflow-hidden h-full flex flex-col rounded-3xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border-2 border-yellow-400/50 p-8">
              {/* Badge */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                  <Crown className="w-4 h-4" />
                  Beliebt
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8 pt-4">
                <h3 className="text-3xl font-bold mb-2">Premium</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                    1,99€
                  </span>
                  <span className="text-foreground/60">/Monat</span>
                </div>
                <p className="text-foreground/60 mt-2">Jederzeit kündbar</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 flex-1">
                {premiumFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-yellow-400" />
                    </div>
                    <span className="text-foreground/80 text-sm font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href="/register">
                <Button size="lg" className="w-full text-lg py-6 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold">
                  <Crown className="w-5 h-5 mr-2" />
                  Premium wählen
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* FAQ or Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16 space-y-4"
        >
          <h3 className="text-2xl font-semibold">Häufig gestellte Fragen</h3>
          <div className="max-w-2xl mx-auto space-y-6 text-left">
            <div className="glass rounded-xl p-6">
              <h4 className="font-semibold mb-2">Was ist der Unterschied zwischen Free und Premium?</h4>
              <p className="text-foreground/60 text-sm">
                Mit Free hast du Zugriff auf je 1 Lebenslauf- und Anschreiben-Vorlage. Premium schaltet alle 7
                Lebenslauf- und 7 Anschreiben-Vorlagen frei, plus unbegrenzten PDF-Export für alle Templates.
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <h4 className="font-semibold mb-2">Kann ich jederzeit kündigen?</h4>
              <p className="text-foreground/60 text-sm">
                Ja! Premium hat keine Mindestlaufzeit. Du kannst jederzeit kündigen und behältst bis zum Ende deines
                Abrechnungszeitraums Zugriff auf alle Premium-Features.
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <h4 className="font-semibold mb-2">Werden meine Daten gespeichert?</h4>
              <p className="text-foreground/60 text-sm">
                Ja, deine Lebensläufe und Anschreiben werden sicher in der Cloud gespeichert.
                Du kannst von überall darauf zugreifen - sowohl als Free als auch als Premium-Nutzer.
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <h4 className="font-semibold mb-2">Welche Zahlungsmethoden werden akzeptiert?</h4>
              <p className="text-foreground/60 text-sm">
                Wir akzeptieren alle gängigen Kreditkarten über unseren sicheren Zahlungsanbieter Stripe.
                Deine Zahlungsdaten sind bei uns sicher.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
