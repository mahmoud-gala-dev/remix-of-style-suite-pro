// Distributed token-bucket rate limiter, backed by Postgres
// (`public.check_token_bucket`). Works across all Worker instances.
// Falls back to an in-memory bucket if the DB is unreachable.

type Bucket = { tokens: number; updatedAt: number };
const fallbackBuckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Bucket capacity (max burst). */
  capacity?: number;
  /** Tokens refilled per minute. */
  refillPerMin?: number;
}

function localBucket(key: string, capacity: number, refillPerMin: number): void {
  const refillPerMs = refillPerMin / 60_000;
  const now = Date.now();
  const b = fallbackBuckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = now - b.updatedAt;
  const tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  if (tokens < 1) {
    const retryAfter = Math.ceil((1 - tokens) / refillPerMs / 1000);
    throw new Response(JSON.stringify({ error: "rate_limited", retryAfter }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    });
  }
  fallbackBuckets.set(key, { tokens: tokens - 1, updatedAt: now });
}

/**
 * Distributed rate limit. Throws a 429 Response on exhaustion.
 * Defaults: 60 req/min, burst 60.
 */
export async function rateLimit(key: string, opts: RateLimitOptions = {}): Promise<void> {
  const capacity = opts.capacity ?? 60;
  const refillPerMin = opts.refillPerMin ?? 60;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("check_token_bucket", {
      p_key: key,
      p_capacity: capacity,
      p_refill_per_min: refillPerMin,
    });
    if (error) {
      const msg = error.message ?? "";
      const m = msg.match(/rate_limited:(\d+)/);
      if (m) {
        const retryAfter = Number(m[1]);
        throw new Response(JSON.stringify({ error: "rate_limited", retryAfter }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
        });
      }
      // DB error (not a rate-limit) → fall back to local bucket so traffic isn't blocked.
      localBucket(key, capacity, refillPerMin);
    }
  } catch (e) {
    if (e instanceof Response) throw e;
    localBucket(key, capacity, refillPerMin);
  }
}

/**
 * IP-based distributed rate limit for public HTTP routes.
 * Reads cf-connecting-ip / x-forwarded-for from the incoming Request.
 */
export async function rateLimitByIp(
  request: Request,
  scope: string,
  opts: RateLimitOptions = {},
): Promise<void> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  await rateLimit(`${scope}:${ip}`, opts);
}