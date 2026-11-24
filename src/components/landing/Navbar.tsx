import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LANGUAGES, useLanguage } from "@/contexts/LanguageContext";


const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  const dashboardPath =
    user?.role === "worker"
      ? "/dashboard/worker"
      : user?.role === "admin"
        ? "/dashboard/admin"
        : user?.role === "equipment_owner"
          ? "/dashboard/owner"
          : "/dashboard/farmer";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Leaf className="h-7 w-7 text-primary" />
          <span className="text-foreground">Agro<span className="text-primary">Link</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">{t("features")}</a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">{t("howItWorks")}</a>
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">{t("equipmentOwner")}</Link>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">{t("pricing")}</a>

        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <select
              aria-label={t("language")}
              className="h-9 rounded-lg border border-border bg-background/60 px-2 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
          </div>

          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <Button asChild><Link to={dashboardPath}>{t("dashboardLabel")}</Link></Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/login">{t("auth.login")}</Link></Button>
              <Button asChild><Link to="/signup">{t("auth.signUp")}</Link></Button>
            </>
          )}
        </div>


        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-card border-b p-4 space-y-3">
          <a href="#features" className="block text-muted-foreground text-sm">{t("features")}</a>
          <a href="#how-it-works" className="block text-muted-foreground text-sm">{t("howItWorks")}</a>
          <Link to="/login" className="block text-muted-foreground text-sm">{t("equipmentOwner")}</Link>
          <a href="#pricing" className="block text-muted-foreground text-sm">{t("pricing")}</a>

          <div className="pt-3 flex flex-col gap-2">
            <div className="relative">
              <select
                aria-label={t("language")}
                className="h-9 rounded-lg border border-border bg-background/60 px-2 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
            </div>

            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">{user?.name}</span>
                <Button asChild><Link to={dashboardPath}>{t("dashboardLabel")}</Link></Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">{t("auth.login")}</Link></Button>
                <Button asChild><Link to="/signup">{t("auth.signUp")}</Link></Button>
              </>
            )}
          </div>

        </div>
      )}
    </nav>
  );
};

export default Navbar;
