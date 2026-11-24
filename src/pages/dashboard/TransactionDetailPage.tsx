import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ErrorState, RowsSkeleton, StatusBadge, TestModeBadge } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime, formatINR } from "@/lib/format";
import { downloadInvoice, getPayment } from "@/services/payments";

const TransactionDetailPage = () => {
  const { id = "" } = useParams();
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ["payment", id], queryFn: () => getPayment(id) });
  const p = query.data;
  const rows: [string, React.ReactNode][] = p ? [
    [t("app.payments.txnId"), <span key="a" className="break-all">{p.transactionRef}</span>],
    [t("app.payments.receipt"), p.receiptNo || "—"],
    [t("app.common.description"), p.description],
    [t("app.payments.method"), p.isTest ? t("app.payments.testMethod") : p.mode === "offline" ? t("app.payments.offline") : "Razorpay"],
    [t("app.payments.createdOn"), formatDateTime(p.createdAt)],
    [t("app.payments.paidOn"), formatDateTime(p.paidAt)],
    ...(p.failureReason ? [[t("app.orders.reason"), p.failureReason] as [string, React.ReactNode]] : []),
  ] : [];
  return (
    <DashboardLayout role="farmer">
      <Button variant="ghost" size="sm" asChild className="mb-4 gap-2"><Link to="/dashboard/farmer/payments"><ArrowLeft className="h-4 w-4" />{t("app.common.back")}</Link></Button>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !p ? <RowsSkeleton rows={3} /> : (
        <section className="agro-card mx-auto max-w-xl">
          <div className="agro-card-body">
            <div className="flex items-start justify-between"><p className="agro-price text-3xl">{formatINR(p.amount, { decimals: true })}</p><div className="flex flex-col items-end gap-1"><StatusBadge status={p.status} />{p.isTest && <TestModeBadge />}</div></div>
            {p.isTest && <p className="rounded-md bg-yellow-100 p-2 text-sm text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100">{t("app.payments.testNotice")}</p>}
            <dl>{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
          </div>
          {p.status === "completed" && <div className="agro-card-footer"><Button className="gap-2" onClick={() => void downloadInvoice(p).catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" />{t("app.payments.invoice")}</Button></div>}
        </section>
      )}
    </DashboardLayout>
  );
};
export default TransactionDetailPage;
