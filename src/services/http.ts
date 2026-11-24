import api from "@/lib/api";
import type { Pagination } from "@/types/api";

export interface ListResult<T, S = Record<string, number>> {
  data: T[];
  pagination: Pagination;
  counts?: Record<string, number>;
  summary?: S;
}

// Remove empty values so they are not sent as "?q=&category=".
export const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"));

export const getList = async <T, S = Record<string, number>>(url: string, params: Record<string, unknown> = {}): Promise<ListResult<T, S>> => {
  const res = await api.get(url, { params: clean(params) });
  return { data: res.data.data ?? [], pagination: res.data.pagination, counts: res.data.counts, summary: res.data.summary };
};

export const unwrap = async <T,>(p: Promise<{ data: { data: T } }>): Promise<T> => (await p).data.data;
