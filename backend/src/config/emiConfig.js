// Central configuration for the EMI / loan financing feature.
// Kept out of the controller so the eligibility rule lives in one place.
module.exports = {
  // A farmer can only choose EMI for transactions at or above this amount.
  MIN_EMI_ELIGIBLE_AMOUNT: Number(process.env.MIN_EMI_ELIGIBLE_AMOUNT) || 5000,
  DEFAULT_INTEREST_RATE: Number(process.env.EMI_DEFAULT_INTEREST_RATE) || 8.5,
  MIN_TENURE_MONTHS: 3,
  MAX_TENURE_MONTHS: 36,
};
