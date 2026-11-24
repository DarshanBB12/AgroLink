import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, MapPin, Snowflake, Sun, Wind, Tractor, Wrench, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState, GridSkeleton, PageHeader, StatCard } from "@/components/common/StateViews";
import { LocationControl } from "@/components/common/LocationControl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildAlerts, describeCode, fetchWeather } from "@/lib/weatherService";

const ICONS = { sun: Sun, "cloud-sun": CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: Snowflake, storm: CloudLightning } as const;

const WeatherPage = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const role =
    user?.role === "equipment_owner"
      ? "owner"
      : user?.role === "worker"
      ? "worker"
      : user?.role === "admin"
      ? "admin"
      : "farmer";

  const coords = user?.coordinates;
  const query = useQuery({
    queryKey: ["weather", coords?.lat, coords?.lng],
    queryFn: ({ signal }) => fetchWeather(coords!.lat, coords!.lng, signal),
    enabled: Boolean(coords),
    staleTime: 10 * 60 * 1000,
  });

  const w = query.data;
  const Current = w ? ICONS[describeCode(w.current.code).icon] : Sun;
  const dayName = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(lang, { weekday: "short", day: "numeric" });

  // Specific advisories for Equipment Owners vs Farmers vs Workers
  const getMachineryAdvisory = (weather: NonNullable<typeof w>) => {
    const rainNext3 = weather.daily.slice(0, 3).some((d) => d.rainMm >= 5 || d.rainChance >= 60);
    const highWind = weather.current.windKmh >= 25;
    const extremeHeat = weather.current.temp >= 36;

    if (rainNext3) {
      return {
        severity: "warning",
        title: "Heavy Moisture & Soil Mud Alert",
        desc: "Significant rainfall expected in next 48-72h. Avoid deploying heavy harvesters or 4WD tractors on wet black cotton soil to prevent deep ruts and soil compaction. Store rotavators and sprayers under shelter to avoid rust.",
      };
    }
    if (highWind) {
      return {
        severity: "warning",
        title: "High Wind / Boom Spray Advisory",
        desc: "Wind speeds over 25 km/h. Tractor-mounted boom sprayers should be paused to avoid chemical drift. Great conditions for grain aerating and post-harvest drying.",
      };
    }
    if (extremeHeat) {
      return {
        severity: "info",
        title: "High Ambient Temperature Advisory",
        desc: "Temperatures above 36°C. Check tractor engine coolant and hydraulic fluid levels before extended plowing shifts. Recommend morning (6 AM - 11 AM) and evening fieldwork.",
      };
    }
    return {
      severity: "success",
      title: "Optimal Field Machinery Conditions",
      desc: "Clear skies and moderate wind. Perfect conditions for plowing, rotavator tilling, laser leveling, and harvester rental operations.",
    };
  };

  return (
    <DashboardLayout role={role}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader
          title={t("app.weather.title")}
          subtitle={user?.location ? `📍 ${user.location}` : t("app.weather.subtitle")}
        />
        <Button asChild variant="outline" className="gap-2 shrink-0">
          <Link to={`/dashboard/${role}/map`}>
            <MapPin className="h-4 w-4 text-emerald-600" />
            <span>Open GPS Farm Map</span>
          </Link>
        </Button>
      </div>

      {!coords ? (
        <div className="agro-card gap-3 p-5">
          <p className="font-semibold">{t("app.weather.needLocation")}</p>
          <p className="text-sm text-muted-foreground">{t("app.weather.needLocationHint")}</p>
          <LocationControl />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !w ? (
        <GridSkeleton count={4} />
      ) : (
        <div className="space-y-6">
          {/* Main Weather Card */}
          <div className="agro-card flex-row flex-wrap items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-6">
              <Current className="h-16 w-16 text-amber-500" />
              <div>
                <p className="text-5xl font-bold">{w.current.temp}°C</p>
                <p className="text-muted-foreground">
                  {t(`app.weather.code.${describeCode(w.current.code).key}`)} · {t("app.weather.feelsLike")} {w.current.feelsLike}°C
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {user?.location || `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Open-Meteo Satellite Feed
              </span>
              <p className="text-xs text-muted-foreground">Updated every 10 minutes</p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="agro-stat-grid">
            <StatCard label={t("app.weather.humidity")} value={`${w.current.humidity}%`} icon={<Droplets className="h-4 w-4" />} />
            <StatCard label={t("app.weather.wind")} value={`${w.current.windKmh} km/h`} icon={<Wind className="h-4 w-4" />} />
            <StatCard label={t("app.weather.rainNow")} value={`${w.current.precipitation} mm`} icon={<CloudRain className="h-4 w-4" />} />
          </div>

          {/* Role-Specific Machinery & Farming Advisory */}
          <section className="agro-card p-5 border-l-4 border-l-primary space-y-3">
            <div className="flex items-center gap-2">
              <Tractor className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-base">
                {role === "owner" ? "Equipment Owner & Machinery Advisory" : role === "worker" ? "Farm Labor & Field Advisory" : "Farm Operations & Machinery Advisory"}
              </h3>
            </div>
            {(() => {
              const adv = getMachineryAdvisory(w);
              return (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${adv.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"}`}>
                  {adv.severity === "warning" ? <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-foreground">{adv.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{adv.desc}</p>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Standard Weather Advisories */}
          <section>
            <h3 className="mb-3 font-semibold">{t("app.weather.advisories")}</h3>
            <div className="space-y-2">
              {buildAlerts(w).map((a) => (
                <div key={a.id} className={`agro-card flex-row items-start gap-3 p-3 ${a.severity === "critical" ? "border-destructive/50" : ""}`}>
                  {a.severity === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className={`mt-0.5 h-5 w-5 ${a.severity === "critical" ? "text-destructive" : "text-amber-500"}`} />
                  )}
                  <p className="text-sm">
                    {t(`app.weather.alert.${a.key}`)}
                    {a.value ? ` (${dayName(a.value)})` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 7-Day Forecast */}
          <section>
            <h3 className="mb-3 font-semibold">{t("app.weather.forecast")}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {w.daily.map((d) => {
                const Icon = ICONS[describeCode(d.code).icon];
                return (
                  <div key={d.date} className="agro-card items-center gap-1 p-3 text-center hover:border-primary/50 transition-colors">
                    <p className="text-xs font-medium text-muted-foreground">{dayName(d.date)}</p>
                    <Icon className="h-7 w-7 text-primary" />
                    <p className="text-sm font-semibold">
                      {d.max}° <span className="font-normal text-muted-foreground">{d.min}°</span>
                    </p>
                    <p className="text-xs text-sky-600 font-medium">
                      {d.rainChance}% {t("app.weather.rain")}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
          <p className="text-xs text-muted-foreground">{t("app.weather.source")}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default WeatherPage;
