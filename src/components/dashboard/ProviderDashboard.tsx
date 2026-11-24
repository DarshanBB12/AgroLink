import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, Calendar, CheckCircle2, Clock, Cloud, MapPin, Wallet } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, ErrorState, GridSkeleton, PageHeader, StatCard, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { formatDate, formatINR } from "@/lib/format";
import { earnings, providerOrders } from "@/services/orders";
import { myListings, myWorkerProfile } from "@/services/marketplace";

// Dashboard shared by workers and equipment owners; the numbers all come from the provider's own orders.
export const ProviderDashboard = ({ role }: { role: "worker" | "owner" }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const base = role === "worker" ? "/dashboard/worker" : "/dashboard/owner";
  const e = useQuery({ queryKey: ["earnings"], queryFn: earnings });
  const orders = useQuery({ queryKey: ["orders", "provider", "dashboard"], queryFn: () => providerOrders({ limit: 100 }) });
  const listings = useQuery({ queryKey: ["my-listings", "equipment"], queryFn: () => myListings("equipment"), enabled: role === "owner" });
  const profile = useQuery({ queryKey: ["worker-profile"], queryFn: myWorkerProfile, enabled: role === "worker" });
  const list = orders.data?.data || [];
  const pending = list.filter((o) => o.status === "pending");

  return (
    <DashboardLayout role={role}>
      <PageHeader title={t("app.dash.welcome", { name: user?.name?.split(" ")[0] || "" })} subtitle={t(role === "worker" ? "app.dash.workerSubtitle" : "app.dash.ownerSubtitle")} />
      {orders.isError ? <ErrorState error={orders.error} onRetry={() => void orders.refetch()} /> : !orders.data || !e.data ? <GridSkeleton count={4} /> : (
        <div className="space-y-6">
          {role === "worker" && profile.data === null && (
            <div className="agro-card gap-2 border-amber-400/60 p-4"><p className="font-medium">{t("app.dash.noWorkerProfile")}</p><Button asChild size="sm" className="w-fit"><Link to={`${base}/settings`}>{t("app.dash.setupProfile")}</Link></Button></div>
          )}
          <div className="agro-stat-grid">
            <StatCard label={t("app.dash.netEarnings")} value={formatINR(e.data.net)} icon={<Wallet className="h-4 w-4" />} hint={t("app.dash.pendingPay", { amount: formatINR(e.data.pendingAmount) })} />
            <StatCard label={t("app.dash.newRequests")} value={pending.length} icon={<Clock className="h-4 w-4" />} />
            <StatCard label={t("app.dash.activeJobs")} value={e.data.activeJobs} icon={<Calendar className="h-4 w-4" />} />
            <StatCard label={t("app.dash.completedJobs")} value={e.data.completedJobs} icon={<CheckCircle2 className="h-4 w-4" />} />
            {role === "owner" && <StatCard label={t("app.dash.myListings")} value={listings.data?.pagination.total ?? "—"} />}
            <StatCard label={t("app.dash.unread")} value={unreadCount} icon={<Bell className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="agro-card p-4 flex items-center justify-between gap-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3">
                <Cloud className="h-8 w-8 text-amber-500 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">{role === "owner" ? "Machinery & Weather Advisory" : "Field Work & Weather Advisory"}</h4>
                  <p className="text-xs text-muted-foreground">{role === "owner" ? "Monitor rain forecast, ground trafficability, and maintenance alerts." : "Check outdoor work safety, rain probability, and temperature."}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={`${base}/weather`}>Weather API</Link>
              </Button>
            </div>

            <div className="agro-card p-4 flex items-center justify-between gap-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">GPS Farm & Resource Map</h4>
                  <p className="text-xs text-muted-foreground">Locate regional machinery hubs, active farm orders, and services.</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={`${base}/map`}>Open Map</Link>
              </Button>
            </div>
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t("app.dash.recentRequests")}</h3><Button asChild variant="ghost" size="sm"><Link to={role === "worker" ? `${base}/jobs` : `${base}/rentals`}>{t("app.dash.viewAll")}</Link></Button></div>
            {list.length === 0 ? <EmptyState title={t("app.dash.noRequests")} hint={t("app.dash.noRequestsHint")} /> : (
              <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.item")}</th><th className="p-3">{t("app.table.from")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3 text-right">{t("app.table.amount")}</th></tr></thead>
                <tbody>{list.slice(0, 5).map((o) => <tr key={o.id} className="border-b last:border-0"><td className="p-3 font-medium">{o.itemName}</td><td className="p-3">{o.farmer.name}</td><td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3">{formatDate(o.startDate)}</td><td className="p-3 text-right font-semibold">{formatINR(o.totalPrice)}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
