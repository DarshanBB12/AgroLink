import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton, StatCard } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/format";
import { receivedReviews } from "@/services/orders";

const Stars = ({ n }: { n: number }) => (
  <span className="flex" aria-label={`${n}/5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />)}</span>
);

const ReviewsPage = () => {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ["reviews-received"], queryFn: receivedReviews });
  return (
    <DashboardLayout role="worker">
      <PageHeader title={t("app.pages.reviewsTitle")} subtitle={t("app.pages.reviewsSubtitle")} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data ? <RowsSkeleton /> : (
        <div className="space-y-4">
          <div className="agro-stat-grid"><StatCard label={t("app.reviews.average")} value={q.data.summary.count ? q.data.summary.average.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} /><StatCard label={t("app.reviews.count")} value={q.data.summary.count} /></div>
          {q.data.data.length === 0 ? <EmptyState icon={<Star className="h-10 w-10" />} title={t("app.reviews.emptyTitle")} hint={t("app.reviews.emptyHint")} /> : (
            <div className="grid gap-3">{q.data.data.map((r) => (
              <article key={r.id} className="agro-card gap-2 p-4"><div className="flex items-center justify-between"><p className="font-medium">{r.reviewer}</p><Stars n={r.rating} /></div>{r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}<p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p></article>
            ))}</div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
export default ReviewsPage;
