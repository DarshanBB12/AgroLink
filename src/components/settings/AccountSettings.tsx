import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LocationControl } from "@/components/common/LocationControl";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, useLanguage, type Lang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getErrorMessage } from "@/lib/api";
import { resizeImageToDataUrl } from "@/lib/image";
import { checkPassword, isStrongPassword, validatePhone } from "@/lib/validation";
import { changePasswordApi, saveSettingsApi } from "@/services/profile";
import { myWorkerProfile, saveWorkerProfile } from "@/services/marketplace";
import { requestNotificationPermission } from "@/lib/notificationSound";
import type { ListingPrefs, NotificationPrefs } from "@/types/api";

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="agro-card gap-4 p-5">
    <div><h3 className="font-semibold text-foreground">{title}</h3>{hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>
    {children}
  </section>
);

const Field = ({ label, id, children, error }: { label: string; id: string; children: ReactNode; error?: string | null }) => (
  <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-xs text-destructive" role="alert">{error}</p>}</div>
);

const SwitchRow = ({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
    <div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
  </div>
);

const ProfileSection = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", bio: "", farmSize: "", cropTypes: "", businessName: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone || "", bio: user.bio || "", farmSize: user.farmSize || "", cropTypes: (user.cropTypes || []).join(", "), businessName: user.businessName || "" });
  }, [user]);
  if (!user) return null;

  const nameError = form.name.trim().length < 2 ? t("app.settings.nameError") : null;
  const phoneError = validatePhone(form.phone) ? null : t("app.settings.phoneError");

  const save = async () => {
    if (nameError || phoneError) return;
    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(), phone: form.phone.trim(), bio: form.bio,
        ...(user.role === "farmer" ? { farmSize: form.farmSize, cropTypes: form.cropTypes.split(",").map((c) => c.trim()).filter(Boolean) } : {}),
        ...(user.role === "equipment_owner" ? { businessName: form.businessName } : {}),
      });
      toast.success(t("app.settings.saved"));
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setSaving(false); }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await updateProfile({ avatar: await resizeImageToDataUrl(file) }); toast.success(t("app.settings.photoSaved")); }
    catch (e) { toast.error(e instanceof Error && e.message === "invalid-type" ? t("app.settings.photoType") : getErrorMessage(e)); }
    finally { setUploading(false); }
  };

  return (
    <Section title={t("app.settings.profile")} hint={t("app.settings.profileHint")}>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl font-bold text-primary">
          {user.avatar.startsWith("data:") || user.avatar.startsWith("http") ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}{t("app.settings.changePhoto")}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("app.settings.name")} id="s-name" error={nameError}><Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></Field>
        <Field label={t("app.settings.email")} id="s-email"><Input id="s-email" value={user.email} readOnly disabled /></Field>
        <Field label={t("app.settings.phone")} id="s-phone" error={phoneError}><Input id="s-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
        {user.role === "equipment_owner" && <Field label={t("app.settings.businessName")} id="s-biz"><Input id="s-biz" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} maxLength={120} /></Field>}
        {user.role === "farmer" && <Field label={t("app.settings.farmSize")} id="s-farm"><Input id="s-farm" value={form.farmSize} onChange={(e) => setForm({ ...form, farmSize: e.target.value })} placeholder="5 acres" /></Field>}
        {user.role === "farmer" && <Field label={t("app.settings.crops")} id="s-crops"><Input id="s-crops" value={form.cropTypes} onChange={(e) => setForm({ ...form, cropTypes: e.target.value })} placeholder="Maize, Ragi" /></Field>}
      </div>
      <Field label={t("app.settings.bio")} id="s-bio"><Textarea id="s-bio" rows={3} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
      <div><Button onClick={() => void save()} disabled={saving || Boolean(nameError || phoneError)} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("app.common.save")}</Button></div>
    </Section>
  );
};

const AppearanceSection = () => {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  return (
    <Section title={t("app.settings.appearance")} hint={t("app.settings.appearanceHint")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("app.settings.language")} id="s-lang">
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger id="s-lang"><SelectValue /></SelectTrigger>
            <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.native} ({l.label})</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <SwitchRow label={t("app.settings.darkMode")} checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
      </div>
    </Section>
  );
};

const NotificationSection = () => {
  const { user, setUserFromServer } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  if (!user) return null;
  const prefs = user.settings.notifications;
  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (key === "desktop" && value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error("Browser notification permission was not granted.");
        return;
      }
    }
    setBusy(key);
    try {
      setUserFromServer(await saveSettingsApi({ notifications: { [key]: value } }));
      toast.success(t("app.settings.saved"));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section title={t("app.settings.notifications")} hint={t("app.settings.notificationsHint")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["booking", "payment", "message", "weather"] as const).filter((k) => k !== "weather" || user.role === "farmer").map((k) => (
          <SwitchRow key={k} label={t(`app.settings.notif.${k}`)} checked={Boolean(prefs[k])} disabled={busy === k} onChange={(v) => void toggle(k, v)} />
        ))}
        <SwitchRow
          label="Sound Alerts"
          hint="Play a WhatsApp chime when messages or alerts arrive"
          checked={prefs.sound !== false}
          disabled={busy === "sound"}
          onChange={(v) => void toggle("sound", v)}
        />
        <SwitchRow
          label="Desktop Notifications"
          hint="Show notifications when tab is in background"
          checked={prefs.desktop === true}
          disabled={busy === "desktop"}
          onChange={(v) => void toggle("desktop", v)}
        />
      </div>
    </Section>
  );
};

