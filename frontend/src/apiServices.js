export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

let cachedCsrfToken = null;

export function clearCsrfToken() {
  cachedCsrfToken = null;
}

/** Fetch and cache CSRF token (required for POST /api/auth/*). */
export async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;

  const res = await fetch(`${API_BASE}/api/auth/csrf-token`, {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Failed to obtain CSRF token (${res.status})`,
    );
  }
  if (!data.csrfToken) {
    throw new Error("Failed to obtain CSRF token.");
  }
  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken;
}

async function csrfJsonHeaders() {
  const token = await ensureCsrfToken();
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": token,
  };
}

/** POST/PATCH/DELETE to /api/auth/* with CSRF + cookies. */
async function authPost(url, options = {}) {
  const headers = await csrfJsonHeaders();
  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 403 && data.message?.includes("CSRF")) {
    clearCsrfToken();
    const retryHeaders = await csrfJsonHeaders();
    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...retryHeaders,
        ...options.headers,
      },
    });
    const retryData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        retryData.message || retryData.error || `Request failed (${res.status})`,
      );
    }
    return retryData;
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function setAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens() {
  clearAccessToken();
  clearRefreshToken();
  clearCsrfToken();
}

export function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const t = getAccessToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

async function authedFetch(url, options = {}) {
  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    try {
      await refreshSession();
      res = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new Error("Session expired. Please log in again.");
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${res.status})`,
    );
  }

  return data;
}

async function publicFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}
/**
 * @param {{ fullName: string; email: string; password: string; roleID: number }} payload
 * Accepts payload and registers user
 */
