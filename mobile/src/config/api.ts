// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TIMEOUT: 10000,
};

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  USERS: {
    SEARCH: '/users/search',
    GET_BY_ID: (id: string) => `/users/${id}`,
  },
  CONVERSATIONS: {
    LIST: '/conversations',
    CREATE: '/conversations',
    GET_BY_ID: (id: string) => `/conversations/${id}`,
  },
  MESSAGES: {
    LIST: (conversationId: string) => `/conversations/${conversationId}/messages`,
    SEND: (conversationId: string) => `/conversations/${conversationId}/messages`,
    DELETE: (messageId: string) => `/messages/${messageId}`,
    DELETE_FOR_EVERYONE: (messageId: string) => `/messages/${messageId}/delete-for-everyone`,
  },
};
