import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { searchListings, type SearchParams } from "@/services/marketplace";
import type { ListingType } from "@/types/api";

export const FILTER_KEYS = ["q", "category", "location", "minPrice", "maxPrice", "available", "sort", "radius", "skills", "season", "fertilizerType", "type"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

// All search state lives in the URL query string so filters survive refresh, back/forward and sharing.
export const useMarketplaceSearch = (fixedType: ListingType | "all", pageSize = 12) => {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const origin = user?.coordinates || null;

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    FILTER_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) f[k] = v;
    });
    return f as Partial<Record<FilterKey, string>>;
  }, [params]);
  const page = Math.max(parseInt(params.get("page") || "1", 10) || 1, 1);
  const type: ListingType | "all" = fixedType === "all" ? ((filters.type as ListingType) || "all") : fixedType;

  const setFilters = useCallback(
    (patch: Partial<Record<FilterKey, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
          next.delete("page"); // any filter change returns to page 1
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  const setPage = useCallback(
    (p: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p > 1) next.set("page", String(p));
        else next.delete("page");
        return next;
      }),
    [setParams]
  );
  const reset = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const requestParams: SearchParams = useMemo(
    () => ({
      ...filters,
      // an inverted price range is shown as a validation message instead of being sent to the server
      ...(Number(filters.minPrice) > Number(filters.maxPrice) && filters.minPrice && filters.maxPrice ? { minPrice: undefined, maxPrice: undefined } : {}),
      type,
      available: (filters.available as "true" | "false" | undefined) || undefined,
      // distance sorting / radius only make sense with a saved origin
      sort: filters.sort === "distance" && !origin ? undefined : filters.sort,
      radius: origin ? filters.radius : undefined,
      lat: origin?.lat,
      lng: origin?.lng,
      page,
      limit: pageSize,
    }),
    [filters, type, origin, page, pageSize]
  );

  const query = useQuery({
    queryKey: ["listings", type, requestParams],
    queryFn: () => searchListings(type, requestParams),
    placeholderData: keepPreviousData,
  });

  const activeCount = Object.keys(filters).filter((k) => k !== "type").length;
  return { filters, setFilters, setPage, reset, page, type, query, origin, activeCount };
};
