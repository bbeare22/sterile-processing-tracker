export function toCSV(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  if (arr.length === 0) {
    return "\uFEFF";
  }

  const headerSet = new Set();
  for (const r of arr) {
    Object.keys(r || {}).forEach((k) => headerSet.add(k));
  }
  const headers = Array.from(headerSet);

  const esc = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);

    const needsWrap = /[",\n]/.test(s);
    const safe = s.replace(/"/g, '""');
    return needsWrap ? `"${safe}"` : safe;
  };

  const lines = [];

  lines.push("\uFEFF" + headers.map(esc).join(","));
  for (const row of arr) {
    const line = headers.map((h) => esc(row?.[h]));
    lines.push(line.join(","));
  }
  return lines.join("\n");
}

export function downloadFile(
  content,
  filename = "export.csv",
  mime = "text/csv;charset=utf-8"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
