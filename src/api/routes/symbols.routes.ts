import { Router } from 'express';
import { SymbolHighlighterService } from '../../ai/services/symbol-highlighter.service';
import { authenticateJwt } from '../middleware/jwt.middleware';
import { authorize } from '../middleware/permissions.middleware';

const router = Router();
const symbolHighlighterService = new SymbolHighlighterService();

// Route to get symbols for a given text, with their positions for highlighting
router.post(
  '/highlight',
  authenticateJwt,
  authorize(['read:analysis']), // Assuming symbol highlighting is part of analysis viewing
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required and must be a string.' });
      }
      const symbols = await symbolHighlighterService.getSymbolsForHighlighting(text);
      res.status(200).json(symbols);
    } catch (error) {
      console.error('Error getting symbols for highlighting:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  }
);

// Route to get detailed information about a specific symbol (e.g., for a popup)
router.get(
  '/:term',
  authenticateJwt,
  authorize(['read:analysis']),
  async (req, res) => {
    try {
      const { term } = req.params;
      // In a real scenario, you'd fetch the detailed symbol info from the database
      // For now, a placeholder or direct lookup from a static list
      const mockSymbolInfo = {
        term: term,
        meaning: `Placeholder meaning for ${term}`,
        biblical_pattern: `Placeholder pattern for ${term}`,
        deeper_significance: `Placeholder deeper significance for ${term}`,
        categories: ['placeholder'],
        related_verses: ['placeholder'],
      };
      res.status(200).json(mockSymbolInfo);
    } catch (error) {
      console.error('Error getting symbol details:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  }
);

export default router;