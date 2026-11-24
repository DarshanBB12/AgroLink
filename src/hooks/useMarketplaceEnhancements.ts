import { useState, useEffect, useCallback } from "react";
import type { Listing } from "@/types/api";

const FAV_KEY = "agrolink_favorite_ids";
const RECENT_KEY = "agrolink_recently_viewed";

export const useMarketplaceEnhancements = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAV_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [compareList, setCompareList] = useState<Listing[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favoriteIds));
    } catch {
      // Ignore localStorage write errors
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentlyViewed.slice(0, 10)));
    } catch {
      // Ignore localStorage write errors
    }
  }, [recentlyViewed]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  const addRecentlyViewed = useCallback((listing: Listing) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((l) => l.id !== listing.id);
      return [listing, ...filtered].slice(0, 8);
    });
  }, []);

  const toggleCompare = useCallback((listing: Listing) => {
    setCompareList((prev) => {
      if (prev.some((item) => item.id === listing.id)) {
        return prev.filter((item) => item.id !== listing.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), listing];
      }
      return [...prev, listing];
    });
  }, []);

  const isComparing = useCallback(
    (id: string) => compareList.some((item) => item.id === id),
    [compareList]
  );

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
    recentlyViewed,
    addRecentlyViewed,
    compareList,
    toggleCompare,
    isComparing,
    clearCompare,
  };
};
