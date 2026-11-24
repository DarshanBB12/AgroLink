import { useEffect, useState } from "react";
import { ArrowRight, Eye, RotateCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlipCardCategory = "Equipment" | "Worker" | "Fertilizer";

export interface PremiumFlipCardProps {
  imageUrl: string;
  imageAlt?: string;
  title: FlipCardCategory | string;
  shortDescription: string;
  fullDescription: string;
  pricePreview: string;
  pricingBreakdown: string[];
  features: string[];
  availability: string;
  onOrderNow?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

const PremiumFlipCard = ({
  imageUrl,
  imageAlt,
  title,
  shortDescription,
  fullDescription,
  pricePreview,
  pricingBreakdown,
  features,
  availability,
  onOrderNow,
  onViewDetails,
  className,
}: PremiumFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");

    const updatePointerMode = () => {
      setIsTouchDevice(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsFlipped(false);
      }
    };

    updatePointerMode();

    const onChange = () => updatePointerMode();
    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  const handleCardClick = () => {
    if (isTouchDevice) {
      setIsFlipped((prev) => !prev);
    }
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsFlipped(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsFlipped(false);
    }
  };

  return (
    <div className={cn("w-full max-w-[360px] sm:max-w-[380px]", className)}>
      <div
        className="group relative h-[470px] w-full [perspective:1200px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        <div
          className={cn(
            "relative h-full w-full rounded-2xl transition-transform duration-[800ms] ease-in-out [transform-style:preserve-3d]",
            "group-hover:shadow-[0_30px_60px_-30px_rgba(15,23,42,0.7)]",
            isFlipped
              ? "[transform:rotateY(180deg)_scale(1.015)]"
              : "[transform:rotateY(0deg)_scale(1)]",
          )}
        >
          <article className="absolute inset-0 overflow-hidden rounded-2xl border border-white/55 bg-white/40 shadow-[0_18px_50px_-34px_rgba(2,8,23,0.85)] backdrop-blur-xl [backface-visibility:hidden]">
            <div className="absolute right-3 top-3 z-20 rounded-full border border-white/60 bg-emerald-600/90 p-2 text-white shadow-lg transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
              <RotateCw className="h-4 w-4" />
            </div>

            <div className="relative h-48 overflow-hidden">
              <img
                src={imageUrl}
                alt={imageAlt || title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
            </div>

            <div className="flex h-[calc(100%-12rem)] flex-col p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold leading-tight text-slate-900">{title}</h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {availability}
                </span>
              </div>

              <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{shortDescription}</p>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Price Preview</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{pricePreview}</p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Premium 180° Flip
                </span>
                <span className="text-slate-500">Hover Desktop • Tap Mobile</span>
              </div>
            </div>
          </article>

          <article className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/90 p-5 text-slate-100 shadow-[0_20px_56px_-30px_rgba(15,23,42,0.95)] backdrop-blur-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold leading-snug text-white">{title} Details</h3>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200">
                180° View
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-200">{fullDescription}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {features.slice(0, 4).map((feature) => (
                <div key={feature} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-100">
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Pricing Breakdown</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {pricingBreakdown.map((item) => (
                  <li key={item} className="leading-relaxed">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs">
              <span className="font-medium text-emerald-100">Safety Verified</span>
              <span className="text-emerald-200">Checked and Approved</span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOrderNow?.();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Order Now
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewDetails?.();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                View Details
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default PremiumFlipCard;
