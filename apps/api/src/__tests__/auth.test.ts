import { clerkMiddleware, getAuth } from '@clerk/express';
import cors from 'cors';
import express, {
  type Express,
  type Request,
  type RequestHandler,
} from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error-handler.js';

// Extend Request type for tests
interface RequestWithAuth extends Request {
  auth?: { userId: string | null };
}

// Mock @clerk/express
vi.mock('@clerk/express', () => ({
  clerkMiddleware: vi.fn(),
  getAuth: vi.fn(),
}));

describe('Authentication Middleware', () => {
  let app: Express;

  // Helper to create a fresh Express app for each test
  const createApp = (authState: { userId: string | null }) => {
    const testApp = express();
    testApp.use(cors({ origin: 'http://localhost:5173', credentials: true }));
    testApp.use(express.json());

    // Public health endpoint (before auth)
    testApp.get('/health', (_req, res) => {
      res.json({ status: 'healthy' });
    });

    // Mock clerkMiddleware to attach auth state
    vi.mocked(clerkMiddleware).mockReturnValue(((req, _res, next) => {
      (req as RequestWithAuth).auth = authState;
      next();
    }) as RequestHandler);

    // Mock getAuth to return the auth state from req
    vi.mocked(getAuth).mockImplementation(
      (req: RequestWithAuth) => req.auth || { userId: null },
    );

    testApp.use(clerkMiddleware());

    // Protected endpoints
    testApp.get('/api/users', requireAuth, (_req, res) => {
      res.json({ data: [{ id: '1', name: 'Test User' }] });
    });

    testApp.post('/api/sync', requireAuth, (_req, res) => {
      res.status(202).json({ data: { jobId: 'test-job-id' } });
    });

    testApp.use(errorHandler);

    return testApp;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Public endpoints', () => {
    it('returns 200 for health check without authentication', async () => {
      app = createApp({ userId: null });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('Protected endpoints - unauthenticated', () => {
    beforeEach(() => {
      app = createApp({ userId: null });
    });

    it('returns 401 for GET /api/users without authentication', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('returns 401 for POST /api/sync without authentication', async () => {
      const response = await request(app)
        .post('/api/sync')
        .send({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });
  });

  describe('Protected endpoints - authenticated', () => {
    beforeEach(() => {
      app = createApp({ userId: 'user_test123' });
    });

    it('returns 200 for GET /api/users with authentication', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: [{ id: '1', name: 'Test User' }],
      });
    });

    it('returns 202 for POST /api/sync with authentication', async () => {
      const response = await request(app)
        .post('/api/sync')
        .send({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(202);
      expect(response.body).toEqual({
        data: { jobId: 'test-job-id' },
      });
    });
  });

  describe('CORS headers', () => {
    it('includes credentials support in CORS headers', async () => {
      app = createApp({ userId: null });

      const response = await request(app)
        .options('/api/users')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});

describe('UnauthorizedError', () => {
  it('creates error with correct properties', () => {
    const error = new UnauthorizedError();

    expect(error.message).toBe('Authentication required');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('accepts custom message', () => {
    const error = new UnauthorizedError('Custom auth message');

    expect(error.message).toBe('Custom auth message');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
