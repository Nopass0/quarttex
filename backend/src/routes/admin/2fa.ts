import { Elysia, t } from "elysia";
import { db } from "@/db";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import ErrorSchema from "@/types/error";

export const admin2faRoutes = new Elysia({ prefix: "/2fa" })
  // Get 2FA status for admin
  .get("/status", async ({ request }) => {
    const adminToken = request.headers.get("x-admin-key");
    
    // Check if it's master key (no 2FA required)
    const masterKey = Bun.env.SUPER_ADMIN_KEY;
    if (adminToken === masterKey) {
      return {
        success: true,
        data: {
          enabled: false,
          required: false,
          isMasterKey: true
        }
      };
    }

    // Find admin in database
    const admin = await db.admin.findUnique({
      where: { token: adminToken || "" },
      select: {
        id: true,
        twoFactorEnabled: true,
        role: true
      }
    });

    if (!admin) {
      return {
        success: false,
        error: "Admin not found"
      };
    }

    return {
      success: true,
      data: {
        enabled: admin.twoFactorEnabled,
        required: true,
        isMasterKey: false
      }
    };
  })

  // Setup 2FA - generate secret and QR code
  .post("/setup", async ({ request }) => {
    const adminToken = request.headers.get("x-admin-key");
    
    // Master key doesn't need 2FA
    const masterKey = Bun.env.SUPER_ADMIN_KEY;
    if (adminToken === masterKey) {
      return {
        success: false,
        error: "Master key doesn't require 2FA"
      };
    }

    const admin = await db.admin.findUnique({
      where: { token: adminToken || "" },
      select: { id: true, twoFactorEnabled: true }
    });

    if (!admin) {
      return {
        success: false,
        error: "Admin not found"
      };
    }

    if (admin.twoFactorEnabled) {
      return {
        success: false,
        error: "2FA is already enabled"
      };
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Chase Admin (${admin.id})`,
      issuer: "Chase Trading Platform"
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (not enabled yet)
    await db.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorSecret: secret.base32
      }
    });

    return {
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
        manualEntryKey: secret.base32
      }
    };
  })

  // Verify and enable 2FA
  .post("/enable", async ({ request, body }) => {
    const adminToken = request.headers.get("x-admin-key");
    const { token: totpToken } = body;

    const admin = await db.admin.findUnique({
      where: { token: adminToken || "" },
      select: { 
        id: true, 
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    });

    if (!admin) {
      return {
        success: false,
        error: "Admin not found"
      };
    }

    if (admin.twoFactorEnabled) {
      return {
        success: false,
        error: "2FA is already enabled"
      };
    }

    if (!admin.twoFactorSecret) {
      return {
        success: false,
        error: "2FA setup not initiated. Call /setup first"
      };
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 2 // Allow 2 time steps of variance
    });

    if (!verified) {
      return {
        success: false,
        error: "Invalid verification code"
      };
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable 2FA
    await db.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: true,
        backupCodes
      }
    });

    return {
      success: true,
      data: {
        backupCodes,
        message: "2FA enabled successfully. Save these backup codes in a secure place."
      }
    };
  }, {
    body: t.Object({
      token: t.String({ minLength: 6, maxLength: 6 })
    })
  })

  // Disable 2FA
  .post("/disable", async ({ request, body }) => {
    const adminToken = request.headers.get("x-admin-key");
    const { token: totpToken, backupCode } = body;

    const admin = await db.admin.findUnique({
      where: { token: adminToken || "" },
      select: { 
        id: true, 
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true
      }
    });

    if (!admin) {
      return {
        success: false,
        error: "Admin not found"
      };
    }

    if (!admin.twoFactorEnabled) {
      return {
        success: false,
        error: "2FA is not enabled"
      };
    }

    let verified = false;

    // Check TOTP token
    if (totpToken && admin.twoFactorSecret) {
      verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      });
    }

    // Check backup code
    if (!verified && backupCode) {
      verified = admin.backupCodes.includes(backupCode.toUpperCase());
    }

    if (!verified) {
      return {
        success: false,
        error: "Invalid verification code or backup code"
      };
    }

    // Disable 2FA
    await db.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: []
      }
    });

    return {
      success: true,
      message: "2FA disabled successfully"
    };
  }, {
    body: t.Object({
      token: t.Optional(t.String({ minLength: 6, maxLength: 6 })),
      backupCode: t.Optional(t.String())
    })
  })

  // Verify 2FA token (for login)
  .post("/verify", async ({ request, body }) => {
    const adminToken = request.headers.get("x-admin-key");
    const { token: totpToken, backupCode } = body;

    const admin = await db.admin.findUnique({
      where: { token: adminToken || "" },
      select: { 
        id: true, 
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true
      }
    });

    if (!admin) {
      return {
        success: false,
        error: "Admin not found"
      };
    }

    if (!admin.twoFactorEnabled) {
      return {
        success: true,
        message: "2FA not required"
      };
    }

    let verified = false;
    let usedBackupCode = false;

    // Check TOTP token
    if (totpToken && admin.twoFactorSecret) {
      verified = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      });
    }

    // Check backup code
    if (!verified && backupCode) {
      const backupCodeUpper = backupCode.toUpperCase();
      if (admin.backupCodes.includes(backupCodeUpper)) {
        verified = true;
        usedBackupCode = true;
        
        // Remove used backup code
        const updatedBackupCodes = admin.backupCodes.filter(code => code !== backupCodeUpper);
        await db.admin.update({
          where: { id: admin.id },
          data: { backupCodes: updatedBackupCodes }
        });
      }
    }

    if (!verified) {
      return {
        success: false,
        error: "Invalid verification code"
      };
    }

    return {
      success: true,
      message: usedBackupCode ? "Backup code used successfully" : "2FA verification successful"
    };
  }, {
    body: t.Object({
      token: t.Optional(t.String({ minLength: 6, maxLength: 6 })),
      backupCode: t.Optional(t.String())
    })
  });
