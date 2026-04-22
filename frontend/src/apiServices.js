export const API_BASE = "http://localhost:3000";
const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

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
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      res = await fetch(url, {
        ...options,
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
/**
 * @param {{ fullName: string; email: string; password: string; roleID: number }} payload
 * Accepts payload and registers user
 */
export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Registration failed (${res.status})`,
    );
  }
  return data;
}

/**
 * @param {{email: string; password: string}} payload
 * accepts payload and changes password
 */

export async function changeUserPassword(payload) {
  const res = await fetch(`${API_BASE}/api/auth/changePassword`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Change failed (${res.status})`,
    );
  }
  return data;
}

/**
 * @param {{ email: string; password: string }} payload
 * accepts payload and attempts login
 */
export async function login(payload) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Login failed (${res.status})`,
    );
  }
  if (data.token) {
    setAccessToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }
  return data;
}

/**
 * POST /api/auth/refresh — rotates refresh token; updates storage.
 */
export async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token.");
  }
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    clearAuthTokens();
    throw new Error(
      data.message || data.error || `Refresh failed (${res.status})`,
    );
  }
  if (data.token) {
    setAccessToken(data.token);
  }
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }
  return data;
}

/**
 * POST /api/auth/logout — revokes refresh token server-side; clears local tokens.
 */
export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  clearAuthTokens();
}

/** GET /api/auth/me — uses access token; on 401 tries refresh once then retries. */
export async function fetchCurrentUser() {
  let res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
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

/** GET /api/admin/users — uses access token; on 401 tries refresh once then retries. */
export async function fetchAdminUsers() {
  let res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: authHeaders(),
  });
  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: authHeaders(),
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

/** PATCH /api/admin/users/:id — updates user name and status. */
export async function updateAdminUser(id, payload) {
  let res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Session expired. Please log in again.");
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Update failed (${res.status})`,
    );
  }
  return data;
}

/** DELETE /api/admin/users/:id — marks user as inactive. */
export async function deleteAdminUser(id) {
  let res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (res.status === 401 && getRefreshToken()) {
    try {
      await refreshSession();
      res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      throw new Error("Session expired. Please log in again.");
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || `Delete failed (${res.status})`,
    );
  }
  return data;
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
  return authedFetch(`${API_BASE}/api/chat/conversations/${conversationID}/read`, {
    method: "PATCH",
  });
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
