// apps/client/src/utils/csv.js

/**
 * Turn an array of objects into CSV text (with BOM for Excel).
 * - Collects superset of keys across rows to form the header.
 * - Escapes quotes and wraps values with commas/quotes/newlines in double quotes.
 * - Preserves empty fields as empty strings.
 */
export function toCSV(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  // Always include UTF-8 BOM so Excel opens encoding correctly
  const BOM = "\uFEFF";

  if (arr.length === 0) {
    return BOM; // empty CSV with BOM
  }

  // Collect superset of headers
  const headerSet = new Set();
  for (const r of arr) {
    if (r && typeof r === "object") {
      for (const k of Object.keys(r)) headerSet.add(k);
    }
  }
  const headers = Array.from(headerSet);

  const esc = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    const needsQuotes = /[",\n\r]/.test(s);
    const out = s.replace(/"/g, '""');
    return needsQuotes ? `"${out}"` : out;
  };

  const headerLine = headers.map(esc).join(",");
  const lines = [headerLine];

  for (const r of arr) {
    const line = headers.map((h) => esc(r?.[h]));
    lines.push(line.join(","));
  }

  return BOM + lines.join("\n");
}

/**
 * Create a downloaded file from provided text content.
 */
export function downloadTextAsFile(
  content,
  filename = "export.csv",
  mime = "text/csv;charset=utf-8"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
