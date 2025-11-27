import apiClient from './api';
import { Conversation } from '../types';

export const conversationsService = {
  async getUserConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/conversations');
    return response.data;
  },

  async createConversation(
    type: 'direct' | 'group',
    otherUserId?: string,
    participantIds?: string[],
    groupName?: string
  ): Promise<Conversation> {
    const response = await apiClient.post('/conversations', {
      type,
      otherUserId,
      participantIds,
      groupName,
    });
    return response.data;
  },

  async getConversationById(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get(`/conversations/${conversationId}`);
    return response.data;
  },
};
