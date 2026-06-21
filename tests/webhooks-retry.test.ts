import { describe, it, expect } from "vitest";
import { isFailureStatus, isSuccessStatus, shouldGiveUp, backoffMs, planRetry } from "@/lib/retry-policy";

describe("isFailureStatus", () => {
  it("treats 0 (network error) as failure", () => expect(isFailureStatus(0)).toBe(true));
  it("treats 500+ as failure", () => expect(isFailureStatus(503)).toBe(true));
  it("treats 200 as success", () => expect(isFailureStatus(200)).toBe(false));
  it("treats 404 as non-retriable (not failure here)", () => expect(isFailureStatus(404)).toBe(false));
});

describe("isSuccessStatus", () => {
  it("accepts 2xx", () => expect(isSuccessStatus(204)).toBe(true));
  it("accepts 3xx", () => expect(isSuccessStatus(302)).toBe(true));
  it("rejects 4xx", () => expect(isSuccessStatus(400)).toBe(false));
  it("rejects 5xx", () => expect(isSuccessStatus(500)).toBe(false));
});

describe("shouldGiveUp", () => {
  it("never gives up on success", () => expect(shouldGiveUp(99, true)).toBe(false));
  it("gives up at maxAttempts on failure", () => expect(shouldGiveUp(3, false)).toBe(true));
  it("retries below maxAttempts", () => expect(shouldGiveUp(2, false)).toBe(false));
});

describe("backoffMs", () => {
  it("is exponential", () => {
    expect(backoffMs(2)).toBe(4 * 60_000);
    expect(backoffMs(3)).toBe(8 * 60_000);
  });
});

describe("planRetry", () => {
  it("schedules next retry on first failure", () => {
    const p = planRetry({ attempts: 1, status: 0 }, 500);
    expect(p.attempts).toBe(2);
    expect(p.failed).toBe(false);
    expect(p.nextRetryAtMs).toBeGreaterThan(Date.now());
  });
  it("marks failed after 3 attempts", () => {
    const p = planRetry({ attempts: 2, status: 0 }, 500);
    expect(p.attempts).toBe(3);
    expect(p.failed).toBe(true);
    expect(p.nextRetryAtMs).toBeNull();
  });
  it("clears retry on success", () => {
    const p = planRetry({ attempts: 1, status: 500 }, 200);
    expect(p.failed).toBe(false);
    expect(p.nextRetryAtMs).toBeNull();
  });
});