import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ReviewModal from "../components/ReviewModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PaymentForm from "../components/PaymentForm.jsx";
import {
  confirmPayment,
  createMilestone,
  createPaymentIntent,
  downloadExport,
  fetchMyContract,
  fetchMyContracts,
  signContract,
  updateMilestoneStatus,
} from "../apiServices.js";
import { exportCSV, exportJSON } from "../utils/export.js";

const statusClass = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  terminated: "bg-red-50 text-red-700",
  pending: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

function Badge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[status] || statusClass.pending}`}>
      {String(status || "-").replace("_", " ")}
    </span>
  );
}

export default function ClientContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [milestoneContract, setMilestoneContract] = useState(null);
  const [reviewContract, setReviewContract] = useState(null);
  const [payMilestone, setPayMilestone] = useState(null);
  const [payContract, setPayContract] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [agreementChecks, setAgreementChecks] = useState({});
  const [form, setForm] = useState({
    title: "",
    mDesc: "",
    amountPayable: "",
    dueDate: "",
  });

  useEffect(() => {
    fetchMyContracts()
      .then((data) => setContracts(Array.isArray(data.contracts) ? data.contracts : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load contracts."))
      .finally(() => setLoading(false));
  }, []);

  const exportRows = useMemo(
    () =>
      contracts.map((contract) => ({
        id: contract.id,
        projectTitle: contract.projectTitle,
        freelancerName: contract.freelancerName,
        status: contract.cStatus,
        totalAmount: contract.totalAmount,
        startDate: contract.startDate,
      })),
    [contracts],
  );

  async function toggleContract(contract) {
    if (expanded === contract.id) {
      setExpanded(null);
      return;
    }
    setExpanded(contract.id);
    if (!details[contract.id]) {
      const data = await fetchMyContract(contract.id);
      setDetails((current) => ({ ...current, [contract.id]: data.contract }));
    }
  }

  async function reloadContract(contractId) {
    const data = await fetchMyContract(contractId);
    setDetails((current) => ({ ...current, [contractId]: data.contract }));
    setContracts((current) =>
      current.map((contract) =>
        contract.id === contractId
          ? { ...contract, ...data.contract, milestones: undefined }
          : contract,
      ),
    );
  }

  async function handleSignContract(contractId) {
    try {
      await signContract(contractId, "client");
      setAgreementChecks((current) => ({ ...current, [contractId]: false }));
      await reloadContract(contractId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign contract.");
    }
  }

  async function handleMilestoneSubmit(event) {
    event.preventDefault();
    if (!milestoneContract) return;
    try {
      await createMilestone(milestoneContract.id, {
        ...form,
        amountPayable: Number(form.amountPayable),
      });
      setMilestoneContract(null);
      setForm({ title: "", mDesc: "", amountPayable: "", dueDate: "" });
      await reloadContract(milestoneContract.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create milestone.");
    }
  }

  async function setMilestoneStatus(milestone, status) {
    try {
      await updateMilestoneStatus(milestone.id, status, "client");
      await reloadContract(milestone.contractID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update milestone.");
    }
  }

  async function openMilestonePayment(contract, milestone) {
    setError("");
    setPayContract(contract);
    setPayMilestone(milestone);
    setClientSecret("");
    setPaymentIntentId("");
    setPaymentLoading(true);
    try {
      const data = await createPaymentIntent({
        contractID: contract.id,
        milestoneID: milestone.id,
        amount: Number(milestone.amountPayable),
      });
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setPayMilestone(null);
      setPayContract(null);
    } finally {
      setPaymentLoading(false);
    }
  }

  function closePaymentModal() {
    setPayMilestone(null);
    setPayContract(null);
    setClientSecret("");
    setPaymentIntentId("");
  }

  async function handlePaymentSuccess() {
    if (paymentIntentId) {
      try {
        await confirmPayment(paymentIntentId);
      } catch {
        /* webhook may already have synced */
      }
    }
    const contractId = payContract?.id;
    closePaymentModal();
    if (contractId) {
      await reloadContract(contractId);
    }
  }

  function markReviewed(contractId) {
    setContracts((current) =>
      current.map((contract) =>
        contract.id === contractId ? { ...contract, hasReviewed: true } : contract,
      ),
    );
    setDetails((current) => ({
      ...current,
      [contractId]: current[contractId]
        ? { ...current[contractId], hasReviewed: true }
        : current[contractId],
    }));
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Contracts</h1>
                <p className="mt-2 text-slate-600">Manage contracts, milestones, and reviews.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportCSV(exportRows, "client-contracts")} className="rounded-lg border px-3 py-2 text-sm">CSV</button>
                <button onClick={() => downloadExport("contracts", "xlsx").catch((err) => setError(err.message))} className="rounded-lg border px-3 py-2 text-sm">Excel</button>
                <button onClick={() => exportJSON(exportRows, "client-contracts")} className="rounded-lg border px-3 py-2 text-sm">JSON</button>
              </div>
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {loading ? <div className="rounded-lg border p-6 text-slate-500">Loading contracts...</div> : null}
            {!loading && contracts.length === 0 ? (
              <EmptyState
                title="No contracts yet"
                description="Accepted proposals will appear here as active contracts."
              />
            ) : null}

            <div className="space-y-4">
              {contracts.map((contract) => {
                const detail = details[contract.id];
                const milestones = detail?.milestones || [];
                const hasReviewed = detail?.hasReviewed ?? contract.hasReviewed;
                return (
                  <article key={contract.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <button onClick={() => toggleContract(contract)} className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{contract.projectTitle}</h2>
                        <p className="mt-1 text-sm text-slate-500">{contract.freelancerName} · ${contract.totalAmount ?? 0} · {contract.startDate ? String(contract.startDate).slice(0, 10) : "-"}</p>
                      </div>
                      <Badge status={contract.cStatus} />
                    </button>

                    {expanded === contract.id ? (
                      <div className="border-t border-slate-200 p-5">
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Contract Agreement</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Both parties must sign before milestone progress and payments can continue.
                          </p>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p>Client signed: {contract.clientSignedAt ? String(contract.clientSignedAt).slice(0, 10) : "Pending"}</p>
                            <p>Freelancer signed: {contract.freelancerSignedAt ? String(contract.freelancerSignedAt).slice(0, 10) : "Pending"}</p>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <input
                              id={`client-agree-${contract.id}`}
                              type="checkbox"
                              checked={Boolean(agreementChecks[contract.id])}
                              onChange={(e) =>
                                setAgreementChecks((current) => ({
                                  ...current,
                                  [contract.id]: e.target.checked,
                                }))
                              }
                              disabled={Boolean(contract.clientSignedAt)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <label htmlFor={`client-agree-${contract.id}`} className="text-sm text-slate-700">
                              I agree to the contract terms and want to sign this agreement.
                            </label>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSignContract(contract.id)}
                              disabled={Boolean(contract.clientSignedAt) || !agreementChecks[contract.id]}
                              className="rounded-lg bg-[#1f3a2d] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {contract.clientSignedAt ? "Signed" : "Sign Contract"}
                            </button>
                            {contract.isFullySigned ? (
                              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                                Fully signed
                              </span>
                            ) : (
                              <span className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                                Waiting for both signatures
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => setMilestoneContract(contract)}
                            disabled={!contract.isFullySigned}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Create Milestone
                          </button>
                          <Link
                            to={`/project-milestones/${contract.id}`}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Project milestones
                          </Link>
                          {contract.cStatus === "completed" && !hasReviewed ? (
                            <button onClick={() => setReviewContract(contract)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Leave Review</button>
                          ) : null}
                        </div>
                        {milestones.length === 0 ? <p className="text-sm text-slate-500">No milestones created.</p> : null}
                        <div className="space-y-3">
                          {milestones.map((milestone) => (
                            <div key={milestone.id} className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-900">{milestone.title}</h3>
                                <p className="mt-1 text-sm text-slate-600">{milestone.mDesc}</p>
                                <p className="mt-1 text-xs text-slate-500">${milestone.amountPayable} · {milestone.dueDate ? String(milestone.dueDate).slice(0, 10) : "No due date"}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge status={milestone.mStatus} />
                                {contract.cStatus === "active" &&
                                contract.isFullySigned &&
                                ["pending", "in_progress"].includes(milestone.mStatus) ? (
                                  <button
                                    type="button"
                                    onClick={() => openMilestonePayment(contract, milestone)}
                                    className="rounded-lg bg-[#2f4f2f] px-3 py-1.5 text-xs font-semibold text-white"
                                  >
                                    Pay milestone
                                  </button>
                                ) : null}
                                {milestone.mStatus === "submitted" ? (
                                  <>
                                    <button onClick={() => setMilestoneStatus(milestone, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                                    <button onClick={() => setMilestoneStatus(milestone, "rejected")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Reject</button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                        {!contract.isFullySigned ? (
                          <p className="mt-4 text-sm text-amber-700">
                            Contract signatures are required before milestone payments and progress updates continue.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {milestoneContract ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Create Milestone</h2>
            <form onSubmit={handleMilestoneSubmit} className="mt-4 space-y-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border px-3 py-2" />
              <textarea value={form.mDesc} onChange={(e) => setForm({ ...form, mDesc: e.target.value })} placeholder="Description" rows={4} className="w-full rounded-lg border px-3 py-2" />
              <input type="number" value={form.amountPayable} onChange={(e) => setForm({ ...form, amountPayable: e.target.value })} placeholder="Amount" className="w-full rounded-lg border px-3 py-2" />
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setMilestoneContract(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {payMilestone && payContract ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Pay milestone</h2>
            <p className="mt-1 text-sm text-slate-600">
              {payMilestone.title} · ${payMilestone.amountPayable}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Funds are held until you approve the submitted milestone work.
            </p>
            <div className="mt-4">
              {paymentLoading ? (
                <p className="text-sm text-slate-500">Loading secure checkout…</p>
              ) : (
                <PaymentForm
                  clientSecret={clientSecret}
                  amountLabel={`Total: $${payMilestone.amountPayable} USD`}
                  onSuccess={handlePaymentSuccess}
                  onError={(msg) => setError(msg)}
                />
              )}
            </div>
            <button
              type="button"
              onClick={closePaymentModal}
              className="mt-4 w-full rounded-lg border px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {reviewContract ? (
        <ReviewModal
          contract={reviewContract}
          role="client"
          onClose={() => setReviewContract(null)}
          onSubmitted={() => markReviewed(reviewContract.id)}
        />
      ) : null}
    </div>
  );
}
