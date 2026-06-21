// P74 — In-memory token-bucket rate limiter for server functions.
// Note: in-memory only — bound to a single Worker instance. Best-effort
// abuse mitigation, not a hard global guarantee.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Bucket capacity (max burst). */
  capacity?: number;
  /** Tokens refilled per minute. */
  refillPerMin?: number;
}

/**
 * Throws a 429 Response if `key` has exhausted its bucket.
 * Defaults: 60 req/min, burst 60.
 */
export function rateLimit(key: string, opts: RateLimitOptions = {}): void {
  const capacity = opts.capacity ?? 60;
  const refillPerMs = (opts.refillPerMin ?? 60) / 60_000;
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = now - b.updatedAt;
  const tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  if (tokens < 1) {
    const retryAfter = Math.ceil((1 - tokens) / refillPerMs / 1000);
    throw new Response(JSON.stringify({ error: "rate_limited", retryAfter }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    });
  }
  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
}

/**
 * P21 — IP-based rate limit for public HTTP routes.
 * Reads cf-connecting-ip / x-forwarded-for from the incoming Request.
 */
export function rateLimitByIp(request: Request, scope: string, opts: RateLimitOptions = {}): void {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  rateLimit(`${scope}:${ip}`, opts);
}