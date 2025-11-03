/* ---------------- token + origin helpers ---------------- */

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

export function getServerOrigin() {
  // Access import.meta safely (it's valid ESM syntax; no "typeof import"!)
  const envOrigin =
    (typeof import.meta !== 'undefined' &&
      import.meta?.env &&
      (import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_URL)) ||
    '';

  if (envOrigin) return String(envOrigin).replace(/\/+$/, '');

  const origin = window.location.origin;
  if (origin.includes(':5173')) return origin.replace(':5173', ':3001');
  return origin;
}

/* ---------------- low-level fetch + trigger ---------------- */

async function tryFetchFile(url, token, extraHeaders = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const responseContentType = res.headers.get('content-type') || '';
    let msg = `HTTP ${res.status}`;
    if (responseContentType.includes('application/json')) {
      try {
        const j = await res.json();
        msg = j.error || j.message || msg;
      } catch {
        // ignore parse errors
      }
    } else {
      try {
        const t = await res.text();
        if (t) msg = t;
      } catch {
        // ignore
      }
    }
    throw new Error(msg);
  }

  const contentType = res.headers.get('content-type') || '';
  // Avoid accidentally downloading JSON/HTML as a file
  if (contentType.includes('application/json') || contentType.includes('text/html')) {
    let msg = 'Unexpected non-file response';
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {
      try {
        const t = await res.text();
        if (t) msg = t;
      } catch {
        // ignore
      }
    }
    throw new Error(msg);
  }

  return await res.blob();
}

export function triggerDownload(blob, filename = 'download.bin') {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- high-level helpers ---------------- */

export async function downloadCSVFromReports(params, filename = 'export.csv') {
  const server = getServerOrigin();
  const usp = new URLSearchParams();

  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }

  const token = getToken();
  const headers = {};

  const paths = [
    `${server}/api/reports/csv?${usp.toString()}`,
    `${server}/reports/csv?${usp.toString()}`, // fallback mount
    `${server}/api/report/csv?${usp.toString()}`, // singular fallback
  ];

  const attempted = [];
  for (const url of paths) {
    attempted.push(url);
    try {
      const blob = await tryFetchFile(url, token, headers);
      triggerDownload(blob, filename);
      return;
    } catch {}
  }
  throw new Error('CSV download failed. Tried:\n' + attempted.join('\n'));
}

export async function downloadWithAuth(paths, { filename }) {
  const token = getToken();
  const base = getServerOrigin();

  const list = Array.isArray(paths) ? paths : [paths];
  const attempted = [];

  for (const p of list) {
    const full = p.startsWith('http') ? p : `${base}${p}`;
    attempted.push(full);
    try {
      const blob = await tryFetchFile(full, token);
      triggerDownload(blob, filename);
      return;
    } catch {}
  }

  throw new Error(
    'Download failed: endpoint not found or returned an error.\nTried:\n' + attempted.join('\n')
  );
}
