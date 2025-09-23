import { apiFetch } from "../utils/api";

async function toError(res) {
  try {
    const j = await res.json();
    return new Error(j.error || j.message || `HTTP ${res.status}`);
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

/** Register */
export async function register({
  email,
  password,
  name,
  employeeId,
  sterilizationNumber,
}) {
  const r = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name,
      employeeId,
      sterilizationNumber,
    }),
  });
  if (!r.ok) throw await toError(r);
  return r.json();
}

/** Login */
export async function login({ email, password }) {
  const r = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw await toError(r);
  return r.json();
}

export async function me() {
  const r = await apiFetch("/api/auth/me");
  if (!r.ok) throw await toError(r);
  return r.json();
}