export async function registerUser(payload) {
  return authPost(`${API_BASE}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(email) {
  return authPost(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload) {
  return authPost(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * @param {{currentPassword: string; newPassword: string}} payload
 * accepts payload and changes password for the authenticated user
 */

export async function changeUserPassword(payload) {
  const headers = await csrfJsonHeaders();
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const data = await authPost(`${API_BASE}/api/auth/changePassword`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return data;
}

/**
 * @param {{ email: string; password: string }} payload
 * accepts payload and attempts login
 */
export async function login(payload) {
  const data = await authPost(`${API_BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data.token) {
    setAccessToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }
  return data;
}

/**
 * POST /api/auth/refresh — rotates the HttpOnly refresh-token cookie.
 */
export async function refreshSession() {
  try {
    const refreshToken = getRefreshToken();
    const data = await authPost(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    if (data.token) {
      setAccessToken(data.token);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data;
  } catch (err) {
    clearAuthTokens();
    throw err;
  }
}

/**
 * POST /api/auth/logout — revokes refresh token server-side and clears cookie.
 */
export async function logout() {
  try {
    const refreshToken = getRefreshToken();
    await authPost(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } catch {
    /* ignore logout errors */
  }
  clearAuthTokens();
}

/** GET /api/auth/me — silent when logged out; refreshes once on 401 if possible. */
export async function fetchCurrentUser() {
  if (!getAccessToken()) {
    try {
      await refreshSession();
    } catch {
      clearAuthTokens();
      return { user: null };
    }
  }

  if (!getAccessToken()) {
    return { user: null };
  }

  let res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  if (res.status === 401) {
    try {
      await refreshSession();
      res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
    } catch {
      clearAuthTokens();
      return { user: null };
    }
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAuthTokens();
    return { user: null };
  }
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${res.status})`,
    );
  }
  return data;
}

/** GET /api/admin/users. */
export async function fetchAdminUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return authedFetch(`${API_BASE}/api/admin/users${suffix}`);
}

/** PATCH /api/admin/users/:id - updates user name and status. */
export async function updateAdminUser(id, payload) {
  return authedFetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/admin/users/:id - marks user as inactive. */
export async function deleteAdminUser(id) {
  return authedFetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
  });
}
export function fetchProjectsWithFreelancer() {
  return authedFetch(`${API_BASE}/api/admin/projects/with-freelancer`);
}

export function fetchProjectsWithoutFreelancer() {
  return authedFetch(`${API_BASE}/api/admin/projects/without-freelancer`);
}

export function fetchClientList() {
  return authedFetch(`${API_BASE}/api/admin/clients`);
}

export function createAdminProject(payload) {
  return authedFetch(`${API_BASE}/api/admin/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminProject(id, payload) {
  return authedFetch(`${API_BASE}/api/admin/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminProject(id) {
  return authedFetch(`${API_BASE}/api/admin/projects/${id}`, {
    method: "DELETE",
  });
}

export function fetchAdminCategories(includeInactive = true) {
  const query = includeInactive ? "?includeInactive=true" : "";
  return authedFetch(`${API_BASE}/api/admin/categories${query}`);
}

export function fetchPublicCategories() {
  return publicFetch(`${API_BASE}/api/categories/public`);
}

export function createAdminCategory(payload) {
  return authedFetch(`${API_BASE}/api/admin/categories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminCategory(id, payload) {
  return authedFetch(`${API_BASE}/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCategory(id) {
  return authedFetch(`${API_BASE}/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

export function fetchAdminSkills(includeInactive = true) {
  const query = includeInactive ? "?includeInactive=true" : "";
  return authedFetch(`${API_BASE}/api/admin/skills${query}`);
}

export function createAdminSkill(payload) {
  return authedFetch(`${API_BASE}/api/admin/skills`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminSkill(id, payload) {
  return authedFetch(`${API_BASE}/api/admin/skills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminSkill(id) {
  return authedFetch(`${API_BASE}/api/admin/skills/${id}`, {
    method: "DELETE",
  });
}

/** GET /api/admin/disputes - fetch all disputes */
export function fetchAdminDisputes(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return authedFetch(`${API_BASE}/api/admin/disputes${query}`);
}

/** GET /api/admin/disputes/:id - fetch single dispute */
export function fetchAdminDispute(id) {
  return authedFetch(`${API_BASE}/api/admin/disputes/${id}`);
}

/** PATCH /api/admin/disputes/:id - update dispute status */
export function updateAdminDispute(id, payload) {
  return authedFetch(`${API_BASE}/api/admin/disputes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/admin/payments - all payments (admin) */
export function fetchAdminPayments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const suffix = query ? `?${query}` : '';
  return authedFetch(`${API_BASE}/api/admin/payments${suffix}`);
}

/** GET /api/admin/applications - all proposals/applications (admin) */
export function fetchAdminApplications(params = {}) {
  const query = new URLSearchParams(params).toString();
  const suffix = query ? `?${query}` : '';
  return authedFetch(`${API_BASE}/api/admin/applications${suffix}`);
}

// ─── CLIENT PROJECT APIs ───────────────────────────────────────────────────

/**
 * GET /api/client/projects — fetch all projects for logged-in client
 */
export function fetchClientProjects() {
  return authedFetch(`${API_BASE}/api/client/projects`);
}

/**
 * GET /api/client/projects/:id — fetch single project for logged-in client
 */
export function fetchClientProject(id) {
  return authedFetch(`${API_BASE}/api/client/projects/${id}`);
}

/**
 * POST /api/client/projects — create new project as client
 */
export function createClientProject(payload) {
  return authedFetch(`${API_BASE}/api/client/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/client/projects/:id — update own project as client
 */
export function updateClientProject(id, payload) {
  return authedFetch(`${API_BASE}/api/client/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteClientProject(id) {
  return authedFetch(`${API_BASE}/api/client/projects/${id}`, {
    method: "DELETE",
  });
}

export function fetchClientApplications() {
  return authedFetch(`${API_BASE}/api/client/applications`);
}

export function updateClientApplicationStatus(applicationId, payload) {
  return authedFetch(
    `${API_BASE}/api/client/applications/${applicationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchClientProfile() {
  return authedFetch(`${API_BASE}/api/client/profile`);
}

export function updateClientProfile(payload) {
  return authedFetch(`${API_BASE}/api/client/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/client/projects/:id — delete own project as client
 */
// ─── NOTIFICATION APIs ─────────────────────────────────────────────────────

export function fetchNotifications() {
  return authedFetch(`${API_BASE}/api/client/notifications`);
}

export function fetchUnreadCount() {
  return authedFetch(`${API_BASE}/api/client/notifications/unread-count`);
}

export function markNotificationRead(id) {
  return authedFetch(`${API_BASE}/api/client/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return authedFetch(`${API_BASE}/api/client/notifications/read-all`, {
    method: "PATCH",
  });
}

export function deleteNotification(id) {
  return authedFetch(`${API_BASE}/api/client/notifications/${id}`, {
    method: "DELETE",
  });
}

export function deleteAllNotifications() {
  return authedFetch(`${API_BASE}/api/client/notifications/delete-all`, {
    method: "DELETE",
  });
}

export function fetchAdminNotifications() {
  return authedFetch(`${API_BASE}/api/admin/notifications`);
}

export function fetchAdminUnreadCount() {
  return authedFetch(`${API_BASE}/api/admin/notifications/unread-count`);
}

export function markAdminNotificationRead(id) {
  return authedFetch(`${API_BASE}/api/admin/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllAdminNotificationsRead() {
  return authedFetch(`${API_BASE}/api/admin/notifications/read-all`, {
    method: "PATCH",
  });
}

export function deleteAdminNotification(id) {
  return authedFetch(`${API_BASE}/api/admin/notifications/${id}`, {
    method: "DELETE",
  });
}

export function deleteAllAdminNotifications() {
  return authedFetch(`${API_BASE}/api/admin/notifications/delete-all`, {
    method: "DELETE",
  });
}

// ─── CHAT APIs ──────────────────────────────────────────────────────────────

export function fetchChatConversations() {
  return authedFetch(`${API_BASE}/api/chat/conversations`);
}

export function createOrGetChatConversation(payload) {
  return authedFetch(`${API_BASE}/api/chat/conversations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchConversationMessages(conversationID, options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.beforeID) params.set("beforeID", String(options.beforeID));
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return authedFetch(
    `${API_BASE}/api/chat/conversations/${conversationID}/messages${suffix}`,
  );
}

export function markConversationRead(conversationID) {
  return authedFetch(
    `${API_BASE}/api/chat/conversations/${conversationID}/read`,
    {
      method: "PATCH",
    },
  );
}

export function searchChatUsers(query) {
  const params = new URLSearchParams({ q: query });
  return authedFetch(`${API_BASE}/api/chat/users?${params.toString()}`);
}

export function createOrGetDirectConversation(payload) {
  return authedFetch(`${API_BASE}/api/chat/conversations/direct`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── FREELANCER NOTIFICATION APIs ──────────────────────────────────────────

export function fetchFreelancerNotifications() {
  return authedFetch(`${API_BASE}/api/freelancer/notifications`);
}

export function fetchFreelancerUnreadCount() {
  return authedFetch(`${API_BASE}/api/freelancer/notifications/unread-count`);
}

export function markFreelancerNotificationRead(id) {
  return authedFetch(`${API_BASE}/api/freelancer/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllFreelancerNotificationsRead() {
  return authedFetch(`${API_BASE}/api/freelancer/notifications/read-all`, {
    method: "PATCH",
  });
}

export function deleteFreelancerNotification(id) {
  return authedFetch(`${API_BASE}/api/freelancer/notifications/${id}`, {
    method: "DELETE",
  });
}

export function deleteAllFreelancerNotifications() {
  return authedFetch(`${API_BASE}/api/freelancer/notifications/delete-all`, {
    method: "DELETE",
  });
}

export function fetchFreelancerDashboard() {
  return authedFetch(`${API_BASE}/api/freelancer/dashboard`);
}

export function fetchFreelancerProfile() {
  return authedFetch(`${API_BASE}/api/freelancer/profile`);
}

export function updateFreelancerProfile(payload) {
  return authedFetch(`${API_BASE}/api/freelancer/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchFreelancerSkills() {
  return authedFetch(`${API_BASE}/api/freelancer/skills`);
}

export async function fetchPublicFreelancerProfile(userID) {
  const res = await fetch(`${API_BASE}/api/freelancer/public/${userID}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function fetchBrowseProjects(params = {}, signal) {
  const sanitized = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
  const query = new URLSearchParams(sanitized).toString();

  const url = query
    ? `${API_BASE}/api/freelancer/browse-projects?${query}`
    : `${API_BASE}/api/freelancer/browse-projects`;

  return authedFetch(url, { signal });
}

export async function fetchSavedProjects() {
  return authedFetch(`${API_BASE}/api/saved-projects`);
}

export async function saveProject(projectID) {
  return authedFetch(`${API_BASE}/api/saved-projects/${projectID}`, {
    method: "POST",
  });
}

export async function removeSavedProject(projectID) {
  return authedFetch(`${API_BASE}/api/saved-projects/${projectID}`, {
    method: "DELETE",
  });
}

export async function submitApplication(projectId, payload) {
  return authedFetch(`${API_BASE}/api/freelancer/projects/${projectId}/apply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMyApplications() {
  return authedFetch(`${API_BASE}/api/freelancer/applications`);
}

export async function updateMyApplication(applicationId, payload) {
  return authedFetch(
    `${API_BASE}/api/freelancer/applications/${applicationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function softDeleteMyApplication(applicationId) {
  return authedFetch(
    `${API_BASE}/api/freelancer/applications/${applicationId}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchFreelancerProjectDetails(projectId) {
  return authedFetch(`${API_BASE}/api/freelancer/projects/${projectId}`);
}

export async function fetchActivityFeed(params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.eventType) query.set("eventType", params.eventType);
  if (params.onlyUnread) query.set("onlyUnread", "true");

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return authedFetch(`${API_BASE}/api/freelancer/activities${suffix}`);
}

export async function fetchActivityUnreadCount() {
  return authedFetch(`${API_BASE}/api/freelancer/activities/unread-count`);
}

export async function markActivityRead(id) {
  return authedFetch(`${API_BASE}/api/freelancer/activities/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllActivitiesRead() {
  return authedFetch(`${API_BASE}/api/freelancer/activities/read-all`, {
    method: "PATCH",
  });
}

export async function deleteActivity(id) {
  return authedFetch(`${API_BASE}/api/freelancer/activities/${id}`, {
    method: "DELETE",
  });
}

export async function deleteAllActivities() {
  return authedFetch(`${API_BASE}/api/freelancer/activities`, {
    method: "DELETE",
  });
}

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function searchList(type, params = {}) {
  return authedFetch(`${API_BASE}/api/search/${type}${qs(params)}`);
}

export async function downloadExport(kind, format = "csv", params = {}) {
  const url = `${API_BASE}/api/export/${kind}${qs({ ...params, format })}`;
  let res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    await refreshSession();
    res = await fetch(url, { headers: authHeaders() });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${kind}.${format === "xlsx" ? "xlsx" : format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export async function downloadProjectReport(format = "json", params = {}) {
  const url = `${API_BASE}/api/reports/projects${qs({ ...params, format })}`;
  let res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    await refreshSession();
    res = await fetch(url, { headers: authHeaders() });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Report export failed (${res.status})`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `project-report.${format === "xlsx" ? "xlsx" : format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export async function importFile(kind, file, extra = {}) {
  const form = new FormData();
  form.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, value);
    }
  });
  let res = await fetch(`${API_BASE}/api/import/${kind}`, {
    method: "POST",
    headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    credentials: "include",
    body: form,
  });
  if (res.status === 401) {
    await refreshSession();
    res = await fetch(`${API_BASE}/api/import/${kind}`, {
      method: "POST",
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
      credentials: "include",
      body: form,
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Import failed (${res.status})`);
  return data;
}

export function fetchPlatformSummaryReport() {
  return authedFetch(`${API_BASE}/api/reports/platform-summary`);
}

export function fetchClientReport(id) {
  return authedFetch(`${API_BASE}/api/reports/client/${id}`);
}

export function fetchFreelancerReport(id) {
  return authedFetch(`${API_BASE}/api/reports/freelancer/${id || "me"}`);
}

// Contracts
export async function createPaymentIntent(payload) {
  return authedFetch(`${API_BASE}/api/payment/intent`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmPayment(paymentIntentId) {
  return authedFetch(`${API_BASE}/api/payment/confirm`, {
    method: "POST",
    body: JSON.stringify({ paymentIntentId }),
  });
}

export async function refundPayment(paymentIntentId, reason) {
  return authedFetch(`${API_BASE}/api/payment/refund`, {
    method: "POST",
    body: JSON.stringify({ paymentIntentId, reason }),
  });
}

export async function fetchPaymentHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return authedFetch(`${API_BASE}/api/payment/history${suffix}`);
}

export function fetchMyContracts() {
  return authedFetch(`${API_BASE}/api/client/contracts`);
}

export function fetchMyContract(id) {
  return authedFetch(`${API_BASE}/api/client/contracts/${id}`);
}

export function signContract(id, role = "client") {
  return authedFetch(`${API_BASE}/api/${role}/contracts/${id}/sign`, {
    method: "POST",
  });
}

export function createContractDispute(id, payload, role = "client") {
  return authedFetch(`${API_BASE}/api/${role}/contracts/${id}/disputes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchFreelancerContracts() {
  return authedFetch(`${API_BASE}/api/freelancer/contracts`);
}

export function fetchFreelancerContract(id) {
  return authedFetch(`${API_BASE}/api/freelancer/contracts/${id}`);
}

// Milestones
export function createMilestone(contractId, payload) {
  return authedFetch(
    `${API_BASE}/api/client/contracts/${contractId}/milestones`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function fetchMilestones(contractId, role = "client") {
  return authedFetch(`${API_BASE}/api/${role}/contracts/${contractId}/milestones`);
}

export function updateMilestoneStatus(id, status, role = "client") {
  return authedFetch(`${API_BASE}/api/${role}/milestones/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ mStatus: status }),
  });
}

// Reviews
export function createReview(contractId, payload, role = "client") {
  return authedFetch(`${API_BASE}/api/${role}/contracts/${contractId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyReviews() {
  return authedFetch(`${API_BASE}/api/freelancer/reviews`);
}

// Freelancer Payments
export function fetchFreelancerPayments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const suffix = query ? `?${query}` : '';
  return authedFetch(`${API_BASE}/api/freelancer/payments${suffix}`);
}

export function fetchFreelancerPayment(id) {
  return authedFetch(`${API_BASE}/api/freelancer/payments/${id}`);
}

// Search
export function searchProjects(params = {}) {
  return authedFetch(`${API_BASE}/api/search/projects${qs(params)}`);
}

export function searchFreelancers(params = {}) {
  return authedFetch(`${API_BASE}/api/search/freelancers${qs(params)}`);
}

// Reports
export function fetchPlatformReport() {
  return authedFetch(`${API_BASE}/api/reports/platform-summary`);
}

export function fetchPublicHomeData() {
  return publicFetch(`${API_BASE}/api/public/home-data`);
}

export function fetchPublicTestimonials(limit = 6) {
  return publicFetch(`${API_BASE}/api/public/testimonials?limit=${limit}`);
}

export function createClientTestimonial(payload) {
  return authedFetch(`${API_BASE}/api/client/testimonials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminSettings() {
  return authedFetch(`${API_BASE}/api/admin/settings`);
}

export function updateAdminSettings(payload) {
  return authedFetch(`${API_BASE}/api/admin/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Export
export function exportData(resource, format = "csv") {
  return downloadExport(resource, format);
}
