import api, { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { AuthResponse, User } from '../types';

export const authService = {
  register: async (username: string, password: string, publicKey: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
      username,
      password,
      publicKey,
    });
    
    // Save token
    await apiClient.setToken(response.data.accessToken);
    
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });
    
    // Save token
    await apiClient.setToken(response.data.accessToken);
    
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.removeToken();
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },
};

export const usersService = {
  search: async (query: string): Promise<User[]> => {
    const response = await api.get<User[]>(API_ENDPOINTS.USERS.SEARCH, {
      params: { query },
    });
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(API_ENDPOINTS.USERS.GET_BY_ID(id));
    return response.data;
  },
};
