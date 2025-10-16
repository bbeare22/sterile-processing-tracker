// apps/client/src/utils/download.js
// Tries multiple endpoint paths to avoid 404s if the server mounts routes differently.
// Also NEVER navigates away from the SPA and never returns JSON as a file.

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

async function tryFetchFile(url, token) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const ctype = res.headers.get("content-type") || "";
    let msg = `HTTP ${res.status}`;
    if (ctype.includes("application/json")) {
      try {
        const j = await res.json();
        msg = j.error || j.message || msg;
      } catch {}
    }
    throw new Error(msg);
  }

  // Guard against JSON/HTML responses that are 200 but not a file
  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("application/json") || ctype.includes("text/html")) {
    let msg = "Unexpected non-file response";
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return await res.blob();
}

function triggerDownload(blob, filename = "download") {
  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    a.remove();
  }, 1500);
}

/**
 * downloadWithAuth(paths, { filename })
 * - paths: string OR string[] (we'll try each until one works)
 */
export async function downloadWithAuth(paths, { filename }) {
  const token = getToken();
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  const list = Array.isArray(paths) ? paths : [paths];
  const attempted = [];

  for (const p of list) {
    const full = p.startsWith("http") ? p : `${base}${p}`;
    attempted.push(full);
    try {
      const blob = await tryFetchFile(full, token);
      triggerDownload(blob, filename);
      return;
    } catch (e) {
      // try next path
      // console.debug("Download attempt failed at", full, e?.message);
    }
  }

  throw new Error(
    "Download failed: endpoint not found or returned an error.\nTried:\n" +
      attempted.join("\n")
  );
}
