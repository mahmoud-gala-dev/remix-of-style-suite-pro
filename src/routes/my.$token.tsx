import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, MapPin, Scissors, User, XCircle, MessageCircle, CheckCircle2, Star } from "lucide-react";
import { getBookingByToken, cancelBookingByToken } from "@/lib/customer-portal.functions";
import { submitReview, getReviewForBooking } from "@/lib/reviews.functions";
import { useDir, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { waLink, buildBookingConfirmMsg } from "@/lib/whatsapp";

export const Route = createFileRoute("/my/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Manage your booking" }, { name: "robots", content: "noindex" }] }),
  component: MyBookingPage,
});

function MyBookingPage() {
  const { token } = Route.useParams();
  const lang = useI18n((s) => s.lang);
  const dir = useDir();
  const fetchBooking = useServerFn(getBookingByToken);
  const cancelFn = useServerFn(cancelBookingByToken);
  const fetchReview = useServerFn(getReviewForBooking);
  const submitReviewFn = useServerFn(submitReview);
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const q = useQuery({
    queryKey: ["portal-booking", token],
    queryFn: () => fetchBooking({ data: { token } }),
    retry: false,
  });

  const reviewQ = useQuery({
    queryKey: ["portal-review", token],
    queryFn: () => fetchReview({ data: { token } }),
    retry: false,
  });

  const reviewMut = useMutation({
    mutationFn: () => submitReviewFn({ data: { token, rating, comment: comment.trim() || undefined } }),
    onSuccess: () => {
      toast.success(lang === "ar" ? "شكراً لتقييمك" : "Thanks for your review");
      qc.invalidateQueries({ queryKey: ["portal-review", token] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { token } }),
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم إلغاء الحجز" : "Booking cancelled");
      qc.invalidateQueries({ queryKey: ["portal-booking", token] });
      setConfirmCancel(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : (lang === "ar" ? "تعذّر الإلغاء" : "Could not cancel");
      toast.error(msg);
    },
  });

  if (q.isLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (q.isError || !q.data) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">{lang === "ar" ? "الحجز غير موجود" : "Booking not found"}</h1>
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "الرابط غير صالح أو منتهي." : "This link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const b = q.data;
  const branchName = lang === "ar" ? b.branch?.name_ar : b.branch?.name_en;
  const serviceName = lang === "ar" ? b.service?.name_ar : b.service?.name_en;
  const employeeName = lang === "ar" ? b.employee?.name_ar : b.employee?.name_en;
  const cancelled = b.status === "cancelled";
  const completed = b.status === "completed";

  const waMsg = buildBookingConfirmMsg({
    customerName: b.customer?.name ?? "",
    serviceName: serviceName ?? "",
    branchName: branchName ?? "",
    startAt: b.startAt,
    manageUrl: typeof window !== "undefined" ? window.location.href : "",
    lang,
  });
  const shareHref = b.customer?.phone ? waLink(b.customer.phone, waMsg) : "";

  return (
    <div dir={dir} className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            {cancelled ? (
              <XCircle className="size-8 text-destructive" />
            ) : (
              <CheckCircle2 className="size-8 text-primary" />
            )}
            <div>
              <h1 className="text-xl font-bold">
                {cancelled
                  ? (lang === "ar" ? "حجز ملغى" : "Booking cancelled")
                  : (lang === "ar" ? "حجزك مؤكد" : "Your booking")}
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{b.status}</p>
            </div>
          </div>

          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3"><MapPin className="size-4 text-muted-foreground" /><span>{branchName}</span></li>
            <li className="flex items-center gap-3"><Scissors className="size-4 text-muted-foreground" /><span>{serviceName}</span></li>
            <li className="flex items-center gap-3"><User className="size-4 text-muted-foreground" /><span>{employeeName}</span></li>
            <li className="flex items-center gap-3"><Calendar className="size-4 text-muted-foreground" />
              <span>{new Date(b.startAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "full", timeStyle: "short" })}</span>
            </li>
            <li className="flex items-center gap-3 font-semibold">{fmtMoney(b.price)}</li>
          </ul>

          {!cancelled && !completed && (
            <div className="mt-6 grid gap-2">
              {shareHref && (
                <a href={shareHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                  <MessageCircle className="size-4" /> {lang === "ar" ? "مشاركة عبر واتساب" : "Share via WhatsApp"}
                </a>
              )}
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm font-medium hover:bg-destructive/10">
                  <XCircle className="size-4" /> {lang === "ar" ? "إلغاء الحجز" : "Cancel booking"}
                </button>
              ) : (
                <div className="rounded-md border border-destructive/40 p-3 bg-destructive/5">
                  <p className="text-sm mb-3">{lang === "ar" ? "هل أنت متأكد؟ يتطلب الإلغاء قبل ساعتين على الأقل." : "Are you sure? Cancellation requires at least 2 hours notice."}</p>
                  <div className="flex gap-2">
                    <button disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()}
                      className="flex-1 rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm font-semibold disabled:opacity-60">
                      {cancelMut.isPending ? "…" : (lang === "ar" ? "نعم، إلغاء" : "Yes, cancel")}
                    </button>
                    <button onClick={() => setConfirmCancel(false)}
                      className="flex-1 rounded-md border px-3 py-2 text-sm">
                      {lang === "ar" ? "تراجع" : "Keep"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {completed && (
            <div className="mt-6 border-t pt-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="size-4" />
                {lang === "ar" ? "كيف كانت تجربتك؟" : "How was your visit?"}
              </h2>
              {reviewQ.data ? (
                <div className="rounded-md bg-muted/30 p-4 text-sm">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`size-4 ${n <= reviewQ.data!.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  {reviewQ.data.comment && <p className="text-muted-foreground">{reviewQ.data.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === "ar" ? "تم إرسال تقييمك. شكراً لك!" : "Your review was submitted. Thank you!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                        <Star className={`size-7 transition ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                    placeholder={lang === "ar" ? "تعليق اختياري…" : "Optional comment…"}
                    rows={3}
                    className="w-full rounded-md border bg-background p-2 text-sm"
                  />
                  <button
                    disabled={rating === 0 || reviewMut.isPending}
                    onClick={() => reviewMut.mutate()}
                    className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {reviewMut.isPending ? "…" : (lang === "ar" ? "إرسال التقييم" : "Submit review")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}