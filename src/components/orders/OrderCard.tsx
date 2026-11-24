import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Package, Phone, User } from "lucide-react";
import { StatusBadge, TestModeBadge } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/types/api";

interface Props {
  order: Order;
  perspective: "farmer" | "provider" | "admin";
  actions?: ReactNode;
  detailsHref?: string;
}

const TYPE_EMOJI: Record<string, string> = { equipment: "🚜", worker: "👨‍🌾", seed: "🌱", fertilizer: "🧪" };

export const OrderCard = ({ order, perspective, actions, detailsHref }: Props) => {
  const { t } = useLanguage();
  const isProduct = order.type === "seed" || order.type === "fertilizer";
  const other = perspective === "farmer" ? order.provider : order.farmer;
  const when = isProduct
    ? t("app.orders.qty", { n: order.quantity })
    : order.endDate && order.endDate !== order.startDate
    ? `${formatDate(order.startDate)} – ${formatDate(order.endDate)}`
    : formatDate(order.startDate);

  return (
    <article className="agro-card" data-testid="order-card">
      <div className="agro-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-2xl" aria-hidden="true">{TYPE_EMOJI[order.type]}</span>
            <div className="min-w-0">
              <h3 className="agro-card-title">{detailsHref ? <Link to={detailsHref} className="hover:underline">{order.itemName || t(`app.types.${order.type}`)}</Link> : order.itemName}</h3>
              <p className="agro-card-meta">{t(`app.types.${order.type}`)} · #{order.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
            {order.paymentMode === "test" && <TestModeBadge />}
          </div>
        </div>
        <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-2">{isProduct ? <Package className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{when}{!isProduct && order.unit === "hour" ? ` · ${order.duration} h` : !isProduct ? ` · ${t("app.orders.days", { n: order.duration })}` : ""}</p>
          <p className="flex items-center gap-2"><User className="h-4 w-4" />{other?.name || "—"}</p>
          {order.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{order.location}</p>}
          {other?.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href={`tel:${other.phone}`} className="text-primary hover:underline">{other.phone}</a></p>}
        </div>
        {order.notes && <p className="agro-card-desc">“{order.notes}”</p>}
        {order.cancelReason && <p className="text-sm text-destructive">{t("app.orders.reason")}: {order.cancelReason}</p>}
      </div>
      <div className="agro-card-footer">
        <div>
          <p className="text-xs text-muted-foreground">{t("app.orders.total")}</p>
          <p className="agro-price">{formatINR(order.totalPrice, { decimals: true })}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </article>
  );
};
