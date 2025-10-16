const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(t) {
  if (!t) {
    localStorage.removeItem('token');
    return;
  }
  localStorage.setItem('token', t);
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');

    window.location.assign('/login');

    return res;
  }

  return res;
}

// Small helpers for JSON usage
export async function getJSON(path) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

export async function postJSON(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
  return res.json();
}

export async function putJSON(path, body) {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed (${res.status})`);
  return res.json();
}

export async function delJSON(path) {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed (${res.status})`);
  return res.json();
}
