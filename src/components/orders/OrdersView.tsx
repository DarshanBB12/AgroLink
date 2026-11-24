import { useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton } from "@/components/common/StateViews";
import { PayButton } from "@/components/payments/PaymentFlow";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { myOrders, providerOrders, setOrderStatus } from "@/services/orders";
import type { Order } from "@/types/api";
import { OrderCard } from "./OrderCard";
import { ReviewDialog } from "./ReviewDialog";

const TABS = ["all", "pending", "approved", "completed", "rejected", "cancelled"] as const;

interface Props {
  perspective: "farmer" | "provider";
  title: string;
  subtitle?: string;
  type?: string; // equipment | worker | product
  header?: ReactNode;
}

// One orders list used by farmer bookings/rentals and provider jobs/rental requests. Actions depend on role + status.
export const OrdersView = ({ perspective, title, subtitle, type, header }: Props) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ order: Order; status: string } | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const params = { status: tab === "all" ? undefined : tab, type, page, limit: 10 };
  const query = useQuery({
    queryKey: ["orders", perspective, params],
    queryFn: () => (perspective === "farmer" ? myOrders(params) : providerOrders(params)),
    placeholderData: keepPreviousData,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setOrderStatus(id, status),
    onSuccess: (o) => { toast.success(t(`app.orders.updated.${o.status}`)); void refresh(); void qc.invalidateQueries({ queryKey: ["earnings"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const actionsFor = (o: Order) => {
    const btns: ReactNode[] = [];
    if (perspective === "farmer") {
      if (o.canPay) btns.push(<PayButton key="pay" kind="order" id={o.id} onDone={refresh} />);
      if (o.status === "pending" || (o.status === "approved" && o.paymentStatus === "unpaid")) btns.push(<Button key="cancel" size="sm" variant="outline" className="agro-btn" onClick={() => setConfirm({ order: o, status: "cancelled" })}>{t("app.orders.cancel")}</Button>);
      if (o.status === "completed" && !o.review) btns.push(<Button key="rev" size="sm" variant="outline" className="agro-btn" onClick={() => setReviewId(o.id)}>{t("app.reviews.leave")}</Button>);
      btns.push(<Button key="d" size="sm" variant="ghost" asChild><Link to={`/dashboard/farmer/rentals/${o.id}`}>{t("app.orders.details")}</Link></Button>);
    } else {
      if (o.status === "pending") {
        btns.push(<Button key="ok" size="sm" className="agro-btn" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: o.id, status: "approved" })}>{t("app.orders.accept")}</Button>);
        btns.push(<Button key="no" size="sm" variant="outline" className="agro-btn" onClick={() => setConfirm({ order: o, status: "rejected" })}>{t("app.orders.reject")}</Button>);
      }
      if (o.status === "approved") btns.push(<Button key="done" size="sm" className="agro-btn" disabled={statusMutation.isPending || (o.type !== "equipment" && o.type !== "worker" && o.paymentStatus !== "paid")} onClick={() => statusMutation.mutate({ id: o.id, status: "completed" })}>{t("app.orders.complete")}</Button>);
    }
    return btns;
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {header}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); }} className="mb-4">
        <TabsList className="h-auto flex-wrap">
          {TABS.map((s) => <TabsTrigger key={s} value={s}>{t(`app.status.${s}`) === `app.status.${s}` ? t("app.common.all") : t(`app.status.${s}`)}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <RowsSkeleton />
      ) : query.data.data.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title={t("app.orders.emptyTitle")} hint={perspective === "farmer" ? t("app.orders.emptyFarmerHint") : t("app.orders.emptyProviderHint")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.data.map((o) => (
            <OrderCard key={o.id} order={o} perspective={perspective} detailsHref={perspective === "farmer" ? `/dashboard/farmer/rentals/${o.id}` : undefined} actions={actionsFor(o)} />
          ))}
        </div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.status === "rejected" ? t("app.orders.rejectTitle") : t("app.orders.cancelTitle")}
        description={t("app.orders.confirmHint")}
        destructive
        onConfirm={() => { if (confirm) statusMutation.mutate({ id: confirm.order.id, status: confirm.status }); setConfirm(null); }}
      />
      <ReviewDialog orderId={reviewId} onClose={() => setReviewId(null)} onDone={refresh} />
    </div>
  );
};
