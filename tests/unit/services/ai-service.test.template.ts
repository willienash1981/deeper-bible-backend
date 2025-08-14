import { StructuredLLMService } from '@/ai/services/structured-llm.service';
import { OpenAIClient } from '@/ai/services/openai-client';
import { PromptManagerService } from '@/ai/services/prompt-manager.service';
import { MockFactory } from '@test-utils/mock-factory';
import { TestHelpers } from '@test-utils/test-helpers';

describe('StructuredLLMService', () => {
  let service: StructuredLLMService;
  let mockOpenAIClient: jest.Mocked<OpenAIClient>;
  let mockPromptManager: jest.Mocked<PromptManagerService>;

  beforeEach(() => {
    // Create mocks
    mockOpenAIClient = {
      chat: jest.fn(),
      embed: jest.fn(),
      getModel: jest.fn(),
      calculateCost: jest.fn()
    } as any;

    mockPromptManager = {
      getPrompt: jest.fn(),
      formatPrompt: jest.fn(),
      validatePrompt: jest.fn()
    } as any;

    // Initialize service with mocks
    service = new StructuredLLMService(mockOpenAIClient, mockPromptManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAnalysis', () => {
    it('should generate analysis successfully', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      const expectedResponse = MockFactory.createOpenAIResponse({
        choices: [{
          message: {
            content: '<analysis>Theological insights</analysis>'
          }
        }]
      });

      mockPromptManager.getPrompt.mockResolvedValue('Test prompt');
      mockOpenAIClient.chat.mockResolvedValue(expectedResponse);

      // Act
      const result = await service.generateAnalysis(input);

      // Assert
      expect(mockPromptManager.getPrompt).toHaveBeenCalledWith('theological');
      expect(mockOpenAIClient.chat).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toContain('Theological insights');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      mockPromptManager.getPrompt.mockResolvedValue('Test prompt');
      mockOpenAIClient.chat.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(service.generateAnalysis(input)).rejects.toThrow('API Error');
      expect(mockOpenAIClient.chat).toHaveBeenCalled();
    });

    it('should validate input parameters', async () => {
      // Arrange
      const invalidInput = {
        book: '',
        chapter: -1,
        verses: '',
        type: 'invalid'
      };

      // Act & Assert
      await expect(service.generateAnalysis(invalidInput)).rejects.toThrow('Invalid input');
    });

    it('should use caching when available', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      const cachedResponse = 'Cached analysis';
      jest.spyOn(service as any, 'getFromCache').mockResolvedValue(cachedResponse);

      // Act
      const result = await service.generateAnalysis(input);

      // Assert
      expect(result).toBe(cachedResponse);
      expect(mockOpenAIClient.chat).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      mockPromptManager.getPrompt.mockResolvedValue('Test prompt');
      mockOpenAIClient.chat
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(MockFactory.createOpenAIResponse());

      // Act
      const result = await service.generateAnalysis(input);

      // Assert
      expect(mockOpenAIClient.chat).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });

  describe('parseResponse', () => {
    it('should parse XML response correctly', () => {
      // Arrange
      const xmlResponse = `
        <analysis>
          <summary>Test summary</summary>
          <themes>Theme1,Theme2</themes>
        </analysis>
      `;

      // Act
      const result = service.parseResponse(xmlResponse);

      // Assert
      expect(result).toHaveProperty('summary', 'Test summary');
      expect(result).toHaveProperty('themes');
      expect(result.themes).toContain('Theme1');
    });

    it('should handle malformed XML', () => {
      // Arrange
      const malformedXml = '<analysis>Unclosed tag';

      // Act & Assert
      expect(() => service.parseResponse(malformedXml)).toThrow();
    });
  });

  describe('cost tracking', () => {
    it('should track API costs accurately', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      const response = MockFactory.createOpenAIResponse({
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      });

      mockPromptManager.getPrompt.mockResolvedValue('Test prompt');
      mockOpenAIClient.chat.mockResolvedValue(response);
      mockOpenAIClient.calculateCost.mockReturnValue(0.015);

      // Act
      await service.generateAnalysis(input);
      const cost = service.getTotalCost();

      // Assert
      expect(mockOpenAIClient.calculateCost).toHaveBeenCalledWith(300, 'gpt-4');
      expect(cost).toBe(0.015);
    });
  });

  describe('performance', () => {
    it('should complete analysis within timeout', async () => {
      // Arrange
      const input = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      mockPromptManager.getPrompt.mockResolvedValue('Test prompt');
      mockOpenAIClient.chat.mockImplementation(
        () => TestHelpers.delay(100).then(() => MockFactory.createOpenAIResponse())
      );

      // Act
      const { duration } = await TestHelpers.measureExecutionTime(
        () => service.generateAnalysis(input)
      );

      // Assert
      expect(duration).toBeLessThan(5000); // 5 second timeout
    });
  });
});