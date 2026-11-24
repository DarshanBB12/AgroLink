import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { saveListing } from "@/services/marketplace";
import { CATEGORY_OPTIONS } from "./FilterBar";
import type { Listing } from "@/types/api";

type Kind = "equipment" | "seed" | "fertilizer";
type Form = Record<string, string | boolean>;

const UNITS: Record<Kind, string[]> = { equipment: ["day", "hour"], seed: ["kg", "packet", "bag"], fertilizer: ["kg", "bag"] };
const FERT_TYPES = ["organic", "chemical", "bio", "compost"];

const emptyForm = (kind: Kind, defaultUnit: string): Form => ({
  name: "", category: CATEGORY_OPTIONS[kind][0] || "", price: "", unit: kind === "equipment" ? defaultUnit : "kg", discount: "0", location: "", description: "",
  available: true, stock: "50", fine: "", power: "", fuel: "", capacity: "", year: "", crop: "", variety: "", season: "", germinationRate: "", maturityDays: "", fertType: "organic", npkRatio: "",
});

const fromListing = (kind: Kind, l: Listing): Form => ({
  ...emptyForm(kind, l.priceUnit), name: l.name, category: l.category, price: String(l.price), unit: l.priceUnit, discount: String(l.details.discount || 0), location: l.location, description: l.description,
  available: l.available, stock: String(l.details.stock ?? 50), fine: String(l.details.fine ?? ""), power: l.details.specs?.power || "", fuel: l.details.specs?.fuel || "", capacity: l.details.specs?.capacity || "",
  year: l.details.specs?.year ? String(l.details.specs.year) : "", crop: l.details.crop || "", variety: l.details.variety || "", season: l.details.season || "", germinationRate: l.details.germinationRate || "",
  maturityDays: l.details.maturityDays ? String(l.details.maturityDays) : "", fertType: l.details.fertilizerType || "organic", npkRatio: l.details.npkRatio || "",
});

const toPayload = (kind: Kind, f: Form) => {
  const base: Record<string, unknown> = { name: String(f.name).trim(), category: f.category, price: Number(f.price), unit: f.unit, discount: Number(f.discount || 0), location: String(f.location).trim(), description: String(f.description).trim(), available: f.available };
  if (kind === "equipment") return { ...base, pricing: { amount: Number(f.price), unit: f.unit }, fine: f.fine === "" ? undefined : Number(f.fine), specs: { power: f.power, fuel: f.fuel, capacity: f.capacity, year: f.year ? Number(f.year) : undefined } };
  if (kind === "seed") return { ...base, stock: Number(f.stock), crop: f.crop, variety: f.variety, season: f.season, germinationRate: f.germinationRate, maturityDays: f.maturityDays ? Number(f.maturityDays) : undefined };
  return { ...base, stock: Number(f.stock), type: f.fertType, npkRatio: f.npkRatio };
};

interface Props { kind: Kind; open: boolean; listing: Listing | null; onClose: () => void; onSaved: () => void }

