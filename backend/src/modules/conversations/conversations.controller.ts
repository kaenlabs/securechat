import { Router, Request, Response, NextFunction } from 'express';
import { ConversationsService } from './conversations.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateDto } from '../../middleware/validation.middleware';
import { CreateConversationDto } from './dto/create-conversation.dto';

const router = Router();
const conversationsService = new ConversationsService();

// All conversation routes require authentication
router.use(authMiddleware);

/**
 * GET /conversations
 * Get all conversations for current user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const conversations = await conversationsService.getUserConversations(userId);

    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /conversations
 * Create a new conversation (direct or group)
 */
router.post(
  '/',
  validateDto(CreateConversationDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const conversation = await conversationsService.createConversation(userId, req.body);

      res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /conversations/:id
 * Get conversation details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const conversation = await conversationsService.getConversationById(req.params.id, userId);

    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
});

export default router;
