import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import * as userService from '../services/user-service.js';

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255),
});

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await userService.getAllUsers();
    res.json({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  }),
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    });
  }),
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = createUserSchema.safeParse(req.body);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const error of result.error.errors) {
        const path = error.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(error.message);
      }
      throw new ValidationError('Validation failed', details);
    }

    const user = await userService.createUser(result.data);
    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    });
  }),
);
