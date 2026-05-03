import { Fragment, useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
	fetchMyApplications,
	fetchFreelancerProjectDetails,
	updateMyApplication,
	softDeleteMyApplication,
} from "../apiServices.js";

function formatDate(value) {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString();
}

function statusBadgeClass(status) {
	if (status === "accepted") return "bg-emerald-100 text-emerald-700 border-emerald-200";
	if (status === "rejected") return "bg-rose-100 text-rose-700 border-rose-200";
	if (status === "withdrawn") return "bg-slate-100 text-slate-700 border-slate-200";
	return "bg-amber-100 text-amber-700 border-amber-200";
}

export default function FreelancerMyApplications() {
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
	const [editingItem, setEditingItem] = useState(null);
	const [editForm, setEditForm] = useState({ coverLetter: "", bidAmount: "", estimatedDays: "" });
	const [editError, setEditError] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);
	const [withdrawingId, setWithdrawingId] = useState(null);

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
					setError(err instanceof Error ? err.message : "Failed to load applications.");
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
			const matchesStatus = status === "all" || item.propStatus === status;
			const matchesQuery =
				!normalized ||
				item.title?.toLowerCase().includes(normalized) ||
				item.coverLetter?.toLowerCase().includes(normalized);
			return isVisible && matchesStatus && matchesQuery;
		});
	}, [applications, query, status]);

	const pendingCount = applications.filter((a) => a.propStatus === "pending").length;
	const acceptedCount = applications.filter((a) => a.propStatus === "accepted").length;

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

	function openEdit(item) {
		setEditingItem(item);
		setEditForm({
			coverLetter: item.coverLetter || "",
			bidAmount: item.bidAmount ?? "",
			estimatedDays: item.estimatedDays ?? "",
		});
		setEditError("");
	}

	function closeEdit() {
		if (savingEdit) return;
		setEditingItem(null);
		setEditError("");
	}

	async function handleSaveEdit(e) {
		e.preventDefault();
		if (!editingItem) return;
		setEditError("");

		if (!editForm.coverLetter.trim()) {
			setEditError("Cover letter is required.");
			return;
		}

		setSavingEdit(true);
		try {
			const data = await updateMyApplication(editingItem.applicationId, {
				coverLetter: editForm.coverLetter.trim(),
				bidAmount: editForm.bidAmount === "" ? null : Number(editForm.bidAmount),
				estimatedDays: editForm.estimatedDays === "" ? null : Number(editForm.estimatedDays),
			});

			setApplications((prev) =>
				prev.map((item) =>
					item.applicationId === editingItem.applicationId
						? {
								...item,
								coverLetter: data?.application?.coverLetter ?? editForm.coverLetter.trim(),
								bidAmount: data?.application?.bidAmount ?? (editForm.bidAmount === "" ? null : Number(editForm.bidAmount)),
								estimatedDays: data?.application?.estimatedDays ?? (editForm.estimatedDays === "" ? null : Number(editForm.estimatedDays)),
							}
						: item,
				),
			);
			setEditingItem(null);
		} catch (err) {
			setEditError(err instanceof Error ? err.message : "Failed to update application.");
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleWithdraw(item) {
		if (item.propStatus !== "pending") return;
		if (!window.confirm("Withdraw this application?")) return;

		setWithdrawingId(item.applicationId);
		try {
			await softDeleteMyApplication(item.applicationId);
			setApplications((prev) =>
				prev.filter((row) => row.applicationId !== item.applicationId),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to withdraw application.");
		} finally {
			setWithdrawingId(null);
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
								<h1 className="text-3xl font-semibold text-slate-900">My Applications</h1>
								<p className="mt-2 text-slate-600">
									Projects where you have already submitted an application.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
								<StatCard label="Pending" value={pendingCount} />
								<StatCard label="Accepted" value={acceptedCount} />
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
									placeholder="Project title or cover letter"
									className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
								/>
							</div>
							<div>
								<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Status
								</label>
								<select
									value={status}
									onChange={(e) => setStatus(e.target.value)}
									className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
								>
									<option value="all">All statuses</option>
									<option value="pending">Pending</option>
									<option value="accepted">Accepted</option>
									<option value="rejected">Rejected</option>
									<option value="withdrawn">Withdrawn</option>
								</select>
							</div>
						</div>

						{error && (
							<div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
								{error}
							</div>
						)}

						{loading ? (
							<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
								Loading applications...
							</div>
						) : filtered.length === 0 ? (
							<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
								<h2 className="text-xl font-semibold text-slate-900">No applications found</h2>
								<p className="mt-2 text-slate-600">You have not applied yet, or no application matches your filter.</p>
							</div>
						) : (
							<div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
								<table className="min-w-full divide-y divide-slate-200 text-sm">
									<thead className="bg-slate-100">
										<tr>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Client</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Bid Amount</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Estimated Days</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Application Status</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Applied On</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
											<th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200">
										{filtered.map((item) => {
											const isExpanded = expandedRows.has(item.applicationId);
											const details = projectDetails[item.projectId];
											const detailsLoading = Boolean(loadingDetails[item.projectId]);
											const detailsError = detailsErrors[item.projectId];
											return (
												<Fragment key={item.applicationId}>
													<tr className="hover:bg-slate-50 transition-colors">
														<td className="px-4 py-4">
															<p className="font-medium text-slate-900">{item.title || "Untitled project"}</p>
															<p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.coverLetter || "-"}</p>
														</td>
														<td className="px-4 py-4 text-slate-700">{item.clientName || "-"}</td>
														
														<td className="px-4 py-4 text-slate-700">
															{item.bidAmount != null ? `$${Number(item.bidAmount).toLocaleString()}` : "-"}
														</td>
														<td className="px-4 py-4 text-slate-700">{item.estimatedDays ?? "-"}</td>
														<td className="px-4 py-4">
															<span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(item.propStatus)}`}>
																{item.propStatus || "pending"}
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
														<td className="px-4 py-4">
															<div className="flex gap-2">
																<button
																	type="button"
																	onClick={() => openEdit(item)}
																	disabled={item.propStatus !== "pending"}
																	className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
																>
																	Edit
																</button>
																<button
																	type="button"
																	onClick={() => handleWithdraw(item)}
																	disabled={item.propStatus !== "pending" || withdrawingId === item.applicationId}
																	className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
																>
																	{withdrawingId === item.applicationId ? "Deleting..." : "Delete"}
																</button>
															</div>
														</td>
													</tr>
													{isExpanded && (
														<tr className="bg-slate-50/70">
															<td colSpan={10} className="px-4 py-4">
																{detailsLoading ? (
																	<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
																		Loading project details...
																	</div>
																) : detailsError ? (
																	<div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
																		{detailsError}
																	</div>
																) : details ? (
																	<>
																		<div className="grid gap-3 sm:grid-cols-3">
																			<div className="rounded-2xl border border-slate-200 bg-white p-3">
																				<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Deadline</p>
																				<p className="mt-1 text-sm font-medium text-slate-800">{formatDate(details.deadline)}</p>
																			</div>
																			<div className="rounded-2xl border border-slate-200 bg-white p-3">
																				<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Budget</p>
																				<p className="mt-1 text-sm font-medium text-slate-800">
																					{details.budget != null ? `$${Number(details.budget).toLocaleString()}` : "-"}
																				</p>
																			</div>
																			<div className="rounded-2xl border border-slate-200 bg-white p-3">
																				<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Status</p>
																				<p className="mt-1 text-sm font-medium capitalize text-slate-800">{details.pStatus || "-"}</p>
																			</div>
																		</div>
																		<div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
																			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project Description</p>
																			<p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{details.pDesc || "No description provided."}</p>
																		</div>
																	</>
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

			{editingItem && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
						<div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
							<h2 className="text-xl font-semibold text-slate-900">Edit Application</h2>
							<button
								type="button"
								onClick={closeEdit}
								disabled={savingEdit}
								className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
							>
								×
							</button>
						</div>

						<form onSubmit={handleSaveEdit} className="space-y-5 p-6">
							{editError && (
								<div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
									{editError}
								</div>
							)}

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">Cover Letter</label>
								<textarea
									value={editForm.coverLetter}
									onChange={(e) => setEditForm((prev) => ({ ...prev, coverLetter: e.target.value }))}
									rows={6}
									className="w-full rounded-2xl border border-slate-300 p-4 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
									required
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">Bid Amount ($)</label>
									<input
										type="number"
										min="0"
										value={editForm.bidAmount}
										onChange={(e) => setEditForm((prev) => ({ ...prev, bidAmount: e.target.value }))}
										className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">Estimated Days</label>
									<input
										type="number"
										min="1"
										value={editForm.estimatedDays}
										onChange={(e) => setEditForm((prev) => ({ ...prev, estimatedDays: e.target.value }))}
										className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/20"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={closeEdit}
									disabled={savingEdit}
									className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={savingEdit}
									className="rounded-2xl bg-[#1a3c2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5c46] disabled:opacity-50"
								>
									{savingEdit ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function StatCard({ label, value }) {
	return (
		<div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
			<p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
			<p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
		</div>
	);
}