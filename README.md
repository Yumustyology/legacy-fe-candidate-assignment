# 🔐 SignVerifyHub

A Web3 message signing and verification platform with wallet authentication and Multi-Factor Authentication.

## Tech Stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Query
**Backend**: Express.js, TypeScript, In-memory storage
**Authentication**: Dynamic.xyz (Email + OTP + MFA)
**Crypto**: Ethers.js for signature verification

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file in project root:
```bash
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id_here
```

Get your Environment ID from [Dynamic.xyz Dashboard](https://dynamic.xyz) → Settings → API Keys

### 3. Run Development Server
```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: Vite dev server (check terminal for URL)

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run dev:watch   # Development with file watching
npm test            # Run comprehensive test suite
```

## Testing

SignVerifyHub includes a **comprehensive test suite with 97/97 tests passing (100% success rate)**:

- **Frontend**: React component testing with React Testing Library
- **Backend**: API and storage layer testing with Vitest
- **Coverage**: All major user flows and edge cases validated
- **Clean Output**: Professional test reporting with no debug spam

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npx vitest run --coverage  # Run with coverage report
```

For detailed testing documentation, see [`test/README.md`](./test/README.md).

## Dynamic.xyz Setup

1. Create account at [Dynamic.xyz](https://dynamic.xyz)
2. Create new project
3. Configure:
   - **Wallet Connectors**: Enable Ethereum
   - **Authentication**: Email + OTP
   - **MFA**: Enable TOTP (optional)
   - **Allowed Origins**: Add your dev/prod URLs

## Deployment (Vercel)

1. Connect GitHub repository to Vercel
2. Add environment variable:
   ```
   VITE_DYNAMIC_ENVIRONMENT_ID=your_environment_id
   ```
3. Deploy automatically on push

## Features

- Wallet authentication with email + OTP
- Message signing and verification
- User-specific message history
- Optional Multi-Factor Authentication
- Real-time API status monitoring

## Trade-offs & Future Improvements

### Current Trade-offs

**In-Memory Storage**: Messages are stored in memory for simplicity but are lost on server restart
- **Trade-off**: Fast development vs data persistence
- **Impact**: Suitable for demo/MVP, not production scale

**No Database**: Avoided database complexity for rapid prototyping
- **Trade-off**: Simple setup vs scalable data management
- **Impact**: Limited to single-server deployment

**Client-Side Signing**: Messages are signed in the browser using wallet integration
- **Trade-off**: User convenience vs potential security considerations
- **Impact**: Requires user to have wallet installed and connected

### Areas for Improvement

**Data Persistence**:
- Replace in-memory storage with PostgreSQL or MongoDB
- Add proper database migrations and backup strategies
- Implement data retention policies

**Security Enhancements**:
- Add rate limiting for API endpoints
- Implement request signing for API authentication
- Add input sanitization beyond Zod validation
- Consider server-side message validation

**Performance & Scalability**:
- Add Redis caching for frequently accessed data
- Implement pagination for message history
- Add database indexing for user queries
- Consider CDN for static assets

**User Experience**:
- Add bulk message operations (select multiple, bulk delete)
- Implement message search and filtering
- Add export functionality for message history
- Improve mobile responsiveness

**Monitoring & Observability**:
- Add structured logging (Winston/Pino)
- Implement error tracking (Sentry)
- Add performance monitoring
- Create health check endpoints
