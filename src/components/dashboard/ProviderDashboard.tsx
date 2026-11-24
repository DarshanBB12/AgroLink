import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, Bot, Calendar, CalendarClock, CheckCircle2, Clock, Cloud, MapPin, Sparkles, Star, SwitchCamera, ToggleLeft, ToggleRight, UserCheck, Wallet } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, ErrorState, GridSkeleton, PageHeader, StatCard, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { formatDate, formatINR } from "@/lib/format";
import { earnings, providerOrders } from "@/services/orders";
import { myListings, myWorkerProfile, saveWorkerProfile } from "@/services/marketplace";
import { toast } from "sonner";

// Dashboard shared by workers and equipment owners; the numbers all come from the provider's own orders.
export const ProviderDashboard = ({ role }: { role: "worker" | "owner" }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { unreadCount } = useNotifications();
  const base = role === "worker" ? "/dashboard/worker" : "/dashboard/owner";
  const e = useQuery({ queryKey: ["earnings"], queryFn: earnings });
  const orders = useQuery({ queryKey: ["orders", "provider", "dashboard"], queryFn: () => providerOrders({ limit: 100 }) });
  const listings = useQuery({ queryKey: ["my-listings", "equipment"], queryFn: () => myListings("equipment"), enabled: role === "owner" });
  const profile = useQuery({ queryKey: ["worker-profile"], queryFn: myWorkerProfile, enabled: role === "worker" });
  
  const [isUpdatingAvail, setIsUpdatingAvail] = useState(false);

  const toggleAvailMutation = useMutation({
    mutationFn: async (current: boolean) => {
      setIsUpdatingAvail(true);
      return saveWorkerProfile({ availability: !current });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["worker-profile"] });
      toast.success("Availability status updated successfully!");
      setIsUpdatingAvail(false);
    },
    onError: () => {
      toast.error("Could not update availability status");
      setIsUpdatingAvail(false);
    },
  });

  const list = orders.data?.data || [];
  const pending = list.filter((o) => o.status === "pending");

  // Upcoming bookings scheduled for today or later
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingBookings = list
    .filter((o) => (o.status === "approved" || o.status === "pending") && new Date(o.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <DashboardLayout role={role}>
      <PageHeader title={t("app.dash.welcome", { name: user?.name?.split(" ")[0] || "" })} subtitle={t(role === "worker" ? "app.dash.workerSubtitle" : "app.dash.ownerSubtitle")} />
      {orders.isError ? <ErrorState error={orders.error} onRetry={() => void orders.refetch()} /> : !orders.data || !e.data ? <GridSkeleton count={4} /> : (
        <div className="space-y-6">
          {role === "worker" && profile.data === null && (
            <div className="agro-card gap-2 border-amber-400/60 p-4">
              <p className="font-medium">{t("app.dash.noWorkerProfile")}</p>
              <Button asChild size="sm" className="w-fit"><Link to={`${base}/settings`}>{t("app.dash.setupProfile")}</Link></Button>
            </div>
          )}

          {/* Worker Instant Availability Toggle Bar */}
          {role === "worker" && profile.data && (
            <section className="agro-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${profile.data.availability ? "bg-emerald-500/20 text-emerald-600" : "bg-zinc-500/20 text-zinc-600"}`}>
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Hiring Availability:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.data.availability ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {profile.data.availability ? "Available for Work" : "Busy / Offline"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profile.data.availability ? "Farmers can discover and assign jobs to you in the directory." : "You are currently hidden from immediate job bookings."}
                  </p>
                </div>
              </div>
              <Button
                variant={profile.data.availability ? "outline" : "default"}
                size="sm"
                disabled={isUpdatingAvail}
                onClick={() => toggleAvailMutation.mutate(profile.data?.availability ?? true)}
                className="gap-2 shrink-0"
              >
                {profile.data.availability ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4" />}
                <span>{profile.data.availability ? "Set to Busy" : "Set to Available"}</span>
              </Button>
            </section>
          )}

          <div className="agro-stat-grid">
            <StatCard label={t("app.dash.netEarnings")} value={formatINR(e.data.net)} icon={<Wallet className="h-4 w-4" />} hint={t("app.dash.pendingPay", { amount: formatINR(e.data.pendingAmount) })} />
            <StatCard label={t("app.dash.newRequests")} value={pending.length} icon={<Clock className="h-4 w-4" />} />
            <StatCard label={t("app.dash.activeJobs")} value={e.data.activeJobs} icon={<Calendar className="h-4 w-4" />} />
            <StatCard label={t("app.dash.completedJobs")} value={e.data.completedJobs} icon={<CheckCircle2 className="h-4 w-4" />} />
            {role === "owner" && <StatCard label={t("app.dash.myListings")} value={listings.data?.pagination.total ?? "—"} />}
            <StatCard label={t("app.dash.unread")} value={unreadCount} icon={<Bell className="h-4 w-4" />} />
          </div>

          {/* AI Intelligence & Advisory Banner */}
          <section className="agro-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-teal-500/10 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span>AI Agricultural Assistant</span>
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">Bilingual EN/KN</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  {role === "owner"
                    ? "Check APMC Mandi rates, machinery utilization tips, and regional agricultural demand."
                    : "Check field advisories, weather safety guidelines, and live APMC market prices."}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link to={`${base}/ai`}>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Open Assistant</span>
              </Link>
            </Button>
          </section>

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

          {/* Upcoming Booking Calendar Schedule */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{role === "worker" ? "Upcoming Job Schedule" : "Upcoming Rental Schedule"}</h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to={role === "worker" ? `${base}/jobs` : `${base}/rentals`}>{t("app.dash.viewAll")}</Link>
              </Button>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="agro-card p-4 text-center text-sm text-muted-foreground">
                No upcoming jobs or rentals scheduled for today or upcoming dates.
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
                      <p>Client: <span className="font-medium text-foreground">{b.farmer.name}</span></p>
                      <p>Dates: <span className="font-medium text-foreground">{formatDate(b.startDate)} - {formatDate(b.endDate)}</span></p>
                      <p>Earnings: <span className="font-semibold text-foreground">{formatINR(b.totalPrice)}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Incoming Requests */}
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
