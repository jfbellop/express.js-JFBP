import { JwtPayload } from '../utils/jwt.js';

// Extend Express Request to include the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
