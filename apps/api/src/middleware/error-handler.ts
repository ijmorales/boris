import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...('details' in err && { details: err.details }),
      },
    });
  }

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};
