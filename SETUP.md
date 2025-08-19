# Development Environment Setup

## Prerequisites
- Linux (Ubuntu/Debian/CentOS) or macOS
- sudo access (for PostgreSQL installation)
- Git
- Node.js 18+ and npm
- Bun (optional, will use npm if not available)

## Quick Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd quattrex
   ```

2. **Make the setup script executable**:
   ```bash
   chmod +x setup-dev-environment.sh
   ```

3. **Run the setup script**:
   ```bash
   ./setup-dev-environment.sh
   ```

   This script will:
   - Install PostgreSQL (if not installed)
   - Create development database `quattrex_dev`
   - Create database user with secure password
   - Generate `.env` files for backend and frontend
   - Install project dependencies
   - Run database migrations
   - Create helper scripts in `.gpt/` directory

4. **Start the development servers**:
   ```bash
   # Using helper scripts
   ./.gpt/start-services.sh
   
   # Or manually
   cd backend && bun dev
   cd frontend && npm run dev
   ```

## Manual Setup (Alternative)

If you prefer to set up manually or the script fails:

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

### 2. Create Database
```bash
sudo -u postgres psql
```

```sql
CREATE USER quattrex_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE quattrex_dev OWNER quattrex_user;
GRANT ALL PRIVILEGES ON DATABASE quattrex_dev TO quattrex_user;
\q
```

### 3. Create .env files

**backend/.env**:
```env
DATABASE_URL="postgresql://quattrex_user:your_password@localhost:5432/quattrex_dev"
PORT=3000
JWT_SECRET=your_jwt_secret_here
ADMIN_KEY=your_admin_key_here
```

**frontend/.env.local**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/ws
```

### 4. Install Dependencies
```bash
# Backend
cd backend
bun install  # or npm install

# Frontend
cd ../frontend
npm install
```

### 5. Run Migrations
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### 6. Seed Database (optional)
```bash
cd backend
bun run seed
```

## Verify Installation

Run the health check:
```bash
./.gpt/health-check.sh
```

You should see:
- ✅ Backend is running
- ✅ Frontend is running
- ✅ Database is accessible

## Troubleshooting

### PostgreSQL Connection Issues
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify connection: `psql -U quattrex_user -d quattrex_dev -h localhost`

### Port Already in Use
- Kill processes on ports: 
  ```bash
  lsof -ti:3000 | xargs kill -9
  lsof -ti:3001 | xargs kill -9
  ```

### Permission Denied
- Make scripts executable: `chmod +x ./.gpt/*.sh`

### Build Errors
- Clear node_modules and reinstall:
  ```bash
  rm -rf backend/node_modules frontend/node_modules
  cd backend && bun install
  cd ../frontend && npm install
  ```

## Next Steps

1. Access the application at http://localhost:3001
2. Use test credentials from CLAUDE.md
3. Refer to AGENTS.md for development workflow
4. Use scripts in `.gpt/` for common tasks