// Create or edit one of the owner's own listings. All numbers are validated here AND again on the server.
export const ListingFormDialog = ({ kind, open, listing, onClose, onSaved }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState<Form>(emptyForm(kind, user?.settings.listingPreferences.defaultPricingUnit || "day"));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setForm(listing ? fromListing(kind, listing) : { ...emptyForm(kind, user?.settings.listingPreferences.defaultPricingUnit || "day"), location: user?.location || "" });
  }, [open, listing, kind, user]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const errors: Record<string, string> = {};
  if (String(form.name).trim().length < 2) errors.name = t("app.form.nameError");
  if (!(Number(form.price) >= 1)) errors.price = t("app.form.priceError");
  if (Number(form.discount) < 0 || Number(form.discount) > 100) errors.discount = t("app.form.discountError");
  if (kind !== "equipment" && !(Number(form.stock) >= 0)) errors.stock = t("app.form.stockError");
  if (kind === "fertilizer" && !String(form.description).trim()) errors.description = t("app.form.descriptionError");

  const m = useMutation({
    mutationFn: () => saveListing(kind, toPayload(kind, form), listing?.id),
    onSuccess: () => { toast.success(listing ? t("app.form.updated") : t("app.form.created")); onSaved(); onClose(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const text = (k: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5"><Label htmlFor={`lf-${k}`}>{label}</Label><Input id={`lf-${k}`} value={String(form[k])} onChange={(e) => set(k, e.target.value)} aria-invalid={touched && Boolean(errors[k])} {...props} />{touched && errors[k] && <p className="text-xs text-destructive" role="alert">{errors[k]}</p>}</div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{listing ? t("app.form.editTitle") : t(`app.form.addTitle.${kind}`)}</DialogTitle><DialogDescription>{t("app.form.hint")}</DialogDescription></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!Object.keys(errors).length) m.mutate(); }} noValidate>
          {text("name", t("app.form.name"), { maxLength: 120 })}
          <div className="space-y-1.5"><Label htmlFor="lf-category">{t("app.form.category")}</Label>
            <Select value={String(form.category)} onValueChange={(v) => set("category", v)}><SelectTrigger id="lf-category"><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_OPTIONS[kind].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          {text("price", t("app.form.price"), { inputMode: "decimal" })}
          <div className="space-y-1.5"><Label htmlFor="lf-unit">{t("app.form.unit")}</Label>
            <Select value={String(form.unit)} onValueChange={(v) => set("unit", v)}><SelectTrigger id="lf-unit"><SelectValue /></SelectTrigger><SelectContent>{UNITS[kind].map((u) => <SelectItem key={u} value={u}>{t(`app.units.${u}`)}</SelectItem>)}</SelectContent></Select></div>
          {text("discount", t("app.form.discount"), { inputMode: "decimal" })}
          {text("location", t("app.form.location"), { maxLength: 150 })}
          {kind === "equipment" && <>{text("power", t("app.card.power"))}{text("fuel", t("app.card.fuel"))}{text("capacity", t("app.card.capacity"))}{text("year", t("app.card.year"), { inputMode: "numeric" })}{text("fine", t("app.form.fine"), { inputMode: "decimal" })}</>}
          {kind === "seed" && <>{text("stock", t("app.form.stock"), { inputMode: "numeric" })}{text("crop", t("app.card.crop"))}{text("variety", t("app.card.variety"))}{text("season", t("app.card.season"))}{text("germinationRate", t("app.card.germination"))}{text("maturityDays", t("app.card.maturity"), { inputMode: "numeric" })}</>}
          {kind === "fertilizer" && <>{text("stock", t("app.form.stock"), { inputMode: "numeric" })}{text("npkRatio", t("app.card.npk"))}
            <div className="space-y-1.5"><Label htmlFor="lf-ft">{t("app.card.type")}</Label><Select value={String(form.fertType)} onValueChange={(v) => set("fertType", v)}><SelectTrigger id="lf-ft"><SelectValue /></SelectTrigger><SelectContent>{FERT_TYPES.map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}</SelectContent></Select></div></>}
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="lf-desc">{t("app.form.description")}</Label><Textarea id="lf-desc" rows={3} maxLength={1000} value={String(form.description)} onChange={(e) => set("description", e.target.value)} />{touched && errors.description && <p className="text-xs text-destructive">{errors.description}</p>}</div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2"><div><p className="text-sm font-medium">{t("app.form.available")}</p><p className="text-xs text-muted-foreground">{t("app.form.availableHint")}</p></div><Switch checked={Boolean(form.available)} onCheckedChange={(v) => set("available", v)} aria-label={t("app.form.available")} /></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">{user?.coordinates ? t("app.form.geoNote") : t("app.form.noGeoNote")}</p>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t("app.common.cancel")}</Button><Button type="submit" disabled={m.isPending} className="gap-2">{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{t("app.common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
