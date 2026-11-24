import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShieldAlert, History, RefreshCw, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState, GridSkeleton, PageHeader, StatCard } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";

const COLORS = ["#16a34a", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#64748b"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const useAdminStats = () => useQuery({ queryKey: ["admin-stats"], queryFn: async () => (await api.get("/analytics/stats")).data.data });

interface AuditLogItem {
  _id: string;
  adminId?: { name?: string; email?: string } | string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

const AdminAnalyticsPage = () => {
  const { t } = useLanguage();
  const stats = useAdminStats();
  const trends = useQuery({ queryKey: ["admin-trends"], queryFn: async () => (await api.get("/analytics/trends")).data.data });
  const auditLogs = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => (await api.get("/admin/audit-logs", { params: { limit: 10 } })).data.data as AuditLogItem[],
  });

  if (stats.isError) return <DashboardLayout role="admin"><ErrorState error={stats.error} onRetry={() => void stats.refetch()} /></DashboardLayout>;
  const s = stats.data;
  const bookingTrend = (trends.data?.bookingTrends || []).map((b: { _id: { month: number; year: number }; count: number; revenue: number }) => ({ month: `${MONTHS[b._id.month - 1]} ${String(b._id.year).slice(2)}`, bookings: b.count, revenue: b.revenue }));
  const userTrend: Record<string, { month: string; [k: string]: number | string }> = {};
  (trends.data?.userTrends || []).forEach((u: { _id: { month: number; year: number; role: string }; count: number }) => { const k = `${u._id.year}-${u._id.month}`; userTrend[k] = userTrend[k] || { month: `${MONTHS[u._id.month - 1]} ${String(u._id.year).slice(2)}` }; userTrend[k][u._id.role] = u.count; });
  const roles = (s?.roleBreakdown || []).map((r: { _id: string; count: number }) => ({ name: t(`app.roles.${r._id === "equipment_owner" ? "owner" : r._id}`), value: r.count }));
  const status = (s?.statusBreakdown || []).map((r: { _id: string; count: number }) => ({ name: t(`app.status.${r._id}`), count: r.count }));

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.analyticsTitle")} subtitle={t("app.admin.analyticsSubtitle")} />
      {!s ? <GridSkeleton count={4} /> : (
        <div className="space-y-6">
          <div className="agro-stat-grid"><StatCard label={t("app.admin.totalUsers")} value={s.totalUsers} /><StatCard label={t("app.admin.totalBookings")} value={s.totalOrders} /><StatCard label={t("app.admin.revenue")} value={formatINR(s.totalRevenue)} hint={t("app.admin.revenueHint")} /><StatCard label={t("app.admin.testRevenue")} value={formatINR(s.testModeRevenue)} /><StatCard label={t("app.admin.activeLoans")} value={s.activeLoans} /></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="agro-card p-5"><h3 className="mb-3 font-semibold">{t("app.admin.bookingsByMonth")}</h3>{bookingTrend.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t("app.admin.noData")}</p> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={bookingTrend}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend /><Line type="monotone" dataKey="bookings" name={t("app.admin.totalBookings")} stroke="#16a34a" strokeWidth={2} /></LineChart></ResponsiveContainer></div>}</section>
            <section className="agro-card p-5"><h3 className="mb-3 font-semibold">{t("app.admin.usersByRole")}</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={roles} dataKey="value" nameKey="name" outerRadius={90} label>{roles.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></section>
            <section className="agro-card p-5"><h3 className="mb-3 font-semibold">{t("app.admin.bookingsByStatus")}</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={status}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
            <section className="agro-card p-5"><h3 className="mb-3 font-semibold">{t("app.admin.signups")}</h3>{Object.keys(userTrend).length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t("app.admin.noData")}</p> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.values(userTrend)}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="farmer" stackId="a" fill="#16a34a" /><Bar dataKey="worker" stackId="a" fill="#f59e0b" /><Bar dataKey="equipment_owner" stackId="a" fill="#3b82f6" /></BarChart></ResponsiveContainer></div>}</section>
          </div>

          {/* Audit Logs & Security Activity */}
          <section className="agro-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Security & Audit Logs</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => void auditLogs.refetch()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${auditLogs.isFetching ? "animate-spin" : ""}`} />
                <span>Refresh Logs</span>
              </Button>
            </div>
            {auditLogs.isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading audit logs...</div>
            ) : !auditLogs.data || auditLogs.data.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No administrative audit actions recorded yet.
              </div>
            ) : (
              <div className="agro-table-wrap">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Target</th>
                      <th className="p-2.5">IP Address</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.data.map((log) => (
                      <tr key={log._id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2.5">
                          <Badge
                            variant={
                              log.severity === "critical"
                                ? "destructive"
                                : log.severity === "warning"
                                ? "secondary"
                                : "outline"
                            }
                            className="capitalize text-[10px] px-1.5 py-0"
                          >
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium">{log.action}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {log.targetType ? `${log.targetType}: ${log.targetId || "N/A"}` : "System"}
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">{log.ipAddress || "127.0.0.1"}</td>
                        <td className="p-2.5 text-muted-foreground">{formatDate(log.createdAt)}</td>
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
export default AdminAnalyticsPage;
