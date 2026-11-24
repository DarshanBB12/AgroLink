import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Filter, Layers, MapPin, Navigation, Sparkles, Tractor, Users, Sprout, Leaf, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatINR } from "@/lib/format";
import { getCoordinatesForLocation } from "@/lib/geo";
import { searchListings } from "@/services/marketplace";
import type { Listing, ListingType } from "@/types/api";
import { saveLocationApi } from "@/services/profile";
import { ListingDialog } from "@/components/marketplace/ListingDialog";

interface GpsMapProps {
  initialType?: ListingType | "all";
  height?: string;
  showSidebar?: boolean;
}

// Custom Leaflet DivIcons with SVG badges for crisp rendering
const createCustomIcon = (type: string, name: string, isUser = false) => {
  if (isUser) {
    return L.divIcon({
      className: "custom-leaflet-user-icon",
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(34, 197, 94, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #16a34a; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }

  const config: Record<string, { bg: string; border: string; emoji: string }> = {
    equipment: { bg: "#059669", border: "#10b981", emoji: "🚜" },
    worker: { bg: "#2563eb", border: "#3b82f6", emoji: "👷" },
    seed: { bg: "#d97706", border: "#f59e0b", emoji: "🌾" },
    fertilizer: { bg: "#0d9488", border: "#14b8a6", emoji: "🌿" },
  };

  const c = config[type] || config.equipment;

  return L.divIcon({
    className: `custom-leaflet-marker-${type}`,
    html: `
      <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: ${c.bg}; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; white-space: nowrap; max-width: 130px; overflow: hidden; text-overflow: ellipsis;">
          <span>${c.emoji}</span>
          <span style="overflow: hidden; text-overflow: ellipsis;">${name}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${c.bg}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
  });
};

export const GpsMap = ({ initialType = "all", height = "650px", showSidebar = true }: GpsMapProps) => {
  const { user, setUserFromServer } = useAuth();
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  const [selectedType, setSelectedType] = useState<ListingType | "all">(initialType);
  const [radiusKm, setRadiusKm] = useState<number>(100);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [locating, setLocating] = useState(false);

  const userCoords = user?.coordinates || { lat: 18.5204, lng: 73.8567 }; // Pune default

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-map", selectedType, user?.coordinates?.lat, user?.coordinates?.lng, radiusKm],
    queryFn: () =>
      searchListings("all", {
        type: selectedType,
        lat: user?.coordinates?.lat,
        lng: user?.coordinates?.lng,
        radius: radiusKm > 0 ? radiusKm : undefined,
        limit: 100,
      }),
  });

  const listings = data?.data || [];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = user?.coordinates?.lat || 18.5204;
    const initialLng = user?.coordinates?.lng || 73.8567;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 9,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User marker and Radius circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !user?.coordinates) return;

    const { lat, lng } = user.coordinates;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], {
        icon: createCustomIcon("user", "You", true),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; font-size: 13px;">
            <strong style="color: #16a34a;">📍 Your Location</strong><br/>
            <span>${user.location || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}</span>
          </div>
        `);
    }

    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    if (radiusKm > 0) {
      radiusCircleRef.current = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(map);
    }
  }, [user?.coordinates, radiusKm]);

  // Update Marketplace Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    listings.forEach((item) => {
      let lat = item.coordinates?.lat;
      let lng = item.coordinates?.lng;

      if (!lat || !lng) {
        const fallback = getCoordinatesForLocation(item.location);
        if (fallback) {
          [lat, lng] = fallback;
        }
      }

      if (!lat || !lng) return;

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(item.type, item.name),
      });

      const distanceText = item.distanceKm ? ` · <span style="color: #2563eb; font-weight: 600;">${item.distanceKm} km away</span>` : "";
      const priceText = `${formatINR(item.price)}/${item.priceUnit || "day"}`;

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #059669; letter-spacing: 0.5px;">${item.category || item.type}</span>
            <span style="font-size: 11px; color: #f59e0b; font-weight: 700;">★ ${item.rating?.toFixed(1) || "5.0"}</span>
          </div>
          <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #0f172a;">${item.name}</h4>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
            📍 ${item.location || "Available"}${distanceText}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
            <div style="font-size: 14px; font-weight: 800; color: #059669;">${priceText}</div>
            <button id="view-listing-${item.id}" style="background: #16a34a; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
              View Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-listing-${item.id}`);
        if (btn) {
          btn.onclick = () => setSelectedListing(item);
        }
      });

      markersGroup.addLayer(marker);
    });
  }, [listings]);

  // Handle "Locate Me" GPS button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.5 });
        }

        try {
          const updated = await saveLocationApi({
            lat,
            lng,
            source: "gps",
            address: user?.location || undefined,
          });
          setUserFromServer(updated);
        } catch {
          // silently handle if offline
        }
      },
      (err) => {
        setLocating(false);
        console.warn("GPS error:", err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const focusOnItem = (item: Listing) => {
    let lat = item.coordinates?.lat;
    let lng = item.coordinates?.lng;
    if (!lat || !lng) {
      const fallback = getCoordinatesForLocation(item.location);
      if (fallback) [lat, lng] = fallback;
    }
    if (lat && lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={selectedType === "all" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setSelectedType("all")}
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" /> All ({listings.length})
          </Button>
          <Button
            size="sm"
            variant={selectedType === "equipment" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setSelectedType("equipment")}
          >
            <Tractor className="mr-1.5 h-3.5 w-3.5" /> Equipment
          </Button>
          <Button
            size="sm"
            variant={selectedType === "worker" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setSelectedType("worker")}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" /> Workers
          </Button>
          <Button
            size="sm"
            variant={selectedType === "seed" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setSelectedType("seed")}
          >
            <Sprout className="mr-1.5 h-3.5 w-3.5" /> Seeds
          </Button>
          <Button
            size="sm"
            variant={selectedType === "fertilizer" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setSelectedType("fertilizer")}
          >
            <Leaf className="mr-1.5 h-3.5 w-3.5" /> Fertilizers
          </Button>
        </div>

        {/* Right Action: Radius & GPS Locate */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
            {[25, 50, 100, 0].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  radiusKm === r ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === 0 ? "All India" : `${r} km`}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
            onClick={handleLocateMe}
            disabled={locating}
          >
            <Crosshair className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{locating ? "Locating..." : "My GPS"}</span>
          </Button>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height }}>
        {/* Leaflet Map Box */}
        <div className={`relative rounded-xl border border-border overflow-hidden shadow-sm ${showSidebar ? "lg:col-span-3" : "lg:col-span-4"}`}>
          <div ref={mapContainerRef} className="h-full w-full z-10" />

          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 rounded-lg bg-background/90 px-3 py-1.5 text-xs font-medium backdrop-blur-md shadow-md border border-border/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{listings.length} Farm Resources Active</span>
          </div>
        </div>

        {/* Sidebar Cards Panel */}
        {showSidebar && (
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="mb-2 pb-2 border-b border-border flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nearby Resources</h4>
              <Badge variant="secondary" className="text-[10px]">{listings.length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {listings.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                  <Navigation className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs">No listings found within {radiusKm > 0 ? `${radiusKm} km` : "this area"}.</p>
                  <Button variant="link" size="sm" onClick={() => setRadiusKm(0)} className="text-xs mt-1">Show All India</Button>
                </div>
              ) : (
                listings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => focusOnItem(item)}
                    className="p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 cursor-pointer transition-all text-left group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] uppercase font-bold text-primary">{item.category || item.type}</span>
                      <span className="text-[11px] font-semibold text-amber-500">★ {item.rating?.toFixed(1) || "4.8"}</span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.name}</h5>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[110px]">📍 {item.location}</span>
                      <span className="font-bold text-foreground">{formatINR(item.price)}/{item.priceUnit || "day"}</span>
                    </div>
                    {item.distanceKm && (
                      <div className="mt-1.5 text-[10px] text-emerald-600 font-semibold flex items-center justify-between">
                        <span>{item.distanceKm} km away</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedListing(item);
                          }}
                        >
                          View <ExternalLink className="h-2.5 w-2.5 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Listing Action Dialog */}
      <ListingDialog listing={selectedListing} onClose={() => setSelectedListing(null)} canOrder={user?.role === "farmer"} />
    </div>
  );
};
