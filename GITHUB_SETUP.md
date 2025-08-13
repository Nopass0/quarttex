# GitHub Repository Setup Guide

This guide explains how to configure GitHub repository secrets for automated deployment of the Quattrex payment platform.

## Prerequisites

1. A server with Docker and Docker Compose installed
2. SSL certificates for quattrex.pro domain
3. SSH access to your deployment server
4. GitHub repository at https://github.com/Nopass0/quattrex

## Required GitHub Secrets

Go to your repository Settings → Secrets and variables → Actions, and add the following secrets:

### 1. Server Connection Secrets

- **SERVER_HOST**: Your server's IP address or hostname
  ```
  Example: 192.168.1.100 or server.example.com
  ```

- **SERVER_USER**: SSH username for deployment
  ```
  Example: root or deploy
  ```

- **SERVER_PORT**: SSH port (default is 22)
  ```
  Example: 22
  ```

- **SERVER_PASSWORD**: SSH password (alternative to SSH key)
  ```
  Your server user's password
  Note: You can use either password OR SSH key, or both
  ```

- **SERVER_SSH_KEY**: Private SSH key for authentication (optional if using password)
  ```
  Generate with: ssh-keygen -t ed25519 -C "github-deploy"
  Then add the public key to server's ~/.ssh/authorized_keys
  Copy the entire private key content including:
  -----BEGIN OPENSSH PRIVATE KEY-----
  [key content]
  -----END OPENSSH PRIVATE KEY-----
  ```

### 2. Application Configuration Secrets

- **PROJECT_PATH**: Absolute path to project directory on server
  ```
  Example: /home/deploy/quattrex or /opt/quattrex
  ```

- **DATABASE_URL**: Full PostgreSQL connection string
  ```
  Format: postgresql://username:password@host:port/database?schema=public
  Example: postgresql://user:pass@db.example.com:5432/quattrex?schema=public
  
  For external databases like Supabase, Neon, or DigitalOcean:
  - Supabase: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
  - Neon: postgresql://[USER]:[PASS]@[ENDPOINT].neon.tech/[DB]?sslmode=require
  - DigitalOcean: postgresql://doadmin:[PASS]@[CLUSTER].db.ondigitalocean.com:25060/defaultdb?sslmode=require
  ```

- **JWT_SECRET**: Secret key for JWT token generation
  ```
  Example: your-very-long-and-secure-jwt-secret-key-minimum-32-chars
  ```

- **SUPER_ADMIN_KEY**: Master admin access key
  ```
  Example: master-admin-key-keep-this-very-secure
  ```

- **ADMIN_IPS**: Comma-separated list of allowed admin IP addresses
  ```
  Example: 192.168.1.100,10.0.0.5
  Leave empty to allow all IPs (not recommended for production)
  ```

## Setup Instructions

### 1. Prepare Your Server

SSH into your server and create the project directory:

```bash
# Create project directory
sudo mkdir -p /opt/quattrex
sudo chown $USER:$USER /opt/quattrex
cd /opt/quattrex

# Clone repository
git clone https://github.com/Nopass0/quattrex.git .

# The deployment script will automatically install all dependencies:
# - Docker & Docker Compose
# - Node.js 20 & npm
# - Bun runtime
# - PostgreSQL client
# - All project dependencies

# Copy SSL certificates to the ssl/ directory
sudo cp /path/to/certificate.crt ssl/
sudo cp /path/to/certificate.key ssl/
sudo cp /path/to/certificate_ca.crt ssl/
sudo chmod 600 ssl/certificate.key
```

### Authentication Options

You can use either SSH key or password authentication:

**Option 1: SSH Key (More Secure)**
- Generate key: `ssh-keygen -t ed25519 -C "github-deploy"`
- Add public key to server: `ssh-copy-id user@server`
- Add private key to GitHub secret: `SERVER_SSH_KEY`

**Option 2: Password (Simpler)**
- Just add your server password to GitHub secret: `SERVER_PASSWORD`

**Option 3: Both**
- Add both `SERVER_SSH_KEY` and `SERVER_PASSWORD`
- SSH key will be tried first, password as fallback

### 2. Configure GitHub Repository

1. Go to https://github.com/Nopass0/quattrex/settings/secrets/actions
2. Click "New repository secret" for each secret listed above
3. Enter the name and value for each secret

### 3. Test Deployment

1. Push code to the main branch:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. Monitor the deployment:
   - Go to Actions tab in your GitHub repository
   - Watch the "Deploy to Production" workflow
   - Check for any errors in the logs

### 4. Verify Deployment

After successful deployment, verify:

1. **Check services are running**:
   ```bash
   ssh user@server "cd /opt/quattrex && docker-compose ps"
   ```

2. **Access the application**:
   - Frontend: https://quattrex.pro
   - API: https://quattrex.pro/api
   - Swagger: https://quattrex.pro/swagger

3. **Check logs if needed**:
   ```bash
   ssh user@server "cd /opt/quattrex && docker-compose logs -f"
   ```

## Troubleshooting

### Common Issues

1. **SSH connection failed**:
   - Verify SERVER_HOST, SERVER_USER, and SERVER_PORT are correct
   - If using SSH key: Ensure key is properly formatted (no extra spaces)
   - If using password: Make sure password is correct and SSH password auth is enabled
   - Check firewall rules allow SSH on the specified port

2. **Docker commands fail**:
   - Ensure Docker is installed on server
   - User might need to be in docker group: `sudo usermod -aG docker $USER`

3. **SSL certificate errors**:
   - Verify certificates are in the correct location: `/opt/quattrex/ssl/`
   - Check certificate permissions (readable by Docker)
   - Ensure certificate matches quattrex.pro domain

4. **Database connection errors**:
   - Check POSTGRES_PASSWORD matches in all places
   - Verify database container is running
   - Look at database logs: `docker-compose logs postgres`

### Manual Deployment

If automatic deployment fails, you can deploy manually:

```bash
# SSH to server
ssh user@server

# Navigate to project
cd /opt/quattrex

# Pull latest changes
git pull origin main

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:pass@external-db.com:5432/quattrex?schema=public
JWT_SECRET=your-jwt-secret
SUPER_ADMIN_KEY=your-admin-key
ADMIN_IPS=allowed-ips
NODE_ENV=production
EOF

# Deploy (using production config without local postgres)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Security Notes

1. **Keep secrets secure**: Never commit secrets to the repository
2. **Rotate keys regularly**: Update JWT_SECRET and SUPER_ADMIN_KEY periodically
3. **Monitor access**: Check logs for unauthorized access attempts
4. **Backup database**: Set up regular PostgreSQL backups
5. **Update dependencies**: Keep Docker images and dependencies updated

## Local Development

For local development, use the provided `run.sh` script:

```bash
chmod +x run.sh
./run.sh
```

This will:
- Create local .env files with development defaults
- Start PostgreSQL locally
- Run backend on http://localhost:3001
- Run frontend on http://localhost:3000
- Enable hot reload for both services