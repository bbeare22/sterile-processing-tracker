const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const publicRead = String(import.meta.env.VITE_PUBLIC_READ || '').toLowerCase() === 'true';

export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(t) {
  if (!t) return localStorage.removeItem('token');
  localStorage.setItem('token', t);
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, method, headers });

  if (res.status === 401) {
    if (publicRead || method === 'GET' || method === 'HEAD') {
      return res;
    }
    localStorage.removeItem('token');
    window.location.assign('/login');
    return res;
  }

  return res;
}

export async function getJSON(path) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}
export async function postJSON(path, body) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
  return res.json();
}
export async function putJSON(path, body) {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`PUT ${path} failed (${res.status})`);
  return res.json();
}
export async function delJSON(path) {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status})`);
  return res.json();
}
