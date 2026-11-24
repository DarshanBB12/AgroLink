export type SubscriptionPlanCode =
  | "farmer_free"
  | "farmer_pro"
  | "equipment_owner"
  | "enterprise";

export type AppRole = "farmer" | "worker" | "equipment_owner" | "admin";

export interface UserPlan {
  id: string;
  role: AppRole;
  planCode: SubscriptionPlanCode;
}

export interface HireBookingRecord {
  type: "worker" | "equipment" | "fertilizer" | string;
  createdAt: string | Date;
  status?: string;
}

export interface WorkerHirePermission {
  allowed: boolean;
  reason: string;
  used: number;
  limit: number | null;
}

export const PLAN_WORKER_HIRE_LIMIT: Record<SubscriptionPlanCode, number | null> = {
  farmer_free: 3,
  farmer_pro: null,
  equipment_owner: null,
  enterprise: null,
};

export const getMonthRange = (referenceDate: Date = new Date()) => {
  const monthStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const monthEnd = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1)
  );
  return { monthStart, monthEnd };
};

export const countMonthlyWorkerHires = (
  history: HireBookingRecord[],
  referenceDate: Date = new Date()
) => {
  const { monthStart, monthEnd } = getMonthRange(referenceDate);
  return history.filter((item) => {
    const createdAt = new Date(item.createdAt);
    const normalizedType = String(item.type || "").toLowerCase();
    const normalizedStatus = String(item.status || "").toLowerCase();
    const isWorkerHire = normalizedType === "worker";
    const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === "rejected";
    const inMonth = createdAt >= monthStart && createdAt < monthEnd;

    return isWorkerHire && !isCancelled && inMonth;
  }).length;
};

export const canHireWorker = (
  user: UserPlan,
  monthlyBookings: HireBookingRecord[],
  referenceDate: Date = new Date()
): WorkerHirePermission => {
  const used = countMonthlyWorkerHires(monthlyBookings, referenceDate);
  const limit = PLAN_WORKER_HIRE_LIMIT[user.planCode];

  if (limit === null) {
    return {
      allowed: true,
      reason: "Unlimited worker hires for this plan",
      used,
      limit: null,
    };
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Monthly worker hire limit reached (${used}/${limit})`,
      used,
      limit,
    };
  }

  return {
    allowed: true,
    reason: `Worker hire available (${used}/${limit} used this month)`,
    used,
    limit,
  };
};
