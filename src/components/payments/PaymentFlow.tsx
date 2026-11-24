import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { paymentConfig, reportFailure, startEmiPayment, startOrderPayment, testConfirm, verifyPayment, type CheckoutPayload } from "@/services/payments";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

let scriptPromise: Promise<boolean> | null = null;
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  scriptPromise ??= new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
};

interface Props {
  kind: "order" | "emi";
  id: string;
  label?: string;
  size?: "sm" | "default";
  onDone?: () => void;
}

// Pays for an order or an EMI instalment. Real mode opens Razorpay Checkout and then asks OUR server to verify
// the signature; test mode shows an explicit "simulated payment" dialog. Nothing is ever marked paid client-side.
export const PayButton = ({ kind, id, label, size = "sm", onDone }: Props) => {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [testPayload, setTestPayload] = useState<CheckoutPayload | null>(null);

  const finish = () => onDone?.();

  const start = async () => {
    setBusy(true);
    try {
      const cfg = await paymentConfig();
      const payload = kind === "order" ? await startOrderPayment(id) : await startEmiPayment(id);

      if (cfg.mode === "test") {
        setTestPayload(payload);
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) {
        await reportFailure(payload.transaction.id, "Checkout could not be loaded");
        toast.error(t("app.payments.checkoutLoadFailed"));
        return;
      }
      const txnId = payload.transaction.id;
      const c = payload.checkout;
      let settled = false;
      const rz = new window.Razorpay({
        key: c.keyId,
        amount: c.amountPaise,
        currency: c.currency,
        name: c.name,
        description: c.description,
        order_id: c.razorpayOrderId,
        prefill: c.prefill,
        theme: { color: "#16803c" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          settled = true;
          try {
            await verifyPayment({ transactionId: txnId, ...response });
            toast.success(t("app.payments.success"));
          } catch (e) {
            toast.error(getErrorMessage(e));
          } finally {
            finish();
          }
        },
        modal: {
          ondismiss: async () => {
            if (settled) return;
            settled = true;
            try { await reportFailure(txnId, "Cancelled by user", true); } catch { /* the transaction stays 'created' and expires harmlessly */ }
            toast.info(t("app.payments.cancelled"));
            finish();
          },
        },
      });
      rz.on("payment.failed", async (r) => {
        if (settled) return;
        settled = true;
        try { await reportFailure(txnId, r.error?.description || "Payment failed"); } catch { /* ignore */ }
        toast.error(r.error?.description || t("app.payments.failed"));
        finish();
      });
      rz.open();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const simulate = async (outcome: "success" | "failure" | "cancel") => {
    if (!testPayload) return;
    setBusy(true);
    try {
      await testConfirm(testPayload.transaction.id, outcome);
      if (outcome === "success") toast.success(t("app.payments.testSuccess"));
      else toast.info(outcome === "cancel" ? t("app.payments.cancelled") : t("app.payments.failed"));
      setTestPayload(null);
      finish();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size={size} onClick={start} disabled={busy} className="agro-btn">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label || t("app.payments.payNow")}
      </Button>
      <Dialog open={Boolean(testPayload)} onOpenChange={(o) => !o && !busy && void simulate("cancel")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />{t("app.payments.testTitle")}</DialogTitle>
            <DialogDescription>{t("app.payments.testNotice")}</DialogDescription>
          </DialogHeader>
          {testPayload && (
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <p className="text-muted-foreground">{testPayload.transaction.description}</p>
              <p className="text-xl font-bold text-foreground">{formatINR(testPayload.transaction.amount, { decimals: true })}</p>
              <p className="text-xs text-muted-foreground">{testPayload.transaction.transactionRef}</p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => simulate("success")} disabled={busy}>{t("app.payments.simulateSuccess")}</Button>
            <Button variant="outline" onClick={() => simulate("failure")} disabled={busy}>{t("app.payments.simulateFailure")}</Button>
            <Button variant="ghost" onClick={() => simulate("cancel")} disabled={busy}>{t("app.payments.simulateCancel")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
