import axios from 'axios';

// API Response Types
export interface BibleBook {
  id: string;
  name: string;
  testament: 'old' | 'new';
  chapters: number;
}

export interface BooksResponse {
  books: BibleBook[];
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  total?: number;
}

export interface ChapterResponse {
  chapters: number;
  bookName: string;
}

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterContentResponse {
  book: string;
  chapter: number;
  verses: Verse[];
}

export interface ReportResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  content?: string;
  analysis?: any; // BiblicalAnalysis data from the backend
  error?: string;
}

// API Service Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error Handler
export class BibleAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'BibleAPIError';
  }
}

const handleAPIError = (error: unknown): never => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response: { data?: { message?: string }; status: number } };
    throw new BibleAPIError(
      axiosError.response.data?.message || 'API request failed',
      axiosError.response.status
    );
  } else if (error && typeof error === 'object' && 'request' in error) {
    throw new BibleAPIError('Network error - unable to reach API');
  } else {
    throw new BibleAPIError('Request configuration error');
  }
};

// API Methods
export const bibleAPI = {
  // Get all books
  getBooks: async (): Promise<BooksResponse> => {
    try {
      const response = await apiClient.get<APIResponse<BibleBook[]>>('/books');
      return { books: response.data.data };
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Get chapters for a book
  getChapters: async (bookId: string): Promise<ChapterResponse> => {
    try {
      const response = await apiClient.get<APIResponse<{bookId: string, bookName: string, chapters: Array<{number: number, verses: number}>, totalChapters: number}>>(`/books/${bookId}/chapters`);
      return {
        chapters: response.data.data.totalChapters,
        bookName: response.data.data.bookName
      };
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Get verses for a chapter
  getChapterContent: async (bookId: string, chapterNumber: number): Promise<ChapterContentResponse> => {
    try {
      const response = await apiClient.get<APIResponse<any>>(
        `/books/${bookId}/chapters/${chapterNumber}/verses`
      );
      // Map verse structure from API to frontend format
      const verses = response.data.data.verses.map((v: any) => ({
        number: v.verse,
        text: v.text
      }));
      return {
        book: response.data.data.bookName,
        chapter: chapterNumber,
        verses
      };
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Check if report already exists
  checkExistingReport: async (bookId: string, chapter: number, verses: string): Promise<{exists: boolean, report: ReportResponse | null}> => {
    try {
      const response = await apiClient.get<{exists: boolean, report: ReportResponse | null}>('/reports/check', {
        params: { bookId, chapter, verses }
      });
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Generate deeper report
  generateReport: async (bookId: string, chapter: number, verses: string): Promise<ReportResponse> => {
    try {
      const response = await apiClient.post<ReportResponse>('/reports/generate', {
        bookId,
        chapter,
        verses,
      });
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Get report status
  getReportStatus: async (reportId: string): Promise<ReportResponse> => {
    try {
      const response = await apiClient.get<ReportResponse>(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  // Health check
  healthCheck: async (): Promise<{ status: string }> => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },
};