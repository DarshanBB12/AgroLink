import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Clock, CreditCard, IndianRupee, Layers, Package, Tractor, Users, UserCheck, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmptyState, ErrorState, GridSkeleton, PageHeader, StatCard, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatINR } from "@/lib/format";
import { allOrders } from "@/services/orders";
import { useAdminStats } from "./admin/AdminAnalyticsPage";

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const stats = useAdminStats();
  const recent = useQuery({ queryKey: ["admin-orders", "recent"], queryFn: () => allOrders({ limit: 6 }) });
  const s = stats.data;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("app.dash.welcome", { name: user?.name?.split(" ")[0] || "" })}
        subtitle={t("app.dash.adminSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/admin/analytics" className="gap-1.5">
                <Layers className="h-4 w-4" />
                <span>Deep Analytics</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard/admin/users" className="gap-1.5">
                <UserCheck className="h-4 w-4" />
                <span>Manage Users</span>
              </Link>
            </Button>
          </div>
        }
      />
      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : !s ? (
        <GridSkeleton count={6} />
      ) : (
        <div className="space-y-6">
          {/* Top Primary Stats */}
          <div className="agro-stat-grid">
            <StatCard
              label={t("app.admin.totalUsers")}
              value={s.totalUsers}
              icon={<Users className="h-4 w-4" />}
              hint={`${s.totalFarmers || 0} Farmers · ${s.totalWorkers || 0} Workers · ${s.totalOwners || 0} Owners`}
            />
            <StatCard
              label={t("app.admin.totalBookings")}
              value={s.totalOrders}
              icon={<Calendar className="h-4 w-4" />}
              hint={s.pendingOrders ? `${s.pendingOrders} pending requests` : "All processed"}
            />
            <StatCard
              label="Marketplace Listings"
              value={s.totalMarketplaceListings ?? s.totalEquipment}
              icon={<Package className="h-4 w-4" />}
              hint={`${s.totalEquipment || 0} Equip · ${s.totalSeeds || 0} Seeds · ${s.totalFertilizers || 0} Fert`}
            />
            <StatCard
              label={t("app.admin.revenue")}
              value={formatINR(s.totalRevenue)}
              icon={<IndianRupee className="h-4 w-4" />}
              hint={t("app.admin.revenueHint")}
            />
            <StatCard
              label={t("app.admin.activeLoans")}
              value={s.activeLoans}
              icon={<CreditCard className="h-4 w-4" />}
            />
            <StatCard
              label="Pending Actions"
              value={s.pendingOrders || 0}
              icon={<Clock className="h-4 w-4" />}
              hint="Bookings awaiting approval"
            />
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              to="/dashboard/admin/users"
              className="agro-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">User Management</p>
                <p className="font-semibold text-sm truncate">{s.totalUsers} Active Accounts</p>
              </div>
            </Link>

            <Link
              to="/dashboard/admin/equipment"
              className="agro-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Tractor className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Machinery Listings</p>
                <p className="font-semibold text-sm truncate">{s.totalEquipment} Units Listed</p>
              </div>
            </Link>

            <Link
              to="/dashboard/admin/payments"
              className="agro-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Payments & Fees</p>
                <p className="font-semibold text-sm truncate">{formatINR(s.totalRevenue)} Paid</p>
              </div>
            </Link>

            <Link
              to="/dashboard/admin/settings"
              className="agro-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">System Governance</p>
                <p className="font-semibold text-sm truncate">Policies & Audits</p>
              </div>
            </Link>
          </div>

          {/* Recent Orders Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{t("app.dash.recent")}</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/admin/bookings">{t("app.dash.viewAll")}</Link>
              </Button>
            </div>
            {recent.isError ? (
              <ErrorState error={recent.error} />
            ) : !recent.data || recent.data.data.length === 0 ? (
              <EmptyState title={t("app.admin.noBookings")} />
            ) : (
              <div className="agro-table-wrap">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-3">{t("app.table.item")}</th>
                      <th className="p-3">{t("app.table.farmer")}</th>
                      <th className="p-3">{t("app.table.status")}</th>
                      <th className="p-3">{t("app.table.date")}</th>
                      <th className="p-3 text-right">{t("app.table.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.data.data.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="p-3 font-medium">{o.itemName}</td>
                        <td className="p-3">{o.farmer.name}</td>
                        <td className="p-3">
                          <StatusBadge status={o.status} />
                        </td>
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

export default AdminDashboard;
