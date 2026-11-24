import { useState, type FormEvent } from "react";
import { AlertCircle, Check, Loader2, Sprout, Tractor, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { checkPassword, isStrongPassword, validateEmail, validatePhone } from "@/lib/validation";

type SignupRole = "farmer" | "worker" | "equipment_owner";
const ROLES: { value: SignupRole; icon: typeof Sprout; labelKey: string; hintKey: string }[] = [
  { value: "farmer", icon: Sprout, labelKey: "app.roles.farmer", hintKey: "app.roles.farmerHint" },
  { value: "worker", icon: Users, labelKey: "app.roles.worker", hintKey: "app.roles.workerHint" },
  { value: "equipment_owner", icon: Tractor, labelKey: "app.roles.owner", hintKey: "app.roles.ownerHint" },
];

const Signup = () => {
  const { t, lang } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", role: "farmer" as SignupRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const checks = checkPassword(form.password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t("app.auth.nameInvalid");
    const emailProblem = validateEmail(form.email);
    if (emailProblem) next.email = t(emailProblem === "required" ? "app.auth.emailRequired" : "app.auth.emailInvalid");
    if (!validatePhone(form.phone)) next.phone = t("app.auth.phoneInvalid");
    if (!isStrongPassword(form.password)) next.password = t("app.auth.passwordWeak");
    if (form.confirm !== form.password) next.confirm = t("app.auth.passwordMismatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const result = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, phone: form.phone.trim() || undefined, preferredLanguage: lang });
      navigate(result.redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, t("app.auth.signupFailed")));
    } finally {
      setLoading(false);
    }
  };

  const Rule = ({ ok, text }: { ok: boolean; text: string }) => (
    <li className={`flex items-center gap-1 text-xs ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>{ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{text}</li>
  );

  return (
    <AuthShell
      title={t("app.auth.createAccount")}
      subtitle={t("app.auth.signupSubtitle")}
      footer={<>{t("app.auth.haveAccount")} <Link to="/login" className="font-semibold text-primary hover:underline">{t("app.auth.login")}</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4" aria-label={t("app.auth.createAccount")}>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">{t("app.auth.iAmA")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(({ value, icon: Icon, labelKey, hintKey }) => (
              <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, role: value }))} aria-pressed={form.role === value} title={t(hintKey)} className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition ${form.role === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                <Icon className="h-5 w-5" />{t(labelKey)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("app.auth.fullName")}</Label>
          <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={Boolean(errors.name)} disabled={loading} />
          {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("app.auth.email")}</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} disabled={loading} />
            {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("app.auth.phoneOptional")}</Label>
            <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} aria-invalid={Boolean(errors.phone)} disabled={loading} />
            {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("app.auth.password")}</Label>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} disabled={loading} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t("app.auth.passwordRules")}>
            <Rule ok={checks.length} text={t("app.auth.ruleLength")} />
            <Rule ok={checks.letter} text={t("app.auth.ruleLetter")} />
            <Rule ok={checks.number} text={t("app.auth.ruleNumber")} />
          </ul>
          {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t("app.auth.confirmPassword")}</Label>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} aria-invalid={Boolean(errors.confirm)} disabled={loading} />
          {errors.confirm && <p role="alert" className="text-xs text-destructive">{errors.confirm}</p>}
        </div>
        {formError && <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t("app.auth.creating") : t("app.auth.createAccount")}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Signup;
