import apiClient from './apiClient';
import type{ AuthUser } from '../types/auth.types';

const authService = {
  async signup(email: string, name: string, password?: string): Promise<AuthUser> {
    const response = await apiClient.post('/auth/signup', {
      email,
      password,
      name,
    });
    return response.data.user;
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Still consider logout successful even if API fails
    }
  },

  async getMe(): Promise<AuthUser> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authService;
