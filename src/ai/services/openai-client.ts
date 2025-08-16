import OpenAI from 'openai';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OpenAIClient');

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  project?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  dangerouslyAllowBrowser?: boolean;
}

export interface ChatCompletionParams {
  model: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: "text" | "json_object" };
  seed?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  parallel_tool_calls?: boolean;
  user?: string;
}

export interface EmbeddingParams {
  model: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens?: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant' | 'system' | 'user';
      content: string | null;
      tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: OpenAIUsage;
  system_fingerprint?: string;
}

export interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Enhanced OpenAI client with improved error handling, monitoring, and research capabilities
 */
export class OpenAIService {
  private client: OpenAI;
  private readonly config: OpenAIConfig;

  constructor(config?: Partial<OpenAIConfig>) {
    // Validate API key
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required. Set it as an environment variable or pass it in the config.');
    }

    this.config = {
      apiKey,
      timeout: 60000, // 60 seconds
      maxRetries: 3,
      ...config
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organization,
      project: this.config.project,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      dangerouslyAllowBrowser: this.config.dangerouslyAllowBrowser,
    });

    logger.info('OpenAI client initialized', {
      hasApiKey: !!apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    });
  }

  /**
   * Create a chat completion with comprehensive error handling
   */
  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    try {
      logger.debug('Creating chat completion', {
        model: params.model,
        messageCount: params.messages.length,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        stream: params.stream
      });

      const response = await this.client.chat.completions.create(params);
      
      logger.info('Chat completion created successfully', {
        id: (response as any).id,
        model: (response as any).model,
        usage: (response as any).usage,
        finishReason: (response as any).choices?.[0]?.finish_reason
      });

      return response as ChatCompletionResponse;
    } catch (error) {
      logger.error('Chat completion failed', {
        error: error instanceof Error ? error.message : String(error),
        model: params.model,
        messageCount: params.messages.length
      });
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Create chat completion with streaming support
   */
  async createChatCompletionStream(params: ChatCompletionParams & { stream: true }) {
    try {
      logger.debug('Creating streaming chat completion', {
        model: params.model,
        messageCount: params.messages.length
      });

      const stream = await this.client.chat.completions.create({
        ...params,
        stream: true
      });

      logger.info('Streaming chat completion started', {
        model: params.model
      });

      return stream;
    } catch (error) {
      logger.error('Streaming chat completion failed', {
        error: error instanceof Error ? error.message : String(error),
        model: params.model
      });
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Create embeddings for text analysis and research
   */
  async createEmbeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    try {
      logger.debug('Creating embeddings', {
        model: params.model,
        inputType: typeof params.input,
        inputLength: Array.isArray(params.input) ? params.input.length : 1
      });

      const response = await this.client.embeddings.create(params);
      
      logger.info('Embeddings created successfully', {
        model: response.model,
        dataCount: response.data.length,
        usage: response.usage
      });

      return response as EmbeddingResponse;
    } catch (error) {
      logger.error('Embeddings creation failed', {
        error: error instanceof Error ? error.message : String(error),
        model: params.model
      });
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Moderate content using OpenAI's moderation API
   */
  async moderateContent(input: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }> {
    try {
      logger.debug('Moderating content', {
        inputLength: input.length
      });

      const response = await this.client.moderations.create({
        input,
        model: 'text-moderation-latest'
      });

      const result = response.results[0];
      
      logger.info('Content moderation completed', {
        flagged: result.flagged,
        categories: Object.keys(result.categories).filter(key => (result.categories as any)[key])
      });

      return {
        flagged: result.flagged,
        categories: result.categories as unknown as Record<string, boolean>,
        categoryScores: result.category_scores as unknown as Record<string, number>
      };
    } catch (error) {
      logger.error('Content moderation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Generate research analysis using latest models
   */
  async generateResearchAnalysis(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<{
    content: string;
    usage: OpenAIUsage;
    model: string;
    reasoning?: string;
  }> {
    const {
      model = 'gpt-4',
      temperature = 0.1,
      maxTokens = 4000,
      systemPrompt = 'You are a biblical research assistant. Provide thorough, accurate, and well-structured analysis based on scholarly sources and biblical texts.'
    } = options || {};

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];

      const response = await this.createChatCompletion({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "text" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from research analysis');
      }

      return {
        content,
        usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: response.model,
        reasoning: undefined // Could be expanded for reasoning models
      };
    } catch (error) {
      logger.error('Research analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        model,
        promptLength: prompt.length
      });
      throw error;
    }
  }

  /**
   * Handle OpenAI API errors with detailed information
   */
  private handleOpenAIError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      const { status, message, code, type } = error;
      
      logger.error('OpenAI API Error', {
        status,
        message,
        code,
        type,
        headers: error.headers
      });

      switch (status) {
        case 400:
          return new Error(`Bad Request: ${message}`);
        case 401:
          return new Error(`Authentication Error: Invalid API key or permissions`);
        case 403:
          return new Error(`Forbidden: ${message}`);
        case 404:
          return new Error(`Not Found: ${message}`);
        case 429:
          return new Error(`Rate Limit Exceeded: ${message}. Please try again later.`);
        case 500:
        case 502:
        case 503:
          return new Error(`OpenAI Server Error: ${message}. Please try again later.`);
        default:
          return new Error(`OpenAI API Error (${status}): ${message}`);
      }
    }

    if (error instanceof OpenAI.APIConnectionError) {
      logger.error('OpenAI Connection Error', {
        message: error.message,
        cause: (error as any).cause
      });
      return new Error(`Connection Error: Unable to connect to OpenAI API. ${error.message}`);
    }

    if (error instanceof OpenAI.RateLimitError) {
      logger.error('OpenAI Rate Limit Error', {
        message: error.message
      });
      return new Error(`Rate Limit Error: ${error.message}`);
    }

    if ((error as any).name === 'APITimeoutError' || (error as any).constructor?.name === 'APITimeoutError') {
      logger.error('OpenAI Timeout Error', {
        message: (error as Error).message
      });
      return new Error(`Timeout Error: ${(error as Error).message}`);
    }

    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected OpenAI Error', {
      error: errorMessage,
      type: typeof error
    });
    
    return new Error(`Unexpected Error: ${errorMessage}`);
  }

  /**
   * Get available models (for debugging/research purposes)
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      const modelIds = response.data.map(model => model.id);
      
      logger.info('Retrieved available models', {
        count: modelIds.length
      });
      
      return modelIds;
    } catch (error) {
      logger.error('Failed to retrieve models', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Get client instance for advanced usage
   */
  getClient(): OpenAI {
    return this.client;
  }
}

// Create default instance
const defaultOpenAIService = new OpenAIService();

// Export both the service class and default instance
export { defaultOpenAIService as openai };
export default defaultOpenAIService;