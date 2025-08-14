import { LLM_SETTINGS } from '../config/llm-settings';
import { createLogger } from '../../utils/logger';
import { validateInput } from '../../utils/validation';
import { Logger } from 'winston';

// Define token costs per model (example values, replace with actual pricing)
const TOKEN_COSTS_PER_1K_TOKENS: { [key: string]: { input: number; output: number } } = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

export class CostTracker {
  private logger: Logger;

  constructor() {
    this.logger = createLogger('CostTracker');
  }

  /**
   * Calculates the cost of an LLM interaction based on tokens used and model.
   * @param model The name of the LLM model used.
   * @param inputTokens The number of input tokens.
   * @param outputTokens The number of output tokens.
   * @returns The calculated cost in USD.
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Input validation
    if (!validateInput.isValidModel(model)) {
      this.logger.warn('Unsupported model provided', { model });
    }
    
    if (inputTokens < 0 || outputTokens < 0) {
      throw new Error('Token counts must be non-negative');
    }

    const modelCosts = TOKEN_COSTS_PER_1K_TOKENS[model];

    if (!modelCosts) {
      this.logger.warn('Cost data not found for model, using default pricing', { 
        model,
        availableModels: Object.keys(TOKEN_COSTS_PER_1K_TOKENS)
      });
      // Use GPT-4 Turbo pricing as default
      const defaultCosts = TOKEN_COSTS_PER_1K_TOKENS['gpt-4-turbo-preview'];
      const inputCost = (inputTokens / 1000) * defaultCosts.input;
      const outputCost = (outputTokens / 1000) * defaultCosts.output;
      return parseFloat((inputCost + outputCost).toFixed(4));
    }

    const inputCost = (inputTokens / 1000) * modelCosts.input;
    const outputCost = (outputTokens / 1000) * modelCosts.output;
    const totalCost = parseFloat((inputCost + outputCost).toFixed(4));

    this.logger.debug('Cost calculated successfully', {
      model,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost
    });

    return totalCost;
  }

  /**
   * Logs cost data for monitoring and analysis.
   * @param model The LLM model used.
   * @param inputTokens Number of input tokens.
   * @param outputTokens Number of output tokens.
   * @param cost Calculated cost.
   * @param userId Optional user ID for per-user tracking.
   * @param requestId Optional request ID for tracing.
   */
  logCost(
    model: string, 
    inputTokens: number, 
    outputTokens: number, 
    cost: number, 
    userId?: string, 
    requestId?: string
  ): void {
    const logData = {
      model,
      inputTokens,
      outputTokens,
      cost: parseFloat(cost.toFixed(4)),
      userId,
      requestId,
      timestamp: new Date().toISOString()
    };

    // Log at info level for cost tracking
    this.logger.info('LLM cost logged', validateInput.sanitizeLogData(logData));

    // In production, this would also:
    // 1. Send to metrics system (DataDog, New Relic, etc.)
    // 2. Store in time-series database for analysis
    // 3. Trigger cost alerts if thresholds exceeded
  }

  /**
   * Gets historical cost data for analysis.
   * @param startDate Start date for the query.
   * @param endDate End date for the query.
   * @returns Promise with cost data array.
   */
  async getHistoricalCosts(startDate: Date, endDate: Date): Promise<any[]> {
    // This would typically query a time-series database
    // For now, return empty array as placeholder
    this.logger.info('Historical cost query requested', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    return [];
  }

  /**
   * Gets model pricing information.
   * @returns Current model pricing map.
   */
  getModelPricing(): typeof TOKEN_COSTS_PER_1K_TOKENS {
    return { ...TOKEN_COSTS_PER_1K_TOKENS };
  }

  /**
   * Updates pricing for a specific model.
   * @param model Model name.
   * @param inputPrice Input token price per 1K tokens.
   * @param outputPrice Output token price per 1K tokens.
   */
  updateModelPricing(model: string, inputPrice: number, outputPrice: number): void {
    if (inputPrice < 0 || outputPrice < 0) {
      throw new Error('Prices must be non-negative');
    }

    TOKEN_COSTS_PER_1K_TOKENS[model] = { input: inputPrice, output: outputPrice };
    
    this.logger.info('Model pricing updated', {
      model,
      inputPrice,
      outputPrice
    });
  }
}