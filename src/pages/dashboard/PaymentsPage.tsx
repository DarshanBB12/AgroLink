import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton, StatCard, StatusBadge, TestModeBadge } from "@/components/common/StateViews";
import { useDebounced } from "@/hooks/useDebounced";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime, formatINR } from "@/lib/format";
import { downloadInvoice, myPayments } from "@/services/payments";

const PaymentsPage = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 350);
  const params = { status: status === "all" ? undefined : status, q: dq || undefined, page, limit: 10 };
  const query = useQuery({ queryKey: ["payments", params], queryFn: () => myPayments(params), placeholderData: keepPreviousData });
  const summary = query.data?.summary as { paid: number; testModePaid: number } | undefined;

  return (
    <DashboardLayout role="farmer">
      <PageHeader title={t("app.pages.paymentsTitle")} subtitle={t("app.pages.paymentsSubtitle")} />
      <div className="agro-stat-grid mb-6">
        <StatCard label={t("app.payments.totalPaid")} value={formatINR(summary?.paid)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label={t("app.payments.testTotal")} value={formatINR(summary?.testModePaid)} hint={t("app.payments.testHint")} />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t("app.payments.searchPlaceholder")} aria-label={t("app.search.label")} className="sm:max-w-sm" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48" aria-label={t("app.common.status")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("app.common.all")}</SelectItem>
            {["completed", "created", "failed", "cancelled", "refunded"].map((s) => <SelectItem key={s} value={s}>{t(`app.status.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !query.data ? <RowsSkeleton /> : query.data.data.length === 0 ? (
        <EmptyState title={t("app.payments.emptyTitle")} hint={t("app.payments.emptyHint")} />
      ) : (
        <div className="grid gap-3">
          {query.data.data.map((p) => (
            <article key={p.id} className="agro-card" data-testid="payment-card">
              <div className="agro-card-body sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link to={`/dashboard/farmer/payments/${p.id}`} className="agro-card-title hover:underline">{p.description}</Link>
                  <p className="agro-card-meta">{p.transactionRef} · {formatDateTime(p.paidAt || p.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />{p.isTest && <TestModeBadge />}
                  <span className="agro-price">{formatINR(p.amount, { decimals: true })}</span>
                  {p.status === "completed" && <Button size="icon" variant="ghost" aria-label={t("app.payments.invoice")} onClick={() => void downloadInvoice(p).catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" /></Button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
    </DashboardLayout>
  );
};
export default PaymentsPage;
