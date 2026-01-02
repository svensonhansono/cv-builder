"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, FileText } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const { login, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Zurücksetzen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl p-8 space-y-6">
          {/* Logo/Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Willkommen zurück</h1>
            <p className="text-foreground/60">Melde dich an um fortzufahren</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Reset Success Message */}
          {resetSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-400 space-y-2">
              <p className="font-semibold">E-Mail gesendet!</p>
              <p>Bitte überprüfen Sie Ihr Postfach und folgen Sie den Anweisungen zum Zurücksetzen Ihres Passworts.</p>
            </div>
          )}

          {/* Password Reset Form */}
          {showResetPassword && !resetSuccess ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-Mail-Adresse</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Wird gesendet..." : "Link senden"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmail("");
                    setError("");
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Login Form */}
              {!resetSuccess && <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Passwort</Label>
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Passwort vergessen?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Wird geladen..." : "Anmelden"}
            </Button>
          </form>}

              {/* Register Link */}
              {!resetSuccess && <div className="text-center text-sm">
                <span className="text-foreground/60">Noch kein Account? </span>
                <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                  Jetzt registrieren
                </Link>
              </div>}
            </>
          )}

          {/* Back to Home */}
          <div className="text-center">
            <Link href="/" className="text-sm text-foreground/60 hover:text-foreground transition-colors">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
