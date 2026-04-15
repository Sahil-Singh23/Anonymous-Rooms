# 🔐 Authentication Integration Plan

## Executive Summary
Your backend auth routes are **complete** ✅. The frontend needs auth flow integration, and the app needs to support **both authenticated and guest users**.

---

## Part 1: Current State Analysis

### ✅ Backend Status  
| Component | Status | Details |
|-----------|--------|---------|
| Google OAuth | ✅ Ready | `/login/federated/google` + callback handler |
| Email/Password Auth | ✅ Ready | `/signup` and `/login` routes |
| JWT Token Management | ✅ Ready | JwtSecret, httpOnly cookies, 30-day expiry |
| requireAuth Middleware | ✅ Ready | Validates token, attaches user to req.user |
| User Model | ✅ Ready | Supports both email + password and Google login |
| Logout | ✅ Ready | Clears auth cookie |
| Current User Endpoint | ✅ Ready | `/me` returns authenticated user |

### ❌ Frontend Status
| Component | Status | Required |
|-----------|--------|----------|
| Auth Context | ❌ Missing | For global auth state |
| Login Page | ❌ Missing | Email/password + Google form |
| Signup Page | ❌ Missing | Registration form |
| OAuth Callback Handler | ❌ Missing | Captures token from redirect |
| API Service | ❌ Missing | Typed fetch wrapper |
| Route Protection | ❌ Missing | Conditional rendering based on auth |
| Session Management | ⚠️ Partial | Has sessionId, needs user auth integration |

---

## Part 2: Architecture & Flows

### User Authentication Flow
```
Guest User:
  Landing → Create Room → Room (with nickname + sessionId)

Authenticated User:
  Landing → Login/Signup → Room (with userId + emailfrom JWT)

OAuth User:
  Landing → Google Button → Google OAuth → Callback → Room
```

### Frontend Architecture
```
App (Router)
├── AuthProvider (Context)
│   ├── Landing
│   │   ├── Create Room (Guest)
│   │   ├── Join Room (Guest)
│   │   └── Login/Signup Links
│   ├── Login (Protected - redirects if logged in)
│   ├── AuthCallback (OAuth redirect handler)
│   ├── Signup (Protected - redirects if logged in)
│   └── Room (Supports both auth + guest)
```

---

## Part 3: Implementation Checklist

### Phase 1️⃣: Create Auth Context & Provider
- [ ] Create `src/contexts/AuthContext.tsx`
  - State: `user`, `isLoading`, `isAuthenticated`, `error`
  - Methods: `login()`, `signup()`, `logout()`, `checkAuth()`, `loginWithGoogle()`
- [ ] Create `src/hooks/useAuth.ts` - Custom hook to use AuthContext
- [ ] Wrap App in AuthProvider in `main.tsx`
- [ ] Add localStorage persistence for user data

**Files to Create:**
```
src/contexts/AuthContext.tsx
src/hooks/useAuth.ts
src/types/auth.types.ts (User interface)
```

---

### Phase 2️⃣: Create API Service for Auth

- [ ] Create `src/services/authService.ts`
  - `signup(email, password, name)` → POST /auth/signup
  - `login(email, password)` → POST /auth/login
  - `logout()` → POST /auth/logout
  - `getMe()` → GET /auth/me
  - `googleCallback(token)` → Parse token from URL

- [ ] Create `src/services/apiClient.ts`
  - Base axios instance with VITE_API_URL
  - Auto-include credentials (cookies)
  - Error handling for 401s (redirect to login)

**Files to Create:**
```
src/services/authService.ts
src/services/apiClient.ts
src/types/api.types.ts
```

---

### Phase 3️⃣: Create Auth Pages

#### A. Login Page
- [ ] Create `src/pages/Login.tsx`
  - Email + Password form
  - Google OAuth button (redirects to `/login/federated/google`)
  - Link to signup
  - Redirect if already logged in
  - Show errors from backend

- [ ] Create `src/pages/Signup.tsx`
  - Name + Email + Password form
  - Link to login
  - Password validation (min 6 chars)
  - Show errors (email exists, etc.)
  - Redirect if already logged in

- [ ] Create `src/pages/AuthCallback.tsx`
  - Extract token from URL query params
  - Store JWT and user data (from response)
  - Redirect to `/room/{roomCode}` or `/` based on referrer
  - Handle errors (invalid token, etc.)

**Files to Create:**
```
src/pages/Login.tsx
src/pages/Signup.tsx
src/pages/AuthCallback.tsx
```

---

### Phase 4️⃣: Update Routing & Navigation

- [ ] Update `src/App.tsx` with new routes:
  ```
  /              → Landing
  /login         → Login
  /signup        → Signup
  /auth/callback → AuthCallback
  /room/:roomCode → Room
  ```

- [ ] Create `src/components/ProtectedRoute.tsx` wrapper (optional)
  - Redirect unauthenticated users to /login
  - Can use for future auth-only features

- [ ] Update `src/pages/Landing.tsx`
  - Add "Login" and "Sign Up" buttons
  - Keep "Create Room as Guest" button
  - Show username if logged in
  - Show logout button if logged in

**Files to Update:**
```
src/App.tsx
src/pages/Landing.tsx
src/components/ProtectedRoute.tsx (new)
src/components/Navbar.tsx (new - optional)
```

---

### Phase 5️⃣: Update Room Page

