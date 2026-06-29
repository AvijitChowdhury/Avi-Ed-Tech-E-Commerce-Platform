// Stable browser session id for guest cart + incomplete-order tracking
const KEY = "aviedu_sid";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export const CART_KEY = "aviedu_cart_v1";
