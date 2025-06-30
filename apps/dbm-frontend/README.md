# Database Backup Manager - Frontend

A modern frontend for the Database Backup Manager, providing an intuitive web interface for managing PostgreSQL backups.

## Features

- ✅ **Email/Password Authentication** - Sign up and sign in with email
- ✅ **Session Management** - Automatic session handling with Better Auth React hooks
- ✅ **User Profile Display** - Shows user and session information
- ✅ **Real-time Session Updates** - Live session state management
- ✅ **Error Handling** - Comprehensive error display and handling
- ✅ **Modern UI** - Built with Tailwind CSS
- ✅ **TypeScript** - Full type safety

## Quick Start

### 1. Install dependencies

```bash
# From the monorepo root
bun install
```

### 2. Copy env file

```bash
cp .env.example .env
```

### 3. Start the backend

```bash
bun run dev:auth
```

### 4. Start the client

```bash
# Make sure PostgreSQL is running
docker-compose up -d

# Start the auth backend
bun run dev:auth
```

### 5. Or run both together

```bash
# Start both backend and frontend
bun run dev
```

## Testing the Authentication Flow

1. **Open the app** at `http://localhost:5173`
2. **Sign Up** - Create a new account with email/password
3. **Sign In** - Log in with your credentials
4. **View Session** - See your user data and session info
5. **Sign Out** - Test the logout functionality

## API Endpoints Tested

- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Get current session
- `GET /api/auth/jwks` - JWT public keys (if JWT plugin enabled)
- `GET /api/auth/token` - Get JWT token (if JWT plugin enabled)

## Database Schema

The client tests the `auth` schema in PostgreSQL with these tables:

- `auth.user` - User accounts
- `auth.session` - User sessions
- `auth.account` - OAuth accounts (if used)
- `auth.verification` - Email verification tokens

## Configuration

The client is configured to connect to:

- **Backend URL**: `http://localhost:3000`
- **Frontend URL**: `http://localhost:5173`

To change the backend URL, edit `src/lib/auth-client.ts`:

```typescript
export const authClient = createAuthClient({
  baseURL: "http://your-backend-url", // Change this
});
```

## Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Better Auth** - Authentication library
- **Bun** - Package manager and runtime

## Troubleshooting

### "Network Error" when signing up/in

- Ensure the auth backend is running on `http://localhost:3000`
- Check that PostgreSQL is running (`docker-compose up -d`)
- Verify CORS is properly configured in the backend

### "Module not found" errors

- Run `bun install` from the monorepo root
- Check that `better-auth` is installed in the dependencies

### TypeScript errors

- Ensure you're using the latest version of Better Auth
- Check that all imports are correct

## Next Steps

Once basic auth is working, you can extend this test client to cover:

- OAuth providers (Google, GitHub, etc.)
- Email verification flows
- Password reset functionality
- Two-factor authentication
- Role-based access control
- JWT token management
