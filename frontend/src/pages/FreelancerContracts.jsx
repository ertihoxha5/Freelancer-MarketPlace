import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ReviewModal from "../components/ReviewModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchFreelancerContract,
  fetchFreelancerContracts,
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
                        {contract.cStatus === "completed" && !hasReviewed ? (
                          <button onClick={() => setReviewContract(contract)} className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Leave Review</button>
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
                                  <button onClick={() => setMilestoneStatus(milestone, "in_progress")} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Start</button>
                                ) : null}
                                {milestone.mStatus === "in_progress" ? (
                                  <button onClick={() => setMilestoneStatus(milestone, "submitted")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Submit for Review</button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
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
    </div>
  );
}
