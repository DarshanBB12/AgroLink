import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Check, X, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Listing } from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: Listing[];
  onRemove: (listing: Listing) => void;
  onSelect: (listing: Listing) => void;
}

export const ListingComparisonDialog = ({
  open,
  onOpenChange,
  listings,
  onRemove,
  onSelect,
}: Props) => {
  if (listings.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Compare Listings ({listings.length}/3)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left w-36 font-semibold text-muted-foreground">Property</th>
                {listings.map((l) => (
                  <th key={l.id} className="p-3 text-left min-w-[200px]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm line-clamp-1">{l.name}</h4>
                        <Badge variant="outline" className="mt-1 capitalize text-xs">
                          {l.type} · {l.category}
                        </Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(l)}
                        title="Remove from comparison"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {/* Price Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Price Rate</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3">
                    <span className="text-base font-bold text-primary">{formatINR(l.price)}</span>
                    <span className="text-xs text-muted-foreground"> / {l.priceUnit}</span>
                    {Number(l.details?.discount || 0) > 0 && (
                      <Badge variant="destructive" className="ml-2 text-[10px]">
                        -{l.details.discount}%
                      </Badge>
                    )}
                  </td>
                ))}
              </tr>

              {/* Rating Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Rating</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3">
                    {l.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <Star className="h-4 w-4 fill-current" />
                        {l.rating.toFixed(1)} / 5.0
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No ratings yet</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Location Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Location</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {l.location || "Regional Hub"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Availability Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Availability</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3">
                    {l.available ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                        <Check className="h-4 w-4" /> Available Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-medium text-xs">
                        <X className="h-4 w-4" /> Currently Booked
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Provider Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Provider</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3 text-xs font-medium">
                    {l.owner?.name || "Verified AgroLink Member"}
                  </td>
                ))}
              </tr>

              {/* Key Specs Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Specifications</td>
                {listings.map((l) => {
                  const d = l.details;
                  return (
                    <td key={l.id} className="p-3 text-xs text-muted-foreground space-y-1">
                      {d.specs?.power && <div>Power: <strong className="text-foreground">{d.specs.power}</strong></div>}
                      {d.specs?.fuel && <div>Fuel: <strong className="text-foreground">{d.specs.fuel}</strong></div>}
                      {d.specs?.year && <div>Year: <strong className="text-foreground">{d.specs.year}</strong></div>}
                      {d.skills && <div>Skills: <strong className="text-foreground">{d.skills.join(", ")}</strong></div>}
                      {d.season && <div>Season: <strong className="text-foreground">{d.season}</strong></div>}
                      {d.npkRatio && <div>NPK: <strong className="text-foreground">{d.npkRatio}</strong></div>}
                      {!d.specs?.power && !d.skills && !d.season && !d.npkRatio && (
                        <span>Standard agricultural spec</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Action Row */}
              <tr>
                <td className="p-3 font-medium text-muted-foreground">Action</td>
                {listings.map((l) => (
                  <td key={l.id} className="p-3">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        onSelect(l);
                      }}
                    >
                      View & Book
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
