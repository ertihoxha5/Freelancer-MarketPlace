import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import PaymentForm from "../components/PaymentForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { confirmPayment, createPaymentIntent, fetchMyContract } from "../apiServices.js";

export default function ClientPayment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get("contractId");
  const milestoneId = searchParams.get("milestoneId");
  const [contract, setContract] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMyContract(contractId);
        const loadedContract = data?.contract || null;
        const loadedMilestone = loadedContract?.milestones?.find((item) => String(item.id) === String(milestoneId))
          || loadedContract?.milestones?.find((item) => ["pending", "in_progress"].includes(item.mStatus))
          || loadedContract?.milestones?.[0]
          || null;

        if (active) {
          setContract(loadedContract);
          setMilestone(loadedMilestone);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load payment details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (contractId) loadData();
    else setError("Missing contract ID.");

    return () => {
      active = false;
    };
  }, [contractId, milestoneId]);

  useEffect(() => {
    let active = true;

    async function prepareCheckout() {
      if (!contract || !milestone) return;
      setPaymentLoading(true);
      try {
        const data = await createPaymentIntent({
          contractID: contract.id,
          milestoneID: milestone.id,
          amount: Number(milestone.amountPayable || 0),
        });
        if (active) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to start checkout.");
      } finally {
        if (active) setPaymentLoading(false);
      }
    }

    prepareCheckout();
    return () => {
      active = false;
    };
  }, [contract, milestone]);

  const amountLabel = useMemo(() => {
    if (!milestone) return "";
    return `Total: $${Number(milestone.amountPayable || 0).toLocaleString()} USD`;
  }, [milestone]);

  async function handleSuccess() {
    if (paymentIntentId) {
      try {
        await confirmPayment(paymentIntentId);
      } catch {
        /* webhook may already have synced */
      }
    }
    navigate("/client/contracts", { replace: true });
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Payment</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Milestone payment</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Pay the milestone (simulated). Funds will be held safely until you approve the completed work.
                </p>
              </div>
              <Link
                to={`/project-milestones/${contractId}`}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Back to milestones
              </Link>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Loading payment details...
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Checkout</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {contract?.projectTitle || "Project"} · {milestone?.title || "Milestone"}
                  </p>
                  <p className="mt-2 text-xs text-emerald-700">
                    Demo mode — simulated payment. No real charges. Funds are held until milestone approval.
                  </p>
                  <div className="mt-4">
                    {paymentLoading ? (
                      <p className="text-sm text-slate-500">Preparing payment…</p>
                    ) : (
                      <PaymentForm
                        clientSecret={clientSecret}
                        amountLabel={amountLabel}
                        onSuccess={handleSuccess}
                        onError={(msg) => setError(msg)}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#eef5ef] to-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Payment summary</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <SummaryRow label="Contract" value={`#${contract?.id || "-"}`} />
                    <SummaryRow label="Project" value={contract?.projectTitle || "-"} />
                    <SummaryRow label="Milestone" value={milestone?.title || "-"} />
                    <SummaryRow label="Milestone status" value={milestone?.mStatus || "-"} />
                    <SummaryRow
                      label="Amount"
                      value={milestone?.amountPayable != null ? `$${Number(milestone.amountPayable).toLocaleString()}` : "-"}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
