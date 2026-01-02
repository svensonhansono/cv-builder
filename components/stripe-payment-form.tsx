"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  sessionId: string;
  onSuccess: (customToken: string) => void;
  onError: (error: string) => void;
}

function PaymentForm({ clientSecret, sessionId, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Confirm the setup intent
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard?trial=started",
        },
        redirect: "if_required",
      });

      if (submitError) {
        throw new Error(submitError.message);
      }

      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error("Zahlungsmethode konnte nicht verifiziert werden");
      }

      // Complete registration on backend
      const response = await fetch("/api/stripe/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          setupIntentId: setupIntent.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Abschließen der Registrierung");
      }

      // Success!
      onSuccess(data.customToken);
    } catch (err: any) {
      onError(err.message || "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 pointer-events-auto"
        disabled={!stripe || loading}
      >
        {loading ? (
          "Verarbeitung..."
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            Zahlungsmethode hinterlegen & starten
          </span>
        )}
      </Button>
    </form>
  );
}

export function StripePaymentForm({ clientSecret, sessionId, onSuccess, onError }: PaymentFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: "night" as const,
      variables: {
        colorPrimary: "#8b5cf6",
        colorBackground: "#1a1a2e",
        colorText: "#e5e7eb",
        colorDanger: "#ef4444",
        fontFamily: 'Montserrat, system-ui, sans-serif',
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        sessionId={sessionId}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
