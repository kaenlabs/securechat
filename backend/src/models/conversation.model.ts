import mongoose, { Schema, Document } from 'mongoose';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

/**
 * Conversation model - represents a chat between users
 * 
 * For direct chats: userA and userB are set
 * For group chats: type is 'group', members are in separate collection
 */
export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  type: ConversationType;
  userA?: mongoose.Types.ObjectId;
  userB?: mongoose.Types.ObjectId;
  groupName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: Object.values(ConversationType),
      default: ConversationType.DIRECT,
      required: true,
    },
    userA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    groupName: {
      type: String,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for finding direct conversations
ConversationSchema.index({ type: 1, userA: 1, userB: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
