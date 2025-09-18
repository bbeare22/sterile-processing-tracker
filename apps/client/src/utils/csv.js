export function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    const needsWrap = /[",\n]/.test(s);
    const quoted = s.replace(/"/g, '""');
    return needsWrap ? `"${quoted}"` : quoted;
  };

  const headerLine = headers.map((h) => esc(h.label)).join(",");
  const body = rows
    .map((r) => headers.map((h) => esc(h.get(r))).join(","))
    .join("\n");
  return headerLine + "\n" + body;
}

export function downloadFile(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}
