"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, CreditCard, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SubscriptionPage() {
  const { user, subscription, isInTrial, getTrialDaysRemaining, loading } = useAuth();
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if not logged in
  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  const handleCancel = async () => {
    if (!confirm("Möchten Sie Ihr Abonnement wirklich kündigen? Sie behalten Zugriff bis zum Ende Ihrer Testphase oder Abrechnungsperiode.")) {
      return;
    }

    setCanceling(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Kündigen des Abonnements");
      }

      setSuccess("Abonnement erfolgreich gekündigt. Sie behalten Zugriff bis zum Ende der Periode.");
      // Reload page to update subscription status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Kündigen");
    } finally {
      setCanceling(false);
    }
  };

  const handleCustomerPortal = async () => {
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Öffnen des Kundenportals");
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Öffnen des Portals");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 animate-pulse">
            <Crown className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-foreground/60">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 lg:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="outline" className="mb-6 glass border-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </Link>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
            <Crown className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
            Ihr Abonnement
          </h1>
          <p className="text-foreground/60">
            Verwalten Sie Ihre Subscription und Zahlungsmethoden
          </p>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6 border border-red-500/20 bg-red-500/10"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6 border border-green-500/20 bg-green-500/10"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{success}</p>
            </div>
          </motion.div>
        )}

        {/* Subscription Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-2xl p-6 lg:p-8 border border-white/10 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Aktueller Status
              </h2>
              <p className="text-sm text-foreground/60">
                Ihre Subscription-Details
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              subscription?.tier === "premium"
                ? "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/50"
                : "bg-foreground/5 border border-foreground/10"
            }`}>
              <span className={`text-sm font-semibold ${
                subscription?.tier === "premium" ? "text-yellow-400" : "text-foreground/60"
              }`}>
                {subscription?.tier === "premium" ? "Premium" : "Free"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Trial Status */}
            {isInTrial() && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-purple-300">Testphase aktiv</h3>
                </div>
                <p className="text-sm text-foreground/70 mb-3">
                  Verbleibende Tage: <span className="font-bold text-purple-400">{getTrialDaysRemaining()}</span>
                </p>
                <p className="text-sm text-foreground/60">
                  Erste Abbuchung: {formatDate(subscription?.trialEndDate)}
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  1,99€/Monat ab {formatDate(subscription?.trialEndDate)}
                </p>
              </div>
            )}

            {/* Active Subscription */}
            {subscription?.status === "active" && !isInTrial() && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-green-300">Aktives Abonnement</h3>
                </div>
                <p className="text-sm text-foreground/70">
                  Ihre Premium-Subscription ist aktiv
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  1,99€/Monat · Beginn: {formatDate(subscription?.startDate)}
                </p>
              </div>
            )}

            {/* Canceled Subscription */}
            {subscription?.cancelAtPeriodEnd && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-yellow-300">Gekündigtes Abonnement</h3>
                </div>
                <p className="text-sm text-foreground/70 mb-2">
                  Ihr Abo wurde gekündigt. Sie behalten Premium-Zugang bis:
                </p>
                <p className="text-sm font-semibold text-yellow-400">
                  {formatDate(subscription?.trialEndDate || subscription?.endDate)}
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  Danach wird Ihr Account automatisch auf Free downgraded.
                </p>
              </div>
            )}

            {/* Free Tier */}
            {subscription?.tier === "free" && !subscription?.cancelAtPeriodEnd && (
              <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4">
                <h3 className="font-semibold text-foreground/80 mb-2">Free Tier</h3>
                <p className="text-sm text-foreground/60 mb-3">
                  Upgraden Sie auf Premium für alle Vorlagen
                </p>
                <Link href="/upgrade">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Crown className="w-4 h-4 mr-2" />
                    Jetzt upgraden
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Actions Card */}
        {subscription?.tier === "premium" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl p-6 lg:p-8 border border-white/10"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Aktionen
            </h2>

            <div className="space-y-4">
              {/* Stripe Customer Portal */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-foreground/5 border border-foreground/10">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-foreground/60" />
                  <div>
                    <h3 className="font-medium text-foreground">Zahlungsmethode verwalten</h3>
                    <p className="text-sm text-foreground/60">
                      Ändern Sie Ihre Kreditkarte oder SEPA-Lastschrift
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCustomerPortal}
                  variant="outline"
                  size="sm"
                  className="border-foreground/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Öffnen
                </Button>
              </div>

              {/* Cancel Subscription */}
              {!subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <h3 className="font-medium text-foreground">Abonnement kündigen</h3>
                      <p className="text-sm text-foreground/60">
                        Kündigen Sie Ihr Abo · Zugang bleibt bis Periodenende
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    disabled={canceling}
                    className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                  >
                    {canceling ? "Wird gekündigt..." : "Kündigen"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
