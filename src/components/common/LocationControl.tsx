import { useState } from "react";
import { Crosshair, Loader2, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation, type GeoStatus } from "@/hooks/useGeolocation";
import { getErrorMessage } from "@/lib/api";
import { CITIES } from "@/lib/cities";
import { clearLocationApi, saveLocationApi } from "@/services/profile";

const ERROR_KEYS: Partial<Record<GeoStatus, string>> = {
  denied: "app.location.denied",
  unavailable: "app.location.unavailable",
  timeout: "app.location.timeout",
  unsupported: "app.location.unsupported",
  error: "app.location.error",
};

// Detect (with explicit consent), enter manually, update or remove the signed-in user's saved location.
export const LocationControl = ({ compact = false, onSaved }: { compact?: boolean; onSaved?: () => void }) => {
  const { user, setUserFromServer } = useAuth();
  const { t } = useLanguage();
  const { status, locate, reset } = useGeolocation();
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState("");

  const save = async (payload: Parameters<typeof saveLocationApi>[0], okMessage: string) => {
    setSaving(true);
    try {
      setUserFromServer(await saveLocationApi(payload));
      toast.success(okMessage);
      onSaved?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const detect = async () => {
    const pos = await locate();
    if (!pos) return; // error state is shown below with the manual fallback
    await save({ lat: Number(pos.lat.toFixed(5)), lng: Number(pos.lng.toFixed(5)), address: user?.location || undefined, source: "gps" }, t("app.location.saved"));
    reset();
  };

  const pickCity = (name: string) => {
    const city = CITIES.find((c) => c.name === name);
    if (city) void save({ lat: city.lat, lng: city.lng, address: city.name, source: "manual" }, t("app.location.saved"));
  };

  const saveText = async () => {
    const value = manual.trim();
    if (!value) return toast.error(t("app.location.enterAddress"));
    await save({ address: value }, t("app.location.saved"));
    setManual("");
  };

  const remove = async () => {
    setSaving(true);
    try {
      setUserFromServer(await clearLocationApi());
      toast.success(t("app.location.removed"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const errorKey = ERROR_KEYS[status];

  return (
    <div className={compact ? "space-y-3" : "agro-card space-y-4 p-4"}>
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("app.location.title")}</p>
          <p className="text-sm text-muted-foreground" data-testid="saved-location">
            {user?.location || t("app.location.notSet")}
            {user?.coordinates && (
              <span className="ml-1 text-xs">({user.locationSource === "gps" ? t("app.location.sourceGps") : t("app.location.sourceManual")})</span>
            )}
          </p>
        </div>
        {(user?.coordinates || user?.location) && (
          <Button variant="ghost" size="icon" onClick={remove} disabled={saving} aria-label={t("app.location.remove")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Button onClick={detect} disabled={saving || status === "locating"} className="w-full gap-2">
          {status === "locating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {status === "locating" ? t("app.location.locating") : t("app.location.detect")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("app.location.consent")}</p>
        {errorKey && (
          <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {t(errorKey)} {t("app.location.useManual")}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city-pick">{t("app.location.pickCity")}</Label>
          <Select onValueChange={pickCity} disabled={saving}>
            <SelectTrigger id="city-pick"><SelectValue placeholder={t("app.location.pickCityPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-loc">{t("app.location.typeAddress")}</Label>
          <div className="flex gap-2">
            <Input id="manual-loc" value={manual} maxLength={200} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void saveText()} placeholder={t("app.location.addressPlaceholder")} />
            <Button variant="outline" onClick={saveText} disabled={saving}>{t("app.common.save")}</Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("app.location.privacy")}</p>
    </div>
  );
};
