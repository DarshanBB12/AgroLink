import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState, RowsSkeleton, StatusBadge, TestModeBadge } from "@/components/common/StateViews";
import { PayButton } from "@/components/payments/PaymentFlow";
import { ReviewDialog } from "@/components/orders/ReviewDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { getOrder, setOrderStatus } from "@/services/orders";
import { downloadInvoice } from "@/services/payments";

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium text-foreground">{v}</dd></div>
);

const RentalDetailPage = () => {
  const { id = "" } = useParams();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [review, setReview] = useState(false);
  const query = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: Boolean(id) });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["order", id] }); void qc.invalidateQueries({ queryKey: ["orders"] }); };
  const cancel = useMutation({ mutationFn: () => setOrderStatus(id, "cancelled"), onSuccess: () => { toast.success(t("app.orders.updated.cancelled")); refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const o = query.data;
  const isProduct = o && (o.type === "seed" || o.type === "fertilizer");

  return (
    <DashboardLayout role="farmer">
      <Button variant="ghost" size="sm" asChild className="mb-4 gap-2"><Link to="/dashboard/farmer/bookings"><ArrowLeft className="h-4 w-4" />{t("app.common.back")}</Link></Button>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !o ? <RowsSkeleton rows={3} /> : (
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          <section className="agro-card md:col-span-2">
            <div className="agro-card-body">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-xl font-bold text-foreground">{o.itemName}</h2><p className="agro-card-meta">{t(`app.types.${o.type}`)} · #{o.id.slice(-6).toUpperCase()}</p></div>
                <div className="flex flex-col items-end gap-1"><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} />{o.paymentMode === "test" && <TestModeBadge />}</div>
              </div>
              <dl>
                <Row k={t("app.orders.provider")} v={o.provider.name || "—"} />
                {o.provider.phone && <Row k={t("app.orders.phone")} v={<a className="text-primary hover:underline" href={`tel:${o.provider.phone}`}>{o.provider.phone}</a>} />}
                {isProduct ? <Row k={t("app.orders.quantity")} v={o.quantity} /> : <><Row k={t("app.orders.start")} v={formatDate(o.startDate)} /><Row k={t("app.orders.end")} v={formatDate(o.endDate)} /><Row k={t("app.orders.duration")} v={o.unit === "hour" ? `${o.duration} h` : t("app.orders.days", { n: o.duration })} /></>}
                <Row k={t("app.orders.unitPrice")} v={formatINR(o.price)} />
                {o.discountPercent > 0 && <Row k={t("app.orders.discount")} v={`${o.discountPercent}%`} />}
                <Row k={t("app.orders.total")} v={<span className="text-lg font-bold text-primary">{formatINR(o.totalPrice, { decimals: true })}</span>} />
                <Row k={t("app.orders.placedOn")} v={formatDateTime(o.createdAt)} />
                {o.notes && <Row k={t("app.booking.notes")} v={o.notes} />}
                {o.cancelReason && <Row k={t("app.orders.reason")} v={o.cancelReason} />}
              </dl>
              {o.status === "pending" && <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{t("app.orders.awaitingApproval")}</p>}
            </div>
            <div className="agro-card-footer flex-wrap">
              <div className="flex flex-wrap gap-2">
                {o.canPay && <PayButton kind="order" id={o.id} size="default" onDone={refresh} />}
                {(o.status === "pending" || (o.status === "approved" && o.paymentStatus === "unpaid")) && <Button variant="outline" className="agro-btn" onClick={() => setCancelOpen(true)}>{t("app.orders.cancel")}</Button>}
                {o.status === "completed" && !o.review && <Button variant="outline" className="agro-btn" onClick={() => setReview(true)}>{t("app.reviews.leave")}</Button>}
              </div>
            </div>
          </section>
          <aside className="agro-card h-fit">
            <div className="agro-card-body">
              <h3 className="agro-card-title">{t("app.payments.title")}</h3>
              {o.payment ? (
                <>
                  <dl><Row k={t("app.payments.receipt")} v={o.payment.receiptNo} /><Row k={t("app.payments.txnId")} v={<span className="break-all text-xs">{o.payment.transactionRef}</span>} /><Row k={t("app.payments.paidOn")} v={formatDateTime(o.payment.paidAt)} /></dl>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadInvoice(o.payment!).catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" />{t("app.payments.invoice")}</Button>
                </>
              ) : <p className="text-sm text-muted-foreground">{t("app.payments.noneYet")}</p>}
              {o.review && <p className="text-sm text-muted-foreground">{t("app.reviews.yourRating")}: {o.review.rating}/5</p>}
            </div>
          </aside>
        </div>
      )}
      <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title={t("app.orders.cancelTitle")} description={t("app.orders.confirmHint")} destructive onConfirm={() => cancel.mutate()} />
      <ReviewDialog orderId={review ? id : null} onClose={() => setReview(false)} onDone={refresh} />
    </DashboardLayout>
  );
};
export default RentalDetailPage;
