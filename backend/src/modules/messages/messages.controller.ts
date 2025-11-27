import { Router, Request, Response, NextFunction } from 'express';
import { MessagesService } from './messages.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateDto } from '../../middleware/validation.middleware';
import { SendMessageDto } from './dto/send-message.dto';

const router = Router();
const messagesService = new MessagesService();

// All message routes require authentication
router.use(authMiddleware);

/**
 * GET /conversations/:id/messages
 * Get messages for a conversation (paginated)
 */
router.get(
  '/conversations/:id/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const conversationId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await messagesService.getMessages(conversationId, userId, limit, offset);

      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /conversations/:id/messages
 * Send an encrypted message
 */
router.post(
  '/conversations/:id/messages',
  validateDto(SendMessageDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const conversationId = req.params.id;

      const message = await messagesService.sendMessage(conversationId, userId, req.body);

      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /messages/:id
 * Delete message (for self only)
 */
router.delete('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    await messagesService.deleteMessage(req.params.id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /messages/:id/delete-for-everyone
 * Delete message for all participants
 */
router.post(
  '/messages/:id/delete-for-everyone',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      await messagesService.deleteMessageForEveryone(req.params.id, userId);

      res.status(200).json({ message: 'Message deleted for everyone' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
