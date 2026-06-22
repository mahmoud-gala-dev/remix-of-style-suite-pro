import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (
          path: string,
          opts?: { transform?: { width?: number; format?: string } },
        ) => ({
          data: {
            publicUrl: `https://cdn.example/${bucket}/${path}?w=${opts?.transform?.width ?? "x"}&f=${opts?.transform?.format ?? "x"}`,
          },
        }),
      }),
    },
  },
}));

import { optimizedImageUrl } from "../src/lib/images";

describe("OptimizedImage srcset builder", () => {
  // OptimizedImage's URL-building logic is plain optimizedImageUrl + width per entry.
  // Validate the pieces here (DOM render is exercised by E2E).
  it("optimizedImageUrl defaults to webp", () => {
    const url = optimizedImageUrl("service-images", "a.jpg", { width: 320 });
    expect(url).toContain("w=320");
    expect(url).toContain("f=webp");
  });

  it("builds a multi-width srcset string", () => {
    const widths = [320, 640, 960];
    const srcset = widths
      .map((w) => `${optimizedImageUrl("service-images", "a.jpg", { width: w })} ${w}w`)
      .join(", ");
    expect(srcset.split(", ")).toHaveLength(3);
    expect(srcset).toContain("w=320&f=webp 320w");
    expect(srcset).toContain("w=960&f=webp 960w");
  });
});