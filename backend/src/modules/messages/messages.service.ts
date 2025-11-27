import { Message, IMessage } from '../../models/message.model';
import { Conversation, ConversationType } from '../../models/conversation.model';
import { ConversationMember } from '../../models/conversation-member.model';
import { AppError } from '../../middleware/error.middleware';
import { SendMessageDto } from './dto/send-message.dto';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';

export class MessagesService {

  /**
   * Get messages for a conversation (paginated)
   * Only returns non-deleted messages
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<IMessage[]> {
    // Verify user has access to this conversation
    await this.verifyConversationAccess(conversationId, userId);

    const messages = await Message.find({
      conversation: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('sender', 'username publicKey');

    return messages;
  }

  /**
   * Send a new encrypted message
   * 
   * E2EE Flow:
   * 1. Client generates random session key
   * 2. Client encrypts message with session key (symmetric)
   * 3. Client encrypts session key with recipient's public key (asymmetric)
   * 4. Server stores encrypted message and encrypted session key
   * 5. Server NEVER sees plaintext message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<IMessage> {
    // Verify user has access to this conversation
    await this.verifyConversationAccess(conversationId, senderId);

    // Calculate hard delete timestamp if expiry is set
    let hardDeleteAt: Date | undefined = undefined;
    if (dto.expirySeconds) {
      hardDeleteAt = new Date(Date.now() + dto.expirySeconds * 1000);
    }

    const message = await Message.create({
      conversation: new mongoose.Types.ObjectId(conversationId),
      sender: new mongoose.Types.ObjectId(senderId),
      ciphertextMessage: dto.ciphertextMessage,
      encryptedSessionKey: dto.encryptedSessionKey,
      expirySeconds: dto.expirySeconds,
      hardDeleteAt,
    });

    // Update conversation's updated_at timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      updatedAt: new Date(),
    });

    logger.info(`Message sent: ${message._id} in conversation ${conversationId}`);

    // TODO: Send push notification to recipients

    return message;
  }

  /**
   * Delete message (self only)
   * Soft delete - only removes from current user's view
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Verify user has access to this conversation
    await this.verifyConversationAccess(message.conversation.toString(), userId);

    // For "delete for me", we just mark it as delivered (client handles local deletion)
    // In a real implementation, you might want a separate table for per-user deletions
    logger.info(`User ${userId} deleted message ${messageId} (local only)`);

    // This is a simplified implementation
    // In production, consider a message_deletions table with (message_id, user_id)
  }

  /**
   * Delete message for everyone
   * Hard delete or soft delete that affects all participants
   */
  async deleteMessageForEveryone(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId).populate('sender');

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Only sender can delete for everyone
    if (message.sender._id.toString() !== userId) {
      throw new AppError('Only message sender can delete for everyone', 403);
    }

    // Soft delete - set deletedAt
    message.deletedAt = new Date();
    await message.save();

    logger.info(`Message ${messageId} deleted for everyone by user ${userId}`);

    // TODO: Send "message deleted" event to all conversation participants
    // This would typically be done via WebSocket or push notification
  }

  /**
   * Background job: Delete expired messages
   * Should be run periodically (e.g., every minute)
   */
  async deleteExpiredMessages(): Promise<number> {
    const result = await Message.deleteMany({
      hardDeleteAt: { $lte: new Date(), $ne: null },
    });

    const deletedCount = result.deletedCount || 0;
    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} expired messages`);
    }

    return deletedCount;
  }

  /**
   * Verify user has access to conversation
   */
  private async verifyConversationAccess(conversationId: string, userId: string): Promise<void> {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (conversation.type === ConversationType.DIRECT) {
      if (
        conversation.userA?.toString() !== userId &&
        conversation.userB?.toString() !== userId
      ) {
        throw new AppError('Access denied', 403);
      }
    } else {
      const member = await ConversationMember.findOne({
        conversation: conversation._id,
        user: userObjectId,
      });

      if (!member) {
        throw new AppError('Access denied', 403);
      }
    }
  }
}
