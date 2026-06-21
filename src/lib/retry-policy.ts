// Pure retry/backoff policy used by webhook retries. Tested in tests/webhooks-retry.test.ts.
export type DeliveryRow = { attempts: number | null; status: number };

export function isFailureStatus(status: number): boolean {
  return status === 0 || status >= 500;
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 400;
}

export function shouldGiveUp(nextAttempts: number, ok: boolean, maxAttempts = 3): boolean {
  return !ok && nextAttempts >= maxAttempts;
}

export function backoffMs(nextAttempts: number, baseMs = 60_000): number {
  return Math.pow(2, Math.max(1, nextAttempts)) * baseMs;
}

export function planRetry(row: DeliveryRow, newStatus: number, maxAttempts = 3) {
  const ok = isSuccessStatus(newStatus);
  const failure = !ok;
  const attempts = (row.attempts ?? 1) + 1;
  const giveUp = shouldGiveUp(attempts, ok, maxAttempts);
  return {
    attempts,
    failed: giveUp,
    nextRetryAtMs: failure && !giveUp ? Date.now() + backoffMs(attempts) : null,
  };
}