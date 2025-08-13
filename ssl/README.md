# SSL Certificate Setup

## Required files:

1. **certificate.key** - Private key
2. **certificate.crt** - Your domain certificate
3. **certificate_ca.crt** - CA bundle (intermediate certificates)
4. **fullchain.crt** - Full certificate chain (certificate + intermediates)

## Creating fullchain.crt

If you don't have fullchain.crt, create it by combining certificate and CA bundle:

```bash
cat certificate.crt certificate_ca.crt > fullchain.crt
```

## Certificate chain order

The correct order in fullchain.crt should be:
1. Your domain certificate
2. Intermediate certificate(s)
3. Root CA certificate (optional)

## Testing SSL certificate chain

Test your certificate chain:
```bash
openssl s_client -connect quattrex.pro:443 -servername quattrex.pro -showcerts
```

## Common SSL providers and their intermediate certificates

### Let's Encrypt
- Already provides fullchain.pem

### Comodo/Sectigo
- Usually provides: domain.crt, intermediate1.crt, intermediate2.crt
- Combine: `cat domain.crt intermediate1.crt intermediate2.crt > fullchain.crt`

### GoDaddy
- Provides: domain.crt and gd_bundle.crt
- Combine: `cat domain.crt gd_bundle.crt > fullchain.crt`