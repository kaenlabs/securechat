export interface User {
  id: string;
  username: string;
  publicKey: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  userA?: User;
  userB?: User;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  ciphertextMessage: string;
  encryptedSessionKey: string;
  sentAt: string;
  deliveredAt?: string;
  expirySeconds?: number;
  hardDeleteAt?: string;
  deletedAt?: string;
}

export interface DecryptedMessage extends Omit<Message, 'ciphertextMessage' | 'encryptedSessionKey'> {
  plaintext: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}
