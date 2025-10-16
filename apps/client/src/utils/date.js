export function daysSince(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d)) return Infinity;
  const now = new Date();
  const diff = now - d;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLocalInputDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return formatLocalInputDateTime(d);
}

export function localInputToISO(localStr) {
  if (!localStr) return '';
  const d = new Date(localStr);
  if (isNaN(d)) return '';
  return d.toISOString();
}
