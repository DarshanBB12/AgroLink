import { Compass, MapPin, Sparkles, Tractor, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader, StatCard } from "@/components/common/StateViews";
import { GpsMap } from "@/components/map/GpsMap";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const GpsMapPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const role =
    user?.role === "equipment_owner"
      ? "owner"
      : user?.role === "worker"
      ? "worker"
      : user?.role === "admin"
      ? "admin"
      : "farmer";

  return (
    <DashboardLayout role={role}>
      <PageHeader
        title="GPS Farm & Machinery Map"
        subtitle={
          user?.location
            ? `📍 Your Saved Location: ${user.location}`
            : "Locate equipment rentals, skilled workers, and farm supplies near you in real-time."
        }
      />

      <div className="space-y-6">
        {/* Quick GPS Stats */}
        <div className="agro-stat-grid">
          <StatCard
            label="Location Mode"
            value={user?.locationSource === "gps" ? "GPS Active" : "City Fallback"}
            icon={<MapPin className="h-4 w-4 text-emerald-500" />}
            hint={user?.coordinates ? `${user.coordinates.lat.toFixed(2)}, ${user.coordinates.lng.toFixed(2)}` : "Click 'My GPS' to detect"}
          />
          <StatCard
            label="Machinery Hubs"
            value="Pune, Nashik, Kolhapur"
            icon={<Tractor className="h-4 w-4 text-amber-500" />}
            hint="Covering West & South zones"
          />
          <StatCard
            label="Active Coverage"
            value="100% Verified"
            icon={<Compass className="h-4 w-4 text-blue-500" />}
            hint="Geocoded marketplace listings"
          />
        </div>

        {/* Live Interactive Leaflet Map */}
        <GpsMap height="600px" showSidebar={true} />
      </div>
    </DashboardLayout>
  );
};

export default GpsMapPage;
