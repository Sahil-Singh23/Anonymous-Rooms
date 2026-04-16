import { createContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import type{ AuthUser } from '../types/auth.types';

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signup: (email: string, name: string, password?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Check if user is already logged in (on page load)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getMe();
      setCurrentUser(userData);
    } catch {
      // Not authenticated, clear state
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, name: string, password?: string) => {
    try {
      const userData = await authService.signup(email, name, password);
      setCurrentUser(userData);
    } catch (err: any) {
      setCurrentUser(null);
      throw new Error(err.response?.data?.error || 'Signup failed');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const userData = await authService.login(email, password);
      setCurrentUser(userData);
    } catch (err: any) {
      setCurrentUser(null);
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err: any) {
      console.error('Logout API error:', err);
    } finally {
      // Clear user state regardless of API response
      setCurrentUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        isLoading,
        signup,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
