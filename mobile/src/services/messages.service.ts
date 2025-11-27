import apiClient from './api';
import { Message } from '../types';

export const messagesService = {
  async getMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<Message[]> {
    let url = `/messages/${conversationId}?limit=${limit}`;
    if (beforeMessageId) {
      url += `&beforeMessageId=${beforeMessageId}`;
    }
    const response = await apiClient.get(url);
    return response.data;
  },

  async sendMessage(
    conversationId: string,
    ciphertextMessage: string,
    encryptedSessionKey: string,
    expirySeconds?: number
  ): Promise<Message> {
    const response = await apiClient.post(`/messages/${conversationId}`, {
      ciphertextMessage,
      encryptedSessionKey,
      expirySeconds,
    });
    return response.data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`);
  },

  async deleteForEveryone(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}/delete-for-everyone`);
  },
};
