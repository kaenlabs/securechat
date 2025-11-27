import apiClient from './api';
import { User } from '../types';

export const usersService = {
  async search(query: string): Promise<User[]> {
    const response = await apiClient.get(`/users/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },
};
