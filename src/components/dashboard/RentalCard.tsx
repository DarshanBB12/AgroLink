import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";

export interface RentalCardItem {
  id: number;
  name: string;
  category: string;
  dailyRate: number;
  location: string;
  image: string;
  available: boolean;
  ownerName: string;
  ownerRating: number;
  feedbackCount: number;
  fine: number;
}

interface RentalCardProps {
  equipment: RentalCardItem;
  onRentNow: (equipment: RentalCardItem) => void;
}

const RentalCard = ({ equipment, onRentNow }: RentalCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="relative h-40 overflow-hidden">
          <img
            src={equipment.image}
            alt={equipment.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <Badge
            className={`absolute left-2 top-2 ${equipment.available ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}
          >
            {equipment.available ? "Available" : "Unavailable"}
          </Badge>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{equipment.name}</h3>
            <p className="text-xs text-muted-foreground">{equipment.category}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {equipment.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {equipment.ownerRating.toFixed(1)} ({equipment.feedbackCount})
            </span>
          </div>

          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            Owner: <span className="font-medium text-foreground">{equipment.ownerName}</span>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground">Rs {equipment.dailyRate}/day</p>
            <Button size="sm" disabled={!equipment.available} onClick={() => onRentNow(equipment)}>
              Rent Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RentalCard;
