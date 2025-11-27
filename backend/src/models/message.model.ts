import mongoose, { Schema, Document } from 'mongoose';

/**
 * Message model - stores encrypted messages
 * 
 * E2EE Implementation:
 * - ciphertextMessage: The actual message content, encrypted with a random session key on client
 * - encryptedSessionKey: The session key encrypted with recipient's public key
 * - Server NEVER has access to plaintext message content
 * 
 * Self-destruct features:
 * - expirySeconds: If set, message will auto-delete after this duration
 * - hardDeleteAt: Calculated timestamp when server should permanently delete this message
 * - deletedAt: Soft delete timestamp (for "delete for everyone" feature)
 */
export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  ciphertextMessage: string;
  encryptedSessionKey: string;
  sentAt: Date;
  deliveredAt?: Date;
  expirySeconds?: number;
  hardDeleteAt?: Date;
  deletedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ciphertextMessage: {
      type: String,
      required: true,
    },
    encryptedSessionKey: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    expirySeconds: {
      type: Number,
    },
    hardDeleteAt: {
      type: Date,
      index: { sparse: true },
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

// Index for finding messages in a conversation, sorted by time
MessageSchema.index({ conversation: 1, sentAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
