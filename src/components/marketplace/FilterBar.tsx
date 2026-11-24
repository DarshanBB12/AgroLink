import { useEffect, useState } from "react";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounced } from "@/hooks/useDebounced";
import type { FilterKey } from "@/hooks/useMarketplaceSearch";
import type { ListingType } from "@/types/api";

export const CATEGORY_OPTIONS: Record<ListingType, string[]> = {
  equipment: ["Tractor", "Harvester", "Irrigation", "Tillage", "Seeding", "Sprayer"],
  worker: ["Harvesting", "Sowing", "Weeding", "Irrigation", "Pesticide Spraying", "Tractor Driving", "Ploughing", "Sorting & Packing"],
  seed: ["Cereal", "Vegetable", "Oilseed", "Pulse", "Millet"],
  fertilizer: ["Organic", "Chemical", "Bio", "Compost"],
};

const ANY = "all";

interface FilterBarProps {
  type: ListingType | "all";
  filters: Partial<Record<FilterKey, string>>;
  onChange: (patch: Partial<Record<FilterKey, string>>) => void;
  onReset: () => void;
  hasOrigin: boolean;
  activeCount: number;
}

// Every control writes to the URL-backed filter state; they all combine (AND) on the server.
export const FilterBar = ({ type, filters, onChange, onReset, hasOrigin, activeCount }: FilterBarProps) => {
  const { t } = useLanguage();
  const [location, setLocation] = useState(filters.location || "");
  const [min, setMin] = useState(filters.minPrice || "");
  const [max, setMax] = useState(filters.maxPrice || "");
  const dLocation = useDebounced(location.trim(), 400);
  const dMin = useDebounced(min.trim(), 400);
  const dMax = useDebounced(max.trim(), 400);

  useEffect(() => setLocation(filters.location || ""), [filters.location]);
  useEffect(() => setMin(filters.minPrice || ""), [filters.minPrice]);
  useEffect(() => setMax(filters.maxPrice || ""), [filters.maxPrice]);
  useEffect(() => { if (dLocation !== (filters.location || "")) onChange({ location: dLocation }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dLocation]);
  useEffect(() => { if (dMin !== (filters.minPrice || "")) onChange({ minPrice: dMin }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dMin]);
  useEffect(() => { if (dMax !== (filters.maxPrice || "")) onChange({ maxPrice: dMax }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dMax]);

  const priceInvalid = min !== "" && max !== "" && Number(min) > Number(max);
  const categories = type === "all" ? [] : CATEGORY_OPTIONS[type];
  const categoryKey: FilterKey = type === "worker" ? "skills" : type === "fertilizer" ? "fertilizerType" : "category";

  return (
    <div className="agro-card gap-3 p-4" role="search" aria-label={t("app.search.filters")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {type === "all" && (
          <div className="space-y-1.5">
            <Label>{t("app.search.type")}</Label>
            <Select value={filters.type || ANY} onValueChange={(v) => onChange({ type: v === ANY ? "" : v })}>
              <SelectTrigger aria-label={t("app.search.type")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("app.search.allTypes")}</SelectItem>
                {(["equipment", "worker", "seed", "fertilizer"] as ListingType[]).map((x) => <SelectItem key={x} value={x}>{t(`app.types.${x}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {categories.length > 0 && (
          <div className="space-y-1.5">
            <Label>{type === "worker" ? t("app.search.skill") : t("app.search.category")}</Label>
            <Select value={(filters[categoryKey] as string) || ANY} onValueChange={(v) => onChange({ [categoryKey]: v === ANY ? "" : type === "fertilizer" ? v.toLowerCase() : v })}>
              <SelectTrigger aria-label={t("app.search.category")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("app.search.any")}</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={type === "fertilizer" ? c.toLowerCase() : c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="f-location">{t("app.search.location")}</Label>
          <Input id="f-location" value={location} maxLength={60} onChange={(e) => setLocation(e.target.value)} placeholder={t("app.search.locationPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-min">{t("app.search.priceRange")}</Label>
          <div className="flex items-center gap-2">
            <Input id="f-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} placeholder={t("app.search.min")} aria-invalid={priceInvalid} />
            <span className="text-muted-foreground">–</span>
            <Input aria-label={t("app.search.max")} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} placeholder={t("app.search.max")} aria-invalid={priceInvalid} />
          </div>
          {priceInvalid && <p role="alert" className="text-xs text-destructive">{t("app.search.priceInvalid")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t("app.search.availability")}</Label>
          <Select value={filters.available || ANY} onValueChange={(v) => onChange({ available: v === ANY ? "" : v })}>
            <SelectTrigger aria-label={t("app.search.availability")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("app.search.any")}</SelectItem>
              <SelectItem value="true">{t("app.search.availableOnly")}</SelectItem>
              <SelectItem value="false">{t("app.search.unavailableOnly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("app.search.sort")}</Label>
          <Select value={filters.sort || "newest"} onValueChange={(v) => onChange({ sort: v === "newest" ? "" : v })}>
            <SelectTrigger aria-label={t("app.search.sort")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("app.search.sortNewest")}</SelectItem>
              <SelectItem value="price_asc">{t("app.search.sortPriceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("app.search.sortPriceDesc")}</SelectItem>
              <SelectItem value="rating">{t("app.search.sortRating")}</SelectItem>
              {hasOrigin && <SelectItem value="distance">{t("app.search.sortDistance")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        {hasOrigin && (
          <div className="space-y-1.5">
            <Label>{t("app.search.radius")}</Label>
            <Select value={filters.radius || ANY} onValueChange={(v) => onChange({ radius: v === ANY ? "" : v })}>
              <SelectTrigger aria-label={t("app.search.radius")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("app.search.anyDistance")}</SelectItem>
                {[10, 25, 50, 100, 250].map((km) => <SelectItem key={km} value={String(km)}>{t("app.search.withinKm", { km })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {activeCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-2"><FilterX className="h-4 w-4" />{t("app.search.clearAll")}</Button>
        </div>
      )}
    </div>
  );
};
