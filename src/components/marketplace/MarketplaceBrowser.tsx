import { useState } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "@/components/common/StateViews";
import { PaginationBar } from "@/components/common/PaginationBar";
import { LocationControl } from "@/components/common/LocationControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarketplaceSearch } from "@/hooks/useMarketplaceSearch";
import { FilterBar } from "./FilterBar";
import { ListingCard } from "./ListingCard";
import { ListingDialog } from "./ListingDialog";
import { SearchBar } from "./SearchBar";
import type { Listing, ListingType } from "@/types/api";
import { MapPin } from "lucide-react";

interface Props {
  type: ListingType | "all";
  title: string;
  subtitle?: string;
}

// The one search + filter + results experience shared by Equipment, Workers, Seeds, Fertilizers and global search.
export const MarketplaceBrowser = ({ type: fixedType, title, subtitle }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { filters, setFilters, setPage, reset, query, origin, activeCount, type } = useMarketplaceSearch(fixedType);
  const [selected, setSelected] = useState<Listing | null>(null);
  const isFarmer = user?.role === "farmer";
  const result = query.data;
  const loading = query.isFetching;

  const actionLabelFor = (l: Listing) => (l.type === "worker" ? t("app.booking.hire") : l.type === "equipment" ? t("app.booking.rent") : t("app.booking.buyNow"));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MapPin className="h-4 w-4" />
                {user?.location || t("app.location.set")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] max-w-[92vw]"><LocationControl compact /></PopoverContent>
          </Popover>
        }
      />

      <div className="space-y-4">
        <SearchBar value={filters.q || ""} onChange={(q) => setFilters({ q })} loading={loading} />
        <FilterBar type={type} filters={filters} onChange={setFilters} onReset={reset} hasOrigin={Boolean(origin)} activeCount={activeCount} />

        {result && !query.isError && (
          <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
            {t("app.search.results", { n: result.pagination.total })}
            {result.counts && type === "all" && (
              <span className="ml-2">
                ({Object.entries(result.counts).filter(([, n]) => n > 0).map(([k, n]) => `${t(`app.types.${k}`)}: ${n}`).join(" · ")})
              </span>
            )}
          </p>
        )}

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !result ? (
          <GridSkeleton />
        ) : result.data.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10" />}
            title={t(activeCount > 0 ? "app.search.noResults" : "app.search.emptyTitle")}
            hint={t("app.search.emptyHint")}
            action={activeCount > 0 ? <Button variant="outline" onClick={reset}>{t("app.search.clearAll")}</Button> : undefined}
          />
        ) : (
          <div className={`agro-grid transition-opacity ${loading ? "opacity-60" : ""}`}>
            {result.data.map((l) => (
              <ListingCard key={`${l.type}-${l.id}`} listing={l} onOpen={setSelected} onAction={setSelected} actionLabel={actionLabelFor(l)} hideAction={!isFarmer} />
            ))}
          </div>
        )}
        <PaginationBar pagination={result?.pagination} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>

      <ListingDialog listing={selected} onClose={() => setSelected(null)} canOrder={isFarmer} />
    </div>
  );
};
