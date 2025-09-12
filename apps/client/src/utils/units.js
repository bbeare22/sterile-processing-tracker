export const ML_PER_OZ = 29.5735;

export function mlToOz(ml) {
  if (ml === "" || ml == null || isNaN(Number(ml))) return "";
  return Number(ml) / ML_PER_OZ;
}

export function ozToMl(oz) {
  if (oz === "" || oz == null || isNaN(Number(oz))) return "";
  return Number(oz) * ML_PER_OZ;
}

export function round(n, places = 2) {
  if (n === "" || n == null || isNaN(Number(n))) return "";
  const f = Math.pow(10, places);
  return Math.round(Number(n) * f) / f;
}