- [ ] Modify `src/pages/Room.tsx`
  - Get username from auth context if logged in
  - If guest: use nickname + sessionId (current flow)
  - If authenticated: use email/name from auth context
  - Update WebSocket connection to send userId (if exists)
  - Show "Logged in as..." indicator

- [ ] Update chatMessage interface
  - Add `userId?: number` field
  - Display user differentiation (Guest vs Authenticated)

**Files to Update:**
```
src/pages/Room.tsx
```

---

### Phase 6️⃣: Update WebSocket Communication

- [ ] Modify `src/pages/Room.tsx` - WebSocket join message:
  ```json
  {
    "type": "join",
    "payload": {
      "roomCode": "ABC123",
      "sessionId": "uuid",
      "userId": 42,              # New field (null if guest)
      "username": "John Doe"     # From auth OR nickname
    }
  }
  ```

- [ ] Backend Update (src/index.ts WebSocket handler):
  - Accept `userId` from join payload
  - Use userId to link file uploads to user
  - For guests: keep sessionId-based tracking

**Backend Files to Update:**
```
src/index.ts (WebSocket handler)
src/routes/s3files.ts (if using requireAuth)
```

---

### Phase 7️⃣: Optional - Enhanced Features

- [ ] Add Profile Page (`src/pages/Profile.tsx`)
  - Show user info (name, email)
  - Logout button
  - User settings

- [ ] Add User Indicator in Room
  - Show "You" vs other usernames
  - Different colors/badges for logged-in vs guest

- [ ] Token Refresh Logic
  - If token expires, redirect to login
  - Or implement refresh token flow (optional)

---

## Part 4: Supporting Both Auth & Guest Users

### How it Works:
1. **Guest User**: Uses nickname + sessionId (current method)
   - No authentication required
   - Can access public rooms
   - Anonymous in chat

2. **Authenticated User**: Uses email + JWT token
   - Login/signup first
   - Gets JWT cookie (httpOnly)
   - Can be identified across sessions
   - Optional: Track message history per user

3. **In Database**:
   - Files have `userId` (nullable) - works for both
   - User model exists - only for authenticated users
   - Message history stored in WebSocket (ephemeral for now)

### WebSocket Message Update:
```typescript
interface JoinPayload {
  roomCode: string;
  sessionId: string;        // Always present (for identification)
  userId?: number;          // Present if authenticated
  username: string;         // Either guest nickname or auth name
  isAuthenticated: boolean; // Flag for frontend
}
```

---

## Part 5: Code Examples

<details>
<summary>AuthContext.tsx Template</summary>

```typescript
import { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import authService from '../services/authService';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in (on mount)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const userData = await authService.signup(email, password, name);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const userData = await authService.login(email, password);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      signup,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

</details>

<details>
<summary>useAuth Hook Template</summary>

```typescript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

</details>

<details>
<summary>Login Page Template</summary>

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Input from '../components/Input';
import Alert from '../components/Alert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAlertMessage('Please fill in all fields');
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Redirect to home after login
    } catch (error: any) {
      setAlertMessage(error.message || 'Login failed');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login/federated/google`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Login</h1>
        
        {showAlert && <Alert message={alertMessage} type={alertType} />}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={() => {}} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <button onClick={handleGoogleLogin} className="mt-4 w-full">
          Login with Google
        </button>

        <p className="mt-4 text-center">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

</details>

---

## Part 6: Testing Checklist

- [ ] **Guest Flow**: Create/join room as guest ✅ (already working)
- [ ] **Signup**: Register new account → Auto-login → Redirect to home
- [ ] **Login**: Login with email/password → Get JWT cookie → Redirect to home
- [ ] **Google OAuth**: Click button → Redirect to Google → Get callback token → Auto-login
- [ ] **AuthCallback**: Receive token → Store in localStorage → Redirect appropriately
- [ ] **Room with Auth**: Start room as authenticated user → Show username in chat
- [ ] **Mixed Room**: Authenticated + Guest in same room → Both can chat
- [ ] **Logout**: Logout → Clear cookies → Redirect to login
- [ ] **Session Persistence**: Refresh page → Still logged in (from cookie)

---

## Part 7: Summary of Files to Create

### New Files (Frontend):
```
src/contexts/AuthContext.tsx
src/hooks/useAuth.ts
src/types/auth.types.ts
src/types/api.types.ts
src/services/authService.ts
src/services/apiClient.ts
src/pages/Login.tsx
src/pages/Signup.tsx
src/pages/AuthCallback.tsx
src/components/ProtectedRoute.tsx (optional)
src/components/Navbar.tsx (optional)
```

### Files to Update (Frontend):
```
src/App.tsx (add new routes)
src/main.tsx (wrap in AuthProvider)
src/pages/Landing.tsx (add login/signup buttons)
src/pages/Room.tsx (integrate auth, update WebSocket)
```

### Minor Backend Updates (Optional):
```
src/index.ts (enhance WebSocket to accept userId)
```

---

## Next Steps

1. **Start with Phase 1**: Create AuthContext and hooks
2. **Move to Phase 2**: Build API service
3. **Create Pages**: Login, Signup, Callback
4. **Update Routing**: Add new routes in App.tsx
5. **Test Each Flow**: Guest → Auth → OAuth → Mixed room

Would you like me to **start implementing** any of these phases?
