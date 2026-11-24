import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, RowsSkeleton, StatusBadge } from "@/components/common/StateViews";
import { PayButton } from "@/components/payments/PaymentFlow";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatINR } from "@/lib/format";
import { getOrder } from "@/services/orders";

// Shows the REAL state of an order straight from the server. A pending request is never presented as confirmed
// and nothing is shown as paid until the payment has been verified.
const BookingConfirmationPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const { t } = useLanguage();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrder(orderId!), enabled: Boolean(orderId) });
  const o = query.data;
  const confirmed = o && ["approved", "completed"].includes(o.status);

  return (
    <DashboardLayout role="farmer">
      <div className="mx-auto max-w-xl">
        {!orderId ? <EmptyState title={t("app.booking.noOrder")} action={<Button asChild><Link to="/dashboard/farmer/bookings">{t("app.pages.bookingsTitle")}</Link></Button>} />
          : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          : !o ? <RowsSkeleton rows={3} />
          : (
            <div className="agro-card items-center p-8 text-center">
              {confirmed ? <CheckCircle2 className="h-14 w-14 text-emerald-600" /> : <Clock className="h-14 w-14 text-amber-500" />}
              <h2 className="mt-3 text-2xl font-bold text-foreground">{confirmed ? t("app.booking.confirmedTitle") : t("app.booking.requestedTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{confirmed ? t("app.booking.confirmedHint") : t("app.booking.requestedHint")}</p>
              <div className="my-5 w-full space-y-2 rounded-lg bg-secondary p-4 text-left text-sm">
                <p className="font-semibold text-foreground">{o.itemName}</p>
                <p className="text-muted-foreground">{o.type === "seed" || o.type === "fertilizer" ? t("app.orders.qty", { n: o.quantity }) : `${formatDate(o.startDate)}${o.endDate && o.endDate !== o.startDate ? ` – ${formatDate(o.endDate)}` : ""}`}</p>
                <div className="flex items-center gap-2"><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} /></div>
                <p className="text-xl font-bold text-primary">{formatINR(o.totalPrice, { decimals: true })}</p>
              </div>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {o.canPay && <PayButton kind="order" id={o.id} size="default" label={t("app.payments.payNow")} onDone={() => void qc.invalidateQueries({ queryKey: ["order", orderId] })} />}
                <Button variant="outline" asChild><Link to={`/dashboard/farmer/rentals/${o.id}`}>{t("app.orders.details")}</Link></Button>
                <Button variant="ghost" asChild><Link to="/dashboard/farmer">{t("app.common.goToDashboard")}</Link></Button>
              </div>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};
export default BookingConfirmationPage;
