import mongoose, { Schema, Document } from 'mongoose';

/**
 * ConversationMember model - for group chat participants
 * 
 * Tracks which users are members of which conversations
 * Primarily used for group chats
 */
export interface IConversationMember extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
}

const ConversationMemberSchema = new Schema<IConversationMember>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Unique constraint: user can only be in a conversation once
ConversationMemberSchema.index({ conversation: 1, user: 1 }, { unique: true });

export const ConversationMember = mongoose.model<IConversationMember>(
  'ConversationMember',
  ConversationMemberSchema,
);
