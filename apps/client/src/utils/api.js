export function getToken() {
  return localStorage.getItem("token") || "";
}

export async function apiFetch(path, options = {}) {
  const base = import.meta.env.VITE_API_URL;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  return res;
}
