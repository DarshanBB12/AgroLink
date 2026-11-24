import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, Repeat2, X } from "lucide-react";

export type AgroLinkProductCategory = "Equipment" | "Fertilizer" | "Worker";

export interface AgroLinkProductCardProps {
  category: AgroLinkProductCategory;
  title: string;
  imageUrl: string;
  imageAlt?: string;
  weatherAwareLocation: string;
  availability: "Available" | "Booked";
  technicalSpecs: string[];
  ownerAnalytics: string;
  safetyCertifications: string[];
  ownerHistory: string;
  onBookNow?: () => void;
  onBackAction?: () => void;
  className?: string;
}

const AgroLinkProductCard = ({
  category,
  title,
  imageUrl,
  imageAlt,
  weatherAwareLocation,
  availability,
  technicalSpecs,
  ownerAnalytics,
  safetyCertifications,
  ownerHistory,
  onBookNow,
  onBackAction,
  className,
}: AgroLinkProductCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isBooked = availability === "Booked";

  const handleFlipToBack = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsFlipped(true);
  };

  const handleFlipToFront = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsFlipped(false);
  };

  return (
    <div className={cn("relative h-[440px] w-full [perspective:1200px]", className)}>
      <div
        className={cn(
          "relative h-full w-full rounded-2xl transition-transform duration-[800ms] [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
        )}
      >
        <article className="absolute inset-0 overflow-hidden rounded-2xl border border-white/45 bg-white/55 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.5)] backdrop-blur-xl [backface-visibility:hidden]">
          <button
            type="button"
            aria-label="Show product details"
            onClick={handleFlipToBack}
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-[#2f6c43] text-white shadow-[0_10px_24px_-10px_rgba(47,108,67,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#27583a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6c43] focus-visible:ring-offset-2"
          >
            <Repeat2 className="h-4 w-4" />
          </button>

          <div className="relative h-52">
            <img
              src={imageUrl}
              alt={imageAlt || title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <Badge className="absolute left-3 top-3 bg-slate-900/75 text-white">{category}</Badge>
            <Badge
              className={cn(
                "absolute bottom-3 right-3",
                isBooked ? "bg-red-600 text-white" : "bg-emerald-600 text-white",
              )}
            >
              {availability}
            </Badge>
          </div>

          <div className="flex h-[calc(100%-13rem)] flex-col justify-between gap-4 p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <div className="inline-flex items-center rounded-full border border-amber-300/80 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-900">
                <Info className="mr-1 h-3.5 w-3.5" />
                {weatherAwareLocation}
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-[#2f6c43] text-white hover:bg-[#27583a]"
              onClick={onBookNow}
            >
              Book Now
            </Button>
          </div>
        </article>

        <article className="absolute inset-0 overflow-hidden rounded-2xl border border-white/20 bg-[#10251a]/95 text-slate-100 shadow-[0_24px_50px_-30px_rgba(2,8,23,0.8)] backdrop-blur-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex h-full flex-col p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">AgroLink 360 Details</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
              </div>
              <button
                type="button"
                aria-label="Close product details"
                onClick={handleFlipToFront}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              <section className="rounded-xl border border-white/15 bg-white/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Technical Specs</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-100/90">
                  {technicalSpecs.map((item) => (
                    <div key={item} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-white/15 bg-white/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-300">Owner Analytics</h4>
                <p className="mt-2 text-xs text-slate-100/90">{ownerAnalytics}</p>
              </section>

              <section className="rounded-xl border border-white/15 bg-white/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-300">Safety Certifications</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-100/90">
                  {safetyCertifications.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="mt-3 inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Safety Verified
                </div>
              </section>

              <section className="rounded-xl border border-white/15 bg-white/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-300">Owner History</h4>
                <p className="mt-2 text-xs text-slate-100/90">{ownerHistory}</p>
              </section>
            </div>

            <Button
              type="button"
              onClick={onBackAction}
              className={cn(
                "mt-4 w-full",
                isBooked
                  ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                  : "bg-[#2f6c43] text-white hover:bg-[#27583a]",
              )}
            >
              {isBooked ? "Join Waitlist" : "Book Now"}
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
};

export default AgroLinkProductCard;
