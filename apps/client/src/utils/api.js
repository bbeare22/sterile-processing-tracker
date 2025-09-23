const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function getToken() {
  return localStorage.getItem("token") || "";
}

export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  return res;
}
