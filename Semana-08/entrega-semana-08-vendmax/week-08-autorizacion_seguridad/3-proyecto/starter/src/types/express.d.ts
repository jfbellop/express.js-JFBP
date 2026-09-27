<<<<<<< HEAD
import { JwtPayload } from '../utils/jwt.js';
=======
import { JwtPayload } from '../utils/jwt';
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
