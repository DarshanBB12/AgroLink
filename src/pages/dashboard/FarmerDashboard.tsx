import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, Package, Search, Sprout, Tractor, Users, Leaf, Cloud, Bell, MapPin } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { LocationControl } from "@/components/common/LocationControl";
import { EmptyState, ErrorState, GridSkeleton, PageHeader, StatCard, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { formatDate, formatINR } from "@/lib/format";
import { myOrders } from "@/services/orders";
import { myPayments } from "@/services/payments";

const ACTIONS = [
  { to: "map", icon: MapPin, key: "map" },
  { to: "equipment", icon: Tractor, key: "equipment" },
  { to: "workers", icon: Users, key: "workers" },
  { to: "seeds", icon: Sprout, key: "seeds" },
  { to: "fertilizers", icon: Leaf, key: "fertilizers" },
  { to: "weather", icon: Cloud, key: "weather" },
  { to: "search", icon: Search, key: "search" },
] as const;

// Every number on this page is read from the signed-in user's own orders and payments.
const FarmerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const orders = useQuery({ queryKey: ["orders", "farmer", "dashboard"], queryFn: () => myOrders({ limit: 100 }) });
  const payments = useQuery({ queryKey: ["payments", "dashboard"], queryFn: () => myPayments({ limit: 1 }) });

  const list = orders.data?.data || [];
  const count = (s: string) => list.filter((o) => o.status === s).length;
  const unpaid = list.filter((o) => o.canPay);

  return (
    <DashboardLayout role="farmer">
      <PageHeader title={t("app.dash.welcome", { name: user?.name?.split(" ")[0] || "" })} subtitle={t("app.dash.farmerSubtitle")} />
      {orders.isError ? <ErrorState error={orders.error} onRetry={() => void orders.refetch()} /> : !orders.data ? <GridSkeleton count={4} /> : (
        <div className="space-y-6">
          <div className="agro-stat-grid">
            <StatCard label={t("app.dash.activeRentals")} value={count("approved")} icon={<Package className="h-4 w-4" />} />
            <StatCard label={t("app.dash.pendingRequests")} value={count("pending")} icon={<Calendar className="h-4 w-4" />} />
            <StatCard label={t("app.dash.awaitingPayment")} value={unpaid.length} icon={<CreditCard className="h-4 w-4" />} hint={formatINR(unpaid.reduce((s, o) => s + o.totalPrice, 0))} />
            <StatCard label={t("app.dash.totalPaid")} value={formatINR(payments.data?.summary?.paid)} icon={<CreditCard className="h-4 w-4" />} />
            <StatCard label={t("app.dash.unread")} value={unreadCount} icon={<Bell className="h-4 w-4" />} />
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {ACTIONS.map((a) => (
              <Link key={a.key} to={`/dashboard/farmer/${a.to}`} className="agro-card agro-card-interactive items-center gap-2 p-4 text-center">
                <a.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{a.key === "map" ? "GPS Map" : t(`app.dash.action.${a.key}`)}</span>
              </Link>
            ))}
          </section>
          <section className="agro-card gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("app.settings.location")}</h3>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                <Link to="/dashboard/farmer/map">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Open GPS Map</span>
                </Link>
              </Button>
            </div>
            <LocationControl compact />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t("app.dash.recent")}</h3><Button asChild variant="ghost" size="sm"><Link to="/dashboard/farmer/rentals">{t("app.dash.viewAll")}</Link></Button></div>
            {list.length === 0 ? <EmptyState title={t("app.dash.emptyTitle")} hint={t("app.dash.emptyHint")} action={<Button asChild><Link to="/dashboard/farmer/equipment">{t("app.dash.browse")}</Link></Button>} /> : (
              <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.item")}</th><th className="p-3">{t("app.table.type")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3 text-right">{t("app.table.amount")}</th></tr></thead>
                <tbody>{list.slice(0, 5).map((o) => <tr key={o.id} className="border-b last:border-0"><td className="p-3 font-medium">{o.itemName}</td><td className="p-3">{t(`app.types.${o.type}`)}</td><td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3">{formatDate(o.createdAt)}</td><td className="p-3 text-right font-semibold">{formatINR(o.totalPrice)}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
export default FarmerDashboard;
