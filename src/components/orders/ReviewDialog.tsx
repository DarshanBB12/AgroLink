import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { submitReview } from "@/services/orders";

export const ReviewDialog = ({ orderId, onClose, onDone }: { orderId: string | null; onClose: () => void; onDone: () => void }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  if (!orderId) return null;
  const send = async () => {
    setBusy(true);
    try {
      await submitReview(orderId, rating, comment);
      toast.success(t("app.reviews.thanks"));
      onDone();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("app.reviews.leave")}</DialogTitle></DialogHeader>
        <div className="flex gap-1" role="radiogroup" aria-label={t("app.reviews.rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} onClick={() => setRating(n)}>
              <Star className={`h-8 w-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <Textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("app.reviews.placeholder")} />
        <Button onClick={send} disabled={busy}>{t("app.reviews.submit")}</Button>
      </DialogContent>
    </Dialog>
  );
};