const SecuritySection = () => {
  const { setUserFromServer } = useAuth();
  const { t } = useLanguage();
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const checks = checkPassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const m = useMutation({
    mutationFn: () => changePasswordApi(cur, next),
    onSuccess: (r) => { setUserFromServer(r.user, r.token); setCur(""); setNext(""); setConfirm(""); toast.success(t("app.settings.passwordChanged")); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const valid = cur.length > 0 && isStrongPassword(next) && next === confirm;
  return (
    <Section title={t("app.settings.security")} hint={t("app.settings.securityHint")}>
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (valid) m.mutate(); }}>
        <Field label={t("app.settings.currentPassword")} id="s-cur"><PasswordInput id="s-cur" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label={t("app.settings.newPassword")} id="s-new"><PasswordInput id="s-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label={t("app.settings.confirmPassword")} id="s-conf" error={mismatch ? t("app.auth.passwordMismatch") : null}><PasswordInput id="s-conf" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <ul className="text-xs text-muted-foreground sm:col-span-3">
          {(["length", "letter", "number"] as const).map((k) => <li key={k} className={checks[k] ? "text-emerald-600" : ""}>{checks[k] ? "✓" : "•"} {t(`app.auth.rule.${k}`)}</li>)}
        </ul>
        <div className="sm:col-span-3"><Button type="submit" disabled={!valid || m.isPending} className="gap-2">{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t("app.settings.changePassword")}</Button></div>
      </form>
    </Section>
  );
};

const WorkerSection = () => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["worker-profile"], queryFn: myWorkerProfile });
  const [skills, setSkills] = useState(""); const [rate, setRate] = useState(""); const [unit, setUnit] = useState<"day" | "hour">("day");
  const [notes, setNotes] = useState(""); const [available, setAvailable] = useState(true);
  useEffect(() => {
    if (q.data) { setSkills(q.data.skills.join(", ")); setRate(String(q.data.pricing.amount)); setUnit(q.data.pricing.unit); setNotes(q.data.notes || ""); setAvailable(q.data.availability); }
  }, [q.data]);
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => saveWorkerProfile(payload),
    onSuccess: () => { toast.success(t("app.settings.saved")); void qc.invalidateQueries({ queryKey: ["worker-profile"] }); void qc.invalidateQueries({ queryKey: ["earnings"] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const rateNum = Number(rate);
  const rateError = rate !== "" && (!Number.isFinite(rateNum) || rateNum < 1) ? t("app.settings.rateError") : null;
  const submit = () => save.mutate({ skills: skills.split(",").map((s) => s.trim()).filter(Boolean), pricing: { amount: rateNum, unit }, notes });
  return (
    <Section title={t("app.settings.workerProfile")} hint={q.data ? t("app.settings.workerHint") : t("app.settings.workerCreateHint")}>
      {q.data && <SwitchRow label={t("app.settings.availableForWork")} hint={t("app.settings.availableHint")} checked={available} disabled={save.isPending} onChange={(v) => { setAvailable(v); save.mutate({ availability: v }); }} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("app.settings.skills")} id="w-skills"><Input id="w-skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Harvesting, Irrigation" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("app.settings.rate")} id="w-rate" error={rateError}><Input id="w-rate" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          <Field label={t("app.settings.per")} id="w-unit"><Select value={unit} onValueChange={(v) => setUnit(v as "day" | "hour")}><SelectTrigger id="w-unit"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">{t("app.units.day")}</SelectItem><SelectItem value="hour">{t("app.units.hour")}</SelectItem></SelectContent></Select></Field>
        </div>
      </div>
      <Field label={t("app.settings.workerNotes")} id="w-notes"><Textarea id="w-notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div><Button onClick={submit} disabled={save.isPending || !rate || Boolean(rateError) || !skills.trim()} className="gap-2">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("app.common.save")}</Button></div>
    </Section>
  );
};

const OwnerSection = () => {
  const { user, setUserFromServer } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const lp = user.settings.listingPreferences;
  const update = async (patch: Partial<ListingPrefs>) => {
    setBusy(true);
    try { setUserFromServer(await saveSettingsApi({ listingPreferences: patch })); toast.success(t("app.settings.saved")); }
    catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Section title={t("app.settings.listingPrefs")} hint={t("app.settings.listingPrefsHint")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SwitchRow label={t("app.settings.autoAccept")} hint={t("app.settings.autoAcceptHint")} checked={lp.autoAcceptRequests} disabled={busy} onChange={(v) => void update({ autoAcceptRequests: v })} />
        <SwitchRow label={t("app.settings.showPhone")} hint={t("app.settings.showPhoneHint")} checked={lp.showPhoneAfterApproval} disabled={busy} onChange={(v) => void update({ showPhoneAfterApproval: v })} />
        <Field label={t("app.settings.defaultUnit")} id="o-unit">
          <Select value={lp.defaultPricingUnit} onValueChange={(v) => void update({ defaultPricingUnit: v as "day" | "hour" })} disabled={busy}>
            <SelectTrigger id="o-unit"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">{t("app.units.day")}</SelectItem><SelectItem value="hour">{t("app.units.hour")}</SelectItem></SelectContent>
          </Select>
        </Field>
      </div>
    </Section>
  );
};

export const AccountSettings = ({ withLocation = true }: { withLocation?: boolean }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <ProfileSection />
      {withLocation && user.role !== "admin" && <Section title={t("app.settings.location")} hint={t("app.settings.locationHint")}><LocationControl /></Section>}
      {user.role === "worker" && <WorkerSection />}
      {user.role === "equipment_owner" && <OwnerSection />}
      <AppearanceSection />
      <NotificationSection />
      <SecuritySection />
    </div>
  );
};
