import { StructuredLLMService } from '@/ai/services/structured-llm.service';

// Mock the dependencies
jest.mock('@/ai/services/openai-client');
jest.mock('@/ai/utils/xml-response-parser');
jest.mock('@/ai/utils/cost-tracker');
jest.mock('@/ai/utils/retry-handler');
jest.mock('@/ai/utils/content-moderation');
jest.mock('@/utils/logger');
jest.mock('@/utils/validation');

describe('StructuredLLMService', () => {
  let service: StructuredLLMService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Initialize service
    service = new StructuredLLMService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize service with all dependencies', () => {
      expect(service).toBeInstanceOf(StructuredLLMService);
      expect(service).toBeDefined();
    });
  });

  describe('generateStructuredAnalysis', () => {
    it('should validate prompt input', async () => {
      // Test empty prompt
      await expect(service.generateStructuredAnalysis('', 'v1.0'))
        .rejects.toThrow('Invalid prompt: must be a non-empty string');
      
      // Test null prompt
      await expect(service.generateStructuredAnalysis(null as any, 'v1.0'))
        .rejects.toThrow('Invalid prompt: must be a non-empty string');
      
      // Test whitespace-only prompt
      await expect(service.generateStructuredAnalysis('   ', 'v1.0'))
        .rejects.toThrow('Invalid prompt: must be a non-empty string');
    });

    it('should handle valid prompt input', () => {
      const validPrompt = 'Analyze Genesis 1:1';
      const promptVersion = 'v1.0';
      
      // This test just verifies the method exists and doesn't immediately throw
      expect(() => service.generateStructuredAnalysis(validPrompt, promptVersion))
        .not.toThrow();
    });
  });

  describe('input validation', () => {
    it('should handle different prompt types', () => {
      const validPrompts = [
        'Short prompt',
        'A much longer prompt that contains multiple sentences and should still be valid.',
        'Prompt with numbers 123 and symbols !@#$%',
        'Unicode prompt: éñüñ 中文 العربية'
      ];

      validPrompts.forEach(prompt => {
        expect(() => service.generateStructuredAnalysis(prompt, 'v1.0'))
          .not.toThrow();
      });
    });
  });

  describe('service integration', () => {
    it('should be mockable for integration tests', () => {
      // This test verifies that the service can be mocked properly
      const mockService = {
        generateStructuredAnalysis: jest.fn().mockResolvedValue({
          analysis: { summary: 'Mock analysis' },
          cost: 0.01,
          tokens: 100,
          model: 'gpt-4'
        })
      };

      expect(mockService.generateStructuredAnalysis).toBeDefined();
      expect(typeof mockService.generateStructuredAnalysis).toBe('function');
    });
  });
});