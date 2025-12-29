declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        isAdmin: boolean;
      };
      organization?: {
        id: string;
        name: string;
      };
    }
  }
}

export {};
