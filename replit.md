# replit.md

## Overview

This is a full-stack web application called "Secure Earn" - a GoodDollar tools platform that allows users to submit GoodDollar private keys for verification and earn rewards in local currency (Bangladeshi Taka). Users can then withdraw their earnings via bKash or Nagad mobile payment methods. The app features a guest-based authentication system with a mobile-first dark-themed UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui components (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a mobile-first design pattern with dark mode as default and emerald green accents. Components are organized in:
- `/client/src/pages/` - Route-level components (Login, Dashboard)
- `/client/src/components/` - Reusable components (KeySubmitter, WithdrawForm, TransactionList)
- `/client/src/components/ui/` - shadcn/ui primitive components
- `/client/src/hooks/` - Custom React hooks for auth, wallet, and API interactions

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **API Pattern**: REST endpoints defined in `/server/routes.ts` with Zod validation

The backend uses a shared schema approach where database models and API contracts are defined in `/shared/` and consumed by both client and server.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `/shared/schema.ts`
- **Tables**:
  - `users` - Guest ID, balance, timestamps
  - `transactions` - User transactions (earnings/withdrawals) with status tracking
  - `verification_pool` - Pool of private keys with `addedBy` contributor tracking and `isUsed` status
  - `submitted_numbers` - Numbers submitted by Telegram admins for payment with bKash/Nagad info
  - `reset_history` - History of admin resets with phone number, verified count, admin name, payment info, and timestamp
  - `settings` - Key-value settings store

### Authentication
- Guest-based authentication using a simple guest ID stored in localStorage
- Server-side sessions track authenticated users
- No password authentication - users create/access accounts by guest ID

### Key Features
1. **Private Key Submission**: Users submit GoodDollar private keys which are verified against the GD Identity contract on Celo network
2. **Balance System**: Verified keys earn 40 TK per submission
3. **Withdrawals**: Users can request withdrawals via bKash or Nagad with minimum 200 TK threshold
4. **Transaction History**: Full audit trail of earnings and withdrawals

## External Dependencies

### Blockchain Integration
- **ethers.js v6**: Used for Ethereum/Celo wallet operations
- **GoodDollar Identity Contract**: `0xC361A6E67822a0EDc17D899227dd9FC50BD62F42` on Celo mainnet
- **RPC Endpoint**: Celo Forno (`https://forno.celo.org`)

### Notifications
- **Telegram Bot API**: Sends notifications to admin when keys are submitted or withdrawals requested
- Bot Token and Chat ID are configured in `/server/routes.ts`

### Database
- **PostgreSQL**: Primary data store
- **Drizzle Kit**: Database migrations via `npm run db:push`
- Connection configured via `DATABASE_URL` environment variable

### UI Components
- **Radix UI**: Headless component primitives
- **Lucide React**: Icon library
- **date-fns**: Date formatting utilities

### Development Tools
- **Vite**: Development server with HMR
- **esbuild**: Production bundling for server
- **TypeScript**: Full type safety across stack