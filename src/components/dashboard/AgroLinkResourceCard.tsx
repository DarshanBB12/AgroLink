
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, MessageCircle, ShoppingCart, Wind, Boxes, UserRoundCheck, Eye, ArrowLeft, Leaf, Droplets, Package, CalendarDays, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AgroLinkResource } from "@/data/agrolinkMarketplace";
import { useLanguage } from "@/contexts/LanguageContext";

interface AgroLinkResourceCardProps {
  resource: AgroLinkResource;
  onBookNow?: (resource: AgroLinkResource) => void;
  onChat?: (resource: AgroLinkResource) => void;
}

const AgroLinkResourceCard = ({ resource, onBookNow, onChat }: AgroLinkResourceCardProps) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const { t } = useLanguage();
  const isFertilizerCategory = resource.category === "Fertilizer" || resource.type === "Fertilizer";
  const isWorkerCategory = resource.type === "Worker";
  const isSeedStyleFlip = isFertilizerCategory || isWorkerCategory;

  const handleFlip = () => {
    setIsFlipped((previous) => !previous);
    setFlipCount((count) => count + 1);
  };

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow(resource);
      return;
    }

    if (isFertilizerCategory) {
      navigate("/dashboard/farmer/booking-confirmed", {
        state: {
          bookingId: `FK-${resource.id}`,
          type: "Fertilizer",
          name: resource.name,
          amount: resource.price,
          days: 1,
          category: resource.category,
          location: resource.location,
          saved: 0,
          image: resource.image,
          userName: "AgroLink User",
          paymentStatus: "Paid",
          orderStatus: "Confirmed",
        },
        replace: true,
      });
      return;
    }

    navigate("/dashboard/farmer/bookings", {
      state: {
        prefillResource: resource,
      },
    });
  };

  const handleChat = () => {
    if (onChat) {
      onChat(resource);
      return;
    }

    navigate("/dashboard/farmer/chat", {
      state: {
        chatIntent: {
          recipientName: resource.chatName || resource.ownerName || resource.name,
          recipientRole: resource.chatRole || `${resource.type} Contact`,
          resourceName: resource.name,
          resourceType: resource.type,
        },
      },
    });
  };

  return (
    <div className="perspective-1000 h-[420px]">
      <div
        className={`relative h-full w-full transition-transform duration-700 preserve-3d cursor-pointer ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        onClick={handleFlip}
      >
        <Card className="absolute inset-0 overflow-hidden rounded-3xl border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50 to-lime-50 backface-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="h-full p-0">
            <div className="relative h-full w-full">
              <div className="relative h-48 overflow-hidden">
                <img src={resource.image} alt={resource.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white shadow-md">{resource.realTimeStatus}</Badge>
                  {resource.category === "Fertilizer" && (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 shadow-md" aria-label="Fertilizer listing">
                      <Leaf className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <Badge className={`absolute right-3 top-3 shadow-md ${isFertilizerCategory ? "bg-green-100 text-green-700" : "bg-white/90 text-slate-900"}`}>
                  {resource.category || resource.type}
                </Badge>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span>{resource.rating.toFixed(1)}</span>
                </div>
                <div className="absolute bottom-3 right-3 rounded-full bg-white/25 p-2 text-white backdrop-blur">
                  <Eye className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{resource.name}</h3>
                      <p className="text-xs text-muted-foreground">{resource.description}</p>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${resource.available ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>
                      {resource.available ? "Available" : "Booked"}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {resource.location}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border bg-muted/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-[#526160]">Price / {resource.priceUnit}</p>
                    <p className="text-sm font-semibold text-[#1f2e2e]">₹{resource.price.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-[#526160]">Plan Context</p>
                    <p className="text-xs font-medium text-[#1f2e2e] line-clamp-2">{resource.planContext || "AgroLink verified listing"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full py-3 text-sm font-semibold bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBookNow();
                    }}
                    disabled={!resource.available}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isWorkerCategory ? t("resource.hireNow") : t("resource.bookNow")}
                  </Button>

                  <div className="flex items-center gap-2">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold"
                          size="sm"
                        >
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          {t("resource.call")}
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleChat();
                      }}
                      aria-label="Open chat"
                      className="flex-1 border-sky-400 text-sky-700 hover:bg-sky-50 font-semibold"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      {t("resource.message")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="absolute inset-0 overflow-hidden rounded-3xl border-emerald-950/10 bg-slate-950 text-slate-50 backface-hidden rotate-y-180 shadow-md">
          <CardContent className="h-full p-0">
            <div className="flex h-full flex-col justify-between p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-300/60">AgroLink Resource</p>
                    <h3 className="mt-1 text-lg font-semibold">{resource.name}</h3>
                  </div>
                  <Badge className="bg-white/10 text-slate-50">{isSeedStyleFlip ? t("resource.flipCard") : t("resource.smartCard")}</Badge>
                </div>

                <div className="grid gap-3">
                  {resource.type === "Equipment" && resource.category !== "Fertilizer" && (
                    <>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><UserRoundCheck className="h-4 w-4" /> {t("resource.verifyOwner")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.verifyOwner}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-cyan-300"><Boxes className="h-4 w-4" /> {t("resource.machineStats")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.machineStats?.power} • {resource.machineStats?.fuel} • {resource.machineStats?.capacity}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><Star className="h-4 w-4" /> {t("resource.ownerAnalytics")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.ownerAnalytics}</p>
                      </div>
                    </>
                  )}

                  {resource.type === "Equipment" && resource.category === "Fertilizer" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 font-semibold text-emerald-300"><Leaf className="h-4 w-4" /> {t("resource.powerType")}</p>
                        <p className="mt-1 text-[#f5f1e6]/85">{resource.machineStats?.power || "N/A"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 font-semibold text-cyan-300"><Droplets className="h-4 w-4" /> {t("resource.fuelMedium")}</p>
                        <p className="mt-1 text-[#f5f1e6]/85">{resource.machineStats?.fuel || "N/A"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 font-semibold text-amber-300"><Package className="h-4 w-4" /> {t("resource.capacity")}</p>
                        <p className="mt-1 text-[#f5f1e6]/85">{resource.machineStats?.capacity || "N/A"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 font-semibold text-lime-300"><CalendarDays className="h-4 w-4" /> {t("resource.year")}</p>
                        <p className="mt-1 text-[#f5f1e6]/85">{resource.machineStats?.year || "N/A"}</p>
                      </div>
                    </div>
                  )}

                  {resource.type === "Fertilizer" && (
                    <>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><UserRoundCheck className="h-4 w-4" /> {t("resource.composition")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.composition}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-cyan-300"><Boxes className="h-4 w-4" /> {t("resource.stockLevels")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.stockLevel}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><Wind className="h-4 w-4" /> {t("resource.smartNotifications")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.stockAlert}</p>
                      </div>
                    </>
                  )}

                  {resource.type === "Worker" && (
                    <>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><UserRoundCheck className="h-4 w-4" /> {t("resource.skillLevel")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.skillLevel}</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-cyan-300"><Boxes className="h-4 w-4" /> {t("resource.yearsExperience")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.yearsExperience} years</p>
                      </div>
                      <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><Star className="h-4 w-4" /> {t("resource.priorityBooking")}</p>
                        <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.priorityBooking}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-[#f5f1e6]/20 bg-[#f5f1e6]/5 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-sky-300"><Wind className="h-4 w-4" /> {t("resource.weatherAvailability")}</p>
                  <p className="mt-1 text-xs text-[#f5f1e6]/85">{resource.weatherAvailability}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full py-3 text-sm font-semibold bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBookNow();
                    }}
                    disabled={!resource.available}
                  >
                    {isWorkerCategory ? t("resource.hireNow") : t("resource.bookNow")}
                  </Button>
                  <div className="flex gap-2">
                    {resource.phone && (
                      <a href={`tel:${resource.phone}`} onClick={(e) => e.stopPropagation()} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full border-emerald-400 text-emerald-300 hover:bg-emerald-900/30"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          {t("resource.call")}
                        </Button>
                      </a>
                    )}
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleChat();
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t("resource.message")}
                  </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-[#f5f1e6]/30 bg-transparent text-[#f5f1e6] hover:bg-[#f5f1e6]/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsFlipped(false);
                    setFlipCount((count) => count + 1);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("resource.back")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgroLinkResourceCard;
