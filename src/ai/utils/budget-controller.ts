import { BUDGET_LIMITS, THROTTLING_SETTINGS } from '../config/budget';
import { CostTracker } from './cost-tracker'; // Assuming CostTracker is available

export class BudgetController {
  private costTracker: CostTracker;
  private currentDailyCost: number = 0; // In-memory for demonstration
  private currentMonthlyCost: number = 0; // In-memory for demonstration

  constructor() {
    this.costTracker = new CostTracker();
    // In a real application, these costs would be loaded from a persistent store
    // and reset daily/monthly.
  }

  /**
   * Records a new cost and checks against budget limits.
   * @param cost The cost incurred for the latest LLM interaction.
   * @returns True if LLM usage is allowed, false if throttling is active.
   */
  recordCostAndCheckBudget(cost: number): boolean {
    this.currentDailyCost += cost;
    this.currentMonthlyCost += cost;

    this.checkAlerts();
    return this.checkThrottling();
  }

  private checkAlerts(): void {
    const dailyAlertThreshold = BUDGET_LIMITS.DAILY_LLM_COST_USD * BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT;
    const monthlyAlertThreshold = BUDGET_LIMITS.MONTHLY_LLM_COST_USD * BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT;

    if (this.currentDailyCost >= dailyAlertThreshold) {
      console.warn(`ALERT: Daily LLM cost has exceeded ${BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT * 100}% of budget! Current: ${this.currentDailyCost.toFixed(2)}`);
      // In a real app, send email/slack alert
    }
    if (this.currentMonthlyCost >= monthlyAlertThreshold) {
      console.warn(`ALERT: Monthly LLM cost has exceeded ${BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT * 100}% of budget! Current: ${this.currentMonthlyCost.toFixed(2)}`);
      // In a real app, send email/slack alert
    }
  }

  private checkThrottling(): boolean {
    if (!THROTTLING_SETTINGS.ENABLE_THROTTLING) {
      return true; // Throttling is disabled
    }

    const dailyThrottlingThreshold = BUDGET_LIMITS.DAILY_LLM_COST_USD * THROTTLING_SETTINGS.THROTTLING_THRESHOLD_PERCENT;
    const monthlyThrottlingThreshold = BUDGET_LIMITS.MONTHLY_LLM_COST_USD * THROTTLING_SETTINGS.THROTTLING_THRESHOLD_PERCENT;

    if (this.currentDailyCost >= dailyThrottlingThreshold || this.currentMonthlyCost >= monthlyThrottlingThreshold) {
      console.warn(`THROTTLING: LLM usage is being throttled due to budget limits. Current daily: $${this.currentDailyCost.toFixed(2)}, monthly: $${this.currentMonthlyCost.toFixed(2)}`);
      return false; // Disallow further LLM usage
    }
    return true; // Allow LLM usage
  }

  // Methods for reporting/resetting costs (for a real system)
  getDailyCost(): number {
    return this.currentDailyCost;
  }

  getMonthlyCost(): number {
    return this.currentMonthlyCost;
  }

  resetDailyCost(): void {
    this.currentDailyCost = 0;
  }

  resetMonthlyCost(): void {
    this.currentMonthlyCost = 0;
  }
}