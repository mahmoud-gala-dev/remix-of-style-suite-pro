// Public VAPID key — safe to ship in the client bundle. The matching private
// key lives only on the server as the VAPID_PRIVATE_KEY runtime secret.
export const VAPID_PUBLIC_KEY_B64URL =
  "BGP7k1wGxjYxV_dmY3viCxeAKhN8bCFrTgqPiurkFp_IWP2ZjA_j4xOnubCTP_pdZSCRQ5sCIHGDHtWvub2U6Cs";

export function b64urlToUint8(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function uint8ToB64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}