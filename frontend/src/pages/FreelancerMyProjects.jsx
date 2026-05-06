import { Fragment, useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
	fetchMyApplications,
	fetchFreelancerProjectDetails,
} from "../apiServices.js";

function formatDate(value) {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString();
}

function projectStatusClass(status) {
	if (status === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
	if (status === "completed") return "bg-blue-100 text-blue-700 border-blue-200";
	if (status === "cancelled") return "bg-rose-100 text-rose-700 border-rose-200";
	return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function FreelancerMyProjects() {
	const { user } = useAuth();
	const [applications, setApplications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
	const [expandedRows, setExpandedRows] = useState(() => new Set());
	const [projectDetails, setProjectDetails] = useState({});
	const [loadingDetails, setLoadingDetails] = useState({});
	const [detailsErrors, setDetailsErrors] = useState({});

	useEffect(() => {
		let active = true;

		async function loadApplications() {
			setLoading(true);
			setError("");
			try {
				const data = await fetchMyApplications();
				if (active) {
					setApplications(Array.isArray(data.applications) ? data.applications : []);
				}
			} catch (err) {
				if (active) {
					setError(err instanceof Error ? err.message : "Failed to load projects.");
					setApplications([]);
				}
			} finally {
				if (active) setLoading(false);
			}
		}

		loadApplications();
		return () => {
			active = false;
		};
	}, []);

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return applications.filter((item) => {
			const isVisible = item.isDeleted === false || item.isDeleted === 0 || item.isDeleted == null;
			const isAccepted = item.propStatus === "accepted";
			const projectStatus = String(item.projectStatus ?? "").toLowerCase();
			const isProjectOpen = ["active", "completed", "cancelled"].includes(projectStatus);
			const matchesStatus = status === "all" || projectStatus === status;
			const matchesQuery =
				!normalized ||
				item.title?.toLowerCase().includes(normalized) ||
				item.clientName?.toLowerCase().includes(normalized) ||
				item.pDesc?.toLowerCase().includes(normalized);
			return isVisible && isAccepted && isProjectOpen && matchesStatus && matchesQuery;
		});
	}, [applications, query, status]);

	const activeCount = filtered.filter((item) => String(item.projectStatus ?? "").toLowerCase() === "active").length;
	const completedCount = filtered.filter((item) => String(item.projectStatus ?? "").toLowerCase() === "completed").length;
	const cancelledCount = filtered.filter((item) => String(item.projectStatus ?? "").toLowerCase() === "cancelled").length;

	async function toggleRow(applicationId, projectId) {
		const isOpen = expandedRows.has(applicationId);
		if (isOpen) {
			setExpandedRows((prev) => {
				const next = new Set(prev);
				next.delete(applicationId);
				return next;
			});
			return;
		}

		setExpandedRows((prev) => {
			const next = new Set(prev);
			next.add(applicationId);
			return next;
		});

		if (projectDetails[projectId] || loadingDetails[projectId]) return;

		setLoadingDetails((prev) => ({ ...prev, [projectId]: true }));
		setDetailsErrors((prev) => ({ ...prev, [projectId]: "" }));

		try {
			const data = await fetchFreelancerProjectDetails(projectId);
			setProjectDetails((prev) => ({ ...prev, [projectId]: data?.project ?? null }));
		} catch (err) {
			setDetailsErrors((prev) => ({
				...prev,
				[projectId]: err instanceof Error ? err.message : "Failed to load project details.",
			}));
		} finally {
			setLoadingDetails((prev) => ({ ...prev, [projectId]: false }));
		}
	}

	return (
		<div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
			<Header />
			<main className="flex-1 min-h-0 w-full p-0">
				<div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
					<Sidebar roleID={user?.roleID} />
					<section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
						<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
								<p className="mt-2 text-slate-600">
									Projects where your application was accepted and the project is active or completed.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
								<StatCard label="Active" value={activeCount} />
								<StatCard label="Completed" value={completedCount} />
								<StatCard label="Cancelled" value={cancelledCount} />
							</div>
						</div>

						<div className="mb-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
							<div>
								<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Search
								</label>
								<input
									type="text"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Project title, client, or description"
									className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
								/>
							</div>
							<div>
								<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Project Status
								</label>
								<select
									value={status}
									onChange={(e) => setStatus(e.target.value)}
									className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
								>
									<option value="all">All statuses</option>
									<option value="active">Active</option>
									<option value="completed">Completed</option>								<option value="cancelled">Cancelled</option>								</select>
							</div>
						</div>

						{error && (
							<div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
								{error}
							</div>
						)}

						{loading ? (
							<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
								Loading projects...
							</div>
						) : filtered.length === 0 ? (
							<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
								<h2 className="text-xl font-semibold text-slate-900">No projects found</h2>
								<p className="mt-2 text-slate-600">
									No accepted applications match the active, completed, or cancelled project filters.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
								<table className="min-w-full divide-y divide-slate-200 text-sm">
									<thead className="bg-slate-100">
										<tr>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Client</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Project Status</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Application Status</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Applied On</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200">
										{filtered.map((item) => {
											const isExpanded = expandedRows.has(item.applicationId);
											const details = projectDetails[item.projectId];
											const detailsLoading = Boolean(loadingDetails[item.projectId]);
											const detailsError = detailsErrors[item.projectId];
											const projectStatus = String(item.projectStatus ?? "-").toLowerCase();
											return (
												<Fragment key={item.applicationId}>
													<tr className="hover:bg-slate-50 transition-colors">
														<td className="px-4 py-4">
															<p className="font-medium text-slate-900">{item.title || "Untitled project"}</p>
															<p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.pDesc || "No description provided."}</p>
														</td>
														<td className="px-4 py-4 text-slate-700">{item.clientName || "-"}</td>
														<td className="px-4 py-4">
															<span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${projectStatusClass(projectStatus)}`}>
																{projectStatus || "-"}
															</span>
														</td>
														<td className="px-4 py-4">
															<span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 capitalize">
																{item.propStatus || "accepted"}
															</span>
														</td>
														<td className="px-4 py-4 text-slate-700">{formatDate(item.createdAt)}</td>
														<td className="px-4 py-4">
															<button
																type="button"
																onClick={() => toggleRow(item.applicationId, item.projectId)}
																className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
															>
																{isExpanded ? "Hide" : "View"}
															</button>
														</td>
													</tr>
													{isExpanded && (
														<tr className="bg-slate-50/70">
															<td colSpan={6} className="px-4 py-4">
																{detailsLoading ? (
																	<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
																		Loading project details...
																	</div>
																) : detailsError ? (
																	<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
																		{detailsError}
																	</div>
																) : details ? (
																	<div className="grid gap-3 sm:grid-cols-3">
																		<div className="rounded-2xl border border-slate-200 bg-white p-3">
																			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deadline</p>
																			<p className="mt-1 text-sm font-medium text-slate-800">{formatDate(details.deadline)}</p>
																		</div>
																		<div className="rounded-2xl border border-slate-200 bg-white p-3">
																			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budget</p>
																			<p className="mt-1 text-sm font-medium text-slate-800">
																				{details.budget != null ? `$${Number(details.budget).toLocaleString()}` : "-"}
																			</p>
																		</div>
																		<div className="rounded-2xl border border-slate-200 bg-white p-3">
																			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Status</p>
																			<p className="mt-1 text-sm font-medium capitalize text-slate-800">{details.pStatus || "-"}</p>
																		</div>
																	</div>
																) : (
																	<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
																		No details available.
																	</div>
																)}
															</td>
														</tr>
													)}
												</Fragment>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</main>
		</div>
	);
}

function StatCard({ label, value }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
			<p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
			<p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
		</div>
	);
}