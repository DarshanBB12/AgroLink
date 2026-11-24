const MONTHLY_WORKER_HIRE_LIMIT = {
  farmer_free: 3,
  farmer_pro: null,
  equipment_owner: null,
  enterprise: null,
};

const normalizePlanCode = (user) => {
  if (user?.planCode) return user.planCode;
  if (user?.role === "farmer") return "farmer_free";
  if (user?.role === "equipment_owner" || user?.role === "equipment") return "equipment_owner";
  if (user?.role === "admin") return "enterprise";
  return "farmer_free";
};

const canHireWorker = ({ user, usedThisMonth }) => {
  const planCode = normalizePlanCode(user);
  const limit = MONTHLY_WORKER_HIRE_LIMIT[planCode];

  if (limit === null || limit === undefined) {
    return {
      allowed: true,
      planCode,
      limit: null,
      used: usedThisMonth,
      reason: "Unlimited worker hires for this plan",
    };
  }

  if (usedThisMonth >= limit) {
    return {
      allowed: false,
      planCode,
      limit,
      used: usedThisMonth,
      reason: `Monthly worker hire limit reached (${usedThisMonth}/${limit})`,
    };
  }

  return {
    allowed: true,
    planCode,
    limit,
    used: usedThisMonth,
    reason: `Worker hire available (${usedThisMonth}/${limit} used this month)`,
  };
};

module.exports = {
  canHireWorker,
};
