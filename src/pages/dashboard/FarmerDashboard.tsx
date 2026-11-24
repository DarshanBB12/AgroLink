import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, Package, Search, Sprout, Tractor, Users, Leaf, Cloud, Bell, MapPin, Bot, Sparkles, Star, CalendarClock, ArrowRight, UserCheck } from "lucide-react";
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
import { searchListings } from "@/services/marketplace";

const ACTIONS = [
  { to: "map", icon: MapPin, key: "map" },
  { to: "equipment", icon: Tractor, key: "equipment" },
  { to: "workers", icon: Users, key: "workers" },
  { to: "seeds", icon: Sprout, key: "seeds" },
  { to: "fertilizers", icon: Leaf, key: "fertilizers" },
  { to: "weather", icon: Cloud, key: "weather" },
  { to: "ai", icon: Bot, key: "ai" },
  { to: "search", icon: Search, key: "search" },
] as const;

// Every number on this page is read from the signed-in user's own orders and payments.
const FarmerDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const orders = useQuery({ queryKey: ["orders", "farmer", "dashboard"], queryFn: () => myOrders({ limit: 100 }) });
  const payments = useQuery({ queryKey: ["payments", "dashboard"], queryFn: () => myPayments({ limit: 1 }) });
  const recommendedWorkers = useQuery({
    queryKey: ["recommended-workers"],
    queryFn: () => searchListings("worker", { limit: 3, available: "true" }),
  });

  const list = orders.data?.data || [];
  const count = (s: string) => list.filter((o) => o.status === s).length;
  const unpaid = list.filter((o) => o.canPay);

  // Upcoming bookings scheduled for today or later
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingBookings = list
    .filter((o) => (o.status === "approved" || o.status === "pending") && new Date(o.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

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

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {ACTIONS.map((a) => (
              <Link key={a.key} to={`/dashboard/farmer/${a.to}`} className="agro-card agro-card-interactive items-center gap-2 p-4 text-center">
                <a.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">
                  {a.key === "map" ? "GPS Map" : a.key === "ai" ? "AI Farming" : t(`app.dash.action.${a.key}`)}
                </span>
              </Link>
            ))}
          </section>

          {/* AI Agriculture Feature Banner */}
          <section className="agro-card p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0 mt-0.5">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">Smart AI Farming Intelligence</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3" /> Bilingual EN/KN
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Get bilingual agronomy advice, smart crop recommendations calibrated by soil & rainfall, and live Agmarknet APMC Mandi commodity rates.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm" className="gap-1.5 shadow-sm">
                  <Link to="/dashboard/farmer/ai">
                    <span>Open AI Assistant</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Location Bar */}
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

          {/* Upcoming Bookings Schedule */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Upcoming Bookings Schedule</h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/farmer/bookings">{t("app.dash.viewAll")}</Link>
              </Button>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="agro-card p-4 text-center text-sm text-muted-foreground">
                No upcoming bookings scheduled for today or future dates.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="agro-card p-4 space-y-2 border-l-4 border-l-primary">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1">{b.itemName}</h4>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Type: <span className="font-medium text-foreground">{t(`app.types.${b.type}`)}</span></p>
                      <p>Duration: <span className="font-medium text-foreground">{formatDate(b.startDate)} - {formatDate(b.endDate)}</span></p>
                      <p>Amount: <span className="font-semibold text-foreground">{formatINR(b.totalPrice)}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Farm Workers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Recommended Skilled Workers</h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/farmer/workers">{t("app.dash.viewAll")}</Link>
              </Button>
            </div>
            {recommendedWorkers.isLoading ? (
              <GridSkeleton count={3} />
            ) : (recommendedWorkers.data?.data?.length ?? 0) === 0 ? (
              <div className="agro-card p-4 text-center text-sm text-muted-foreground">
                No active workers currently available in the directory.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendedWorkers.data?.data.slice(0, 3).map((w) => (
                  <div key={w.id} className="agro-card p-4 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-1">{w.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                          <Star className="h-3.5 w-3.5 fill-amber-500" />
                          <span>{w.rating ? w.rating.toFixed(1) : "4.8"}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{w.location || "Local District"}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(w.details?.skills?.slice(0, 3) || ["Harvesting", "Seeding"]).map((s, idx) => (
                          <span key={idx} className="bg-muted px-2 py-0.5 rounded text-[11px] text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <span className="font-semibold text-sm">{formatINR(w.price)}/{w.priceUnit || "day"}</span>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to={`/dashboard/farmer/workers`}>Hire Worker</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Orders / History */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{t("app.dash.recent")}</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/farmer/rentals">{t("app.dash.viewAll")}</Link>
              </Button>
            </div>
            {list.length === 0 ? (
              <EmptyState title={t("app.dash.emptyTitle")} hint={t("app.dash.emptyHint")} action={<Button asChild><Link to="/dashboard/farmer/equipment">{t("app.dash.browse")}</Link></Button>} />
            ) : (
              <div className="agro-table-wrap">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-3">{t("app.table.item")}</th>
                      <th className="p-3">{t("app.table.type")}</th>
                      <th className="p-3">{t("app.table.status")}</th>
                      <th className="p-3">{t("app.table.date")}</th>
                      <th className="p-3 text-right">{t("app.table.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 5).map((o) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{o.itemName}</td>
                        <td className="p-3">{t(`app.types.${o.type}`)}</td>
                        <td className="p-3"><StatusBadge status={o.status} /></td>
                        <td className="p-3">{formatDate(o.createdAt)}</td>
                        <td className="p-3 text-right font-semibold">{formatINR(o.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
export default FarmerDashboard;
