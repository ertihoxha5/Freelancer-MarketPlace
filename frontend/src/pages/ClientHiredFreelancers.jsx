import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ReviewModal from "../components/ReviewModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchMyContracts,
  fetchMyContract,
} from "../apiServices.js";

export default function ClientHiredFreelancers() {
  const { user } = useAuth();
  const [hiredFreelancers, setHiredFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewContract, setReviewContract] = useState(null);
  const [reviewedContracts, setReviewedContracts] = useState(new Set());

  useEffect(() => {
    let active = true;

    async function loadHiredFreelancers() {
      setLoading(true);
      setError("");
      try {
        const contractsData = await fetchMyContracts();
        const contracts = Array.isArray(contractsData?.contracts)
          ? contractsData.contracts
          : [];

        const freelancerMap = new Map();

        for (const contract of contracts) {
          const fid = contract.freelancerID;
          if (!fid) continue;

          if (!freelancerMap.has(fid)) {
            freelancerMap.set(fid, {
              id: fid,
              name: contract.freelancerName || "Unknown Freelancer",
              email: contract.freelancerEmail || "",
              contracts: [],
            });
          }

          const entry = freelancerMap.get(fid);
          entry.contracts.push(contract);
        }

        const enriched = [];
        for (const [fid, data] of freelancerMap.entries()) {
          let hasAnyReviewable = false;
          const contractDetails = [];

          for (const c of data.contracts) {
            try {
              const detail = await fetchMyContract(c.id);
              const hasReviewed = detail?.hasReviewed ?? false;
              if (!hasReviewed) hasAnyReviewable = true;
              contractDetails.push({ ...c, hasReviewed });
            } catch {
              contractDetails.push({ ...c, hasReviewed: false });
              hasAnyReviewable = true;
            }
          }

          enriched.push({
            ...data,
            contracts: data.contracts,
            contractDetails,
            canReview: hasAnyReviewable,
          });
        }

        if (active) {
          setHiredFreelancers(enriched);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load hired freelancers."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHiredFreelancers();
    return () => {
      active = false;
    };
  }, []);

  function markReviewed(contractId) {
    setReviewedContracts((prev) => new Set(prev).add(contractId));
  }

  function openReview(contract) {
    setReviewContract(contract);
  }

  function closeReview() {
    setReviewContract(null);
  }

  const totalHired = hiredFreelancers.length;
  const reviewableCount = hiredFreelancers.filter((f) => f.canReview).length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                Your team
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">
                My Hired Freelancers
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Unique freelancers you have assigned via contracts. You can rate them with stars (1-5) and leave a written review at any time — not only at the end of the contract.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm text-slate-500">Unique Hired</div>
                <div className="mt-1 text-3xl font-semibold">{totalHired}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm text-slate-500">Freelancers with Open Reviews</div>
                <div className="mt-1 text-3xl font-semibold text-amber-600">
                  {reviewableCount}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                Tip: You can rate and review hired freelancers at any time, not only when a contract ends.
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              💡 <strong>How to rate:</strong> Click the <strong>★ Rate with Stars &amp; Review</strong> button below each freelancer. Select 1-5 stars (hover to preview) and write your review comment. Reviews are allowed at any time during the project.
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                Loading your hired freelancers...
              </div>
            ) : hiredFreelancers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">You haven't hired any freelancers yet.</p>
                <p className="mt-2 text-sm text-slate-500">
                  Once you have contracts with freelancers, they will appear here and you can rate &amp; review them at any time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {hiredFreelancers.map((freelancer) => (
                  <div
                    key={freelancer.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {freelancer.name}
                        </h3>
                        {freelancer.email && (
                          <p className="text-sm text-slate-500">{freelancer.email}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-600">
                          Hired for {freelancer.contracts.length} contract
                          {freelancer.contracts.length > 1 ? "s" : ""} across{" "}
                          {new Set(freelancer.contracts.map((c) => c.projectTitle || c.id)).size} project(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {

                            let contractToReview = freelancer.contractDetails.find(
                              (c) => !c.hasReviewed && !reviewedContracts.has(c.id)
                            );
                            if (!contractToReview) {
                              contractToReview = freelancer.contractDetails[0];
                            }
                            if (contractToReview) {
                              openReview(contractToReview);
                            }
                          }}
                          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 flex items-center gap-1"
                        >
                          ★ Rate with Stars &amp; Review
                        </button>
                        <a
                          href={`/freelancers/${freelancer.id}`}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Profile
                        </a>
                      </div>
                    </div>

                    {}
                    <div className="mt-4 border-t pt-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                        Contracts with this freelancer
                      </p>
                      <ul className="space-y-2 text-sm">
                        {freelancer.contractDetails.map((contract) => {
                          const isReviewable =
                            !contract.hasReviewed &&
                            !reviewedContracts.has(contract.id);
                          return (
                            <li
                              key={contract.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                            >
                              <div>
                                <span className="font-medium">
                                  {contract.projectTitle || `Contract #${contract.id}`}
                                </span>
                                <span className="ml-2 text-xs text-slate-500">
                                  ({contract.cStatus})
                                </span>
                              </div>
                              {isReviewable && (
                                <button
                                  onClick={() => openReview(contract)}
                                  className="text-xs font-semibold text-amber-600 hover:underline"
                                >
                                  Review this project
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviewContract && (
              <ReviewModal
                contract={reviewContract}
                role="client"
                onClose={closeReview}
                onSubmitted={() => {
                  markReviewed(reviewContract.id);
                  closeReview();
                }}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
