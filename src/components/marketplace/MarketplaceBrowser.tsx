import { useState, useMemo } from "react";
import { Heart, History, Scale, SearchX, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "@/components/common/StateViews";
import { PaginationBar } from "@/components/common/PaginationBar";
import { LocationControl } from "@/components/common/LocationControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarketplaceSearch } from "@/hooks/useMarketplaceSearch";
import { useMarketplaceEnhancements } from "@/hooks/useMarketplaceEnhancements";
import { FilterBar } from "./FilterBar";
import { ListingCard } from "./ListingCard";
import { ListingDialog } from "./ListingDialog";
import { ListingComparisonDialog } from "./ListingComparisonDialog";
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
  const {
    isFavorite,
    toggleFavorite,
    compareList,
    toggleCompare,
    clearCompare,
    recentlyViewed,
    addRecentlyViewed,
  } = useMarketplaceEnhancements();

  const [selected, setSelected] = useState<Listing | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const isFarmer = user?.role === "farmer";
  const result = query.data;
  const loading = query.isFetching;

  const actionLabelFor = (l: Listing) => (l.type === "worker" ? t("app.booking.hire") : l.type === "equipment" ? t("app.booking.rent") : t("app.booking.buyNow"));

  const handleOpenListing = (l: Listing) => {
    addRecentlyViewed(l);
    setSelected(l);
  };

  const displayedListings = useMemo(() => {
    if (!result?.data) return [];
    if (!showFavoritesOnly) return result.data;
    return result.data.filter((l) => isFavorite(l.id));
  }, [result?.data, showFavoritesOnly, isFavorite]);

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

        <div className="flex flex-wrap items-center justify-between gap-2">
          {result && !query.isError && (
            <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
              {showFavoritesOnly ? `Showing ${displayedListings.length} favorites` : t("app.search.results", { n: result.pagination.total })}
              {result.counts && type === "all" && !showFavoritesOnly && (
                <span className="ml-2">
                  ({Object.entries(result.counts).filter(([, n]) => n > 0).map(([k, n]) => `${t(`app.types.${k}`)}: ${n}`).join(" · ")})
                </span>
              )}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly((prev) => !prev)}
              className="gap-1.5 text-xs h-8"
            >
              <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-white text-white" : "text-rose-500"}`} />
              <span>Favorites Only</span>
            </Button>
          </div>
        </div>

        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !result ? (
          <GridSkeleton />
        ) : displayedListings.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-10 w-10" />}
            title={showFavoritesOnly ? "No favorite items found" : t(activeCount > 0 ? "app.search.noResults" : "app.search.emptyTitle")}
            hint={showFavoritesOnly ? "Click the heart icon on any listing card to add it to your favorites." : t("app.search.emptyHint")}
            action={
              showFavoritesOnly ? (
                <Button variant="outline" onClick={() => setShowFavoritesOnly(false)}>
                  Show All Listings
                </Button>
              ) : activeCount > 0 ? (
                <Button variant="outline" onClick={reset}>{t("app.search.clearAll")}</Button>
              ) : undefined
            }
          />
        ) : (
          <div className={`agro-grid transition-opacity ${loading ? "opacity-60" : ""}`}>
            {displayedListings.map((l) => (
              <ListingCard
                key={`${l.type}-${l.id}`}
                listing={l}
                onOpen={handleOpenListing}
                onAction={handleOpenListing}
                actionLabel={actionLabelFor(l)}
                hideAction={!isFarmer}
                isFavorite={isFavorite(l.id)}
                onToggleFavorite={toggleFavorite}
                isComparing={compareList.some((c) => c.id === l.id)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        )}
        {!showFavoritesOnly && (
          <PaginationBar pagination={result?.pagination} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}

        {/* Recently Viewed Listings Carousel */}
        {recentlyViewed.length > 0 && (
          <section className="pt-6 border-t mt-8">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Recently Viewed</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {recentlyViewed.map((l) => (
                <div
                  key={`recent-${l.id}`}
                  onClick={() => handleOpenListing(l)}
                  className="agro-card p-3 min-w-[200px] max-w-[220px] shrink-0 cursor-pointer hover:border-primary/50 transition-all text-xs"
                >
                  <p className="font-medium text-foreground truncate">{l.name}</p>
                  <p className="text-muted-foreground capitalize mt-0.5">{l.category}</p>
                  <p className="text-primary font-semibold mt-1">₹{l.price}/{l.priceUnit}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating Compare Action Bar */}
      {compareList.length > 0 && (
        <aside
          aria-label="Compare listings"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-primary/40 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">
              Compare ({compareList.length}/3 items)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsCompareOpen(true)} className="h-8 text-xs font-semibold">
              View Comparison
            </Button>
            <Button size="icon" variant="ghost" onClick={clearCompare} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Clear comparison list">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}

      {/* Comparison Modal */}
      <ListingComparisonDialog
        open={isCompareOpen}
        onOpenChange={setIsCompareOpen}
        listings={compareList}
        onRemove={toggleCompare}
        onSelect={(l) => {
          setIsCompareOpen(false);
          handleOpenListing(l);
        }}
      />

      <ListingDialog listing={selected} onClose={() => setSelected(null)} canOrder={isFarmer} />
    </div>
  );
};
