import { createHmac, timingSafeEqual } from "crypto";

/** Pure HMAC-SHA256 signature compare for our internal Stripe-webhook proxy.
 *  Throws `Response('Invalid signature', 401)` when the digest does not match.
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): void {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
    throw new Response("Invalid signature", { status: 401 });
  }
}