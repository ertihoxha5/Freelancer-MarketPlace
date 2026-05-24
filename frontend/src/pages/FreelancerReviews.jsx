import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyReviews } from "../apiServices.js";

function Stars({ value }) {
  const rating = Number(value) || 0;
  return (
    <div className="text-lg text-amber-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= rating ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function FreelancerReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyReviews()
      .then((data) => {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setRatingSummary(data.ratingSummary || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load reviews."))
      .finally(() => setLoading(false));
  }, []);

  const average = useMemo(() => {
    if (ratingSummary?.averageRating != null) return ratingSummary.averageRating;
    if (reviews.length === 0) return null;
    return (
      reviews.reduce((sum, review) => sum + Number(review.stars || 0), 0) /
      reviews.length
    ).toFixed(1);
  }, [ratingSummary, reviews]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Reviews</h1>
              <p className="mt-2 text-slate-600">Feedback received from completed contracts.</p>
            </div>

            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Average rating</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-3xl font-semibold text-slate-900">
                  {average ?? "-"}
                </p>
                <Stars value={Math.round(Number(average || 0))} />
                <span className="text-sm text-slate-500">
                  {ratingSummary?.reviewCount ?? reviews.length} reviews
                </span>
              </div>
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {loading ? <div className="rounded-lg border p-6 text-slate-500">Loading reviews...</div> : null}
            {!loading && reviews.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No reviews yet.</div> : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Stars value={review.stars} />
                      <h2 className="mt-2 text-lg font-semibold text-slate-900">
                        {review.reviewerName || "Reviewer"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {review.projectTitle || "Contract"} · {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
