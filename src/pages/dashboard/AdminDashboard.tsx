import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, IndianRupee, Tractor, Users } from "lucide-react";
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
      <PageHeader title={t("app.dash.welcome", { name: user?.name?.split(" ")[0] || "" })} subtitle={t("app.dash.adminSubtitle")} />
      {stats.isError ? <ErrorState error={stats.error} onRetry={() => void stats.refetch()} /> : !s ? <GridSkeleton count={4} /> : (
        <div className="space-y-6">
          <div className="agro-stat-grid">
            <StatCard label={t("app.admin.totalUsers")} value={s.totalUsers} icon={<Users className="h-4 w-4" />} />
            <StatCard label={t("app.admin.totalEquipment")} value={s.totalEquipment} icon={<Tractor className="h-4 w-4" />} />
            <StatCard label={t("app.admin.totalBookings")} value={s.totalOrders} icon={<Calendar className="h-4 w-4" />} />
            <StatCard label={t("app.admin.revenue")} value={formatINR(s.totalRevenue)} icon={<IndianRupee className="h-4 w-4" />} hint={t("app.admin.revenueHint")} />
            <StatCard label={t("app.admin.activeLoans")} value={s.activeLoans} icon={<CreditCard className="h-4 w-4" />} />
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t("app.dash.recent")}</h3><Button asChild variant="ghost" size="sm"><Link to="/dashboard/admin/bookings">{t("app.dash.viewAll")}</Link></Button></div>
            {recent.isError ? <ErrorState error={recent.error} /> : !recent.data || recent.data.data.length === 0 ? <EmptyState title={t("app.admin.noBookings")} /> : (
              <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.item")}</th><th className="p-3">{t("app.table.farmer")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3">{t("app.table.date")}</th><th className="p-3 text-right">{t("app.table.amount")}</th></tr></thead>
                <tbody>{recent.data.data.map((o) => <tr key={o.id} className="border-b last:border-0"><td className="p-3 font-medium">{o.itemName}</td><td className="p-3">{o.farmer.name}</td><td className="p-3"><StatusBadge status={o.status} /></td><td className="p-3">{formatDate(o.createdAt)}</td><td className="p-3 text-right font-semibold">{formatINR(o.totalPrice)}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
export default AdminDashboard;
