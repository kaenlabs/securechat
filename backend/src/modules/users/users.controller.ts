import { Router, Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const usersService = new UsersService();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /users/search?query=username
 * Search users by username
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.query as string;
    const users = await usersService.searchUsers(query);

    // Return safe user data (no password hash or salt)
    res.status(200).json(
      users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        publicKey: user.publicKey,
        createdAt: user.createdAt,
      })),
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id
 * Get user profile by ID
 * Returns public key needed for E2EE message encryption
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getUserById(req.params.id);

    res.status(200).json({
      id: user._id.toString(),
      username: user.username,
      publicKey: user.publicKey,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
