import type { UserRole } from './services/users.service.ts';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. Absent on anonymous routes. */
      auth?: {
        userId: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

export {};
