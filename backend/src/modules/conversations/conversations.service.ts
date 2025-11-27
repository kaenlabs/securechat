import { Conversation, IConversation, ConversationType } from '../../models/conversation.model';
import { ConversationMember } from '../../models/conversation-member.model';
import { AppError } from '../../middleware/error.middleware';
import { CreateConversationDto } from './dto/create-conversation.dto';
import mongoose from 'mongoose';

export class ConversationsService {

  /**
   * Get all conversations for a user
   * Returns both direct and group conversations
   */
  async getUserConversations(userId: string): Promise<IConversation[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // For direct conversations: user is either userA or userB
    const directConversations = await Conversation.find({
      type: ConversationType.DIRECT,
      $or: [{ userA: userObjectId }, { userB: userObjectId }],
    })
      .populate('userA', 'username publicKey')
      .populate('userB', 'username publicKey')
      .sort({ updatedAt: -1 });

    // For group conversations: user is in conversation_members
    const groupMemberships = await ConversationMember.find({ user: userObjectId }).select(
      'conversation',
    );
    const groupConversationIds = groupMemberships.map((m) => m.conversation);

    const groupConversations = await Conversation.find({
      _id: { $in: groupConversationIds },
      type: ConversationType.GROUP,
    }).sort({ updatedAt: -1 });

    return [...directConversations, ...groupConversations];
  }

  /**
   * Create a new conversation
   * - For direct: creates conversation with two users
   * - For group: creates conversation and adds all members
   */
  async createConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ): Promise<IConversation> {
    if (dto.type === ConversationType.DIRECT) {
      if (!dto.otherUserId) {
        throw new AppError('otherUserId is required for direct conversations', 400);
      }

      const user1 = new mongoose.Types.ObjectId(currentUserId);
      const user2 = new mongoose.Types.ObjectId(dto.otherUserId);

      // Check if direct conversation already exists
      const existing = await Conversation.findOne({
        type: ConversationType.DIRECT,
        $or: [
          { userA: user1, userB: user2 },
          { userA: user2, userB: user1 },
        ],
      })
        .populate('userA', 'username publicKey')
        .populate('userB', 'username publicKey');

      if (existing) {
        return existing;
      }

      // Create new direct conversation
      const conversation = await Conversation.create({
        type: ConversationType.DIRECT,
        userA: user1,
        userB: user2,
      });

      // Populate user details before returning
      await conversation.populate('userA', 'username publicKey');
      await conversation.populate('userB', 'username publicKey');

      return conversation;
    } else {
      // Group conversation
      if (!dto.groupName || !dto.memberIds || dto.memberIds.length === 0) {
        throw new AppError(
          'groupName and memberIds are required for group conversations',
          400,
        );
      }

      const conversation = await Conversation.create({
        type: ConversationType.GROUP,
        groupName: dto.groupName,
      });

      // Add creator and all members
      const allMemberIds = [currentUserId, ...dto.memberIds];
      const uniqueMemberIds = [...new Set(allMemberIds)];

      const members = uniqueMemberIds.map((userId) => ({
        conversation: conversation._id,
        user: new mongoose.Types.ObjectId(userId),
      }));

      await ConversationMember.insertMany(members);

      return conversation;
    }
  }

  /**
   * Get conversation by ID
   * Verifies user has access to this conversation
   */
  async getConversationById(conversationId: string, userId: string): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId)
      .populate('userA', 'username publicKey')
      .populate('userB', 'username publicKey');

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check access
    if (conversation.type === ConversationType.DIRECT) {
      if (
        conversation.userA?._id.toString() !== userId &&
        conversation.userB?._id.toString() !== userId
      ) {
        throw new AppError('Access denied', 403);
      }
    } else {
      // Check if user is a member
      const member = await ConversationMember.findOne({
        conversation: conversation._id,
        user: userObjectId,
      });

      if (!member) {
        throw new AppError('Access denied', 403);
      }
    }

    return conversation;
  }
}
