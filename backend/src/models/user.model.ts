import mongoose, { Schema, Document } from 'mongoose';

/**
 * User model - stores user authentication and public key
 * 
 * Security notes:
 * - passwordHash: Argon2id hash, never store plaintext password
 * - salt: Unique per user, used in Argon2id hashing
 * - publicKey: User's public key for E2EE, generated on client device
 * - Private keys are NEVER sent to or stored on the server
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordHash: string;
  salt: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      maxlength: 255,
    },
    salt: {
      type: String,
      required: true,
      maxlength: 64,
    },
    publicKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model<IUser>('User', UserSchema);
