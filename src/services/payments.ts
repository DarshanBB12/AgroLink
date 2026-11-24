import api from "@/lib/api";
import type { Txn } from "@/types/api";
import { getList, unwrap } from "./http";

export interface PaymentConfig {
  mode: "razorpay" | "test";
  keyId: string | null;
  currency: string;
  testModeNotice: string | null;
}
export interface CheckoutPayload {
  transaction: Txn;
  checkout: {
    mode: "razorpay" | "test";
    keyId: string | null;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    name: string;
    description: string;
    prefill: { name: string; email: string; contact: string };
  };
}

export const paymentConfig = () => unwrap<PaymentConfig>(api.get("/payments/config"));
export const startOrderPayment = (orderId: string) => unwrap<CheckoutPayload>(api.post(`/payments/orders/${orderId}/create`));
export const startEmiPayment = (loanId: string) => unwrap<CheckoutPayload>(api.post(`/payments/emi/${loanId}/create`));
export const verifyPayment = (body: { transactionId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
  unwrap<Txn>(api.post("/payments/verify", body));
export const testConfirm = (id: string, outcome: "success" | "failure" | "cancel") => unwrap<Txn>(api.post(`/payments/${id}/test-confirm`, { outcome }));
export const reportFailure = (id: string, reason: string, cancelled = false) => unwrap<Txn>(api.post(`/payments/${id}/fail`, { reason, cancelled }));
export const myPayments = (params: Record<string, unknown> = {}) => getList<Txn>("/payments/my", params);
export const receivedPayments = (params: Record<string, unknown> = {}) => getList<Txn>("/payments/received", params);
export type Bucket = { total: number; count: number };
export const adminPayments = (params: Record<string, unknown> = {}) => getList<Txn, Record<"completed" | "testMode" | "failed" | "pending" | "refunded", Bucket>>("/payments/admin/all", params);
export const getPayment = (id: string) => unwrap<Txn>(api.get(`/payments/${id}`));
export const refundPayment = (id: string, reason: string) => api.put(`/payments/admin/${id}/refund`, { reason });

export const downloadInvoice = async (txn: Pick<Txn, "id" | "receiptNo" | "transactionRef">) => {
  const res = await api.get(`/payments/${txn.id}/invoice`, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = `invoice-${txn.receiptNo || txn.transactionRef}.pdf`;
  a.click();
  URL.revokeObjectURL(href);
};
