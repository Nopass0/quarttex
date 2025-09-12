# SSL Certificate Configuration

## Current Status
✅ SSL certificates configured with self-signed certificate for development
⚠️ For production, a valid SSL certificate from a Certificate Authority is required

## Certificate Files
- `ssl/certificate.crt` - Domain certificate  
- `ssl/certificate.key` - Private key (keep secure!)
- `ssl/fullchain.crt` - Full certificate chain (auto-generated)
- `ssl/certificate_ca.crt` - CA bundle (optional)

## Setup for Production

### Option 1: Let's Encrypt (Recommended)
Free SSL certificate with automatic renewal:
```bash
sudo ./ssl/setup-production-ssl.sh
# Choose option 1
```

### Option 2: Commercial SSL Certificate
If you have purchased an SSL certificate:
1. Place certificate files in `ssl/` directory
2. Run setup script:
```bash
./ssl/setup-production-ssl.sh
# Choose option 2
```

### Option 3: Keep Self-Signed (Development Only)
Current self-signed certificate is valid but will show security warnings in browsers.

## Deployment
SSL certificates are automatically deployed with the application:
```bash
./deploy-neon.sh
```

The nginx container will:
1. Mount the `ssl/` directory
2. Validate certificates on startup
3. Create fullchain.crt if needed
4. Configure HTTPS on port 443

## Testing SSL
After deployment, test SSL configuration:
```bash
# Check certificate
curl -I https://quattrex.pro

# Detailed SSL test
openssl s_client -connect quattrex.pro:443 -servername quattrex.pro
```

## Troubleshooting

### Certificate Not Working
1. Check certificate validity:
```bash
openssl x509 -in ssl/certificate.crt -noout -dates
```

2. Verify private key matches certificate:
```bash
openssl x509 -noout -modulus -in ssl/certificate.crt | openssl md5
openssl rsa -noout -modulus -in ssl/certificate.key | openssl md5
# Both commands should return the same MD5 hash
```

3. Check nginx logs:
```bash
docker logs quattrex_nginx
```

### Self-Signed Certificate Warnings
This is expected with self-signed certificates. For production, use Let's Encrypt or a commercial certificate.

## Security Notes
- Never commit private keys to version control
- Keep `certificate.key` file permissions at 600
- Use strong SSL ciphers (already configured in nginx)
- Enable HSTS for production (already configured)

## Auto-Renewal (Let's Encrypt)
If using Let's Encrypt, auto-renewal is configured via cron:
```bash
# Check renewal status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```