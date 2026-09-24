/**
 * Jalali ⇄ Gregorian conversion (algorithm from jalaali-js, MIT).
 * The API always speaks Gregorian ISO dates; these helpers only serve the UI.
 */
const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
];

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0]!;
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  const d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number): [number, number, number] {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return [gy, gm, gd];
}

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const jdn = g2d(gy, gm, gd);
  let jy = d2g(jdn)[0] - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(r.gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return [jy, 1 + div(k, 31), mod(k, 31) + 1];
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return [jy, 7 + div(k, 30), mod(k, 30) + 1];
}

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const r = jalCal(jy);
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1);
}

const pad = (value: number) => String(value).padStart(2, '0');

/** '2026-09-24' → '1405/07/02' */
export function isoToJalali(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const [jy, jm, jd] = toJalali(y!, m!, d!);
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** '1405/07/02' → '2026-09-24' */
export function jalaliToIso(jalali: string): string {
  const [jy, jm, jd] = jalali.split('/').map(Number);
  const [gy, gm, gd] = toGregorian(jy!, jm!, jd!);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

export function localIsoDate(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
