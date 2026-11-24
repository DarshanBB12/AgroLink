import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, IndianRupee, AlertTriangle, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import emiService, { type Loan, type AdminEMIStats, type LoanStatus } from "@/lib/emiService";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-200 text-slate-700",
  rejected: "bg-red-100 text-red-700",
  default: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const AdminEMIPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminEMIStats | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState<LoanStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Loan | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = async (status: LoanStatus | "all") => {
    setLoading(true);
    try {
      const [statsData, loansData] = await Promise.all([
        emiService.getAdminStats(),
        status === "all" ? emiService.getAllLoans() : emiService.getAllLoans(status),
      ]);
      setStats(statsData);
      setLoans(loansData);
    } catch {
      toast.error(t("app.emi.admin.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(filter);
  }, [filter]);

  const handleApprove = async (loan: Loan) => {
    setBusyId(loan._id);
    try {
      await emiService.approveLoan(loan._id);
      toast.success(t("app.emi.admin.approved"));
      loadAll(filter);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget._id);
    try {
      await emiService.rejectLoan(rejectTarget._id, rejectReason || t("app.emi.admin.notSpecified"));
      toast.success(t("app.emi.admin.rejected"));
      setRejectTarget(null);
      setRejectReason("");
      loadAll(filter);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const farmerName = (loan: Loan) => (typeof loan.farmerId === "object" ? loan.farmerId.name : t("app.roles.farmer"));

  return (
    <DashboardLayout role="admin">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("app.emi.admin.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("app.emi.admin.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t("app.emi.admin.pending")}</p><p className="text-2xl font-bold">{stats?.pendingApplications ?? "—"}</p></div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t("app.emi.admin.active")}</p><p className="text-2xl font-bold">{stats?.activeLoans ?? "—"}</p></div>
              <Wallet className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t("app.emi.admin.outstanding")}</p><p className="text-lg font-bold">₹{(stats?.totalOutstanding ?? 0).toLocaleString("en-IN")}</p></div>
              <IndianRupee className="h-8 w-8 text-red-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t("app.emi.admin.collected")}</p><p className="text-lg font-bold">₹{(stats?.monthlyCollection ?? 0).toLocaleString("en-IN")}</p></div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as LoanStatus | "all")}>
              <TabsList>
                <TabsTrigger value="pending">{t("app.status.pending")}</TabsTrigger>
                <TabsTrigger value="active">{t("app.status.active")}</TabsTrigger>
                <TabsTrigger value="completed">{t("app.status.completed")}</TabsTrigger>
                <TabsTrigger value="rejected">{t("app.status.rejected")}</TabsTrigger>
                <TabsTrigger value="all">{t("app.common.all")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>}
            {!loading && loans.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">{t("app.emi.admin.empty")}</p>
            )}
            {!loading &&
              loans.map((loan) => (
                <div key={loan._id} className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{farmerName(loan)} — ₹{loan.loanAmount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground capitalize">{loan.purpose} · {t("app.emi.admin.months", { n: loan.loanTerm })} · {t("app.emi.admin.perYear", { n: loan.interestRate })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusStyles[loan.loanStatus] || "bg-muted"}>{t(`app.status.${loan.loanStatus}`)}</Badge>
                    {loan.loanStatus === "pending" && (
                      <>
                        <Button size="sm" disabled={busyId === loan._id} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(loan)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> {t("app.emi.admin.approve")}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === loan._id} onClick={() => setRejectTarget(loan)}>
                          <XCircle className="h-4 w-4 mr-1" /> {t("app.emi.admin.reject")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("app.emi.admin.rejectTitle")}</DialogTitle></DialogHeader>
          <Textarea placeholder={t("app.emi.admin.reasonPlaceholder")} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t("app.common.cancel")}</Button>
            <Button variant="destructive" onClick={handleReject}>{t("app.emi.admin.reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminEMIPage;
