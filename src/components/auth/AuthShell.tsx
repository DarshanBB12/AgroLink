import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, Sprout, Tractor, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Shared frame for the login and signup pages: branded green panel + form card. Collapses to one column on mobile.
export const AuthShell = ({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) => {
  const { t } = useLanguage();
  const points = [
    { icon: Tractor, text: t("app.auth.point1") },
    { icon: Users, text: t("app.auth.point2") },
    { icon: Sprout, text: t("app.auth.point3") },
    { icon: ShieldCheck, text: t("app.auth.point4") },
  ];
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-800 via-green-700 to-lime-600 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold"><Leaf className="h-7 w-7" />AgroLink</Link>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-tight">{t("app.auth.tagline")}</h2>
          <ul className="space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90"><span className="rounded-lg bg-white/15 p-2"><Icon className="h-5 w-5" /></span>{text}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} AgroLink</p>
        <Leaf className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-white/10" />
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary lg:hidden"><Leaf className="h-6 w-6" />AgroLink</Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
};
