import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OptionSelect, SearchInput } from "@/components/common/AdminFilters";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton, StatCard, StatusBadge, TestModeBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime, formatINR } from "@/lib/format";
import { downloadCsv } from "@/services/orders";
import { adminPayments, downloadInvoice, refundPayment } from "@/services/payments";
import type { Txn } from "@/types/api";

const STATUSES = ["created", "completed", "failed", "cancelled", "refunded"];

const AdminPaymentsPage = () => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [f, setF] = useState({ q: "", status: "", mode: "", purpose: "" });
  const [page, setPage] = useState(1);
  const [refund, setRefund] = useState<Txn | null>(null);
  const params = { ...f, page, limit: 15 };
  const query = useQuery({ queryKey: ["admin-payments", params], queryFn: () => adminPayments(params), placeholderData: keepPreviousData });
  const m = useMutation({ mutationFn: (txn: Txn) => refundPayment(txn.id, "Refunded by admin"), onSuccess: () => { toast.success(t("app.admin.refunded")); void qc.invalidateQueries({ queryKey: ["admin-payments"] }); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const set = (patch: Partial<typeof f>) => { setF((x) => ({ ...x, ...patch })); setPage(1); };
  const s = query.data?.summary;

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.paymentsTitle")} subtitle={t("app.admin.paymentsSubtitle")} actions={<Button variant="outline" className="gap-2" onClick={() => void downloadCsv("/payments/admin/export", "payments-report.csv").catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" />{t("app.common.export")}</Button>} />
      {s && <div className="agro-stat-grid mb-5"><StatCard label={t("app.admin.verified")} value={formatINR(s.completed.total)} hint={t("app.admin.txnCount", { n: s.completed.count })} /><StatCard label={t("app.admin.testMode")} value={formatINR(s.testMode.total)} hint={t("app.admin.testModeHint")} /><StatCard label={t("app.admin.pendingPay")} value={formatINR(s.pending.total)} hint={t("app.admin.txnCount", { n: s.pending.count })} /><StatCard label={t("app.status.failed")} value={s.failed.count} /><StatCard label={t("app.status.refunded")} value={formatINR(s.refunded.total)} /></div>}
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder={t("app.admin.searchPayments")} />
        <OptionSelect label={t("app.table.status")} value={f.status} onChange={(status) => set({ status })} options={[{ value: "", label: t("app.common.all") }, ...STATUSES.map((x) => ({ value: x, label: t(`app.status.${x}`) }))]} />
        <OptionSelect label={t("app.admin.mode")} value={f.mode} onChange={(mode) => set({ mode })} options={[{ value: "", label: t("app.common.all") }, { value: "razorpay", label: "Razorpay" }, { value: "test", label: t("app.payments.testBadge") }]} />
        <OptionSelect label={t("app.table.type")} value={f.purpose} onChange={(purpose) => set({ purpose })} options={[{ value: "", label: t("app.common.all") }, { value: "order", label: t("app.admin.purposeOrder") }, { value: "emi", label: "EMI" }]} />
      </div>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !query.data ? <RowsSkeleton /> : query.data.data.length === 0 ? <EmptyState title={t("app.admin.noPayments")} /> : (
        <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.payments.txnId")}</th><th className="p-3">{t("app.table.user")}</th><th className="p-3">{t("app.table.description")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3 text-right">{t("app.table.amount")}</th><th className="p-3 text-right">{t("app.table.actions")}</th></tr></thead>
          <tbody>{query.data.data.map((x) => (
            <tr key={x.id} className="border-b last:border-0"><td className="p-3 font-mono text-xs">{x.transactionRef}{x.isTest && <> <TestModeBadge /></>}</td><td className="p-3">{x.user?.name}</td><td className="p-3">{x.description}</td><td className="p-3">{formatDateTime(x.createdAt)}</td><td className="p-3"><StatusBadge status={x.status} /></td><td className="p-3 text-right font-semibold">{formatINR(x.amount, { decimals: true })}</td>
              <td className="p-3 text-right"><div className="flex justify-end gap-2">{x.status === "completed" && <><Button size="icon" variant="ghost" aria-label={t("app.payments.invoice")} onClick={() => void downloadInvoice(x).catch((e) => toast.error(getErrorMessage(e)))}><FileText className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setRefund(x)}>{t("app.admin.refund")}</Button></>}</div></td></tr>))}</tbody></table></div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      <ConfirmDialog open={Boolean(refund)} onOpenChange={(o) => !o && setRefund(null)} destructive title={t("app.admin.refundTitle")} description={refund?.mode === "razorpay" ? t("app.admin.refundLiveHint") : t("app.admin.refundHint")} onConfirm={() => { if (refund) m.mutate(refund); setRefund(null); }} />
    </DashboardLayout>
  );
};
export default AdminPaymentsPage;
