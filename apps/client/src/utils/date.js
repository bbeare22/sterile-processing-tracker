export function daysSince(isoDate) {
  if (!isoDate) return Infinity; // treat missing date as very overdue
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // whole days
}
