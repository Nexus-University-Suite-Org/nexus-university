# Connecting to Nexus University Backend - Quick Start Guide

## For the Other Website Team

This guide shows how to connect your website to the shared Nexus University Django backend.

## Prerequisites

- Your backend is running at: `http://localhost:8000` (dev) or `https://backend.yourapp.com` (production)
- Your frontend is running at a different port or domain

## 5-Minute Setup

### 1. Install Axios or Fetch Helper

**Option A: Using Axios (recommended)**
```bash
npm install axios
```

**Option B: Using Fetch (built-in)**
No installation needed - use native fetch API

### 2. Create API Service

**Using Axios:**
```typescript
// services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus-auth-token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
```

**Using Fetch:**
```typescript
// services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const token = localStorage.getItem('nexus-auth-token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}
```

### 3. Create Auth Functions

**Axios:**
```typescript
// services/auth.ts
import api from './api';

interface AuthResponse {
  token: string;
  user: { uid: string; email: string; displayName?: string };
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: 'student' | 'lecturer' | 'registrar';
  };
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>('/api/auth/login/', {
    email,
    password,
  });
  
  localStorage.setItem('nexus-auth-token', response.data.token);
  return response.data;
}

export async function signup(email: string, password: string, fullName: string) {
  const response = await api.post<AuthResponse>('/api/auth/signup/', {
    email,
    password,
    full_name: fullName,
  });
  
  localStorage.setItem('nexus-auth-token', response.data.token);
  return response.data;
}

export async function getMe() {
  const response = await api.get<AuthResponse>('/api/auth/me/');
  return response.data;
}

export function logout() {
  localStorage.removeItem('nexus-auth-token');
}
```

**Fetch:**
```typescript
// services/auth.ts
import { apiCall } from './api';

export async function login(email: string, password: string) {
  const data = await apiCall('/api/auth/login/', 'POST', { email, password });
  localStorage.setItem('nexus-auth-token', data.token);
  return data;
}

export async function signup(email: string, password: string, fullName: string) {
  const data = await apiCall('/api/auth/signup/', 'POST', {
    email,
    password,
    full_name: fullName,
  });
  localStorage.setItem('nexus-auth-token', data.token);
  return data;
}

export async function getMe() {
  return apiCall('/api/auth/me/', 'GET');
}

export function logout() {
  localStorage.removeItem('nexus-auth-token');
}
```

### 4. Use in Your Component

**React:**
```typescript
import { useState, useEffect } from 'react';
import { login, getMe } from './services/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await login(email, password);
      console.log('Login successful:', response);
      // Navigate to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### 5. Access Shared Data

**Get All Announcements:**
```typescript
const announcements = await apiCall('/api/announcements/', 'GET');
```

**Get Student Results:**
```typescript
const results = await apiCall('/api/results/', 'GET');
```

**Get Quiz Detail:**
```typescript
const quiz = await apiCall('/api/quizzes/123/', 'GET');
```

**Submit Quiz:**
```typescript
const submission = await apiCall('/api/quizzes/123/submit/', 'POST', {
  answers: {
    'question_1': 'A',
    'question_2': 'B',
  }
});
```

## Environment Setup

Create `.env` in your project:

```bash
# For local development
REACT_APP_API_URL=http://localhost:8000

# For production
# REACT_APP_API_URL=https://backend.yourapp.com
```

Then use in code:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

## Common Patterns

### Protected Routes
```typescript
function ProtectedRoute({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('nexus-auth-token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const user = await getMe();
        setUser(user);
      } catch (error) {
        localStorage.removeItem('nexus-auth-token');
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return children;
}
```

### Error Handling
```typescript
try {
  const data = await apiCall('/api/data/', 'GET');
} catch (error) {
  if (error.message.includes('401')) {
    // Token expired, redirect to login
    localStorage.removeItem('nexus-auth-token');
    window.location.href = '/login';
  } else {
    // Show error message
    console.error('API Error:', error.message);
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS Error | Make sure your frontend URL is in backend's `CORS_ALLOWED_ORIGINS` |
| 401 Unauthorized | Token missing or expired. Login again. |
| 404 Not Found | Endpoint doesn't exist. Check spelling and backend routes. |
| Connection Refused | Backend not running. Start: `python manage.py runserver` |
| Token not persisting | Check localStorage: `localStorage.getItem('nexus-auth-token')` |

## Available Endpoints

See **API_DOCUMENTATION.md** for complete list of endpoints.

## Need Help?

1. Check backend logs: `python manage.py runserver`
2. Check browser console for errors: `F12` → Console
3. Check network tab: `F12` → Network → click failed request
4. Verify token: `localStorage.getItem('nexus-auth-token')`

## Integration Complete! 🎉

Your website can now:
- Share the same user database
- Share authentication tokens
- Access all the same data as the Nexus website
- Create, read, update, and delete data

Start making API calls!
