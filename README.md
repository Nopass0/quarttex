# QUATTREX Payment Platform

P2P payment platform with multi-role support (traders, merchants, agents, admins), focusing on the Russian market with bank card processing and crypto (USDT/TRC-20) integration.

## Tech Stack

- **Backend**: Bun + Elysia framework + Prisma ORM + PostgreSQL
- **Frontend**: Next.js 15 with App Router + React 19 + Tailwind CSS + Zustand
- **Infrastructure**: Docker Compose with Nginx reverse proxy

## Quick Start

### Development
```bash
npm run dev
```

### Production Deployment

#### Manual Deployment
1. Install Docker (if not installed):
```bash
bash scripts/install-docker.sh
```

2. Create `.env` file from example:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run deployment:
```bash
./deploy.sh
```

#### GitHub Actions Deployment
Add these secrets to your GitHub repository:
- `SERVER_HOST` - Server IP/domain
- `SERVER_USER` - SSH username
- `SERVER_PASSWORD` or `SERVER_SSH_KEY` - Authentication
- `SERVER_PORT` - SSH port (default: 22)
- `PROJECT_PATH` - Path on server
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key
- `SUPER_ADMIN_KEY` - Admin key
- `ADMIN_IPS` - Allowed IPs for admin panel

## Features

- Multi-role system (Traders, Merchants, Agents, Admins)
- Bank card payment processing
- USDT/TRC-20 integration
- Real-time transaction monitoring
- Mobile app support with device management
- Commission system for agents
- Advanced security with JWT and IP whitelisting

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed development instructions
- [SETUP.md](./SETUP.md) - Development environment setup
- [docs/SSL_CERTIFICATE_SETUP.md](docs/SSL_CERTIFICATE_SETUP.md) - SSL configuration
- [docs/wellbit-keys.md](docs/wellbit-keys.md) - API keys documentation
