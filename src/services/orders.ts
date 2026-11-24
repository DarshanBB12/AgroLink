import api from "@/lib/api";
import type { Order } from "@/types/api";
import { getList, unwrap } from "./http";

export interface CreateOrderInput {
  type: string;
  itemId: string;
  quantity?: number;
  duration?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export const createOrder = (input: CreateOrderInput) => unwrap<Order>(api.post("/orders", input));
export const getOrder = (id: string) => unwrap<Order>(api.get(`/orders/${id}`));
export const myOrders = (params: Record<string, unknown> = {}) => getList<Order>("/orders/my", { limit: 50, ...params });
export const providerOrders = (params: Record<string, unknown> = {}) => getList<Order>("/orders/provider", { limit: 50, ...params });
export const allOrders = (params: Record<string, unknown> = {}) => getList<Order>("/orders", params);
export const setOrderStatus = (id: string, status: string, reason?: string) => unwrap<Order>(api.put(`/orders/${id}/status`, { status, reason }));

export interface Earnings {
  gross: number;
  platformFeePercent: number;
  platformFee: number;
  net: number;
  testModeAmount: number;
  pendingAmount: number;
  pendingCount: number;
  paidCount: number;
  completedJobs: number;
  activeJobs: number;
  monthly: { month: string; amount: number }[];
  recent: { id: string; itemName: string; type: string; amount: number; paidAt: string; farmer: string }[];
}
export const earnings = () => unwrap<Earnings>(api.get("/orders/earnings"));

export const submitReview = (orderId: string, rating: number, comment: string) => api.post("/reviews", { orderId, rating, comment });
export const receivedReviews = async () => {
  const res = await api.get("/reviews/received");
  return res.data as { data: { id: string; rating: number; comment: string; reviewer: string; createdAt: string }[]; summary: { average: number; count: number } };
};

export const downloadCsv = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
};
