import { Router } from 'express';
import { authenticateJwt } from '../middleware/jwt.middleware';
import { authorize } from '../middleware/permissions.middleware';
import { BudgetController } from '../../ai/utils/budget-controller'; // Assuming BudgetController is available

const router = Router();
const budgetController = new BudgetController(); // Instantiate BudgetController

// Route to get current LLM cost usage (admin only)
router.get('/llm-cost', authenticateJwt, authorize(['manage:prompts']), (req, res) => {
  try {
    const dailyCost = budgetController.getDailyCost();
    const monthlyCost = budgetController.getMonthlyCost();
    res.status(200).json({ dailyCost, monthlyCost });
  } catch (error) {
    console.error('Error getting LLM cost:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Placeholder for other analytics routes (e.g., user engagement, feature usage)
router.get('/user-engagement', authenticateJwt, authorize(['manage:users']), (req, res) => {
  res.status(200).json({ message: 'User engagement data (placeholder)' });
});

export default router;