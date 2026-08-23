# Nexus University Django Backend - API Documentation

This Django backend serves as the central API for the Nexus University system. Multiple frontend applications can connect to it using token authentication.

## Architecture Overview

```
┌─────────────────────┐
│   Nexus Website     │
│   (React/Vite)      │
│   Port: 5173        │
└──────────┬──────────┘
           │
           │ HTTP/HTTPS
           │ Token Auth
           │
┌──────────▼──────────┐
│  Django Backend API │
│  (REST + Token Auth)│
│  Port: 8000         │
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│   Other Website     │
│   (Any Framework)   │
│   Any Port          │
└─────────────────────┘
```

## Environment Configuration

### For the Django Backend

Create a `.env` file in `backend/` directory:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=false
ALLOWED_HOSTS=localhost,127.0.0.1,backend.yourapp.com

# CORS - Allow both websites
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://nexus.yourapp.com,https://other-website.com
CORS_ALLOW_CREDENTIALS=true

# Database
DATABASE_URL=sqlite:///db.sqlite3

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# OTP
OTP_SECRET=your-secret-key
```

## Available REST Endpoints

### Authentication Endpoints

**POST /api/auth/signup/**
- Create new user account
- Body: `{ email, password, full_name, role? }`
- Returns: `{ token, user, profile }`

**POST /api/auth/login/**
- Authenticate user
- Body: `{ email, password }`
- Returns: `{ token, user, profile }`

**GET /api/auth/me/**
- Get authenticated user's profile
- Headers: `Authorization: Token {token}`
- Returns: `{ user, profile }`

**POST /api/auth/logout/**
- Invalidate user's token
- Headers: `Authorization: Token {token}`

**POST /api/auth/reset-password/**
- Reset user password
- Body: `{ email, new_password }`

### Student Data Endpoints

- `GET /api/programs/` - List all programs
- `GET /api/academic-calendar/` - Academic calendar
- `GET /api/announcements/` - List announcements
- `GET /api/announcements/{id}/` - Get announcement detail
- `GET /api/assignments/` - List assignments
- `GET /api/quizzes/` - List quizzes
- `GET /api/quizzes/{id}/` - Get quiz detail
- `POST /api/quizzes/{id}/submit/` - Submit quiz
- `GET /api/results/` - Get student results
- `GET /api/results/exams/` - Get exam results
- `GET /api/results/quizzes/` - Get quiz results
- `GET /api/students/` - List students (admin only)
- `GET /api/messages/` - List messages
- `GET /api/messages/{id}/` - Get message detail
- `POST /api/messages/send/` - Send message
- `GET /api/profile/` - Get student profile
- `GET /api/settings/` - Get user settings

## For the Other Website

### Step 1: Configure API Base URL

```javascript
// .env or .env.local
VITE_API_BASE_URL=http://localhost:8000  // Development
VITE_API_BASE_URL=https://backend.yourapp.com  // Production
```

### Step 2: Create API Helper

```typescript
// api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem('nexus-auth-token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Include cookies if using session auth
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}
```

### Step 3: Implement Login

```typescript
// auth.ts
export async function login(email: string, password: string) {
  const response = await apiCall('/api/auth/login/', 'POST', {
    email,
    password,
  });
  
  localStorage.setItem('nexus-auth-token', response.token);
  localStorage.setItem('nexus-user', JSON.stringify(response.user));
  localStorage.setItem('nexus-profile', JSON.stringify(response.profile));
  
  return response;
}

export async function signup(email: string, password: string, fullName: string) {
  const response = await apiCall('/api/auth/signup/', 'POST', {
    email,
    password,
    full_name: fullName,
  });
  
  localStorage.setItem('nexus-auth-token', response.token);
  return response;
}

export async function getProfile() {
  return apiCall('/api/auth/me/', 'GET');
}

export function logout() {
  localStorage.removeItem('nexus-auth-token');
  localStorage.removeItem('nexus-user');
  localStorage.removeItem('nexus-profile');
}
```

### Step 4: Use in Your Components

```typescript
// Example: Get student results
const results = await apiCall('/api/results/', 'GET');

// Example: Get announcements
const announcements = await apiCall('/api/announcements/', 'GET');
```

## Deployment

### Production Backend Setup

1. **Set environment variables on your server:**
   ```bash
   export SECRET_KEY=your-secure-key
   export DEBUG=false
   export ALLOWED_HOSTS=backend.yourapp.com
   export CORS_ALLOWED_ORIGINS=https://nexus.yourapp.com,https://other-website.com
   ```

2. **Use production WSGI server:**
   ```bash
   gunicorn nexus_backend.wsgi:application --bind 0.0.0.0:8000
   ```

3. **Or with Docker:**
   ```dockerfile
   FROM python:3.11
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["gunicorn", "nexus_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
   ```

## Security Checklist

- ✅ Token authentication (no session cookies)
- ✅ CORS properly configured for allowed origins only
- ✅ HTTPS in production (set `CSRF_TRUSTED_ORIGINS`)
- ✅ SECRET_KEY rotated in production
- ✅ DEBUG=false in production
- ✅ Database backups enabled
- ✅ Rate limiting configured (optional: add django-ratelimit)

## Testing Both Websites

**Terminal 1: Start Django**
```bash
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2: Start Nexus Website**
```bash
npm run dev  # Port 5173
```

**Terminal 3: Start Other Website**
```bash
npm run dev  # Port 3000 (or different port)
```

Both websites can now:
1. Share the same user database
2. Share the same authentication tokens
3. Access the same data through the API
4. Run independently on different ports/domains

## Troubleshooting

**CORS Error: "No 'Access-Control-Allow-Origin' header"**
- Check `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Ensure protocol (http/https) matches exactly

**401 Unauthorized**
- Token may be expired or invalid
- Clear `nexus-auth-token` from localStorage and re-login

**Token not persisting**
- Verify localStorage is working: `localStorage.setItem('test', 'value')`
- Check if browser privacy mode is clearing storage

**Connection refused on localhost:8000**
- Ensure Django server is running
- Check `ALLOWED_HOSTS` includes the client IP
