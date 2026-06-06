import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ReviewModal from "../components/ReviewModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createContractDispute,
  fetchFreelancerContract,
  fetchFreelancerContracts,
  signContract,
  updateMilestoneStatus,
} from "../apiServices.js";

const statusClass = {
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
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[status] || "bg-slate-100 text-slate-700"}`}>
      {String(status || "-").replace("_", " ")}
    </span>
  );
}

export default function FreelancerContracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [details, setDetails] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [reviewContract, setReviewContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agreementChecks, setAgreementChecks] = useState({});
  const [disputeContract, setDisputeContract] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    fetchFreelancerContracts()
      .then((data) => setContracts(Array.isArray(data.contracts) ? data.contracts : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load contracts."))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const totalEarned = contracts
      .filter((contract) => ["active", "completed"].includes(contract.cStatus))
      .reduce((sum, contract) => sum + Number(contract.totalAmount || 0), 0);
    const pendingPayment = contracts
      .filter((contract) => contract.cStatus === "active")
      .reduce((sum, contract) => sum + Number(contract.totalAmount || 0), 0);
    return { totalEarned, pendingPayment };
  }, [contracts]);

  async function toggleContract(contract) {
    if (expanded === contract.id) {
      setExpanded(null);
      return;
    }
    setExpanded(contract.id);
    if (!details[contract.id]) {
      const data = await fetchFreelancerContract(contract.id);
      setDetails((current) => ({ ...current, [contract.id]: data.contract }));
    }
  }

  async function reloadContract(contractId) {
    const data = await fetchFreelancerContract(contractId);
    setDetails((current) => ({ ...current, [contractId]: data.contract }));
    setContracts((current) =>
      current.map((contract) =>
        contract.id === contractId ? { ...contract, ...data.contract, milestones: undefined } : contract,
      ),
    );
  }

  async function handleSignContract(contractId) {
    try {
      await signContract(contractId, "freelancer");
      setAgreementChecks((current) => ({ ...current, [contractId]: false }));
      await reloadContract(contractId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign contract.");
    }
  }

  async function setMilestoneStatus(milestone, status) {
    try {
      await updateMilestoneStatus(milestone.id, status, "freelancer");
      await reloadContract(milestone.contractID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update milestone.");
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

  async function handleDisputeSubmit(event) {
    event.preventDefault();
    if (!disputeContract) return;
    try {
      await createContractDispute(
        disputeContract.id,
        { reason: disputeReason },
        "freelancer",
      );
      const contractId = disputeContract.id;
      setDisputeContract(null);
      setDisputeReason("");
      await reloadContract(contractId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit dispute.");
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Contracts</h1>
              <p className="mt-2 text-slate-600">Track active work, submit milestones, and review completed clients.</p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total earned</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">${summary.totalEarned.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Pending payment</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">${summary.pendingPayment.toLocaleString()}</p>
              </div>
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {loading ? <div className="rounded-lg border p-6 text-slate-500">Loading contracts...</div> : null}
            {!loading && contracts.length === 0 ? (
              <EmptyState
                title="No contracts yet"
                description="Contracts will appear here after a client accepts one of your proposals."
              />
            ) : null}

            <div className="space-y-4">
              {contracts.map((contract) => {
                const detail = details[contract.id];
                const milestones = detail?.milestones || [];
                const disputes = detail?.disputes || [];
                const hasReviewed = detail?.hasReviewed ?? contract.hasReviewed;
                return (
                  <article key={contract.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <button onClick={() => toggleContract(contract)} className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{contract.projectTitle}</h2>
                        <p className="mt-1 text-sm text-slate-500">{contract.clientName} · ${contract.totalAmount ?? 0} · {contract.startDate ? String(contract.startDate).slice(0, 10) : "-"}</p>
                      </div>
                      <Badge status={contract.cStatus} />
                    </button>

                    {expanded === contract.id ? (
                      <div className="border-t border-slate-200 p-5">
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Contract Agreement</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Please review the project statement and sign before you start or submit milestones.
                          </p>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p>Client signed: {contract.clientSignedAt ? String(contract.clientSignedAt).slice(0, 10) : "Pending"}</p>
                            <p>Freelancer signed: {contract.freelancerSignedAt ? String(contract.freelancerSignedAt).slice(0, 10) : "Pending"}</p>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <input
                              id={`freelancer-agree-${contract.id}`}
                              type="checkbox"
                              checked={Boolean(agreementChecks[contract.id])}
                              onChange={(e) =>
                                setAgreementChecks((current) => ({
                                  ...current,
                                  [contract.id]: e.target.checked,
                                }))
                              }
                              disabled={Boolean(contract.freelancerSignedAt)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            <label htmlFor={`freelancer-agree-${contract.id}`} className="text-sm text-slate-700">
                              I agree to the contract terms and want to sign this agreement.
                            </label>
                          </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSignContract(contract.id)}
                            disabled={Boolean(contract.freelancerSignedAt) || !agreementChecks[contract.id]}
                              className="rounded-lg bg-[#1f3a2d] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {contract.freelancerSignedAt ? "Signed" : "Sign Contract"}
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
                            <Link
                              to={`/project-milestones/${contract.id}`}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Project milestones
                            </Link>
                            {contract.isFullySigned && (
                              <Link
                                to={`/contracts/${contract.id}/workspace`}
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                              >
                                Open Workspace
                              </Link>
                            )}
                          </div>
                        </div>
                        {contract.cStatus === "completed" && !hasReviewed ? (
                          <button onClick={() => setReviewContract(contract)} className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Leave Review</button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeContract(contract);
                            setDisputeReason("");
                          }}
                          className="mb-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Dispute Contract
                        </button>
                        {disputes.length > 0 ? (
                          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4">
                            <h3 className="text-sm font-semibold text-red-800">Disputes</h3>
                            <div className="mt-3 space-y-2">
                              {disputes.map((dispute) => (
                                <div key={dispute.id} className="text-sm text-red-900">
                                  <p className="font-medium capitalize">{String(dispute.dStatus).replace("_", " ")}</p>
                                  <p className="mt-1">{dispute.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {milestones.length === 0 ? <p className="text-sm text-slate-500">No milestones assigned.</p> : null}
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
                                {milestone.mStatus === "pending" ? (
                                  <button
                                    onClick={() => setMilestoneStatus(milestone, "in_progress")}
                                    disabled={!contract.isFullySigned}
                                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Start
                                  </button>
                                ) : null}
                                {milestone.mStatus === "in_progress" ? (
                                  <button
                                    onClick={() => setMilestoneStatus(milestone, "submitted")}
                                    disabled={!contract.isFullySigned}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Submit for Review
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                        {!contract.isFullySigned ? (
                          <p className="mt-4 text-sm text-amber-700">
                            Contract signatures are required before milestone work can continue.
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

      {reviewContract ? (
        <ReviewModal
          contract={reviewContract}
          role="freelancer"
          onClose={() => setReviewContract(null)}
          onSubmitted={() => markReviewed(reviewContract.id)}
        />
      ) : null}

      {disputeContract ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Dispute Contract</h2>
            <p className="mt-1 text-sm text-slate-600">{disputeContract.projectTitle}</p>
            <form onSubmit={handleDisputeSubmit} className="mt-4 space-y-4">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain the dispute"
                rows={5}
                required
                minLength={10}
                maxLength={255}
                className="w-full rounded-lg border px-3 py-2"
              />
              <p className="text-xs text-slate-500">Use at least 10 characters.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDisputeContract(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                <button
                  disabled={disputeReason.trim().length < 10}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
