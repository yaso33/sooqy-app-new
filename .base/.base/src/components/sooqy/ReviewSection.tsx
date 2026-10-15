import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchMyReview, fetchReviews, submitReview, type Review } from "@/lib/sooqy";
import { RatingSelector } from "@/components/sooqy/RatingSelector";
import { cn } from "@/lib/utils";

function averageRating(reviews: Review[]) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReviewSection({
  targetType,
  targetId,
  title,
  className,
}: {
  targetType: "product" | "store";
  targetId: string;
  title: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const reviews = useQuery({
    queryKey: ["reviews", targetType, targetId],
    queryFn: () => fetchReviews(targetType, targetId),
  });
  const myReview = useQuery({
    queryKey: ["my-review", targetType, targetId],
    queryFn: () => fetchMyReview(targetType, targetId),
    enabled: ready && !!user,
  });

  const avg = averageRating(reviews.data ?? []);
  const submit = async (rating: number, nextComment?: string) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    try {
      await submitReview(targetType, targetId, rating, nextComment?.trim() || undefined);
      toast.success("تم إرسال التقييم بنجاح");
      qc.invalidateQueries({ queryKey: ["reviews", targetType, targetId] });
      qc.invalidateQueries({ queryKey: ["my-review", targetType, targetId] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <section className={cn("space-y-3 rounded-3xl bg-card p-4 shadow-soft", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {avg != null ? (
          <span className="flex items-center gap-1 text-sm font-bold text-warning">
            <Star className="size-4 fill-warning" /> {avg.toFixed(1)}/5
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">لا توجد تقييمات بعد</span>
        )}
      </div>
      {reviews.data?.length ? (
        <p className="text-xs text-muted-foreground">
          {reviews.data.length} تقييم{reviews.data.length === 1 ? "" : "ات"}
        </p>
      ) : null}

      {myReview.data ? (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-3 text-sm">
          <p className="font-bold text-success">تم تقييمك هذا العنصر {myReview.data.rating}/5</p>
          {myReview.data.comment && (
            <p className="mt-1 text-muted-foreground">{myReview.data.comment}</p>
          )}
        </div>
      ) : (
        <RatingSelector onSubmit={submit} label="قيّم هذا العنصر" compact />
      )}

      <div className="space-y-3 pt-1">
        {reviews.data?.map((review) => (
          <article key={review.id} className="rounded-2xl border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5 text-sm font-bold text-warning">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      "size-3.5",
                      index < review.rating ? "fill-warning text-warning" : "text-muted-foreground",
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(review.created_at)}
              </span>
            </div>
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
            )}
          </article>
        ))}
        {!reviews.isLoading && !reviews.data?.length && !myReview.data && (
          <p className="rounded-2xl bg-background p-4 text-center text-xs text-muted-foreground">
            كن أول من يقيمه.
          </p>
        )}
      </div>
    </section>
  );
}
