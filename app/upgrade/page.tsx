"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function UpgradePage() {
  const { user, isPremium } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create checkout session via Firebase Function
      const response = await fetch("https://us-central1-lebenslauf-24.cloudfunctions.net/createCheckoutSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err: any) {
      console.error("Upgrade error:", err);
      setError(err.message || "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Upgrade auf Premium
            </h1>
            <p className="text-xl text-white/70">
              Erstelle jetzt ein Konto und erhalte Zugriff auf alle Funktionen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Free Plan */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-4xl font-bold text-white mb-6">
                0€<span className="text-lg text-white/60">/Monat</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-white/80">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>1 Lebenslauf-Vorlage</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>1 Anschreiben-Vorlage</span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>PDF-Export (Basic)</span>
                </li>
              </ul>
              <Button
                onClick={() => router.push("/register")}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                Kostenlos starten
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 backdrop-blur-lg rounded-2xl p-8 border-2 border-yellow-400/50 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <div className="text-4xl font-bold text-white mb-6">
                1,99€<span className="text-lg text-white/60">/Monat</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-white">
                  <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">Alle 7 Lebenslauf-Vorlagen</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">Alle 7 Anschreiben-Vorlagen</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">Unbegrenzter PDF-Export</span>
                </li>
                <li className="flex items-start gap-3 text-white">
                  <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold">Jederzeit kündbar</span>
                </li>
              </ul>
              <Button
                onClick={() => router.push("/register")}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold py-6 text-lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Jetzt registrieren
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/60 mb-4">Bereits registriert?</p>
            <Button onClick={() => router.push("/login")} variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Jetzt anmelden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isPremium()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Sie sind bereits Premium!
          </h1>
          <p className="text-white/70 mb-8">
            Sie haben Zugriff auf alle Funktionen und Templates.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-white text-purple-900 hover:bg-white/90"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <Button
          onClick={() => router.push("/dashboard")}
          variant="ghost"
          className="text-white hover:bg-white/10 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
            <div className="text-4xl font-bold text-white mb-6">
              €0<span className="text-lg text-white/60">/Monat</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-white/80">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>1 Lebenslauf-Vorlage (L1)</span>
              </li>
              <li className="flex items-start gap-3 text-white/80">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>1 Anschreiben-Vorlage (A1)</span>
              </li>
              <li className="flex items-start gap-3 text-white/80">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>PDF-Export für Free-Templates</span>
              </li>
              <li className="flex items-start gap-3 text-white/40 line-through">
                <span className="w-5 h-5 flex-shrink-0"></span>
                <span>Alle Premium-Vorlagen</span>
              </li>
              <li className="flex items-start gap-3 text-white/40 line-through">
                <span className="w-5 h-5 flex-shrink-0"></span>
                <span>PDF-Export für alle Templates</span>
              </li>
            </ul>

            <div className="text-center text-white/60 text-sm">
              Aktueller Plan
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 backdrop-blur-lg rounded-2xl p-8 border-2 border-yellow-400/50 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
            <div className="text-4xl font-bold text-white mb-6">
              €1,99<span className="text-lg text-white/60">/Monat</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">
                  Alle 7 Lebenslauf-Vorlagen (L1-L7)
                </span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">
                  Alle 7 Anschreiben-Vorlagen (A1-A7)
                </span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">
                  Unbegrenzter PDF-Export für alle Templates
                </span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">Neue Templates zuerst</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">
                  Jederzeit kündbar - keine Mindestlaufzeit
                </span>
              </li>
            </ul>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold py-6 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Jetzt auf Premium upgraden
                </>
              )}
            </Button>

            <p className="text-center text-white/60 text-xs mt-4">
              Sichere Zahlung über Stripe • Jederzeit kündbar
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-white/60 text-sm">
          <p>
            Durch den Kauf akzeptieren Sie unsere{" "}
            <a href="#" className="underline hover:text-white">
              AGB
            </a>{" "}
            und{" "}
            <a href="#" className="underline hover:text-white">
              Datenschutzerklärung
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
