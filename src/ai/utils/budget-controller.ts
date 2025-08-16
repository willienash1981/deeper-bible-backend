import { BUDGET_LIMITS, THROTTLING_SETTINGS } from '../config/budget';
import { CostTracker } from './cost-tracker';
import Redis from 'ioredis';
import { createLogger } from '../../utils/logger';
import { validateInput } from '../../utils/validation';

export class BudgetController {
  private costTracker: CostTracker;
  private redis: Redis;
  private logger = createLogger('BudgetController');

  constructor() {
    this.costTracker = new CostTracker();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Handle Redis connection events
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error in BudgetController', { error: error.message });
    });
  }

  /**
   * Records a new cost and checks against budget limits.
   * @param cost The cost incurred for the latest LLM interaction.
   * @param userId Optional user ID for per-user tracking
   * @returns True if LLM usage is allowed, false if throttling is active.
   */
  async recordCostAndCheckBudget(cost: number, userId?: string): Promise<boolean> {
    // Input validation
    if (typeof cost !== 'number' || cost < 0) {
      throw new Error('Cost must be a non-negative number');
    }
    
    if (userId && !validateInput.isValidUserId(userId)) {
      throw new Error('Invalid user ID format');
    }

    try {
      // Get current date keys for Redis
      const today = new Date();
      const dailyKey = `budget:daily:${today.toISOString().split('T')[0]}`;
      const monthlyKey = `budget:monthly:${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const userDailyKey = userId ? `budget:user:${userId}:${today.toISOString().split('T')[0]}` : null;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Increment costs in Redis
      pipeline.incrbyfloat(dailyKey, cost);
      pipeline.incrbyfloat(monthlyKey, cost);
      pipeline.expire(dailyKey, 86400 * 2); // 2 days TTL
      pipeline.expire(monthlyKey, 86400 * 35); // 35 days TTL
      
      if (userDailyKey) {
        pipeline.incrbyfloat(userDailyKey, cost);
        pipeline.expire(userDailyKey, 86400 * 2);
      }

      const results = await pipeline.exec();
      if (!results) {
        throw new Error('Failed to update cost tracking in Redis');
      }

      // Get updated costs
      const currentDailyCost = parseFloat(results[0][1] as string);
      const currentMonthlyCost = parseFloat(results[1][1] as string);
      const userDailyCost = userDailyKey ? parseFloat(results[4][1] as string) : 0;

      // Check alerts and throttling
      await this.checkAlerts(currentDailyCost, currentMonthlyCost);
      const isAllowed = await this.checkThrottling(currentDailyCost, currentMonthlyCost, userDailyCost, userId);

      this.logger.info('Cost recorded and budget checked', {
        cost,
        userId,
        currentDailyCost,
        currentMonthlyCost,
        isAllowed
      });

      return isAllowed;
    } catch (error) {
      this.logger.error('Error recording cost and checking budget', {
        error: error instanceof Error ? error.message : String(error),
        cost,
        userId
      });
      // In case of Redis failure, allow the operation but log the issue
      return true;
    }
  }

  private async checkAlerts(currentDailyCost: number, currentMonthlyCost: number): Promise<void> {
    const dailyAlertThreshold = BUDGET_LIMITS.DAILY_LLM_COST_USD * BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT;
    const monthlyAlertThreshold = BUDGET_LIMITS.MONTHLY_LLM_COST_USD * BUDGET_LIMITS.ALERT_THRESHOLD_PERCENT;

    if (currentDailyCost >= dailyAlertThreshold) {
      this.logger.warn(`Daily LLM cost alert triggered`, {
        currentCost: currentDailyCost,
        threshold: dailyAlertThreshold,
        percentage: (currentDailyCost / BUDGET_LIMITS.DAILY_LLM_COST_USD * 100).toFixed(1)
      });
      await this.sendAlert('daily', currentDailyCost, BUDGET_LIMITS.DAILY_LLM_COST_USD);
    }
    
    if (currentMonthlyCost >= monthlyAlertThreshold) {
      this.logger.warn(`Monthly LLM cost alert triggered`, {
        currentCost: currentMonthlyCost,
        threshold: monthlyAlertThreshold,
        percentage: (currentMonthlyCost / BUDGET_LIMITS.MONTHLY_LLM_COST_USD * 100).toFixed(1)
      });
      await this.sendAlert('monthly', currentMonthlyCost, BUDGET_LIMITS.MONTHLY_LLM_COST_USD);
    }
  }

  private async checkThrottling(
    currentDailyCost: number, 
    currentMonthlyCost: number, 
    userDailyCost: number, 
    userId?: string
  ): Promise<boolean> {
    if (!THROTTLING_SETTINGS.ENABLE_THROTTLING) {
      return true;
    }

    const dailyThrottlingThreshold = BUDGET_LIMITS.DAILY_LLM_COST_USD * THROTTLING_SETTINGS.THROTTLING_THRESHOLD_PERCENT;
    const monthlyThrottlingThreshold = BUDGET_LIMITS.MONTHLY_LLM_COST_USD * THROTTLING_SETTINGS.THROTTLING_THRESHOLD_PERCENT;
    const userDailyLimit = parseFloat(process.env.USER_DAILY_LIMIT || '10');

    // Check global limits
    if (currentDailyCost >= dailyThrottlingThreshold || currentMonthlyCost >= monthlyThrottlingThreshold) {
      this.logger.warn('Global throttling activated due to budget limits', {
        currentDailyCost,
        currentMonthlyCost,
        dailyThreshold: dailyThrottlingThreshold,
        monthlyThreshold: monthlyThrottlingThreshold
      });
      return false;
    }

    // Check user-specific limits
    if (userId && userDailyCost >= userDailyLimit) {
      this.logger.warn('User throttling activated', {
        userId,
        userDailyCost,
        userDailyLimit
      });
      return false;
    }

    return true;
  }

  private async sendAlert(period: 'daily' | 'monthly', currentCost: number, budgetLimit: number): Promise<void> {
    // Implement alert sending logic (email, Slack, etc.)
    // For now, just log and store alert in Redis
    const alertKey = `alert:${period}:${new Date().toISOString().split('T')[0]}`;
    const alertData = {
      timestamp: new Date().toISOString(),
      period,
      currentCost,
      budgetLimit,
      percentage: (currentCost / budgetLimit * 100).toFixed(1)
    };

    try {
      await this.redis.setex(alertKey, 86400 * 7, JSON.stringify(alertData)); // 7 days TTL
      this.logger.info('Budget alert recorded', alertData);
    } catch (error) {
      this.logger.error('Failed to record budget alert', { 
        error: error instanceof Error ? error.message : String(error),
        alertData 
      });
    }
  }

  // Methods for reporting/resetting costs
  async getDailyCost(): Promise<number> {
    try {
      const today = new Date();
      const dailyKey = `budget:daily:${today.toISOString().split('T')[0]}`;
      const cost = await this.redis.get(dailyKey);
      return cost ? parseFloat(cost) : 0;
    } catch (error) {
      this.logger.error('Error getting daily cost', { error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  async getMonthlyCost(): Promise<number> {
    try {
      const today = new Date();
      const monthlyKey = `budget:monthly:${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const cost = await this.redis.get(monthlyKey);
      return cost ? parseFloat(cost) : 0;
    } catch (error) {
      this.logger.error('Error getting monthly cost', { error: error instanceof Error ? error.message : String(error) });
      return 0;
    }
  }

  async getUserDailyCost(userId: string): Promise<number> {
    try {
      if (!validateInput.isValidUserId(userId)) {
        throw new Error('Invalid user ID format');
      }

      const today = new Date();
      const userDailyKey = `budget:user:${userId}:${today.toISOString().split('T')[0]}`;
      const cost = await this.redis.get(userDailyKey);
      return cost ? parseFloat(cost) : 0;
    } catch (error) {
      this.logger.error('Error getting user daily cost', { 
        error: error instanceof Error ? error.message : String(error),
        userId 
      });
      return 0;
    }
  }

  async resetDailyCost(): Promise<void> {
    try {
      const today = new Date();
      const dailyKey = `budget:daily:${today.toISOString().split('T')[0]}`;
      await this.redis.del(dailyKey);
      this.logger.info('Daily cost reset');
    } catch (error) {
      this.logger.error('Error resetting daily cost', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async resetMonthlyCost(): Promise<void> {
    try {
      const today = new Date();
      const monthlyKey = `budget:monthly:${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      await this.redis.del(monthlyKey);
      this.logger.info('Monthly cost reset');
    } catch (error) {
      this.logger.error('Error resetting monthly cost', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async getBudgetStatus(): Promise<{
    daily: { current: number; limit: number; percentage: number };
    monthly: { current: number; limit: number; percentage: number };
    throttlingEnabled: boolean;
  }> {
    const [dailyCost, monthlyCost] = await Promise.all([
      this.getDailyCost(),
      this.getMonthlyCost()
    ]);

    return {
      daily: {
        current: dailyCost,
        limit: BUDGET_LIMITS.DAILY_LLM_COST_USD,
        percentage: (dailyCost / BUDGET_LIMITS.DAILY_LLM_COST_USD) * 100
      },
      monthly: {
        current: monthlyCost,
        limit: BUDGET_LIMITS.MONTHLY_LLM_COST_USD,
        percentage: (monthlyCost / BUDGET_LIMITS.MONTHLY_LLM_COST_USD) * 100
      },
      throttlingEnabled: THROTTLING_SETTINGS.ENABLE_THROTTLING
    };
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Budget controller Redis connection closed');
    } catch (error) {
      this.logger.error('Error closing Redis connection', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}