import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounced } from "@/hooks/useDebounced";

// Debounced text search used by every admin table.
export const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => {
  const [local, setLocal] = useState(value);
  const debounced = useDebounced(local.trim(), 350);
  useEffect(() => { if (debounced !== value) onChange(debounced); }, [debounced]);
  const { t } = useLanguage();
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-9 pr-9" />
      {local && <button type="button" onClick={() => { setLocal(""); onChange(""); }} aria-label={t("app.common.clear")} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
    </div>
  );
};

export const OptionSelect = ({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) => (
  <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
    <SelectTrigger className="w-[160px]" aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value || "all"} value={o.value || "all"}>{o.label}</SelectItem>)}</SelectContent>
  </Select>
);
