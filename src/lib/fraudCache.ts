// Client-side session cache so each phone is checked at most once per session.
const KEY = "aviedu_fraud_cache_v1";

type Entry = { risk: string; total_parcel: number; success: number; cancelled: number; success_ratio: number; checked_at: string };

function readAll(): Record<string, Entry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function writeAll(map: Record<string, Entry>) {
  try { sessionStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^88/, "");
}
export function getCached(phone: string): Entry | null {
  return readAll()[normalizePhone(phone)] ?? null;
}
export function setCached(phone: string, e: Entry) {
  const map = readAll();
  map[normalizePhone(phone)] = e;
  writeAll(map);
}
