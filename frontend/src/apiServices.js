const API_BASE = 'http://localhost:3000';
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

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
    const headers = { 'Content-Type': 'application/json' };
    const t = getAccessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
    return headers;
}

/**
 * @param {{ fullName: string; email: string; password: string; roleID: number }} payload
 * Accepts payload and registers user
 */
export async function registerUser(payload) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || `Registration failed (${res.status})`);
    }
    return data;
}

/**
 * @param {{email: string; password: string}} payload
 * accepts payload and changes password
 */

export async function changeUserPassword(payload){
    const res = await fetch(`${API_BASE}/api/auth/changePassword`,{
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body:JSON.stringify(payload)
    })
    const data = await res.json().catch(()=>({}));
    if(!res.ok) {
        throw new Error(data.message || data.error || `Change failed (${res.status})`);
    }
    return data;
}

/**
 * @param {{ email: string; password: string }} payload
 * accepts payload and attempts login
 */
export async function login(payload) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || `Login failed (${res.status})`);
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
        throw new Error('No refresh token.');
    }
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        clearAuthTokens();
        throw new Error(data.message || data.error || `Refresh failed (${res.status})`);
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            throw new Error('Session expired. Please log in again.');
        }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }
    return data;
}