import { useEffect, useState } from "react";

// Optional real Stripe support (only loaded/used when a real key + real clientSecret are present)
let StripeLibs = null;
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

async function loadStripeIfNeeded() {
  if (!publishableKey) return null;
  if (StripeLibs) return StripeLibs;
  try {
    const mod = await import("@stripe/stripe-js");
    const reactMod = await import("@stripe/react-stripe-js");
    StripeLibs = { loadStripe: mod.loadStripe, Elements: reactMod.Elements, PaymentElement: reactMod.PaymentElement, useElements: reactMod.useElements, useStripe: reactMod.useStripe };
    return StripeLibs;
  } catch {
    return null;
  }
}

const isMockClientSecret = (secret) =>
  !secret || secret.startsWith("mock_") || secret.includes("mock_client_secret");

/**
 * Simulated (demo) checkout – no Stripe involved.
 * This matches the backend mock payment flow (createPaymentIntent + confirmPayment).
 */
function SimulatedCheckout({ amountLabel, onSuccess, onError }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleMockPay() {
    setSubmitting(true);
    setMessage("");

    // Simulate network/processing delay for better UX
    await new Promise((r) => setTimeout(r, 650));

    try {
      // Signal success to parent. The parent is responsible for calling the real
      // backend confirmPayment(paymentIntentId) which marks it succeeded + holds funds.
      onSuccess?.({ status: "succeeded", id: "mock_payment" });
    } catch (err) {
      const msg = err?.message || "Simulated payment failed.";
      setMessage(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div className="font-semibold text-amber-800">Demo / Simulated Payment</div>
        <div className="mt-1 text-amber-700">
          No real money is charged. This creates a pending payment record and marks it succeeded (funds held in escrow until you approve the milestone).
        </div>
      </div>

      {amountLabel && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="text-slate-500">Amount to pay</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{amountLabel}</div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
        Simulated card: •••• 4242 (demo success)
      </div>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <button
        type="button"
        onClick={handleMockPay}
        disabled={submitting}
        className="w-full rounded-lg bg-[#2f4f2f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a5f3a] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {submitting ? "Processing simulation…" : "Pay now (simulated)"}
      </button>

      <p className="text-center text-[11px] text-slate-400">
        In a real deployment this step would use Stripe. Here it directly confirms via the platform.
      </p>
    </div>
  );
}

// Tiny real Stripe checkout (only when a proper key + real clientSecret exist)
function RealStripeCheckout({ clientSecret, onSuccess, onError }) {
  const [stripe, setStripe] = useState(null);
  const [ElementsComp, setElementsComp] = useState(null);
  const [PaymentElementComp, setPaymentElementComp] = useState(null);
  const [UseStripeHook, setUseStripeHook] = useState(null);
  const [UseElementsHook, setUseElementsHook] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Lazy load Stripe libs only for the real flow
  useEffect(() => {
    let cancelled = false;
    loadStripeIfNeeded().then((libs) => {
      if (cancelled || !libs) {
        if (!cancelled) setLoadError("Stripe libraries unavailable — using simulated mode.");
        return;
      }
      libs.loadStripe(publishableKey).then((s) => {
        if (cancelled) return;
        if (s) {
          setStripe(s);
          setElementsComp(() => libs.Elements);
          setPaymentElementComp(() => libs.PaymentElement);
          setUseStripeHook(() => libs.useStripe);
          setUseElementsHook(() => libs.useElements);
          setReady(true);
        } else {
          setLoadError("Failed to load Stripe.");
        }
      }).catch(() => {
        if (!cancelled) setLoadError("Could not initialize Stripe.");
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (loadError || !ready || !ElementsComp) {
    return (
      <p className="text-sm text-amber-700">
        {loadError || "Preparing real checkout…"}
      </p>
    );
  }

  const CheckoutForm = () => {
    const stripeHook = UseStripeHook ? UseStripeHook() : null;
    const elementsHook = UseElementsHook ? UseElementsHook() : null;
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!stripeHook || !elementsHook) return;

      setSubmitting(true);
      setMessage("");

      const { error, paymentIntent } = await stripeHook.confirmPayment({
        elements: elementsHook,
        redirect: "if_required",
      });

      if (error) {
        const errMsg = error.message || "Payment failed.";
        setMessage(errMsg);
        onError?.(errMsg);
        setSubmitting(false);
        return;
      }

      onSuccess?.(paymentIntent);
      setSubmitting(false);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElementComp />
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
        <button
          type="submit"
          disabled={!stripeHook || submitting}
          className="w-full rounded-lg bg-[#2f4f2f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a5f3a] disabled:bg-gray-400"
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>
      </form>
    );
  };

  return (
    <ElementsComp
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#2f4f2f", borderRadius: "8px" },
        },
      }}
    >
      <CheckoutForm />
    </ElementsComp>
  );
}

/**
 * PaymentForm – works for both real Stripe and the backend mock/simulated flow.
 *
 * When the backend returns a mock clientSecret (pi_mock_ / mock_client_secret_),
 * or when no VITE_STRIPE_PUBLISHABLE_KEY is set, it shows a clean simulated payment UI.
 */
export default function PaymentForm({ clientSecret, amountLabel, onSuccess, onError }) {
  const useMock = isMockClientSecret(clientSecret) || !publishableKey;

  if (!clientSecret) {
    return <p className="text-sm text-slate-500">Preparing checkout…</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {amountLabel ? (
        <p className="mb-3 text-sm font-medium text-slate-700">{amountLabel}</p>
      ) : null}

      {useMock ? (
        <SimulatedCheckout
          amountLabel={amountLabel}
          onSuccess={onSuccess}
          onError={onError}
        />
      ) : (
        <RealStripeCheckout
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      )}
    </div>
  );
}
