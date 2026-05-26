import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function CheckoutForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      const errMsg = error.message || "Payment failed.";
      setMessage(errMsg);
      onError?.(errMsg);
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess?.(paymentIntent);
    } else {
      setMessage(`Payment status: ${paymentIntent?.status || "processing"}`);
      onSuccess?.(paymentIntent);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-[#2f4f2f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a5f3a] disabled:bg-gray-400"
      >
        {submitting ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

/**
 * @param {{
 *   clientSecret: string;
 *   amountLabel?: string;
 *   onSuccess?: (paymentIntent: import('@stripe/stripe-js').PaymentIntent) => void;
 *   onError?: (message: string) => void;
 * }} props
 */
export default function PaymentForm({
  clientSecret,
  amountLabel,
  onSuccess,
  onError,
}) {
  if (!publishableKey) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Stripe publishable key is missing. Set VITE_STRIPE_PUBLISHABLE_KEY in your frontend .env file.
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <p className="text-sm text-slate-500">Preparing secure checkout…</p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {amountLabel ? (
        <p className="mb-4 text-sm font-medium text-slate-700">{amountLabel}</p>
      ) : null}
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#2f4f2f",
              borderRadius: "8px",
            },
          },
        }}
      >
        <CheckoutForm onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
