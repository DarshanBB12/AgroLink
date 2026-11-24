import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import kn from "@/locales/kn.json";
import te from "@/locales/te.json";
import ta from "@/locales/ta.json";
import ml from "@/locales/ml.json";

export type Lang = "en" | "hi" | "kn" | "ml" | "ta" | "te";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

type TranslationTree = Record<string, unknown>;
const translations: Record<Lang, TranslationTree> = {
  en,
  hi,
  kn,
  ml,
  te,
  ta,
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

const isRtlLang = (value: string) => value === "ar" || value === "he" || value === "ur";

function getByPath(obj: TranslationTree, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "hi" || value === "kn" || value === "ml" || value === "ta" || value === "te";
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile } = useAuth();
  const hydratedFor = useRef<string | null>(null);
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang");
    return isLang(stored) ? stored : "en";
  });

  // Saved account language wins on login/refresh (read-only; never overwrites the account).
  useEffect(() => {
    if (!user?.id) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    if (isLang(user.preferredLanguage)) setLangState(user.preferredLanguage);
  }, [user?.id, user?.preferredLanguage]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtlLang(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      if (user && user.preferredLanguage !== next) {
        updateProfile({ preferredLanguage: next }).catch((e) => console.error("Could not save language:", e));
      }
    },
    [user, updateProfile]
  );

  // t(key, vars?) supports {placeholders}. Falls back to English, then to the key.
  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const direct = getByPath(translations[lang], key);
      const found = typeof direct === "string" ? direct : (getByPath(translations.en, key) as string | undefined);
      const text = typeof found === "string" ? found : key;
      return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useLanguage = () => useContext(Ctx);

