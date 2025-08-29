/**
 * Утилиты для работы с RSA подписью в аукционной системе
 * Реализация согласно документации IE Cloud Summit
 */

import crypto from "crypto";
import forge from "node-forge";
import {
  AuctionOperation,
  SignatureUtils,
  RSAKeyPair,
  RSAKeyGenerator,
  AuctionErrorCode,
} from "@/types/auction";

/**
 * Реализация утилит подписи согласно документации
 */
class AuctionSignatureHelpers implements SignatureUtils {
  /**
   * Создает каноничную строку для подписи согласно документации
   * Формат: {timestamp}|{external_system_name}|{key_field}|{operation}
   */
  createCanonicalString(
    timestamp: number,
    externalSystemName: string,
    keyField: string,
    operation: AuctionOperation
  ): string {
    // Строгий формат согласно документации
    const canonical = `${timestamp}|${externalSystemName}|${keyField}|${operation}`;
    console.log(`[AuctionSignature] Canonical string: "${canonical}"`);
    return canonical;
  }

  /**
   * Подписывает каноничную строку приватным ключом (node-forge реализация)
   * Алгоритм: RSA-SHA256, ключ 2048 бит, результат в Base64
   */
  signCanonicalString(canonicalString: string, privateKeyPem: string): string {
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const md = forge.md.sha256.create();
      md.update(canonicalString, "utf8");
      const signature = privateKey.sign(md);
      const base64Signature = forge.util.encode64(signature);
      
      console.log(`[AuctionSignature] Signed string length: ${canonicalString.length}, signature length: ${base64Signature.length}`);
      return base64Signature;
    } catch (error) {
      console.error(`[AuctionSignature] Signing error:`, error);
      throw new Error(`Failed to sign canonical string: ${error}`);
    }
  }

  /**
   * Проверяет подпись публичным ключом (node-forge реализация)
   * Алгоритм: RSA-SHA256, проверка Base64 подписи
   */
  verifySignature(
    canonicalString: string,
    base64Signature: string,
    publicKeyPem: string
  ): boolean {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const md = forge.md.sha256.create();
      md.update(canonicalString, "utf8");
      const signatureBytes = forge.util.decode64(base64Signature);
      const isValid = publicKey.verify(md.digest().bytes(), signatureBytes);
      
      console.log(`[AuctionSignature] Verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error(`[AuctionSignature] Verification error:`, error);
      return false;
    }
  }

  /**
   * Проверяет валидность timestamp (±120 секунд согласно документации)
   */
  validateTimestamp(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    const isValid = diff <= 120; // ±2 минуты
    
    console.log(`[AuctionSignature] Timestamp validation: ${timestamp}, now: ${now}, diff: ${diff}s, valid: ${isValid}`);
    return isValid;
  }
}

/**
 * Генератор RSA ключей согласно документации
 */
class AuctionRSAKeyGenerator implements RSAKeyGenerator {
  /**
   * Генерирует пару RSA ключей 2048 бит
   * Формат: PKCS#8 (приватный), X.509 (публичный)
   */
  async generateKeyPair(): Promise<RSAKeyPair> {
    try {
      console.log(`[AuctionRSA] Generating 2048-bit RSA key pair...`);
      
      const keypair = forge.pki.rsa.generateKeyPair(2048);
      
      // Приватный ключ в формате PKCS#8
      const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
      
      // Публичный ключ в формате X.509
      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
      
      console.log(`[AuctionRSA] Key pair generated successfully`);
      console.log(`[AuctionRSA] Public key length: ${publicKeyPem.length}`);
      console.log(`[AuctionRSA] Private key length: ${privateKeyPem.length}`);
      
      return {
        publicKeyPem,
        privateKeyPem
      };
    } catch (error) {
      console.error(`[AuctionRSA] Key generation error:`, error);
      throw new Error(`Failed to generate RSA key pair: ${error}`);
    }
  }

  /**
   * Проверяет валидность ключей
   */
  validateKeyPair(publicKeyPem: string, privateKeyPem: string): boolean {
    try {
      // Проверяем что ключи можно загрузить
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      
      // Проверяем что ключи совпадают (тест подписи)
      const testString = "test_validation_string";
      const md = forge.md.sha256.create();
      md.update(testString, "utf8");
      
      const signature = privateKey.sign(md);
      
      const md2 = forge.md.sha256.create();
      md2.update(testString, "utf8");
      const isValid = publicKey.verify(md2.digest().bytes(), signature);
      
      console.log(`[AuctionRSA] Key pair validation: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error(`[AuctionRSA] Key validation error:`, error);
      return false;
    }
  }
}

/**
 * Валидация запроса с подписью
 */
export function validateAuctionRequest(
  headers: Record<string, string>,
  body: any,
  publicKeyPem: string,
  externalSystemName: string,
  keyField: string,
  operation: AuctionOperation
): { valid: boolean; error?: AuctionErrorCode; message?: string } {
  try {
    // Проверяем наличие заголовков
    const timestamp = headers["x-timestamp"] || headers["X-Timestamp"];
    const signature = headers["x-signature"] || headers["X-Signature"];

    if (!timestamp) {
      return {
        valid: false,
        error: "timestamp_invalid",
        message: "Missing X-Timestamp header"
      };
    }

    if (!signature) {
      return {
        valid: false,
        error: "signature_missing", 
        message: "Missing X-Signature header"
      };
    }

    // Проверяем timestamp
    const timestampNum = parseInt(timestamp);
    if (isNaN(timestampNum)) {
      return {
        valid: false,
        error: "timestamp_invalid",
        message: "Invalid timestamp format"
      };
    }

    const signatureUtils = new AuctionSignatureHelpers();
    
    if (!signatureUtils.validateTimestamp(timestampNum)) {
      return {
        valid: false,
        error: "timestamp_expired",
        message: "Timestamp is outside allowed window (±120 seconds)"
      };
    }

    // Создаем каноничную строку
    const canonical = signatureUtils.createCanonicalString(
      timestampNum,
      externalSystemName,
      keyField,
      operation
    );

    // Проверяем подпись
    const isSignatureValid = signatureUtils.verifySignature(
      canonical,
      signature,
      publicKeyPem
    );

    if (!isSignatureValid) {
      return {
        valid: false,
        error: "signature_invalid",
        message: "RSA signature verification failed"
      };
    }

    return { valid: true };
    
  } catch (error) {
    console.error(`[AuctionSignature] Validation error:`, error);
    return {
      valid: false,
      error: "signature_invalid",
      message: `Validation error: ${error}`
    };
  }
}

// Константы для аукционной системы
export const AUCTION_CONSTANTS = {
  MAX_RESPONSE_TIMEOUT: 5000, // 5 секунд согласно документации
  TIMESTAMP_TOLERANCE: 120,   // ±120 секунд
  RSA_KEY_SIZE: 2048,        // Размер RSA ключа
};

// Экспортируем экземпляры классов
export const auctionSignatureUtils = new AuctionSignatureHelpers();
export const auctionRSAKeyGenerator = new AuctionRSAKeyGenerator();

// Экспортируем классы для возможности наследования
export { AuctionSignatureHelpers, AuctionRSAKeyGenerator };