import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, IndianRupee, Percent, Wallet } from "lucide-react";
import { ErrorState, EmptyState, GridSkeleton, PageHeader, StatCard } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatINR } from "@/lib/format";
import { earnings } from "@/services/orders";

// Earnings for workers and equipment owners, computed on the server from VERIFIED payments only.
export const EarningsView = () => {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ["earnings"], queryFn: earnings });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <GridSkeleton count={4} />;
  const e = q.data;

  return (
    <div className="space-y-6">
      <PageHeader title={t("app.earnings.title")} subtitle={t("app.earnings.subtitle")} />
      <div className="agro-stat-grid">
        <StatCard label={t("app.earnings.net")} value={formatINR(e.net)} icon={<Wallet className="h-4 w-4" />} hint={t("app.earnings.netHint")} />
        <StatCard label={t("app.earnings.gross")} value={formatINR(e.gross)} icon={<IndianRupee className="h-4 w-4" />} hint={t("app.earnings.paidOrders", { n: e.paidCount })} />
        <StatCard label={t("app.earnings.fee", { p: e.platformFeePercent })} value={formatINR(e.platformFee)} icon={<Percent className="h-4 w-4" />} />
        <StatCard label={t("app.earnings.pending")} value={formatINR(e.pendingAmount)} icon={<Clock className="h-4 w-4" />} hint={t("app.earnings.pendingHint", { n: e.pendingCount })} />
        <StatCard label={t("app.earnings.completed")} value={e.completedJobs} icon={<CheckCircle2 className="h-4 w-4" />} hint={t("app.earnings.active", { n: e.activeJobs })} />
      </div>
      {e.testModeAmount > 0 && <div className="agro-card border-yellow-400/60 p-4 text-sm" role="note">⚠️ {t("app.earnings.testNote", { amount: formatINR(e.testModeAmount) })}</div>}
      <section className="agro-card p-5">
        <h3 className="mb-3 font-semibold">{t("app.earnings.monthly")}</h3>
        {e.monthly.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("app.earnings.noMonthly")}</p> : (
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={e.monthly}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} /><Tooltip formatter={(v: number) => formatINR(v)} /><Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        )}
      </section>
      <section>
        <h3 className="mb-3 font-semibold">{t("app.earnings.recent")}</h3>
        {e.recent.length === 0 ? <EmptyState title={t("app.earnings.emptyTitle")} hint={t("app.earnings.emptyHint")} /> : (
          <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.item")}</th><th className="p-3">{t("app.table.from")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3 text-right">{t("app.table.amount")}</th></tr></thead>
            <tbody>{e.recent.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.itemName}</td><td className="p-3">{r.farmer}</td><td className="p-3">{formatDate(r.paidAt)}</td><td className="p-3 text-right font-semibold">{formatINR(r.amount)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
};
