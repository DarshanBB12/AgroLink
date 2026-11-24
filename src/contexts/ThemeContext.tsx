import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/api";

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}
const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {}, setTheme: () => {} });

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile } = useAuth();
  const hydratedFor = useRef<string | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return isTheme(stored) ? stored : "light";
  });

  // On login / page load the user's SAVED preference wins. We only read here — never write — so a stale
  // local value can no longer overwrite what is stored on the account.
  useEffect(() => {
    if (!user?.id) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    if (isTheme(user.theme)) setThemeState(user.theme);
  }, [user?.id, user?.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Only an explicit user action is persisted to the account.
  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      if (user && user.theme !== next) {
        updateProfile({ theme: next }).catch((e) => console.error("Could not save theme:", getErrorMessage(e)));
      }
    },
    [user, updateProfile]
  );
  const toggle = useCallback(() => setTheme(theme === "light" ? "dark" : "light"), [theme, setTheme]);

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
};
export const useTheme = () => useContext(Ctx);
