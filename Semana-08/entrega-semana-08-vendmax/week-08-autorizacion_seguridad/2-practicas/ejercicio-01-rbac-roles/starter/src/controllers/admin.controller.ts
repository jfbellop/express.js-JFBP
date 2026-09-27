import { Request, Response, NextFunction } from 'express';
import { findAllUsers } from '../repositories/users.repository.js';
import { AppError } from '../errors/AppError.js';

// listUsers — only accessible with role 'admin'
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const users = await findAllUsers();
    res.json({
      message: 'Admin: list of all users',
      data: users,
      total: users.length,
    });
  } catch (err) {
    next(err);
  }
}

// getStats — only accessible with role 'admin'
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const users = await findAllUsers();
    const stats = {
      totalUsers: users.length,
      byRole: {
        admin: users.filter((u) => u.role === 'admin').length,
        user: users.filter((u) => u.role === 'user').length,
      },
    };

    res.json({ message: 'Admin: system stats', data: stats });
  } catch (err) {
    next(err);
  }
}
