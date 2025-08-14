import { Request, Response, NextFunction } from 'express';
import { AnalysisController } from '@/api/controllers/analysis.controller';
import { VerseAnalysisService } from '@/api/services/verse-analysis.service';
import { TestHelpers } from '@test-utils/test-helpers';
import { MockFactory } from '@test-utils/mock-factory';

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let mockService: jest.Mocked<VerseAnalysisService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mock service
    mockService = {
      analyzeVerse: jest.fn(),
      getAnalysis: jest.fn(),
      getAnalysisHistory: jest.fn(),
      deleteAnalysis: jest.fn(),
      updateAnalysis: jest.fn()
    } as any;

    // Initialize controller
    controller = new AnalysisController(mockService);

    // Create mock request, response, and next
    mockRequest = TestHelpers.createMockRequest();
    mockResponse = TestHelpers.createMockResponse();
    mockNext = TestHelpers.createMockNext();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/analysis/verse', () => {
    it('should create analysis successfully', async () => {
      // Arrange
      mockRequest.body = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };
      mockRequest.user = { userId: 'user-123', role: 'user' };

      const expectedAnalysis = MockFactory.createAnalysis();
      mockService.analyzeVerse.mockResolvedValue(expectedAnalysis);

      // Act
      await controller.analyzeVerse(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.analyzeVerse).toHaveBeenCalledWith({
        ...mockRequest.body,
        userId: 'user-123'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expectedAnalysis
      });
    });

    it('should validate required fields', async () => {
      // Arrange
      mockRequest.body = {
        book: 'Genesis',
        // Missing required fields
      };

      // Act
      await controller.analyzeVerse(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('required')
        })
      );
      expect(mockService.analyzeVerse).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.body = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      const serviceError = new Error('Service unavailable');
      mockService.analyzeVerse.mockRejectedValue(serviceError);

      // Act
      await controller.analyzeVerse(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });

    it('should enforce rate limiting', async () => {
      // Arrange
      mockRequest.body = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };
      mockRequest.user = { userId: 'user-123', role: 'user' };

      // Simulate rate limit exceeded
      jest.spyOn(controller as any, 'checkRateLimit').mockReturnValue(false);

      // Act
      await controller.analyzeVerse(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 429
        }
      });
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should retrieve analysis by ID', async () => {
      // Arrange
      mockRequest.params = { id: 'analysis-123' };
      mockRequest.user = { userId: 'user-123', role: 'user' };

      const expectedAnalysis = MockFactory.createAnalysis({
        id: 'analysis-123',
        userId: 'user-123'
      });
      mockService.getAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      await controller.getAnalysis(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.getAnalysis).toHaveBeenCalledWith('analysis-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expectedAnalysis
      });
    });

    it('should return 404 for non-existent analysis', async () => {
      // Arrange
      mockRequest.params = { id: 'non-existent' };
      mockService.getAnalysis.mockResolvedValue(null);

      // Act
      await controller.getAnalysis(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Analysis not found',
          code: 404
        }
      });
    });

    it('should enforce access control', async () => {
      // Arrange
      mockRequest.params = { id: 'analysis-123' };
      mockRequest.user = { userId: 'user-456', role: 'user' };

      const analysis = MockFactory.createAnalysis({
        id: 'analysis-123',
        userId: 'user-123' // Different user
      });
      mockService.getAnalysis.mockResolvedValue(analysis);

      // Act
      await controller.getAnalysis(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Access denied',
          code: 403
        }
      });
    });
  });

  describe('GET /api/analysis/history', () => {
    it('should retrieve user analysis history', async () => {
      // Arrange
      mockRequest.user = { userId: 'user-123', role: 'user' };
      mockRequest.query = { limit: '10', offset: '0' };

      const history = [
        MockFactory.createAnalysis(),
        MockFactory.createAnalysis(),
        MockFactory.createAnalysis()
      ];
      mockService.getAnalysisHistory.mockResolvedValue({
        data: history,
        total: 3,
        limit: 10,
        offset: 0
      });

      // Act
      await controller.getAnalysisHistory(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.getAnalysisHistory).toHaveBeenCalledWith(
        'user-123',
        { limit: 10, offset: 0 }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: history,
        meta: {
          total: 3,
          limit: 10,
          offset: 0
        }
      });
    });

    it('should handle pagination', async () => {
      // Arrange
      mockRequest.user = { userId: 'user-123', role: 'user' };
      mockRequest.query = { limit: '5', offset: '10' };

      // Act
      await controller.getAnalysisHistory(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.getAnalysisHistory).toHaveBeenCalledWith(
        'user-123',
        { limit: 5, offset: 10 }
      );
    });
  });

  describe('DELETE /api/analysis/:id', () => {
    it('should delete analysis successfully', async () => {
      // Arrange
      mockRequest.params = { id: 'analysis-123' };
      mockRequest.user = { userId: 'user-123', role: 'user' };

      const analysis = MockFactory.createAnalysis({
        id: 'analysis-123',
        userId: 'user-123'
      });
      mockService.getAnalysis.mockResolvedValue(analysis);
      mockService.deleteAnalysis.mockResolvedValue(true);

      // Act
      await controller.deleteAnalysis(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.deleteAnalysis).toHaveBeenCalledWith('analysis-123');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should prevent unauthorized deletion', async () => {
      // Arrange
      mockRequest.params = { id: 'analysis-123' };
      mockRequest.user = { userId: 'user-456', role: 'user' };

      const analysis = MockFactory.createAnalysis({
        id: 'analysis-123',
        userId: 'user-123'
      });
      mockService.getAnalysis.mockResolvedValue(analysis);

      // Act
      await controller.deleteAnalysis(
        mockRequest as Request,
        mockResponse,
        mockNext
      );

      // Assert
      expect(mockService.deleteAnalysis).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});