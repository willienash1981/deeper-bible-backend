export const LLM_SETTINGS = {
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4',
  OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '6000', 10),
  OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
  // Add other LLM related settings here
};