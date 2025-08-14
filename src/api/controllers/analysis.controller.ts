import { Request, Response } from 'express';
import { VerseAnalysisService } from '../services/verse-analysis.service';
import { AnalyzeRequest } from '../../shared/types/analysis.types';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

export class AnalysisController {
  private verseAnalysisService: VerseAnalysisService;

  constructor() {
    this.verseAnalysisService = new VerseAnalysisService();
  }

  async analyzeVerse(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      const request: AnalyzeRequest = req.body;
      const result = await this.verseAnalysisService.analyzeVerse(request);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error analyzing verse:', error);
      res.status(500).json({ message: 'Internal server error during analysis.' });
    }
  }

  async getAnalysisById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      const { id } = req.params;
      const result = await this.verseAnalysisService.getAnalysisById(id);
      if (result) {
        res.status(200).json(result);
      } else {
        res.status(404).json({ message: 'Analysis not found.' });
      }
    } catch (error) {
      console.error('Error getting analysis by ID:', error);
      res.status(500).json({ message: 'Internal server error retrieving analysis.' });
    }
  }
}