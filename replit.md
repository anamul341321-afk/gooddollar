# replit.md

## Overview

This is a full-stack web application called "Secure Earn" - a GoodDollar tools platform that allows users to submit GoodDollar private keys for verification and earn rewards in local currency (Bangladeshi Taka). Users can then withdraw their earnings via bKash or Nagad mobile payment methods. The app features a guest-based authentication system with a mobile-first dark-themed UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Project Structure
```
/
├── server/          - Backend Express.js server
│   ├── index.ts    - Server entry point (port 5000)
│   ├── routes.ts   - API route handlers
│   ├── db.ts       - Database connection (Drizzle + PostgreSQL)
│   ├── storage.ts  - Database access layer
│   ├── vite.ts     - Vite dev middleware + static serving + log()
│   └── static.ts   - Static file serving for production
├── client/          - React frontend
│   ├── index.html  - HTML entry point
│   └── src/
│       ├── main.tsx            - React entry point
│       ├── App.tsx             - Root component with routing
│       ├── index.css           - Global styles
│       ├── pages/              - Route-level components
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── AdminPanel.tsx
│       │   └── AddKeys.tsx
│       ├── components/         - Reusable components
│       │   ├── ui/             - shadcn/ui primitives
│       │   ├── KeySubmitter.tsx
│       │   ├── WithdrawForm.tsx
│       │   └── TransactionList.tsx
│       ├── hooks/              - Custom React hooks
│       │   ├── use-auth.ts
│       │   ├── use-earn.ts
│       │   ├── use-wallet.ts
│       │   ├── use-toast.ts
│       │   └── use-mobile.tsx
│       └── lib/
│           ├── queryClient.ts  - TanStack Query client
│           └── utils.ts        - Utility functions
├── shared/          - Shared types between client and server
│   ├── schema.ts   - Database schema (Drizzle ORM)
│   └── routes.ts   - API contract types
├── vite.config.ts  - Vite build configuration
├── tailwind.config.ts - Tailwind CSS v3 configuration
├── postcss.config.js  - PostCSS configuration
└── drizzle.config.ts  - Database migration configuration
```

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v3 with shadcn/ui components (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: express-session with MemoryStore
- **API Pattern**: REST endpoints in `server/routes.ts`

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Tables**:
  - `users` - Guest ID, balance, timestamps
  - `transactions` - User transactions (earnings/withdrawals)
  - `verification_pool` - Pool of private keys
  - `submitted_numbers` - Numbers submitted for payment
  - `reset_history` - History of admin resets
  - `settings` - Key-value settings store

### Authentication
- Guest-based authentication using guest ID (phone number)
- Server-side sessions with express-session
- Admin panel with password authentication

### Key Features
1. **Private Key Submission**: Users submit GoodDollar private keys verified on Celo network
2. **Balance System**: Verified keys earn TK per submission (configurable)
3. **Withdrawals**: Users request withdrawals via bKash or Nagad
4. **Transaction History**: Full audit trail
5. **Admin Panel**: User management, withdrawal approval, key pool management

## External Dependencies

### Blockchain Integration
- **ethers.js v6**: Ethereum/Celo wallet operations
- **GoodDollar Identity Contract**: `0xC361A6E67822a0EDc17D899227dd9FC50BD62F42` on Celo mainnet
- **RPC Endpoint**: Celo Forno (`https://forno.celo.org`)

### Optional Notifications
- **Telegram Bot API**: Sends notifications when keys submitted or withdrawals requested
- Configure via `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables

### Database
- **PostgreSQL**: Replit built-in database via `DATABASE_URL`
- **Drizzle Kit**: Schema management via `npm run db:push`

## Development
- Run: `NODE_ENV=development tsx server/index.ts`
- Port: 5000
- Database schema push: `npm run db:push`

## Deployment
- Build: `npm run build`
- Run: `node dist/index.js`
- Target: Autoscale
