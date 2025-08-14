export const BUDGET_LIMITS = {
  DAILY_LLM_COST_USD: parseFloat(process.env.DAILY_LLM_COST_USD || '100.00'),
  MONTHLY_LLM_COST_USD: parseFloat(process.env.MONTHLY_LLM_COST_USD || '1000.00'),
  // Thresholds for alerts (e.g., 80% of budget)
  ALERT_THRESHOLD_PERCENT: parseFloat(process.env.ALERT_THRESHOLD_PERCENT || '0.80'),
};

export const THROTTLING_SETTINGS = {
  ENABLE_THROTTLING: process.env.ENABLE_LLM_THROTTLING === 'true',
  THROTTLING_THRESHOLD_PERCENT: parseFloat(process.env.THROTTLING_THRESHOLD_PERCENT || '0.95'),
};
