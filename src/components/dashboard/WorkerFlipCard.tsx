import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  RotateCw,
  UserRoundCheck,
  Award,
  DollarSign,
  Star,
  Briefcase,
  CheckCircle2,
  Calendar,
  Phone,
} from "lucide-react";

type Worker = {
  id: number;
  name: string;
  emoji: string;
  role: string;
  dailyRate: number;
  hourlyRate: number;
  skillLevel: string;
  location: string;
  rating: number;
  experience: string;
  bio: string;
  certifications: string;
  availability: string;
  phone: string;
};

interface WorkerFlipCardProps {
  worker: Worker;
  onHire?: (worker: Worker) => void;
  onContact?: (worker: Worker) => void;
}

export const WorkerFlipCard = ({
  worker,
  onHire,
  onContact,
}: WorkerFlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 h-[320px]">
      <div
        className={`relative h-full w-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRONT SIDE - Light Blue */}
        <Card className="absolute inset-0 overflow-hidden border-sky-200/70 bg-gradient-to-br from-white via-sky-50 to-blue-50 shadow-sm backface-hidden">
          <CardContent className="relative h-full p-0">
            {/* Flip Button */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur hover:bg-background"
                aria-label={`Flip ${worker.name}`}
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <Badge className="bg-sky-600 text-white">Worker</Badge>
            </div>

            {/* Content */}
            <div className="flex h-full flex-col">
              {/* Avatar Section */}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-white text-7xl">
                {worker.emoji}
              </div>

              {/* Details Section */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="space-y-2">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {worker.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {worker.role}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-sky-700"
                    >
                      Available
                    </Badge>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border bg-background/80 p-2">
                      <p className="text-muted-foreground">Daily Rate</p>
                      <p className="font-semibold text-foreground">
                        ₹{worker.dailyRate.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-2">
                      <p className="text-muted-foreground">Skill</p>
                      <p className="font-semibold text-foreground">
                        {worker.skillLevel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tags & Button */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">
                      {worker.experience}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      {worker.location}
                    </span>
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground"
                    onClick={() => onHire?.(worker)}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Hire Worker
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BACK SIDE - Dark Blue */}
        <Card className="absolute inset-0 overflow-hidden border-sky-950/10 bg-sky-950 text-sky-50 backface-hidden rotate-y-180">
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
                    AgroLink Workers
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {worker.name}
                  </h3>
                </div>
                <Badge className="bg-white/10 text-sky-50">Flip card</Badge>
              </div>

              {/* 4-Box Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-sky-200">
                    <UserRoundCheck className="h-4 w-4" /> Skill Level
                  </p>
                  <p className="mt-1 text-sky-50/90">{worker.skillLevel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-sky-200">
                    <Award className="h-4 w-4" /> Experience
                  </p>
                  <p className="mt-1 text-sky-50/90">{worker.experience}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-sky-200">
                    <DollarSign className="h-4 w-4" /> Hourly Rate
                  </p>
                  <p className="mt-1 text-sky-50/90">₹{worker.hourlyRate}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 font-semibold text-sky-200">
                    <Star className="h-4 w-4" /> Rating
                  </p>
                  <p className="mt-1 text-sky-50/90">{worker.rating}/5.0</p>
                </div>
              </div>

              {/* Bio Box */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-50/85">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Briefcase className="h-4 w-4" /> About
                </p>
                <p className="mt-1 leading-relaxed">{worker.bio}</p>
              </div>

              {/* Certifications Box */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-50/85">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4" /> Certifications
                </p>
                <p className="mt-1 leading-relaxed">{worker.certifications}</p>
              </div>

              {/* Availability Box */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-sky-50/85">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Calendar className="h-4 w-4" /> Availability
                </p>
                <p className="mt-1 leading-relaxed">{worker.availability}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full bg-sky-500 text-sky-950 hover:bg-sky-400"
                onClick={() => onHire?.(worker)}
              >
                Hire this Worker
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => setIsFlipped(false)}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Back to front
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => onContact?.(worker)}
              >
                <Phone className="mr-2 h-4 w-4" />
                Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerFlipCard;
