import express from 'express';
import { updateAgentAvatar } from '../controllers/agentProfile.controller.js';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
  console.log('[Avatar Update Route] Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params
  });
  next();
});

// Public route for updating avatar - no auth required
router.post('/update-avatar/:id', updateAgentAvatar);

export default router;
