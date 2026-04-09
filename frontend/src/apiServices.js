const API_BASE = "http://localhost:3000";
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
