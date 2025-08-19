# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- SSL certificates (see SSL Certificate Setup below)
- PostgreSQL database (can use the included one or external)

## SSL Certificate Setup

### Required Files

Place the following files in the `/ssl` directory:

1. `certificate.crt` - Your domain certificate
2. `certificate_ca.crt` - CA bundle with intermediate certificates  
3. `certificate.key` - Private key

### Create fullchain.crt (REQUIRED)

Since the SSL directory is mounted as read-only for security, you must create the fullchain certificate on the host:

```bash
cd ssl/
./create-fullchain.sh
```

Or manually:
```bash
cat ssl/certificate.crt ssl/certificate_ca.crt > ssl/fullchain.crt
chmod 644 ssl/fullchain.crt
```

### Alternative: Use existing fullchain

If you already have a fullchain certificate (e.g., from Let's Encrypt), you can:

1. Place `fullchain.crt` in the `/ssl` directory
2. Place `certificate.key` in the `/ssl` directory
3. Skip the fullchain creation step

### SSL Certificate Providers

See [docs/SSL_CERTIFICATE_SETUP.md](docs/SSL_CERTIFICATE_SETUP.md) for provider-specific instructions.

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/quattrex?schema=public

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
SUPER_ADMIN_KEY=your-admin-key
ADMIN_IPS=192.168.1.100,10.0.0.1

# Node environment
NODE_ENV=production
```

## Deployment Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nopass0/quattrex.git
cd quattrex
   ```

2. **Set up SSL certificates**
   ```bash
   # Copy your certificates to the ssl directory
   cp /path/to/certificate.crt ssl/
   cp /path/to/certificate_ca.crt ssl/
   cp /path/to/certificate.key ssl/
   
   # Create fullchain certificate
   cd ssl/
   ./create-fullchain.sh
   cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

5. **Run database migrations**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

6. **Verify deployment**
   ```bash
   # Check services are running
   docker-compose ps
   
   # Check nginx logs for SSL setup
   docker-compose logs nginx
   
   # Test HTTPS endpoint
   curl https://yourdomain.com/api/health
   ```

## Updating

To update to the latest version:

```bash
git pull origin main
docker-compose up -d --build
docker-compose exec backend npx prisma migrate deploy
```

## Troubleshooting

### SSL Certificate Issues

If you see "Unable to verify the first certificate" errors:

1. Check nginx logs: `docker-compose logs nginx`
2. Verify fullchain.crt was created: `docker-compose exec nginx ls -la /etc/nginx/ssl/`
3. Test certificate chain: `openssl s_client -connect yourdomain.com:443 -showcerts`

### Database Connection Issues

1. Check DATABASE_URL in .env
2. Verify database is accessible from Docker network
3. Check backend logs: `docker-compose logs backend`

### Performance Tuning

For production, consider:

1. Using an external PostgreSQL database
2. Adding Redis for caching
3. Configuring nginx worker processes based on CPU cores
4. Setting up monitoring with Prometheus/Grafana