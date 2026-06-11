import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import { fetchMyContract, fetchFreelancerContract } from "../apiServices.js";

function statusLabel(value) {
  return String(value || "-").replaceAll("_", " ");
}

function StepCard({ step, title, description, action, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">{step}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
          Next step
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function MilestonePill({ status }) {
  const map = {
    pending: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-50 text-blue-700",
    submitted: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[status] || map.pending}`}>
      {statusLabel(status)}
    </span>
  );
}

export default function ProjectMilestones() {
  const { user } = useAuth();
  const { contractId } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadContract() {
      setLoading(true);
      setError("");
      try {
        const data =
          Number(user?.roleID) === 2
            ? await fetchMyContract(contractId)
            : await fetchFreelancerContract(contractId);
        if (active) {
          setContract(data?.contract || null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load project milestones.");
          setContract(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (contractId) loadContract();

    return () => {
      active = false;
    };
  }, [contractId, user?.roleID]);

  const milestones = contract?.milestones || [];
  const primaryMilestone = useMemo(
    () => milestones.find((item) => ["pending", "in_progress"].includes(item.mStatus)) || milestones[0] || null,
    [milestones],
  );
  const isClient = Number(user?.roleID) === 2;
  const contractPage = isClient ? "/client/contracts" : "/freelancer/contracts";
  const paymentLink =
    isClient && contract?.isFullySigned && primaryMilestone
      ? `/client/payment?contractId=${contract?.id}&milestoneId=${primaryMilestone.id}`
      : null;
  const paymentMessage = !isClient
    ? "Payment is handled by the client."
    : !contract?.isFullySigned
      ? "Both signatures are required before payment."
      : !primaryMilestone
        ? "Create a milestone before starting payment."
        : "";

  const nextSteps = [
    {
      step: "01",
      title: "Sign the contract",
      description: "Both sides must sign before the project can move forward.",
      tone: contract?.isFullySigned ? "emerald" : "blue",
      action: (
        <Link
          to={contractPage}
          className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Open contract page
        </Link>
      ),
    },
    {
      step: "02",
      title: "Make the payment",
      description: "The client pays the milestone (simulated / demo). Funds are held until approval.",
      tone: isClient ? "amber" : "slate",
      action: paymentLink ? (
        <Link
          to={paymentLink}
          className="inline-flex rounded-2xl bg-[#1a3c2e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#214b38]"
        >
          Go to payment page
        </Link>
      ) : (
        <p className="text-sm text-slate-500">{paymentMessage}</p>
      ),
    },
    {
      step: "03",
      title: "Work on milestones",
      description: "Freelancers move milestones to in progress, then submit them for review.",
      tone: "slate",
      action: (
        <Link
          to={isClient ? "/client/contracts" : "/freelancer/contracts"}
          className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Open milestone board
        </Link>
      ),
    },
    {
      step: "04",
      title: "Approve and review",
      description: "Clients approve milestones, then leave a review after completion.",
      tone: "emerald",
      action: (
        <Link
          to={isClient ? "/client/contracts" : "/freelancer/contracts"}
          className="inline-flex rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Continue to reviews
        </Link>
      ),
    },
  ];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Project milestones</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Next steps</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Follow the project flow from signing the contract to payment, milestone work, approval, and review.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current contract</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{contract?.projectTitle || "Loading..."}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Status: <span className="font-semibold text-slate-900">{statusLabel(contract?.cStatus)}</span>
                </p>
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Loading project milestones...
              </div>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-2">
                  {nextSteps.map((step) => (
                    <StepCard key={step.step} {...step} />
                  ))}
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Milestone list</h2>
                        <p className="mt-1 text-sm text-slate-600">Track the current stage of each project milestone.</p>
                      </div>
                      {contract?.isFullySigned ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Contract signed
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Waiting for signatures
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-3">
                      {milestones.length === 0 ? (
                        <p className="text-sm text-slate-500">No milestones have been created yet.</p>
                      ) : (
                        milestones.map((milestone, index) => (
                          <div
                            key={milestone.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                    Step {index + 1}
                                  </span>
                                  <MilestonePill status={milestone.mStatus} />
                                </div>
                                <h3 className="mt-3 text-lg font-semibold text-slate-900">{milestone.title}</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{milestone.mDesc}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Amount</p>
                                <p className="mt-1 font-semibold text-slate-900">${Number(milestone.amountPayable || 0).toLocaleString()}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                  Due: {milestone.dueDate ? String(milestone.dueDate).slice(0, 10) : "No due date"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#eef5ef] to-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">Project snapshot</h2>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <InfoRow label="Client" value={contract?.clientName || "-"} />
                      <InfoRow label="Freelancer" value={contract?.freelancerName || "-"} />
                      <InfoRow label="Total amount" value={contract?.totalAmount != null ? `$${Number(contract.totalAmount).toLocaleString()}` : "-"} />
                      <InfoRow label="Start date" value={contract?.startDate ? String(contract.startDate).slice(0, 10) : "-"} />
                      <InfoRow label="End date" value={contract?.endDate ? String(contract.endDate).slice(0, 10) : "-"} />
                    </div>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Quick links</p>
                      <div className="mt-4 flex flex-col gap-3">
                        <Link to={contractPage} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                          Go to contract page
                        </Link>
                        {paymentLink ? (
                          <Link to={paymentLink} className="rounded-2xl bg-[#1a3c2e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#214b38]">
                            Go to payment page
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
