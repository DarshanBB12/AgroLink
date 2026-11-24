import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OptionSelect, SearchInput } from "@/components/common/AdminFilters";
import { PaginationBar } from "@/components/common/PaginationBar";
import { EmptyState, ErrorState, PageHeader, RowsSkeleton, StatusBadge } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import api, { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { isStrongPassword, validateEmail } from "@/lib/validation";
import { downloadCsv } from "@/services/orders";
import { getList } from "@/services/http";
import type { Role } from "@/types/api";

interface AdminUser { id: string; name: string; email: string; role: Role; planCode?: string; isActive: boolean; location: string; phone: string; createdAt: string }
const ROLES: Role[] = ["farmer", "worker", "equipment_owner", "admin"];
const PLANS = ["farmer_free", "farmer_pro", "equipment_owner", "enterprise"];
const roleKey = (r: string) => (r === "equipment_owner" ? "owner" : r);

const AdminUsersPage = () => {
  const { t } = useLanguage();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: "", role: "", active: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<{ user: AdminUser; action: "delete" | "toggle" } | null>(null);
  const params = { ...filters, page, limit: 15 };
  const query = useQuery({ queryKey: ["admin-users", params], queryFn: () => getList<AdminUser>("/admin/users", params), placeholderData: keepPreviousData });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api.put(`/admin/users/${id}`, patch),
    onSuccess: () => { toast.success(t("app.admin.userUpdated")); void refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success(t("app.admin.userDeleted")); void refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const set = (patch: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.usersTitle")} subtitle={t("app.admin.usersSubtitle")} actions={<><Button variant="outline" className="gap-2" onClick={() => void downloadCsv("/admin/exports/users", "users-report.csv").catch((e) => toast.error(getErrorMessage(e)))}><Download className="h-4 w-4" />{t("app.common.export")}</Button><Button className="gap-2" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" />{t("app.admin.addUser")}</Button></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={filters.q} onChange={(q) => set({ q })} placeholder={t("app.admin.searchUsers")} />
        <OptionSelect label={t("app.table.role")} value={filters.role} onChange={(role) => set({ role })} options={[{ value: "", label: t("app.common.all") }, ...ROLES.map((r) => ({ value: r, label: t(`app.roles.${roleKey(r)}`) }))]} />
        <OptionSelect label={t("app.table.status")} value={filters.active} onChange={(active) => set({ active })} options={[{ value: "", label: t("app.common.all") }, { value: "true", label: t("app.status.active") }, { value: "false", label: t("app.status.inactive") }]} />
      </div>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : !query.data ? <RowsSkeleton /> : query.data.data.length === 0 ? <EmptyState title={t("app.admin.noUsers")} /> : (
        <div className="agro-table-wrap"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{t("app.table.name")}</th><th className="p-3">{t("app.table.role")}</th><th className="p-3">{t("app.table.plan")}</th><th className="p-3">{t("app.table.status")}</th><th className="p-3">{t("app.table.joined")}</th><th className="p-3 text-right">{t("app.table.actions")}</th></tr></thead>
          <tbody>{query.data.data.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
              <td className="p-3"><Select value={u.role} disabled={u.id === me?.id} onValueChange={(role) => update.mutate({ id: u.id, patch: { role } })}><SelectTrigger className="h-8 w-[150px]" aria-label={t("app.table.role")}><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{t(`app.roles.${roleKey(r)}`)}</SelectItem>)}</SelectContent></Select></td>
              <td className="p-3"><Select value={u.planCode || "farmer_free"} onValueChange={(planCode) => update.mutate({ id: u.id, patch: { planCode } })}><SelectTrigger className="h-8 w-[140px]" aria-label={t("app.table.plan")}><SelectValue /></SelectTrigger><SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></td>
              <td className="p-3"><StatusBadge status={u.isActive ? "active" : "cancelled"} label={u.isActive ? t("app.status.active") : t("app.status.inactive")} /></td>
              <td className="p-3">{formatDate(u.createdAt)}</td>
              <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={u.id === me?.id} onClick={() => setTarget({ user: u, action: "toggle" })}>{u.isActive ? t("app.admin.deactivate") : t("app.admin.activate")}</Button><Button size="sm" variant="destructive" disabled={u.id === me?.id} onClick={() => setTarget({ user: u, action: "delete" })}>{t("app.common.delete")}</Button></div></td>
            </tr>))}</tbody></table></div>
      )}
      <PaginationBar pagination={query.data?.pagination} onPage={setPage} />
      <ConfirmDialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)} destructive={target?.action === "delete" || target?.user.isActive}
        title={target?.action === "delete" ? t("app.admin.deleteUserTitle") : target?.user.isActive ? t("app.admin.deactivateTitle") : t("app.admin.activateTitle")}
        description={target?.action === "delete" ? t("app.admin.deleteUserHint", { name: target.user.name }) : t("app.admin.toggleHint", { name: target?.user.name || "" })}
        onConfirm={() => { if (target) { if (target.action === "delete") remove.mutate(target.user.id); else update.mutate({ id: target.user.id, patch: { isActive: !target.user.isActive } }); } setTarget(null); }} />
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onCreated={() => void refresh()} />
    </DashboardLayout>
  );
};

const CreateUserDialog = ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) => {
  const { t } = useLanguage();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "farmer" as Role });
  const emailErr = f.email ? validateEmail(f.email) : null;
  const valid = f.name.trim().length >= 2 && !validateEmail(f.email) && isStrongPassword(f.password);
  const m = useMutation({ mutationFn: () => api.post("/admin/users", f), onSuccess: () => { toast.success(t("app.admin.userCreated")); setF({ name: "", email: "", password: "", role: "farmer" }); onCreated(); onClose(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent><DialogHeader><DialogTitle>{t("app.admin.addUser")}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) m.mutate(); }}>
          <div className="space-y-1.5"><Label htmlFor="cu-name">{t("app.settings.name")}</Label><Input id="cu-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cu-email">{t("app.settings.email")}</Label><Input id="cu-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />{emailErr && <p className="text-xs text-destructive">{t("app.auth.emailInvalid")}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="cu-pw">{t("app.auth.password")}</Label><Input id="cu-pw" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><p className="text-xs text-muted-foreground">{t("app.auth.passwordHint")}</p></div>
          <div className="space-y-1.5"><Label htmlFor="cu-role">{t("app.table.role")}</Label><Select value={f.role} onValueChange={(role) => setF({ ...f, role: role as Role })}><SelectTrigger id="cu-role"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{t(`app.roles.${roleKey(r)}`)}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("app.common.cancel")}</Button><Button type="submit" disabled={!valid || m.isPending} className="gap-2">{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t("app.common.create")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default AdminUsersPage;
