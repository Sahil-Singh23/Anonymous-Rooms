export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profilePicUrl?: string | null;
  totalRoomsJoined?: number;
  createdAt?: string;
}

export interface GuestSession {
  sessionId: string;
  nickname: string;
}

export type CurrentUser = AuthUser | GuestSession;

// Helper functions to check user type
export const isAuthUser = (user: CurrentUser | null): user is AuthUser => {
  return user !== null && 'email' in user && 'id' in user;
};

export const isGuestUser = (user: CurrentUser | null): user is GuestSession => {
  return user !== null && 'sessionId' in user && !('email' in user);
};
