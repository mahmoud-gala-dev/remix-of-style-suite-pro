import { useMemo, type ImgHTMLAttributes } from "react";
import { optimizedImageUrl, type ImageTransform } from "@/lib/images";

// Default responsive widths used to build srcset. Tuned for common card / hero sizes.
const DEFAULT_WIDTHS = [320, 640, 960, 1280] as const;

export type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet" | "src"> & {
  /** Public Supabase Storage bucket name. */
  bucket: string;
  /** Object path inside the bucket. */
  path: string;
  /** Intrinsic display width hint (drives default `sizes` + base `src`). */
  width?: number;
  /** Intrinsic display height hint. */
  height?: number;
  /** Per-image transform overrides (format/quality/resize). Width per srcset entry is added automatically. */
  transform?: Omit<ImageTransform, "width">;
  /** Custom widths for the srcset. Defaults to 320/640/960/1280. */
  widths?: readonly number[];
  /** Responsive `sizes` attribute. Defaults to `(min-width: 768px) {width}px, 100vw`. */
  sizes?: string;
  /** Set to "eager" for above-the-fold/LCP images. Defaults to "lazy". */
  loading?: "lazy" | "eager";
};

/**
 * <OptimizedImage> — renders a Supabase-Storage backed <img> with:
 *   - per-width srcset for the browser to pick the right size
 *   - WebP (default) via on-the-fly transforms
 *   - loading="lazy" + decoding="async" by default
 *   - explicit width/height to avoid layout shift
 *
 * Pair with the matching transform defaults in `src/lib/storage.ts`.
 */
export function OptimizedImage({
  bucket,
  path,
  width,
  height,
  transform,
  widths = DEFAULT_WIDTHS,
  sizes,
  loading = "lazy",
  alt = "",
  decoding = "async",
  ...rest
}: OptimizedImageProps) {
  const { src, srcSet, computedSizes } = useMemo(() => {
    const baseWidth = width ?? widths[widths.length - 1];
    const srcSetStr = widths
      .map((w) => `${optimizedImageUrl(bucket, path, { ...transform, width: w })} ${w}w`)
      .join(", ");
    const baseSrc = optimizedImageUrl(bucket, path, { ...transform, width: baseWidth });
    const fallbackSizes = sizes ?? `(min-width: 768px) ${baseWidth}px, 100vw`;
    return { src: baseSrc, srcSet: srcSetStr, computedSizes: fallbackSizes };
  }, [bucket, path, width, widths, transform, sizes]);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={computedSizes}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      alt={alt}
      {...rest}
    />
  );
}

export default OptimizedImage;