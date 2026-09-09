import { createClient } from "@supabase/supabase-js";

/* ================= supabase + browser identity ================= */
// The anon key is safe in the browser. The rules in schema.sql decide
// what it can do.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// Identity without accounts: a random id saved in the browser, so the
// app knows which claims are yours. If it's gone, you just type your
// name again.
export function deviceId() {
  let v = localStorage.getItem("split.device");
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem("split.device", v);
  }
  return v;
}

export const savedName = () =>
  typeof window === "undefined" ? "" : localStorage.getItem("split.name") || "";
export const saveName = (n) => localStorage.setItem("split.name", n);

// Short, unguessable, unambiguous. No 0/O or 1/l.
export function billCode() {
  const abc = "23456789abcdefghjkmnpqrstuvwxyz";
  return Array.from(crypto.getRandomValues(new Uint8Array(7)))
    .map((b) => abc[b % abc.length])
    .join("");
}

// Phone photos are 4MB and nothing here needs that.
export async function shrink(file, max = 1400, quality = 0.8) {
  const url = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * scale);
  cv.height = Math.round(img.height * scale);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", quality);
}

/* ========================= the money ========================== */

export const fmt = (cents) =>
  (cents < 0 ? "-" : "") + "$" + (Math.abs(cents) / 100).toFixed(2);

export const toCents = (v) => Math.round((parseFloat(v) || 0) * 100);

/**
 * Largest-remainder allocation: splits `amount` across `weights` so the
 * parts sum back to exactly `amount`. No stray penny left on the payer.
 */
export function allocate(amount, weights) {
  const n = weights.length;
  if (n === 0) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = total === 0
    ? weights.map(() => amount / n)
    : weights.map((w) => (amount * w) / total);
  const parts = raw.map((r) => Math.floor(r));
  const left = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) }))
                   .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) parts[order[k % n].i] += 1;
  return parts;
}

/**
 * The point of the app.
 *
 * You pay for what you ate, plus a share of tax, tip and fees in
 * proportion to what you ate. Not an even split of the extras — that's
 * the thing that overcharges whoever had a salad.
 *
 * An item claimed by several people splits equally among them.
 *
 * The total charged to the card is treated as truth, because it's the
 * number that actually left the account. Everything above the item
 * lines rides along proportionally, so the shares add up to the real
 * charge even if the scan misread a digit.
 */
export function computeShares({ items, diners, claims, bill }) {
  const ids = diners.map((d) => d.id);
  const sub = Object.fromEntries(ids.map((id) => [id, 0]));
  const claimersOf = {};
  let unclaimedBase = 0;
  let itemsSum = 0;

  items.forEach((it, idx) => {
    const on = claims.filter((c) => c.item_id === it.id)
                     .map((c) => c.diner_id)
                     .filter((id) => ids.includes(id));
    claimersOf[it.id] = on;
    itemsSum += it.price_cents;
    if (on.length === 0) { unclaimedBase += it.price_cents; return; }
    const base = Math.floor(it.price_cents / on.length);
    const rem = it.price_cents - base * on.length;
    // Rotate the odd penny by item index so it isn't always the same person.
    on.forEach((id, i) => { sub[id] += base + ((i + idx) % on.length < rem ? 1 : 0); });
  });

  const grand = bill.total_cents || itemsSum;
  const extras = grand - itemsSum;
  const cut = allocate(extras, [...ids.map((id) => sub[id]), unclaimedBase]);

  const byId = {};
  ids.forEach((id, i) => {
    byId[id] = { sub: sub[id], extra: cut[i], total: sub[id] + cut[i] };
  });

  return {
    byId, claimersOf, itemsSum, extras, grand,
    unclaimed: unclaimedBase + cut[ids.length],
    unclaimedCount: items.filter((it) => (claimersOf[it.id] || []).length === 0).length,
  };
}

export const PALETTE = [
  "#1F5F5B", "#B4453C", "#4A5FA8", "#C2803C",
  "#6B5B95", "#2E7D4F", "#A03E6E", "#56707A",
];

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
