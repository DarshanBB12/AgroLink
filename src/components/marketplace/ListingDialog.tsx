import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Loader2, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { estimatePrice, formatDate, formatDistance, formatINR, todayISO } from "@/lib/format";
import { createOrder } from "@/services/orders";
import { equipmentAvailability } from "@/services/marketplace";
import type { Listing } from "@/types/api";

interface Props {
  listing: Listing | null;
  onClose: () => void;
  canOrder: boolean; // only farmers can book/buy
}

// Details for a search result plus the relevant action: book equipment, hire a worker, or buy seeds/fertilizer.
export const ListingDialog = ({ listing, onClose, canOrder }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [hours, setHours] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProduct = listing?.type === "seed" || listing?.type === "fertilizer";
  const isHourly = listing?.priceUnit === "hour";
  const datesValid = Boolean(start) && (isHourly || end >= start) && start >= todayISO();

  const availability = useQuery({
    queryKey: ["availability", listing?.id, start, isHourly ? start : end],
    queryFn: () => equipmentAvailability(listing!.id, start, isHourly ? start : end),
    enabled: Boolean(listing && listing.type === "equipment" && datesValid),
  });
  const conflict = availability.data?.requested && !availability.data.requested.available;

  const estimate = useMemo(
    () => (listing ? estimatePrice({ unitPrice: listing.price, unit: listing.priceUnit, type: listing.type, quantity, hours, start, end, discount: Number(listing.details.discount || 0) }) : null),
    [listing, quantity, hours, start, end]
  );
  const stock = Number(listing?.details.stock ?? Infinity);
  const qtyInvalid = isProduct && (!Number.isInteger(quantity) || quantity < 1 || quantity > stock);

  if (!listing) return null;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder(
        isProduct
          ? { type: listing.type, itemId: listing.id, quantity, notes }
          : { type: listing.type, itemId: listing.id, startDate: start, endDate: isHourly ? start : end, duration: isHourly ? hours : undefined, notes }
      );
      toast.success(order.status === "approved" ? t("app.booking.confirmed") : t("app.booking.requestSent"));
      onClose();
      navigate(`/dashboard/farmer/bookings/confirm?orderId=${order.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const actionLabel = isProduct ? t("app.booking.buyNow") : listing.type === "worker" ? t("app.booking.hire") : t("app.booking.rent");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t(`app.types.${listing.type}`)}</Badge>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location || t("app.common.locationUnknown")}</span>
            {formatDistance(listing.distanceKm) && <span className="font-medium text-primary">{formatDistance(listing.distanceKm)}</span>}
            {listing.rating > 0 && <span className="flex items-center gap-0.5 text-amber-600"><Star className="h-3 w-3 fill-current" />{listing.rating.toFixed(1)}</span>}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{listing.description || listing.category}</p>
        {listing.details.skills && listing.details.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">{listing.details.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
        )}
        <div className="flex items-baseline justify-between rounded-lg bg-secondary p-3">
          <span className="text-sm text-muted-foreground">{t("app.booking.price")}</span>
          <span className="agro-price">{formatINR(listing.price)}<span className="agro-price-unit">/ {listing.priceUnit}</span></span>
        </div>

        {!canOrder ? (
          <p className="text-sm text-muted-foreground">{t("app.booking.farmersOnly")}</p>
        ) : !listing.available ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{t("app.booking.notAvailable")}</p>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            {isProduct ? (
              <div className="space-y-1.5">
                <Label htmlFor="qty">{t("app.booking.quantity")} ({t("app.booking.inStock", { n: stock })})</Label>
                <Input id="qty" type="number" min={1} max={stock} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-invalid={qtyInvalid} />
                {qtyInvalid && <p role="alert" className="text-xs text-destructive">{t("app.booking.quantityInvalid", { n: stock })}</p>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{t("app.booking.startDate")}</Label>
                    <Input id="start" type="date" min={todayISO()} value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
                  </div>
                  {isHourly ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="hours">{t("app.booking.hours")}</Label>
                      <Input id="hours" type="number" min={1} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="end">{t("app.booking.endDate")}</Label>
                      <Input id="end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                  )}
                </div>
                {!datesValid && <p role="alert" className="text-xs text-destructive">{t("app.booking.datesInvalid")}</p>}
                {listing.type === "equipment" && availability.isFetching && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{t("app.booking.checking")}</p>}
                {conflict && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{t("app.booking.conflict")}</p>}
                {availability.data && availability.data.bookedRanges.length > 0 && (
                  <p className="text-xs text-muted-foreground">{t("app.booking.bookedDates")}: {availability.data.bookedRanges.map((r) => `${formatDate(r.start)}–${formatDate(r.end)}`).join(", ")}</p>
                )}
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="notes">{t("app.booking.notes")}</Label>
              <Textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {estimate && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm text-muted-foreground">{t("app.booking.estimatedTotal")}</span>
                <span className="text-lg font-bold text-foreground">{formatINR(estimate.total, { decimals: true })}</span>
              </div>
            )}
            {error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting || (!isProduct && (!datesValid || Boolean(conflict))) || qtyInvalid}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionLabel}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("app.booking.finalPriceNote")}</p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
