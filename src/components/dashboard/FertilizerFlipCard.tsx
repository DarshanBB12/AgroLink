import { useState } from "react";
import "./FertilizerFlipCard.css";
import {
  RotateCw,
  Beaker,
  Atom,
  Sprout,
  Map,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Package,
} from "lucide-react";

type Fertilizer = {
  id: number;
  name: string;
  emoji: string;
  npkRatio: string;
  price: number;
  unit: string;
  coverage: string;
  type: string;
  dosage: string;
  composition: string;
  applicationRate: string;
  benefits: string;
  certification: string;
  warning: string;
};

interface FertilizerFlipCardProps {
  fertilizer: Fertilizer;
  onOrder?: (fertilizer: Fertilizer) => void;
}

export const FertilizerFlipCard = ({
  fertilizer,
  onOrder,
}: FertilizerFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`fertilizer-flip-card ${isFlipped ? "flipped" : ""}`}
      onTouchStart={() => setIsFlipped((prev) => !prev)}
      aria-label={`Flip card for ${fertilizer.name}`}
      role="region"
      aria-live="polite"
    >
      <div className="fertilizer-flip-inner">
        {/* FRONT SIDE */}
        <article className="fertilizer-flip-front">
          <div className="fertilizer-flip-shell">
            {/* Banner Section */}
            <div className="fertilizer-flip-banner">
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="fertilizer-flip-button"
                aria-label={`Flip ${fertilizer.name}`}
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <span className="fertilizer-flip-badge">Fertilizer</span>
              <div className="fertilizer-flip-emoji">{fertilizer.emoji}</div>
            </div>

            {/* Front Content */}
            <div className="fertilizer-flip-front-content">
              <h3 className="fertilizer-flip-title">{fertilizer.name}</h3>
              <p className="fertilizer-flip-subtitle">{fertilizer.npkRatio} Ratio</p>
              <p className="fertilizer-flip-hint">hover to see details -&gt;</p>

              {/* Info Grid */}
              <div className="fertilizer-flip-info-grid">
                <div className="fertilizer-flip-info-item">
                  <p className="fertilizer-flip-info-label">Price</p>
                  <p className="fertilizer-flip-info-value">
                    ₹{fertilizer.price.toLocaleString()} / {fertilizer.unit}
                  </p>
                </div>
                <div className="fertilizer-flip-info-item">
                  <p className="fertilizer-flip-info-label">Coverage</p>
                  <p className="fertilizer-flip-info-value">{fertilizer.coverage}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="fertilizer-flip-tags">
                <span className="fertilizer-flip-tag">{fertilizer.type}</span>
                <span className="fertilizer-flip-tag">{fertilizer.dosage}</span>
              </div>

              <button
                type="button"
                className="fertilizer-flip-order-btn"
                onClick={() => onOrder?.(fertilizer)}
              >
                <Package className="mr-2 h-4 w-4" />
                Order Now
              </button>
            </div>
          </div>
        </article>

        {/* BACK SIDE */}
        <article className="fertilizer-flip-back">
          <div className="fertilizer-flip-shell">
            <div className="fertilizer-flip-back-content">
              {/* Header */}
              <div className="fertilizer-flip-back-header">
                <div>
                  <p className="fertilizer-flip-back-label">AgroLink Fertilizers</p>
                  <h4 className="fertilizer-flip-back-title">{fertilizer.name}</h4>
                </div>
              </div>

              <hr className="fertilizer-flip-divider" />

              {/* Details Grid */}
              <div className="fertilizer-flip-details-grid">
                <div className="fertilizer-flip-detail-item">
                  <p className="fertilizer-flip-detail-label">
                    <Beaker className="h-4 w-4" /> NPK Ratio
                  </p>
                  <p className="fertilizer-flip-detail-value">{fertilizer.npkRatio}</p>
                </div>
                <div className="fertilizer-flip-detail-item">
                  <p className="fertilizer-flip-detail-label">
                    <Atom className="h-4 w-4" /> Composition
                  </p>
                  <p className="fertilizer-flip-detail-value">{fertilizer.composition}</p>
                </div>
                <div className="fertilizer-flip-detail-item">
                  <p className="fertilizer-flip-detail-label">
                    <Sprout className="h-4 w-4" /> Application Rate
                  </p>
                  <p className="fertilizer-flip-detail-value">{fertilizer.applicationRate}</p>
                </div>
                <div className="fertilizer-flip-detail-item">
                  <p className="fertilizer-flip-detail-label">
                    <Map className="h-4 w-4" /> Coverage Area
                  </p>
                  <p className="fertilizer-flip-detail-value">{fertilizer.coverage}</p>
                </div>
              </div>

              {/* Benefits */}
              <div className="fertilizer-flip-info-box">
                <p className="fertilizer-flip-info-box-title">
                  <Sparkles className="h-4 w-4" /> Benefits
                </p>
                <p className="fertilizer-flip-info-box-text">{fertilizer.benefits}</p>
              </div>

              {/* Certification */}
              <div className="fertilizer-flip-info-box">
                <p className="fertilizer-flip-info-box-title">
                  <CheckCircle2 className="h-4 w-4" /> Certification
                </p>
                <p className="fertilizer-flip-info-box-text">{fertilizer.certification}</p>
              </div>

              {/* Warning */}
              <div className="fertilizer-flip-warning-box">
                <p className="fertilizer-flip-warning-title">
                  <ShieldAlert className="h-4 w-4" /> Warning
                </p>
                <p className="fertilizer-flip-warning-text">{fertilizer.warning}</p>
              </div>
            </div>
          </div>

          {/* Back Buttons */}
          <div className="fertilizer-flip-button-row">
            <button
              type="button"
              className="fertilizer-flip-btn fertilizer-flip-btn-primary"
              onTouchStart={(event) => event.stopPropagation()}
              onClick={() => onOrder?.(fertilizer)}
            >
              Order this Fertilizer
            </button>
            <button
              type="button"
              className="fertilizer-flip-btn fertilizer-flip-btn-secondary"
              onTouchStart={(event) => event.stopPropagation()}
              onClick={() => setIsFlipped(false)}
            >
              <RotateCw className="h-4 w-4" />
              Back
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};

export default FertilizerFlipCard;
