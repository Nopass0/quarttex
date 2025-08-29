/**
 * Утилиты для подписи и верификации RSA-SHA256 в аукционной системе
 */

import crypto from "crypto";
import {
  AuctionOperation,
  SignatureUtils,
  RSAKeyPair,
  RSAKeyGenerator,
} from "../types/auction";

/**
 * Реализация утилит для работы с RSA подписями
 */
export class AuctionSignatureUtils implements SignatureUtils {
  /**
   * Создает каноничную строку для подписи
   * Формат: {timestamp}|{external_system_name}|{key_field}|{operation}
   */
  createCanonicalString(
    timestamp: number,
    externalSystemName: string,
    keyField: string,
    operation: AuctionOperation
  ): string {
    return `${timestamp}|${externalSystemName}|${keyField}|${operation}`;
  }

  /**
   * Подписывает каноничную строку приватным ключом RSA-SHA256
   */
  signCanonicalString(canonicalString: string, privateKeyPem: string): string {
    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(canonicalString, "utf8");
      const signature = sign.sign(privateKeyPem, "base64");
      return signature;
    } catch (error) {
      throw new Error(`Ошибка подписи: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Проверяет подпись публичным ключом RSA-SHA256
   */
  verifySignature(
    canonicalString: string,
    signature: string,
    publicKeyPem: string
  ): boolean {
    try {
      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(canonicalString, "utf8");
      return verify.verify(publicKeyPem, signature, "base64");
    } catch (error) {
      console.error("Ошибка верификации подписи:", error);
      return false;
    }
  }

  /**
   * Проверяет валидность timestamp (±120 секунд от текущего времени)
   */
  validateTimestamp(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    return diff <= 120; // ±120 секунд
  }

  /**
   * Создает заголовки для HTTP запроса с подписью
   */
  createSignedHeaders(
    canonicalString: string,
    privateKeyPem: string,
    timestamp?: number
  ): Record<string, string> {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const signature = this.signCanonicalString(canonicalString, privateKeyPem);

    return {
      "Content-Type": "application/json",
      "X-Timestamp": ts.toString(),
      "X-Signature": signature,
    };
  }

  /**
   * Валидирует входящие заголовки с подписью
   */
  validateIncomingHeaders(
    headers: Record<string, string>,
    canonicalString: string,
    publicKeyPem: string
  ): { valid: boolean; error?: string } {
    const timestamp = headers["x-timestamp"] || headers["X-Timestamp"];
    const signature = headers["x-signature"] || headers["X-Signature"];

    if (!timestamp) {
      return { valid: false, error: "timestamp_missing" };
    }

    if (!signature) {
      return { valid: false, error: "signature_missing" };
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return { valid: false, error: "timestamp_invalid" };
    }

    if (!this.validateTimestamp(timestampNum)) {
      return { valid: false, error: "timestamp_expired" };
    }

    if (!this.verifySignature(canonicalString, signature, publicKeyPem)) {
      return { valid: false, error: "signature_invalid" };
    }

    return { valid: true };
  }
}

/**
 * Генератор RSA ключей для аукционной системы
 */
export class AuctionRSAKeyGenerator implements RSAKeyGenerator {
  /**
   * Генерирует пару RSA ключей 2048 бит
   */
  async generateKeyPair(): Promise<RSAKeyPair> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        "rsa",
        {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
          },
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject(new Error(`Ошибка генерации ключей: ${err.message}`));
            return;
          }

          resolve({
            publicKeyPem: publicKey,
            privateKeyPem: privateKey,
          });
        }
      );
    });
  }

  /**
   * Проверяет валидность пары ключей
   */
  validateKeyPair(publicKeyPem: string, privateKeyPem: string): boolean {
    try {
      // Создаем тестовую строку для проверки
      const testString = "test_validation_string";
      const signatureUtils = new AuctionSignatureUtils();
      
      // Подписываем тестовую строку приватным ключом
      const signature = signatureUtils.signCanonicalString(testString, privateKeyPem);
      
      // Проверяем подпись публичным ключом
      return signatureUtils.verifySignature(testString, signature, publicKeyPem);
    } catch (error) {
      console.error("Ошибка валидации ключей:", error);
      return false;
    }
  }

  /**
   * Извлекает информацию о ключе (размер, алгоритм)
   */
  getKeyInfo(keyPem: string): { type: string; size: number } | null {
    try {
      const keyObject = crypto.createPublicKey(keyPem);
      return {
        type: keyObject.asymmetricKeyType || "unknown",
        size: keyObject.asymmetricKeySize || 0,
      };
    } catch (error) {
      console.error("Ошибка получения информации о ключе:", error);
      return null;
    }
  }
}

/**
 * Синглтон экземпляры для использования в приложении
 */
export const auctionSignatureUtils = new AuctionSignatureUtils();
export const auctionRSAKeyGenerator = new AuctionRSAKeyGenerator();

/**
 * Вспомогательные функции для работы с подписями
 */
export const AuctionSignatureHelpers = {
  /**
   * Создает каноничную строку для CreateOrder
   */
  createOrderCanonical(
    timestamp: number,
    externalSystemName: string,
    systemOrderId: string
  ): string {
    return auctionSignatureUtils.createCanonicalString(
      timestamp,
      externalSystemName,
      systemOrderId,
      "CreateOrder"
    );
  },

  /**
   * Создает каноничную строку для CancelOrder
   */
  cancelOrderCanonical(
    timestamp: number,
    externalSystemName: string,
    systemOrderId: string
  ): string {
    return auctionSignatureUtils.createCanonicalString(
      timestamp,
      externalSystemName,
      systemOrderId,
      "CancelOrder"
    );
  },

  /**
   * Создает каноничную строку для GetOrderStatus
   */
  getOrderStatusCanonical(
    timestamp: number,
    externalSystemName: string,
    systemOrderId: string
  ): string {
    return auctionSignatureUtils.createCanonicalString(
      timestamp,
      externalSystemName,
      systemOrderId,
      "GetOrderStatus"
    );
  },

  /**
   * Создает каноничную строку для CreateDispute
   */
  createDisputeCanonical(
    timestamp: number,
    externalSystemName: string,
    systemOrderId: string
  ): string {
    return auctionSignatureUtils.createCanonicalString(
      timestamp,
      externalSystemName,
      systemOrderId,
      "CreateDispute"
    );
  },

  /**
   * Создает каноничную строку для AuctionCallback
   */
  auctionCallbackCanonical(
    timestamp: number,
    externalSystemName: string,
    orderId: string
  ): string {
    return auctionSignatureUtils.createCanonicalString(
      timestamp,
      externalSystemName,
      orderId,
      "AuctionCallback"
    );
  },
};

/**
 * Константы для аукционной системы
 */
export const AUCTION_CONSTANTS = {
  /** Максимальное время ожидания ответа от внешней системы (5 секунд) */
  MAX_RESPONSE_TIMEOUT: 5000,
  
  /** Окно валидности timestamp (±120 секунд) */
  TIMESTAMP_WINDOW: 120,
  
  /** Размер RSA ключа в битах */
  RSA_KEY_SIZE: 2048,
  
  /** Алгоритм подписи */
  SIGNATURE_ALGORITHM: "RSA-SHA256",
  
  /** Формат приватного ключа */
  PRIVATE_KEY_FORMAT: "PKCS#8",
  
  /** Формат публичного ключа */
  PUBLIC_KEY_FORMAT: "X.509",
} as const;
