import request, { SuperTest, Test } from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';

export class ApiClient {
  private app: Application;
  private client: SuperTest<Test>;
  private authToken?: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  constructor(app: Application) {
    this.app = app;
    this.client = request(app);
  }

  // Authentication methods
  async authenticate(userId: string, role = 'user', email = 'test@example.com') {
    this.authToken = jwt.sign(
      { userId, role, email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    return this;
  }

  clearAuth() {
    this.authToken = undefined;
    return this;
  }

  setHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    return this;
  }

  // HTTP methods
  async get(url: string, query?: any) {
    const req = this.client.get(url);
    this.applyHeaders(req);
    if (query) req.query(query);
    return req;
  }

  async post(url: string, body?: any) {
    const req = this.client.post(url);
    this.applyHeaders(req);
    if (body) req.send(body);
    return req;
  }

  async put(url: string, body?: any) {
    const req = this.client.put(url);
    this.applyHeaders(req);
    if (body) req.send(body);
    return req;
  }

  async patch(url: string, body?: any) {
    const req = this.client.patch(url);
    this.applyHeaders(req);
    if (body) req.send(body);
    return req;
  }

  async delete(url: string) {
    const req = this.client.delete(url);
    this.applyHeaders(req);
    return req;
  }

  // Analysis endpoints
  async analyzeVerse(book: string, chapter: number, verses: string, options = {}) {
    return this.post('/api/analysis/verse', {
      book,
      chapter,
      verses,
      ...options
    });
  }

  async getAnalysisHistory(userId?: string) {
    const url = userId ? `/api/analysis/history/${userId}` : '/api/analysis/history';
    return this.get(url);
  }

  async getAnalysis(analysisId: string) {
    return this.get(`/api/analysis/${analysisId}`);
  }

  // Symbol endpoints
  async searchSymbols(query: string) {
    return this.get('/api/symbols/search', { q: query });
  }

  async getSymbol(symbolId: string) {
    return this.get(`/api/symbols/${symbolId}`);
  }

  async getSymbolRelationships(symbolId: string) {
    return this.get(`/api/symbols/${symbolId}/relationships`);
  }

  // User endpoints
  async register(userData: any) {
    return this.post('/api/auth/register', userData);
  }

  async login(email: string, password: string) {
    return this.post('/api/auth/login', { email, password });
  }

  async refreshToken(refreshToken: string) {
    return this.post('/api/auth/refresh', { refreshToken });
  }

  async getProfile() {
    return this.get('/api/users/profile');
  }

  async updateProfile(updates: any) {
    return this.patch('/api/users/profile', updates);
  }

  // Helper methods
  private applyHeaders(req: Test) {
    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      req.set(key, value);
    });
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
  }

  // Batch operations
  async batchAnalyze(verses: Array<{ book: string; chapter: number; verses: string }>) {
    const results = [];
    for (const verse of verses) {
      const response = await this.analyzeVerse(verse.book, verse.chapter, verse.verses);
      results.push(response.body);
    }
    return results;
  }

  // Performance testing
  async loadTest(endpoint: string, method: 'GET' | 'POST', requests: number, body?: any) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < requests; i++) {
      const start = Date.now();
      const response = method === 'GET' 
        ? await this.get(endpoint)
        : await this.post(endpoint, body);
      const duration = Date.now() - start;
      
      results.push({
        status: response.status,
        duration,
        success: response.status < 400
      });
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgDuration = totalDuration / requests;
    const successRate = results.filter(r => r.success).length / requests;

    return {
      totalRequests: requests,
      totalDuration,
      avgDuration,
      successRate,
      results
    };
  }

  // WebSocket testing
  connectWebSocket(namespace = '/') {
    // Would require socket.io-client for full implementation
    return {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
  }
}