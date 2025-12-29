import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { requireOrgMember } from '../middleware/auth.js';

export const organizationsRouter = Router();

// GET /api/organizations/current
organizationsRouter.get(
  '/current',
  requireOrgMember(),
  asyncHandler(async (req, res) => {
    res.json({
      data: {
        id: req.organization!.id,
        name: req.organization!.name,
        role: req.user!.isAdmin ? 'admin' : 'member',
      },
    });
  }),
);
