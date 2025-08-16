export const LLM_SETTINGS = {
  // Primary models for different use cases
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  OPENAI_RESEARCH_MODEL: process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o',
  OPENAI_REASONING_MODEL: process.env.OPENAI_REASONING_MODEL || 'o1-mini',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  
  // Token limits
  OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
  OPENAI_MAX_RESEARCH_TOKENS: parseInt(process.env.OPENAI_MAX_RESEARCH_TOKENS || '8000', 10),
  
  // Temperature settings
  OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
  OPENAI_RESEARCH_TEMPERATURE: parseFloat(process.env.OPENAI_RESEARCH_TEMPERATURE || '0.1'),
  
  // Advanced parameters
  OPENAI_TOP_P: parseFloat(process.env.OPENAI_TOP_P || '1.0'),
  OPENAI_FREQUENCY_PENALTY: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY || '0.0'),
  OPENAI_PRESENCE_PENALTY: parseFloat(process.env.OPENAI_PRESENCE_PENALTY || '0.0'),
  
  // API configuration
  OPENAI_TIMEOUT: parseInt(process.env.OPENAI_TIMEOUT || '60000', 10), // 60 seconds
  OPENAI_MAX_RETRIES: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
  
  // Feature flags
  ENABLE_STREAMING: process.env.ENABLE_OPENAI_STREAMING === 'true',
  ENABLE_FUNCTION_CALLING: process.env.ENABLE_FUNCTION_CALLING === 'true',
  ENABLE_VISION: process.env.ENABLE_VISION === 'true',
  
  // Model configurations
  MODELS: {
    'gpt-4o': {
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsTools: true,
      costPer1kInputTokens: 0.0025,
      costPer1kOutputTokens: 0.01
    },
    'gpt-4o-mini': {
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsTools: true,
      costPer1kInputTokens: 0.00015,
      costPer1kOutputTokens: 0.0006
    },
    'o1-mini': {
      contextWindow: 128000,
      maxOutputTokens: 65536,
      supportsVision: false,
      supportsTools: false,
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.012,
      isReasoningModel: true
    },
    'gpt-4': {
      contextWindow: 8192,
      maxOutputTokens: 4096,
      supportsVision: false,
      supportsTools: true,
      costPer1kInputTokens: 0.03,
      costPer1kOutputTokens: 0.06
    }
  },
  
  // Embedding models
  EMBEDDING_MODELS: {
    'text-embedding-3-large': {
      dimensions: 3072,
      maxInputTokens: 8191,
      costPer1kTokens: 0.00013
    },
    'text-embedding-3-small': {
      dimensions: 1536,
      maxInputTokens: 8191,
      costPer1kTokens: 0.00002
    },
    'text-embedding-ada-002': {
      dimensions: 1536,
      maxInputTokens: 8191,
      costPer1kTokens: 0.0001
    }
  }
};

// Helper function to get model configuration
export function getModelConfig(modelName: string) {
  return LLM_SETTINGS.MODELS[modelName as keyof typeof LLM_SETTINGS.MODELS] || null;
}

// Helper function to get embedding model configuration
export function getEmbeddingModelConfig(modelName: string) {
  return LLM_SETTINGS.EMBEDDING_MODELS[modelName as keyof typeof LLM_SETTINGS.EMBEDDING_MODELS] || null;
}