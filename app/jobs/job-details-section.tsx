"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface JobDetailsProps {
  refNr: string;
}

interface JobDetails {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  captchaImage?: string;
  captchaId?: string;
  contactInfo?: {
    employer?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function JobDetailsSection({ refNr }: JobDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaSolution, setCaptchaSolution] = useState("");
  const [solvingCaptcha, setSolvingCaptcha] = useState(false);
  const [contactLoaded, setContactLoaded] = useState(false);

  // Lade Job-Details beim Mount
  useEffect(() => {
    loadJobDetails();
  }, [refNr]);

  const loadJobDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/arbeitsagentur/job-details?refNr=${refNr}`);
      if (!response.ok) throw new Error("Fehler beim Laden der Job-Details");

      const data = await response.json();
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleSolveCaptcha = async () => {
    if (!captchaSolution.trim() || !details?.captchaId) return;

    setSolvingCaptcha(true);
    setError(null);

    try {
      const response = await fetch("/api/arbeitsagentur/solve-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refNr,
          captchaId: details.captchaId,
          solution: captchaSolution,
        }),
      });

      if (!response.ok) throw new Error("CAPTCHA-Lösung falsch oder abgelaufen");

      const data = await response.json();
      setDetails((prev) => ({ ...prev!, contactInfo: data.contactInfo }));
      setContactLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Lösen des CAPTCHAs");
    } finally {
      setSolvingCaptcha(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-3 text-foreground/60">Lade vollständige Details...</span>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-semibold">Fehler beim Laden</p>
          <p className="text-sm text-red-200/70 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Jobbeschreibung */}
      {details?.description && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
            Tätigkeitsbeschreibung
          </h4>
          <div className="glass rounded-lg p-4 border border-purple-500/20">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: details.description }}
            />
          </div>
        </div>
      )}

      {/* Anforderungen */}
      {details?.requirements && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
            Anforderungen
          </h4>
          <div className="glass rounded-lg p-4 border border-purple-500/20">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: details.requirements }}
            />
          </div>
        </div>
      )}

      {/* Benefits */}
      {details?.benefits && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
            Unser Angebot
          </h4>
          <div className="glass rounded-lg p-4 border border-purple-500/20">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: details.benefits }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
