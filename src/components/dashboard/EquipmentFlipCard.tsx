import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  RotateCw,
  Zap,
  Boxes,
  Fuel,
  Clock,
  UserRoundCheck,
  CheckCircle2,
  ShieldAlert,
  ShoppingCart,
} from "lucide-react";

type Equipment = {
  id: number;
  name: string;
  emoji: string;
  model: string;
  ownerName: string;
  dailyRate: number;
  priceUnit: string;
  condition: string;
  type: string;
  availability: string;
  power: string;
  capacity: string;
  fuelType: string;
  hoursUsed: number;
  ownerDetails: string;
  maintenance: string;
  warranty: string;
};

interface EquipmentFlipCardProps {
  equipment: Equipment;
  onBook?: (equipment: Equipment) => void;
}

export const EquipmentFlipCard = ({
  equipment,
  onBook,
}: EquipmentFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 h-[320px]">
      <div
        className={`relative h-full w-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRONT SIDE - Light Red/Rose */}
        <Card className="absolute inset-0 overflow-hidden border-red-200/70 bg-gradient-to-br from-white via-red-50 to-rose-50 shadow-sm backface-hidden">
          <CardContent className="relative h-full p-0">
            {/* Flip Button */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur hover:bg-background"
                aria-label={`Flip ${equipment.name}`}
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <Badge className="bg-red-600 text-white">Equipment</Badge>
            </div>

            {/* Content */}
            <div className="flex h-full flex-col">
              {/* Equipment Emoji Section */}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-red-100 via-rose-50 to-white text-7xl">
                {equipment.emoji}
              </div>

              {/* Details Section */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="space-y-2">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {equipment.model}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {equipment.ownerName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700"
                    >
                      {equipment.condition}
                    </Badge>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border bg-background/80 p-2">
                      <p className="text-muted-foreground">Daily Rate</p>
                      <p className="font-semibold text-foreground">
                        ₹{equipment.dailyRate.toLocaleString()} / {equipment.priceUnit}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-2">
                      <p className="text-muted-foreground">Availability</p>
                      <p className="font-semibold text-foreground">
                        {equipment.availability}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tags & Button */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">
                      {equipment.type}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      {equipment.hoursUsed}h used
                    </span>
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground"
                    onClick={() => onBook?.(equipment)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Book Equipment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BACK SIDE - Dark Red */}
        <Card className="absolute inset-0 overflow-hidden border-red-950/10 bg-red-950 text-red-50 backface-hidden rotate-y-180">
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-200/70">
                    AgroLink Equipment
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {equipment.model}
                  </h3>
                </div>
                <Badge className="bg-white/10 text-red-50">Flip card</Badge>
              </div>

              {/* 4-Box Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-red-200">
                    <Zap className="h-4 w-4" /> Power
                  </p>
                  <p className="mt-1 text-red-50/90">{equipment.power}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-red-200">
                    <Boxes className="h-4 w-4" /> Capacity
                  </p>
                  <p className="mt-1 text-red-50/90">{equipment.capacity}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-red-200">
                    <Fuel className="h-4 w-4" /> Fuel Type
                  </p>
                  <p className="mt-1 text-red-50/90">{equipment.fuelType}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-red-200">
                    <Clock className="h-4 w-4" /> Hours Used
                  </p>
                  <p className="mt-1 text-red-50/90">{equipment.hoursUsed}h</p>
                </div>
              </div>

              {/* Owner Details Box */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-red-50/85">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <UserRoundCheck className="h-4 w-4" /> Owner Details
                </p>
                <p className="mt-1 leading-relaxed">{equipment.ownerDetails}</p>
              </div>

              {/* Maintenance Box */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-red-50/85">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4" /> Maintenance
                </p>
                <p className="mt-1 leading-relaxed">{equipment.maintenance}</p>
              </div>

              {/* Warranty Box */}
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-50">
                <p className="flex items-center gap-2 font-semibold text-red-200">
                  <ShieldAlert className="h-4 w-4" /> Warranty
                </p>
                <p className="mt-1 leading-relaxed">{equipment.warranty}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full bg-red-600 text-red-950 hover:bg-red-500"
                onClick={() => onBook?.(equipment)}
              >
                Book this Equipment
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => setIsFlipped(false)}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Back to front
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentFlipCard;
