# Backend-Frontend Connection Guide

This document explains how the frontend is connected to the backend API and the authentication flow.

## Setup

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The default value is `http://localhost:8000` if not specified.

## API Client

The API client is located in `lib/api.ts` and provides:

- **Token Management**: Automatic storage and retrieval of JWT tokens
- **Automatic Token Refresh**: Handles token expiration and refresh
- **Error Handling**: Custom `ApiError` class for better error management
- **Type Safety**: TypeScript types for all API responses

### Available APIs

#### Auth API (`authApi`)
- `register(email, password)` - Register a new user
- `login(email, password)` - Login user
- `logout()` - Clear tokens
- `getMe()` - Get current user info

#### Projects API (`projectsApi`)
- `list()` - Get all projects
- `get(projectId)` - Get a specific project
- `create(name, description?)` - Create a new project
- `update(projectId, data)` - Update a project
- `delete(projectId)` - Delete a project

#### Health API (`healthApi`)
- `check()` - Check backend health status

## React Hooks

Custom hooks are available in `lib/hooks/useApi.ts`:

### `useHealthCheck()`
```tsx
const { check, loading, error, status } = useHealthCheck();
```

### `useAuth()`
```tsx
const { login, register, logout, getMe, loading, error, user } = useAuth();
```

### `useProjects()`
```tsx
const { fetchProjects, createProject, projects, loading, error } = useProjects();
```

## Usage Example

```tsx
"use client";

import { useAuth, useProjects } from '@/lib/hooks/useApi';

export default function MyComponent() {
  const { login, user, loading } = useAuth();
  const { fetchProjects, projects } = useProjects();

  const handleLogin = async () => {
    await login('user@example.com', 'password');
    if (user) {
      await fetchProjects();
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <p>Projects: {projects.length}</p>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

## Authentication Flow

### Login Page

The login page is available at `/login` and provides:
- Email/password login form
- Registration option (toggle between login/register)
- Automatic redirect to `/main` after successful authentication
- Error handling and validation

### Protected Routes

The `/main` page is protected and requires authentication:
- Unauthenticated users are automatically redirected to `/login`
- Authenticated users can access the canvas and all features
- Logout button is available in the top-left corner

### Auth Context

The `AuthContext` (`lib/contexts/AuthContext.tsx`) provides global authentication state:
- `user` - Current user object (null if not authenticated)
- `loading` - Loading state during auth checks
- `isAuthenticated` - Boolean indicating auth status
- `login(email, password)` - Login function
- `register(email, password)` - Registration function
- `logout()` - Logout function
- `checkAuth()` - Manually check authentication status

Usage:
```tsx
import { useAuth } from '@/lib/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  // ...
}
```

## Backend Connection Component

The `BackendConnection` component (`components/BackendConnection.tsx`) displays:
- Backend health status
- Current user info (if logged in)
- Project count
- Refresh button

It's already added to the main page at `/main`.

## CORS Configuration

The backend is configured to accept requests from `http://localhost:3000` by default. Make sure your backend's `CORS_ORIGINS` setting includes your frontend URL.

## Token Storage

Tokens are stored in `localStorage`:
- `access_token` - JWT access token
- `refresh_token` - JWT refresh token

Tokens are automatically included in API requests via the `Authorization` header.
