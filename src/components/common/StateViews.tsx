import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) => (
  <div className="agro-card items-center justify-center gap-2 px-6 py-12 text-center" role="status">
    <div className="text-muted-foreground">{icon || <Inbox className="h-10 w-10" />}</div>
    <p className="font-semibold text-foreground">{title}</p>
    {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
    {action}
  </div>
);

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => {
  const { t } = useLanguage();
  return (
    <div className="agro-card items-center justify-center gap-2 border-destructive/40 px-6 py-10 text-center" role="alert">
      <AlertCircle className="h-9 w-9 text-destructive" />
      <p className="font-semibold text-foreground">{t("app.common.errorTitle")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-2">
          <RefreshCw className="h-4 w-4" /> {t("app.common.retry")}
        </Button>
      )}
    </div>
  );
};

// Skeleton that has exactly the same box model as ListingCard so the layout does not jump.
export const CardSkeleton = () => (
  <div className="agro-card" aria-hidden="true">
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="agro-card-body">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="agro-card-footer">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

export const GridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="agro-grid" role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const RowsSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-20 w-full rounded-xl" />
    ))}
  </div>
);

export const StatCard = ({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string }) => (
  <div className="agro-stat">
    <div className="flex items-center justify-between text-muted-foreground">
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      {icon}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  created: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  unpaid: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  test: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200",
};

export const StatusBadge = ({ status, label }: { status: string; label?: string }) => {
  const { t } = useLanguage();
  const translated = t(`app.status.${status}`);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] || "bg-muted text-muted-foreground"}`}>
      {label || (translated.startsWith("app.status.") ? status : translated)}
    </span>
  );
};

export const TestModeBadge = () => {
  const { t } = useLanguage();
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES.test}`}>{t("app.payments.testBadge")}</span>;
};

export const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);
