import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture options passed to createSignedUrl so we can assert the transform.
const createSignedUrl = vi.fn(async (_path: string, _ttl: number, opts?: unknown) => ({
  data: { signedUrl: `https://signed.example/url?o=${JSON.stringify(opts)}` },
  error: null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl }) },
  },
}));

import { getAvatarUrl, getImageUrl } from "../src/lib/storage";

beforeEach(() => createSignedUrl.mockClear());

describe("storage image transforms (CDN optimization)", () => {
  it("getAvatarUrl returns null for empty path without calling storage", async () => {
    expect(await getAvatarUrl(null)).toBeNull();
    expect(await getAvatarUrl(undefined)).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("getAvatarUrl defaults to webp/128/quality75", async () => {
    await getAvatarUrl("u/1/customer/abc.png");
    expect(createSignedUrl).toHaveBeenCalledOnce();
    const [, , opts] = createSignedUrl.mock.calls[0];
    expect(opts).toMatchObject({
      transform: { width: 128, quality: 75, resize: "cover", format: "webp" },
    });
  });

  it("getAvatarUrl honors caller-supplied transform", async () => {
    await getAvatarUrl("p.png", { width: 64, format: "avif", quality: 90, resize: "contain" });
    const [, , opts] = createSignedUrl.mock.calls[0];
    expect(opts).toMatchObject({
      transform: { width: 64, quality: 90, resize: "contain", format: "avif" },
    });
  });

  it("getImageUrl defaults to webp/512/quality75", async () => {
    await getImageUrl("service-images", "tenant/svc.jpg");
    const [, , opts] = createSignedUrl.mock.calls[0];
    expect(opts).toMatchObject({
      transform: { width: 512, quality: 75, resize: "cover", format: "webp" },
    });
  });

  it("getImageUrl returns null for empty path", async () => {
    expect(await getImageUrl("customer-avatars", null)).toBeNull();
  });
});
