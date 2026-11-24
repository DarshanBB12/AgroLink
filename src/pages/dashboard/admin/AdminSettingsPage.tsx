import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Save } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ErrorState, GridSkeleton, PageHeader } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import api, { getErrorMessage } from "@/lib/api";

type Settings = Record<string, string | number | boolean>;
const GROUPS: { group: string; keys: { key: string; kind: "bool" | "num" | "text"; min?: number; max?: number }[] }[] = [
  { group: "system", keys: [{ key: "system.maintenanceMode", kind: "bool" }, { key: "system.allowRegistrations", kind: "bool" }] },
  { group: "marketplace", keys: [{ key: "marketplace.maxListingsPerOwner", kind: "num", min: 1, max: 500 }, { key: "marketplace.maxRentalDays", kind: "num", min: 1, max: 365 }] },
  { group: "payments", keys: [{ key: "payments.platformFeePercent", kind: "num", min: 0, max: 50 }, { key: "payments.emiInterestRate", kind: "num", min: 0, max: 40 }, { key: "payments.emiMinAmount", kind: "num", min: 0, max: 10000000 }] },
  { group: "notifications", keys: [{ key: "notifications.announcementsEnabled", kind: "bool" }] },
];

const SystemConfig = () => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await api.get("/admin/settings")).data.data as Settings });
  const [draft, setDraft] = useState<Settings>({});
  useEffect(() => { if (q.data) setDraft(q.data); }, [q.data]);
  const changed = Object.fromEntries(Object.entries(draft).filter(([k, v]) => q.data && q.data[k] !== v));
  const errors: Record<string, string> = {};
  GROUPS.flatMap((g) => g.keys).forEach((k) => { if (k.kind === "num") { const n = Number(draft[k.key]); if (!Number.isFinite(n) || n < (k.min ?? 0) || n > (k.max ?? Infinity)) errors[k.key] = t("app.admin.rangeHint", { min: k.min ?? 0, max: k.max ?? 0 }); } });
  const save = useMutation({
    mutationFn: () => api.put("/admin/settings", Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, typeof q.data?.[k] === "number" ? Number(v) : v]))),
    onSuccess: () => { toast.success(t("app.settings.saved")); void qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <GridSkeleton count={2} />;
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => (
        <section key={g.group} className="agro-card gap-4 p-5"><h3 className="font-semibold">{t(`app.admin.group.${g.group}`)}</h3>
          <div className="grid gap-4 sm:grid-cols-2">{g.keys.map((k) => (
            k.kind === "bool"
              ? <div key={k.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><Label htmlFor={k.key} className="text-sm">{t(`app.admin.setting.${k.key}`)}</Label><Switch id={k.key} checked={Boolean(draft[k.key])} onCheckedChange={(v) => setDraft({ ...draft, [k.key]: v })} /></div>
              : <div key={k.key} className="space-y-1.5"><Label htmlFor={k.key}>{t(`app.admin.setting.${k.key}`)}</Label><Input id={k.key} inputMode={k.kind === "num" ? "decimal" : undefined} value={String(draft[k.key] ?? "")} onChange={(e) => setDraft({ ...draft, [k.key]: e.target.value })} />{errors[k.key] && <p className="text-xs text-destructive" role="alert">{errors[k.key]}</p>}</div>
          ))}</div>
        </section>
      ))}
      <Button onClick={() => save.mutate()} disabled={save.isPending || Object.keys(changed).length === 0 || Object.keys(errors).length > 0} className="gap-2">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("app.common.save")}</Button>
    </div>
  );
};

const Announcement = () => {
  const { t } = useLanguage();
  const [f, setF] = useState({ title: "", message: "", role: "all", severity: "info" });
  const m = useMutation({ mutationFn: () => api.post("/admin/announcements", f), onSuccess: (r) => { toast.success(r.data.message); setF({ ...f, title: "", message: "" }); }, onError: (e) => toast.error(getErrorMessage(e)) });
  return (
    <section className="agro-card gap-4 p-5"><h3 className="flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4" />{t("app.admin.announce")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="an-title">{t("app.admin.annTitle")}</Label><Input id="an-title" maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label htmlFor="an-role">{t("app.admin.audience")}</Label><Select value={f.role} onValueChange={(role) => setF({ ...f, role })}><SelectTrigger id="an-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("app.common.all")}</SelectItem><SelectItem value="farmer">{t("app.roles.farmer")}</SelectItem><SelectItem value="worker">{t("app.roles.worker")}</SelectItem><SelectItem value="equipment_owner">{t("app.roles.owner")}</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="an-sev">{t("app.admin.severity")}</Label><Select value={f.severity} onValueChange={(severity) => setF({ ...f, severity })}><SelectTrigger id="an-sev"><SelectValue /></SelectTrigger><SelectContent>{["info", "success", "warning", "critical"].map((s) => <SelectItem key={s} value={s}>{t(`app.admin.sev.${s}`)}</SelectItem>)}</SelectContent></Select></div>
        </div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="an-msg">{t("app.admin.annMessage")}</Label><Textarea id="an-msg" rows={3} maxLength={500} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
      <div><Button onClick={() => m.mutate()} disabled={m.isPending || !f.title.trim() || !f.message.trim()} className="gap-2">{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t("app.admin.send")}</Button></div>
    </section>
  );
};

const AdminSettingsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.settingsTitle")} subtitle={t("app.admin.settingsSubtitle")} />
      <div className="mx-auto max-w-4xl space-y-8">
        <SystemConfig />
        <Announcement />
        <div><h2 className="mb-3 text-lg font-bold">{t("app.admin.myAccount")}</h2><AccountSettings withLocation={false} /></div>
      </div>
    </DashboardLayout>
  );
};
export default AdminSettingsPage;
