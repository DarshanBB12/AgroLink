import { lazy, Suspense, useState } from "react";
import { Box, Heart, MapPin, Navigation, RotateCw, Scale, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistance, formatINR } from "@/lib/format";
import type { Listing } from "@/types/api";

// The 3D viewer (three.js) is large, so it is only downloaded when someone actually opens a preview.
const Equipment3DViewer = lazy(() => import("@/components/equipment/Equipment3DViewer"));

const TYPE_EMOJI: Record<Listing["type"], string> = { equipment: "🚜", worker: "👨‍🌾", seed: "🌱", fertilizer: "🧪" };

const specRows = (l: Listing): [string, string][] => {
  const d = l.details;
  const rows: [string, string | number | undefined][] =
    l.type === "equipment"
      ? [["app.card.power", d.specs?.power], ["app.card.fuel", d.specs?.fuel], ["app.card.capacity", d.specs?.capacity], ["app.card.year", d.specs?.year]]
      : l.type === "worker"
      ? [["app.card.skills", (d.skills || []).join(", ")]]
      : l.type === "seed"
      ? [["app.card.crop", d.crop], ["app.card.variety", d.variety], ["app.card.season", d.season], ["app.card.germination", d.germinationRate], ["app.card.maturity", d.maturityDays ? `${d.maturityDays} d` : undefined]]
      : [["app.card.npk", d.npkRatio], ["app.card.type", d.fertilizerType], ["app.card.crops", (d.suitableCrops || []).join(", ")]];
  return rows.filter(([, v]) => v !== undefined && v !== "" && v !== 0).map(([k, v]) => [k, String(v)]);
};

interface ListingCardProps {
  listing: Listing;
  onOpen: (l: Listing) => void;
  actionLabel: string;
  onAction?: (l: Listing) => void;
  secondaryAction?: { label: string; onClick: (l: Listing) => void; variant?: "outline" | "destructive" };
  hideAction?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (l: Listing) => void;
}

// One card for equipment, workers, seeds and fertilizers. Flip it for specifications; equipment also has a 3D preview.
export const ListingCard = ({
  listing,
  onOpen,
  actionLabel,
  onAction,
  secondaryAction,
  hideAction,
  isFavorite,
  onToggleFavorite,
  isComparing,
  onToggleCompare,
}: ListingCardProps) => {
  const { t } = useLanguage();
  const [flipped, setFlipped] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const discount = Number(listing.details.discount || 0);
  const unavailable = !listing.available;
  const emoji = (listing.details.imageEmoji as string) || TYPE_EMOJI[listing.type];
  const imageUrl = listing.details.imageUrl as string | undefined;
  const distance = formatDistance(listing.distanceKm);
  const finalPrice = Math.round(listing.price * (1 - discount / 100) * 100) / 100;
  const rows = specRows(listing);

  return (
    <article className="agro-card agro-card-interactive h-full relative group" data-testid="listing-card" aria-label={listing.name}>
      {flipped ? (
        <div className="agro-card-body" data-testid="listing-card-back">
          <div className="flex items-center justify-between">
            <h3 className="agro-card-title">{listing.name}</h3>
            <Button variant="ghost" size="icon" aria-label={t("app.card.flipBack")} onClick={() => setFlipped(false)}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <dl className="grid flex-1 content-start gap-2 text-sm">
            {rows.length === 0 && <p className="text-muted-foreground">{t("app.card.noSpecs")}</p>}
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border/50 pb-1">
                <dt className="text-muted-foreground">{t(k)}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
            {listing.owner && (
              <div className="flex justify-between gap-3 pb-1">
                <dt className="text-muted-foreground">{t("app.card.provider")}</dt>
                <dd className="text-right font-medium text-foreground">{listing.owner.name}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <>
          <div className="agro-card-media relative">
            {imageUrl ? <img src={imageUrl} alt={listing.name} loading="lazy" /> : <span aria-hidden="true">{emoji}</span>}
            <Badge className="absolute left-3 top-3 capitalize">{t(`app.types.${listing.type}`)}</Badge>
            
            <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
              {discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
              {onToggleFavorite && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur hover:bg-background shadow-xs"
                  aria-label="Add to favorites"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(listing.id);
                  }}
                >
                  <Heart className={`h-4 w-4 transition-colors ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                </Button>
              )}
            </div>

            <div className="absolute bottom-2 right-2 flex gap-1 z-10">
              {onToggleCompare && (
                <Button
                  size="icon"
                  variant={isComparing ? "default" : "secondary"}
                  className="h-8 w-8"
                  aria-label="Compare listing"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompare(listing);
                  }}
                  title={isComparing ? "Remove from comparison" : "Add to comparison"}
                >
                  <Scale className="h-4 w-4" />
                </Button>
              )}
              {listing.type === "equipment" && (
                <Button size="icon" variant="secondary" className="h-8 w-8" aria-label={t("app.card.preview3d")} onClick={() => setShow3d(true)}>
                  <Box className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="secondary" className="h-8 w-8" aria-label={t("app.card.flip")} onClick={() => setFlipped(true)}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="agro-card-body cursor-pointer" onClick={() => onOpen(listing)}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="agro-card-title">{listing.name}</h3>
              {listing.rating > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {listing.rating.toFixed(1)}
                </span>
              )}
            </div>
            <p className="agro-card-meta">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.location || t("app.common.locationUnknown")}</span>
              {distance && (
                <span className="ml-auto flex shrink-0 items-center gap-1 font-medium text-primary">
                  <Navigation className="h-3 w-3" />
                  {distance}
                </span>
              )}
            </p>
            <p className="agro-card-desc">{listing.description || listing.category}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{listing.category}</Badge>
              {unavailable && <Badge variant="secondary">{t("app.card.unavailable")}</Badge>}
            </div>
          </div>
        </>
      )}
      <div className="agro-card-footer">
        <div>
          <span className="agro-price">{formatINR(finalPrice)}</span>
          <span className="agro-price-unit">/ {t(`app.units.${listing.priceUnit}`) === `app.units.${listing.priceUnit}` ? listing.priceUnit : t(`app.units.${listing.priceUnit}`)}</span>
          {discount > 0 && <span className="ml-1 text-xs text-muted-foreground line-through">{formatINR(listing.price)}</span>}
        </div>
        <div className="flex gap-2">
          {secondaryAction && (
            <Button size="sm" variant={secondaryAction.variant || "outline"} className="agro-btn" onClick={() => secondaryAction.onClick(listing)}>
              {secondaryAction.label}
            </Button>
          )}
          {!hideAction && (
            <Button size="sm" className="agro-btn" disabled={unavailable} onClick={() => (onAction ? onAction(listing) : onOpen(listing))}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>

      {listing.type === "equipment" && (
        <Dialog open={show3d} onOpenChange={setShow3d}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{listing.name}</DialogTitle>
            </DialogHeader>
            {show3d && (
              <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-muted" />}>
                <Equipment3DViewer category={listing.category} />
              </Suspense>
            )}
            <p className="text-xs text-muted-foreground">{t("app.card.dragToRotate")}</p>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
};
