import { useMemo, useState } from "react";
import "./FlipCard.css";

export type FlipCardProps = {
  variant: "equipment" | "worker" | "fertilizer";
  icon: string;
  badge: string;
  title: string;
  description: string;
  price: string;
  priceUnit: string;
  features: string[];
  availability: string;
  onOrder: () => void;
  onViewDetails: () => void;
};

type VariantMeta = {
  className: string;
  subtitle: string;
  orderLabel: string;
  viewLabel: string;
};

const variantMetaMap: Record<FlipCardProps["variant"], VariantMeta> = {
  equipment: {
    className: "flip-variant-equipment",
    subtitle: "Equipment Listing",
    orderLabel: "Order Now",
    viewLabel: "View Details",
  },
  worker: {
    className: "flip-variant-worker",
    subtitle: "Worker Profile",
    orderLabel: "Hire Now",
    viewLabel: "View Profile",
  },
  fertilizer: {
    className: "flip-variant-fertilizer",
    subtitle: "Fertilizer Listing",
    orderLabel: "Order Now",
    viewLabel: "View Details",
  },
};

const isImageSource = (value: string) => /^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(value);

const IconVisual = ({ icon, altText, className }: { icon: string; altText: string; className: string }) => {
  if (isImageSource(icon)) {
    return <img src={icon} alt={altText} className={className} loading="lazy" />;
  }

  return <span aria-hidden="true" className={className}>{icon}</span>;
};

const FlipCard = ({
  variant,
  icon,
  badge,
  title,
  description,
  price,
  priceUnit,
  features,
  availability,
  onOrder,
  onViewDetails,
}: FlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const variantMeta = variantMetaMap[variant];
  const visibleFeatures = useMemo(() => features.slice(0, 5), [features]);

  return (
    <div
      className={`flip-card ${variantMeta.className} ${isFlipped ? "flipped" : ""}`}
      onTouchStart={() => setIsFlipped((prev) => !prev)}
      aria-label={`Flip card for ${title}`}
      role="region"
      aria-live="polite"
    >
      <div className="flip-inner">
        <article className="flip-front">
          <div className="flip-card-shell">
            <div className="flip-card-banner">
              <span className="flip-card-badge">{badge}</span>
              <div className="flip-card-icon">
                <IconVisual icon={icon} altText={`${title} icon`} className="h-16 w-16 object-contain" />
              </div>
            </div>

            <div className="flip-card-front-content">
              <h3 className="flip-card-title">{title}</h3>
              <p className="flip-card-description">{description}</p>
              <p className="flip-card-hint">hover to see details -&gt;</p>

              <div className="flip-card-price-row">
                <span className="flip-card-price">{price}</span>
                <span className="flip-card-price-unit">{priceUnit}</span>
              </div>
            </div>
          </div>
        </article>

        <article className="flip-back">
          <div className="flip-card-shell">
            <div className="flip-card-back-content">
              <div className="flip-card-back-header">
                <div className="flip-card-mini-icon" aria-hidden="true">
                  <IconVisual icon={icon} altText={`${title} small icon`} className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h4 className="flip-card-back-title">{title}</h4>
                  <p className="flip-card-back-subtitle">{variantMeta.subtitle}</p>
                </div>
              </div>

              <hr className="flip-card-divider" />

              <div className="flip-card-feature-list">
                {visibleFeatures.map((feature) => (
                  <div key={feature} className="flip-card-feature-item">
                    <span className="flip-card-feature-dot" aria-hidden="true" />
                    <span className="flip-card-feature-text">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flip-card-info-row">
                <div>
                  <span className="flip-card-price">{price}</span>
                  <span className="flip-card-price-unit">{priceUnit}</span>
                </div>
                <span className="flip-card-availability">{availability}</span>
              </div>

              <div className="flip-card-button-row">
                <button
                  type="button"
                  className="flip-card-btn flip-card-btn-primary"
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={onOrder}
                >
                  {variantMeta.orderLabel}
                </button>
                <button
                  type="button"
                  className="flip-card-btn flip-card-btn-secondary"
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={onViewDetails}
                >
                  {variantMeta.viewLabel}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default FlipCard;
