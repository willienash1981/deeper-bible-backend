import { LLM_SETTINGS } from '../config/llm-settings';

// Define token costs per model (example values, replace with actual pricing)
const TOKEN_COSTS_PER_1K_TOKENS: { [key: string]: { input: number; output: number } } = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  // Add other models as needed
};

export class CostTracker {
  /**
   * Calculates the cost of an LLM interaction based on tokens used and model.
   * @param model The name of the LLM model used.
   * @param inputTokens The number of input tokens.
   * @param outputTokens The number of output tokens.
   * @returns The calculated cost in USD.
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelCosts = TOKEN_COSTS_PER_1K_TOKENS[model];

    if (!modelCosts) {
      console.warn(`Cost data not found for model: ${model}. Returning 0 cost.`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelCosts.input;
    const outputCost = (outputTokens / 1000) * modelCosts.output;

    return inputCost + outputCost;
  }

  /**
   * Placeholder for logging or storing cost data.
   * In a real application, this would persist to a database or a monitoring system.
   * @param model The LLM model used.
   * @param inputTokens Number of input tokens.
   * @param outputTokens Number of output tokens.
   * @param cost Calculated cost.
   */
  logCost(model: string, inputTokens: number, outputTokens: number, cost: number): void {
    console.log(`LLM Cost: Model=${model}, InputTokens=${inputTokens}, OutputTokens=${outputTokens}, Cost=$${cost.toFixed(4)}`);
    // Here you would typically send this data to a metrics system or a database
  }
}