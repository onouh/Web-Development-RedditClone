const ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let accessToken = null;
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const socketOrigin = () => ORIGIN || window.location.origin;

/**
 * Non-sensitive marker set alongside the HTTP-only refresh cookie. With a cross-origin API
 * (e.g. Vercel SPA + Render API) JavaScript cannot read the API-domain cookie, so probe
 * refresh unconditionally and let the cookie itself decide.
 */
export const hasSessionHint = () =>
  Boolean(ORIGIN) ||
  (typeof document !== 'undefined' && document.cookie.split('; ').includes('threadit_session=1'));

export const clearSessionHint = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'threadit_session=; Max-Age=0; path=/; SameSite=Lax';
};

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${ORIGIN}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          clearSessionHint();
          throw new Error('No active session');
        }
        const data = await response.json();
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parse(response) {
  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || `Request failed (${response.status})`,
      response.status,
      data?.error?.details,
    );
  }
  return data;
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const request = async (token) => {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${ORIGIN}/api${path}`, {
      method,
      credentials: 'include',
      headers,
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  };

  let response = await request(accessToken);
  if (response.status === 401 && accessToken) {
    try {
      const session = await refreshSession();
      setAccessToken(session.accessToken);
      response = await request(session.accessToken);
    } catch {
      setAccessToken(null);
    }
  }
  return parse(response);
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return api('/uploads', { method: 'POST', formData });
}

export const API_ORIGIN = ORIGIN;

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path}`;
}
