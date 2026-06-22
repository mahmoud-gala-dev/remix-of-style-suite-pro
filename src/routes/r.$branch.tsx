import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, MapPin, Phone, Calendar } from "lucide-react";
import { getPublicBranchReviews } from "@/lib/reviews.functions";

export const Route = createFileRoute("/r/$branch")({
  loader: async ({ params }) => {
    try {
      return await getPublicBranchReviews({ data: { branchId: params.branch, limit: 30 } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.branch.name_en ?? "Salon";
    const avg = loaderData?.avg ?? 0;
    const count = loaderData?.count ?? 0;
    const desc = `${name} — ${avg.toFixed(1)}★ from ${count} reviews. Book your next appointment.`;
    return {
      meta: [
        { title: `${name} — Reviews & Ratings` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — ${avg.toFixed(1)}★` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "business.business" },
      ],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-8">
      <p className="text-sm text-muted-foreground">Unable to load reviews. Please try again later.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-8">
      <p className="text-sm text-muted-foreground">Branch not found.</p>
    </div>
  ),
  component: ReviewsPage,
});

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const data = Route.useLoaderData() as Awaited<ReturnType<typeof getPublicBranchReviews>>;
  const { branch, avg, count, distribution, reviews } = data;
  const max = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center gap-5">
          {branch.logo_url && (
            <img src={branch.logo_url} alt={branch.name_en ?? ""} className="h-16 w-16 rounded-2xl object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{branch.name_en ?? branch.name_ar}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <Stars value={avg} />
              <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
              <span>· {count} reviews</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {branch.address && (
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {branch.address}</span>
              )}
              {branch.phone && (
                <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone size={12} /> {branch.phone}
                </a>
              )}
            </div>
          </div>
          <Link
            to="/book"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            <Calendar size={16} /> Book now
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold mb-3">Rating breakdown</h2>
          <div className="space-y-1.5">
              {[...distribution].reverse().map((d: { star: number; count: number }) => (
              <div key={d.star} className="flex items-center gap-3 text-xs">
                <span className="w-8 tabular-nums">{d.star}★</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${(d.count / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-4">Recent reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r: typeof reviews[number], i: number) => (
                <li key={i} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.rating} size={14} />
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          to="/book"
          className="sm:hidden inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium"
        >
          <Calendar size={16} /> Book your appointment
        </Link>
      </main>
    </div>
  );
}