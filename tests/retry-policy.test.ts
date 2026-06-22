import { describe, it, expect } from "vitest";
import {
  isFailureStatus,
  isSuccessStatus,
  shouldGiveUp,
  backoffMs,
  planRetry,
} from "../src/lib/retry-policy";

describe("retry-policy", () => {
  it("classifies status codes", () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(302)).toBe(true);
    expect(isSuccessStatus(404)).toBe(false);
    expect(isFailureStatus(0)).toBe(true);
    expect(isFailureStatus(500)).toBe(true);
    expect(isFailureStatus(404)).toBe(false);
  });

  it("gives up only after maxAttempts and only on failure", () => {
    expect(shouldGiveUp(3, false, 3)).toBe(true);
    expect(shouldGiveUp(2, false, 3)).toBe(false);
    expect(shouldGiveUp(5, true, 3)).toBe(false);
  });

  it("backoff grows exponentially with attempts", () => {
    expect(backoffMs(1, 1000)).toBe(2000);
    expect(backoffMs(2, 1000)).toBe(4000);
    expect(backoffMs(3, 1000)).toBe(8000);
  });

  it("planRetry schedules retry on failure under max", () => {
    const r = planRetry({ attempts: 1, status: 500 }, 500, 3);
    expect(r.attempts).toBe(2);
    expect(r.failed).toBe(false);
    expect(r.nextRetryAtMs).not.toBeNull();
  });

  it("planRetry marks failed once attempts reach max", () => {
    const r = planRetry({ attempts: 2, status: 500 }, 500, 3);
    expect(r.failed).toBe(true);
    expect(r.nextRetryAtMs).toBeNull();
  });

  it("planRetry on success clears retry", () => {
    const r = planRetry({ attempts: 1, status: 0 }, 200, 3);
    expect(r.failed).toBe(false);
    expect(r.nextRetryAtMs).toBeNull();
  });
});
