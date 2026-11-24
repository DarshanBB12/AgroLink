import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { roleDashboardMap } from "@/components/auth/PrivateRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { validateEmail } from "@/lib/validation";

const Login = () => {
  const { t } = useLanguage();
  const { login, user, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string }; expired?: boolean } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in (e.g. opened /login in a second tab): go straight to the role dashboard.
  useEffect(() => {
    if (user && !loading) navigate(state?.from?.pathname || roleDashboardMap[user.role] || "/dashboard/farmer", { replace: true });
  }, [user, loading, navigate, state]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const next: typeof errors = {};
    const emailProblem = validateEmail(email);
    if (emailProblem) next.email = t(emailProblem === "required" ? "app.auth.emailRequired" : "app.auth.emailInvalid");
    if (!password) next.password = t("app.auth.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password, remember);
      navigate(state?.from?.pathname || result.redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, t("app.auth.loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("app.auth.welcomeBack")}
      subtitle={t("app.auth.loginSubtitle")}
      footer={<>{t("app.auth.noAccount")} <Link to="/signup" className="font-semibold text-primary hover:underline">{t("app.auth.signUp")}</Link></>}
    >
      {(state?.expired || sessionExpired) && !formError && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"><AlertCircle className="h-4 w-4" />{t("app.auth.sessionExpired")}</p>
      )}
      <form onSubmit={submit} noValidate className="space-y-4" aria-label={t("app.auth.login")}>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("app.auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-err" : undefined} disabled={loading} />
          {errors.email && <p id="email-err" role="alert" className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("app.auth.password")}</Label>
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} disabled={loading} />
          {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(c === true)} />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">{t("app.auth.remember")}</Label>
        </div>
        {formError && <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{formError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t("app.auth.loggingIn") : t("app.auth.login")}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Login;
