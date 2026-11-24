import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounced } from "@/hooks/useDebounced";
import { fetchSuggestions } from "@/services/marketplace";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void; // called with the trimmed, committed query
  loading?: boolean;
  placeholder?: string;
}

// Controlled-ish search input: edits are debounced, whitespace is trimmed/collapsed, there is a clear button and
// type-ahead suggestions from the API.
export const SearchBar = ({ value, onChange, loading, placeholder }: SearchBarProps) => {
  const { t } = useLanguage();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const normalized = text.replace(/\s+/g, " ").trim();
  const debounced = useDebounced(normalized, 350);

  // keep the box in sync when the parent resets the query (e.g. "clear filters")
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const suggestions = useQuery({ queryKey: ["suggestions", debounced], queryFn: () => fetchSuggestions(debounced), enabled: open && debounced.length >= 2, staleTime: 60_000 });

  useEffect(() => {
    const close = (e: MouseEvent) => wrapRef.current && !wrapRef.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (v: string) => {
    setText(v);
    onChange(v);
    setOpen(false);
  };
  const clear = () => {
    setText("");
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="searchbox"
        aria-label={t("app.search.label")}
        value={text}
        maxLength={100}
        placeholder={placeholder || t("app.search.placeholder")}
        className="pl-9 pr-16"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") choose(normalized);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("app.search.searching")} />}
        {text && (
          <button type="button" onClick={clear} aria-label={t("app.search.clear")} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && suggestions.data && suggestions.data.length > 0 && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {suggestions.data.map((s) => (
            <li key={`${s.text}-${s.kind}-${s.type}`}>
              <button type="button" role="option" aria-selected="false" onClick={() => choose(s.text)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                <span>{s.text}</span>
                <span className="text-xs text-muted-foreground">{t(`app.types.${s.type}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
