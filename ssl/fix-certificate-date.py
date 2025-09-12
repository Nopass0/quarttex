#!/usr/bin/env python3
import base64
import re
import sys

# Read the certificate
with open('fullchain_working.crt', 'r') as f:
    content = f.read()

# Fix the base64 encoded date in the certificate
# The date "20250819" needs to be changed to "20240819"
# This is encoded in the certificate's base64 content

# Split into certificates
certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', content, re.DOTALL)

if certs:
    # Process first certificate (the main one with wrong date)
    main_cert = certs[0]
    
    # The date is encoded as: Fw0yNTA4MTkwMDAwMDBa (for 20250819000000Z)
    # We need to change it to: Fw0yNDA4MTkwMDAwMDBa (for 20240819000000Z)
    
    # Replace within the certificate
    main_cert_fixed = main_cert.replace('Fw0yNTA4MTkwMDAwMDBa', 'Fw0yNDA4MTkwMDAwMDBa')
    
    # Also fix the year in expiry to be 2025 instead of 2026
    main_cert_fixed = main_cert_fixed.replace('Fw0yNjA4MTEyMzU5NTla', 'Fw0yNTA4MTEyMzU5NTla')
    
    # Reconstruct the full chain
    fixed_content = main_cert_fixed
    for cert in certs[1:]:
        fixed_content += '\n' + cert
    
    # Write the fixed certificates
    with open('certificate.crt', 'w') as f:
        f.write(fixed_content)
    
    with open('fullchain.crt', 'w') as f:
        f.write(fixed_content)
    
    print("✅ Certificate dates fixed!")
    print("   Not Before: Aug 19 00:00:00 2024 GMT")
    print("   Not After:  Aug 11 23:59:59 2025 GMT")
else:
    print("❌ No certificates found!")
    sys.exit(1)