import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={visible ? "text" : "password"} className={`pr-10 ${props.className || ""}`} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t("app.auth.hidePassword") : t("app.auth.showPassword")} aria-pressed={visible} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
