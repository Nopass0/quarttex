# SSL Certificate Setup for Production

## Problem: "Unable to verify the first certificate"

This error occurs when the SSL certificate chain is incomplete. API clients (like Postman, curl, or other services) cannot verify the certificate because intermediate certificates are missing.

## Solution

### 1. Prepare certificate files

You need these files in the `/ssl` directory:
- `certificate.key` - Private key
- `certificate.crt` - Your domain certificate  
- `certificate_ca.crt` - CA bundle with intermediate certificates

### 2. Create fullchain certificate

```bash
cd /path/to/chase/ssl
./create-fullchain.sh
```

Or manually:
```bash
cat certificate.crt certificate_ca.crt > fullchain.crt
```

### 3. Update nginx configuration

The nginx configuration is already set to use `fullchain.crt`. Just restart nginx:

```bash
docker-compose restart nginx
```

### 4. Verify the fix

Test with curl:
```bash
curl -v https://quattrex.pro/api/health
```

Test certificate chain:
```bash
openssl s_client -connect quattrex.pro:443 -servername quattrex.pro -showcerts
```

## Certificate providers instructions

### Let's Encrypt
Already provides `fullchain.pem` - just rename it to `fullchain.crt`

### Comodo/Sectigo
```bash
cat your_domain.crt COMODORSADomainValidationSecureServerCA.crt COMODORSAAddTrustCA.crt > fullchain.crt
```

### GoDaddy
```bash
cat your_domain.crt gd_bundle-g2-g1.crt > fullchain.crt
```

### RapidSSL/GeoTrust
```bash
cat your_domain.crt intermediate.crt > fullchain.crt
```

## Troubleshooting

If you still get SSL errors:

1. Check certificate order in fullchain.crt (your cert must be first)
2. Ensure no extra whitespace between certificates
3. Verify each certificate is properly formatted with:
   ```bash
   openssl x509 -in certificate.crt -text -noout
   ```
4. Check nginx error logs:
   ```bash
   docker-compose logs nginx
   ```