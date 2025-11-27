import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { validateDto } from '../../middleware/validation.middleware';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const authService = new AuthService();

/**
 * POST /auth/register
 * Register a new user with username, password, and public key
 */
router.post(
  '/register',
  validateDto(RegisterDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  validateDto(LoginDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /auth/me
 * Get current authenticated user
 * Requires JWT token in Authorization header
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!; // Set by authMiddleware
    const user = await authService.getCurrentUser(userId);
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
