export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode = 500,
    public code = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public details?: Record<string, string[]>,
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
