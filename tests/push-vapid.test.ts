import { describe, it, expect } from "vitest";
import { b64urlToUint8, uint8ToB64url, VAPID_PUBLIC_KEY_B64URL } from "@/lib/push-vapid";

describe("VAPID_PUBLIC_KEY_B64URL", () => {
  it("decodes to a 65-byte uncompressed P-256 point starting with 0x04", () => {
    const bytes = b64urlToUint8(VAPID_PUBLIC_KEY_B64URL);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04);
  });
});

describe("b64urlToUint8 / uint8ToB64url", () => {
  it("round-trips arbitrary bytes", () => {
    const src = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(b64urlToUint8(uint8ToB64url(src))).toEqual(src);
  });

  it("emits url-safe alphabet without padding", () => {
    const s = uint8ToB64url(new Uint8Array([0xfb, 0xff, 0xbf]));
    expect(s).not.toMatch(/[+/=]/);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("accepts unpadded input and decodes correctly", () => {
    // 'hi' -> base64 'aGk=' -> url-safe unpadded 'aGk'
    const bytes = b64urlToUint8("aGk");
    expect(Array.from(bytes)).toEqual([0x68, 0x69]);
  });

  it("decodes url-safe chars (- and _) as + and /", () => {
    // bytes [0xfb, 0xff, 0xbf] => base64 '+/+/' => url-safe '-_-_'
    expect(Array.from(b64urlToUint8("-_-_"))).toEqual([0xfb, 0xff, 0xbf]);
  });

  it("accepts ArrayBuffer input", () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    expect(b64urlToUint8(uint8ToB64url(buf))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("handles empty input", () => {
    expect(uint8ToB64url(new Uint8Array())).toBe("");
    expect(b64urlToUint8("")).toEqual(new Uint8Array());
  });
});