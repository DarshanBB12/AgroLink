import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OptionSelect, SearchInput } from "@/components/common/AdminFilters";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { allOrders, downloadCsv, setOrderStatus } from "@/services/orders";
import type { Order } from "@/types/api";

const STATUSES = ["pending", "approved", "completed", "rejected", "cancelled"];
const TYPES = ["equipment", "worker", "seed", "fertilizer"];

const AdminBookingsPage = () => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [f, setF] = useState({ q: "", status: "", type: "", paymentStatus: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ o: Order; status: string } | null>(null);
  const params = { ...f, page, limit: 15 };
  const query = useQuery({ queryKey: ["admin-orders", params], queryFn: () => allOrders(params), placeholderData: keepPreviousData });
  const m = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setOrderStatus(id, status, "Updated by administrator"),
    onSuccess: () => { toast.success(t("app.admin.bookingUpdated")); void qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const set = (patch: Partial<typeof f>) => { setF((x) => ({ ...x, ...patch })); setPage(1); };
  const range = f.from && f.to && f.from > f.to;

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.bookingsTitle")} subtitle={t("app.admin.bookingsSubtitle")} actions={<Button variant="outline" className="gap-2" onClick={() => void downloadCsv("/admin/exports/orders", "orders-report.csv").catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" />{t("app.common.export")}</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={f.q} onChange={(q) => set({ q })} placeholder={t("app.admin.searchBookings")} />
        <OptionSelect label={t("app.table.status")} value={f.status} onChange={(status) => set({ status })} options={[{ value: "", label: t("app.common.all") }, ...STATUSES.map((s) => ({ value: s, label: t(`app.status.${s}`) }))]} />
        <OptionSelect label={t("app.table.type")} value={f.type} onChange={(type) => set({ type })} options={[{ value: "", label: t("app.common.all") }, ...TYPES.map((s) => ({ value: s, label: t(`app.types.${s}`) }))]} />
        <OptionSelect label={t("app.table.payment")} value={f.paymentStatus} onChange={(paymentStatus) => set({ paymentStatus })} options={[{ value: "", label: t("app.common.all") }, ...["unpaid", "paid", "refunded"].map((s) => ({ value: s, label: t(`app.status.${s}`) }))]} />
        <Input type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} className="w-[150px]" aria-label={t("app.admin.from")} />
        <Input type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} className="w-[150px]" aria-label={t("app.admin.to")} />
      </div>
      {range && <p className="mb-3 text-sm text-destructive" role="alert">{t("app.admin.rangeError")}</p>}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !query.data ? <RowsSkeleton /> : query.data.data.length === 0 ? <EmptyState title={t("app.admin.noBookings")} /> : (
        <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.item")}</th><th className="p-3">{t("app.table.farmer")}</th><th className="p-3">{t("app.table.provider")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3">{t("app.table.payment")}</th><th className="p-3 text-right">{t("app.table.amount")}</th><th className="p-3 text-right">{t("app.table.actions")}</th></tr></thead>
          <tbody>{query.data.data.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="p-3 font-medium">{o.itemName}<p className="text-xs font-normal text-muted-foreground">{t(`app.types.${o.type}`)}</p></td>
              <td className="p-3">{o.farmer.name}</td><td className="p-3">{o.provider.name}</td><td className="p-3">{formatDate(o.startDate)}</td>
              <td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3"><StatusBadge status={o.paymentStatus} /></td>
              <td className="p-3 text-right font-semibold">{formatINR(o.totalPrice)}</td>
              <td className="p-3 text-right"><div className="flex justify-end gap-2">
                {o.status === "pending" && <Button size="sm" onClick={() => m.mutate({ id: o.id, status: "approved" })} disabled={m.isPending}>{t("app.orders.accept")}</Button>}
                {o.status === "approved" && <Button size="sm" variant="outline" onClick={() => m.mutate({ id: o.id, status: "completed" })} disabled={m.isPending}>{t("app.orders.complete")}</Button>}
                {(o.status === "pending" || o.status === "approved") && <Button size="sm" variant="destructive" onClick={() => setConfirm({ o, status: "cancelled" })}>{t("app.orders.cancel")}</Button>}
              </div></td>
            </tr>))}</tbody></table></div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      <ConfirmDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)} destructive title={t("app.orders.cancelTitle")} description={confirm?.o.paymentStatus === "paid" ? t("app.admin.cancelPaidHint") : t("app.orders.confirmHint")} onConfirm={() => { if (confirm) m.mutate({ id: confirm.o.id, status: confirm.status }); setConfirm(null); }} />
    </DashboardLayout>
  );
};
export default AdminBookingsPage;
