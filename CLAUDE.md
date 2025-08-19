# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
Quattrex is a P2P payment platform with multi-role support (traders, merchants, agents, admins), focusing on the Russian market with bank card processing and crypto (USDT/TRC-20) integration.

## Development Commands

### Running the Application
```bash
# Run both backend and frontend in development mode
npm run dev

# Run backend only (with watch mode)
cd backend && bun dev

# Run frontend only (with Turbopack)
cd frontend && npm run dev
```

### Database Management
```bash
# Run migrations
cd backend && npx prisma migrate dev

# Open Prisma Studio
cd backend && npx prisma studio

# Generate Prisma client
cd backend && npx prisma generate

# Seed database
cd backend && bun seed
cd backend && bun seed-admin  # Admin-specific seed
```

### Testing
```bash
# Run backend tests
cd backend && bun test

# Run specific test files
cd backend && bun test src/tests/admin.test.ts
cd backend && bun test src/tests/merchant.test.ts
cd backend && bun test src/tests/trader.test.ts
```

### Production
```bash
# Build and run with Docker
docker-compose up -d

# Backend production build
cd backend && bun build

# Frontend production build
cd frontend && npm run build
```

## Architecture Overview

### Tech Stack
- **Backend**: Bun + Elysia framework + Prisma ORM + PostgreSQL
- **Frontend**: Next.js 15 with App Router + React 19 + Tailwind CSS + Zustand
- **Infrastructure**: Docker Compose with Nginx reverse proxy

### Key Backend Components

1. **Service Architecture** (`/backend/src/services/`)
   - Base service pattern with registry for all services
   - Background services run via `runBackgroundServices()` including:
     - `DeviceEmulatorService`: Manages virtual devices
     - `DeviceHealthService`: Monitors device health
     - `NotificationService`: Handles push notifications
     - `TransactionWatcherService`: Monitors transaction states

2. **Multi-Role System**
   - **Traders**: Handle P2P transactions, manage bank cards and devices
   - **Merchants**: Create payment requests, configure payment methods
   - **Agents**: Manage trader teams, earn commissions
   - **Admins**: System administration with IP whitelist protection

3. **Authentication & Security**
   - JWT tokens with role-based access (`/backend/src/services/auth.service.ts`)
   - Device token authentication for mobile apps
   - Admin IP whitelist enforcement
   - Password hashing with bcrypt

4. **Transaction Flow**
   - Merchants create requests → Traders accept → Process via bank cards
   - Support for freezing/unfreezing trader balances
   - Commission system for agents
   - Multi-currency support (RUB, USDT)

### Key Frontend Components

1. **State Management**
   - Zustand stores in `/frontend/store/`
   - Separate stores for auth, user data, transactions

2. **UI Components**
   - Custom component library in `/frontend/components/ui/`
   - Built on Radix UI primitives with Tailwind styling
   - Form handling with react-hook-form and Zod validation

3. **Role-Based Routing**
   - `/app/(admin)/*` - Admin dashboard
   - `/app/(merchant)/*` - Merchant interface
   - `/app/(trader)/*` - Trader interface
   - `/app/(agent)/*` - Agent management

## Important Patterns

1. **API Endpoints**: Follow RESTful conventions with role prefixes (e.g., `/api/trader/*`, `/api/merchant/*`)

2. **Database Models**: Extensive use of Prisma relations, especially for User-Trader-Device relationships

3. **Error Handling**: Elysia's built-in error handling with custom error types

4. **Background Jobs**: Services implement `start()` and `stop()` methods for lifecycle management

5. **Device Management**: Complex device registration flow with tokens and health monitoring

## Testing Approach

- Backend uses Bun's built-in test runner
- Test files follow `*.test.ts` pattern
- Tests cover main user flows (admin, merchant, trader operations)
- Use test utilities from `/backend/src/tests/utils/`

## Development Best Practices

- **API Testing**: 
  - когда работаешь с эндпоинтами с бэкэнда убеждайся в их работе отправляя различные данные на этот эндпоинт прежде чем использовать его на фронтэнде

- **Import Verification**:
  - Всегда проверять в файле что все, что используется, импортировано