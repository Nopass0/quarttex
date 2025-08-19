import axios from 'axios'
import { db } from '@/db'
import { WellbitCallbackService } from '@/services/WellbitCallbackService'
import crypto from 'crypto'

// Helper function to send callback and save to history
async function sendCallbackWithHistory(url: string, payload: any, transactionId: string, merchantId?: string) {
  let result: any = { url };
  
  // Проверяем, является ли мерчант Wellbit и подготавливаем соответствующий payload и headers
  let finalPayload = payload;
  let headers: any = { 'Content-Type': 'application/json' };
  
  if (merchantId) {
    const isWellbit = await WellbitCallbackService.isWellbitMerchant(merchantId);
    if (isWellbit) {
      console.log(`[Callback] Detected Wellbit merchant, using Wellbit callback format`);
      
      // Получаем ключи мерчанта для подписи
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: { apiKeyPrivate: true, apiKeyPublic: true }
      });
      
      // Маппим статус для Wellbit
      const statusMap: Record<string, string> = {
        'PENDING': 'new',
        'IN_PROGRESS': 'new',
        'READY': 'complete',
        'CANCELED': 'cancel',
        'EXPIRED': 'cancel',
        'FAILED': 'cancel',
        'REFUNDED': 'chargeback',
        'DISPUTE': 'appeal'
      };
      
      finalPayload = {
        callback: 'payment',
        payment_id: payload.id || transactionId,
        payment_status: statusMap[payload.status] || 'new'
      };
      
      // Добавляем публичный ключ, если есть
      if (merchant?.apiKeyPublic) {
        headers['x-api-key'] = merchant.apiKeyPublic;
      }

      // Добавляем HMAC подпись, если есть приватный ключ
      if (merchant?.apiKeyPrivate) {
        // Сортируем ключи и генерируем подпись
        const sortedPayload = Object.keys(finalPayload)
          .sort()
          .reduce((obj: any, key) => {
            obj[key] = finalPayload[key];
            return obj;
          }, {});

        const jsonString = JSON.stringify(sortedPayload);
        const signature = crypto.createHmac('sha256', merchant.apiKeyPrivate).update(jsonString).digest('hex');
        headers['x-api-token'] = signature;
      }
    }
  }
  
  try {
    console.log(`[Callback] Sending to ${url}:`, finalPayload);
    const res = await axios.post(url, finalPayload, { headers });
    result = { ...result, status: res.status, data: res.data };
    
    // Save successful callback to history
    try {
      await db.callbackHistory.create({
        data: {
          transactionId,
          url,
          payload: finalPayload,
          response: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
          statusCode: res.status
        }
      });
      console.log(`[Callback] Saved successful callback to history: ${url}`);
    } catch (dbError: any) {
      console.error(`[Callback] Failed to save callback history:`, dbError.message);
    }
  } catch (e: any) {
    console.error(`[Callback] Error sending to ${url}:`, e?.message);
    result = { ...result, error: e?.message ?? 'request failed' };
    
    // Save failed callback to history
    try {
      await db.callbackHistory.create({
        data: {
          transactionId,
          url,
          payload: finalPayload,
          error: e?.message ?? 'request failed',
          statusCode: e.response?.status || null
        }
      });
      console.log(`[Callback] Saved failed callback to history: ${url}`);
    } catch (dbError: any) {
      console.error(`[Callback] Failed to save error callback history:`, dbError.message);
    }
  }
  
  return result;
}

export async function notifyByStatus(trx: { 
  id: string; // This is orderId
  status: string; 
  successUri: string; 
  failUri: string;
  callbackUri?: string;
  amount?: number;
  merchantId?: string;
  transactionId?: string; // Real transaction ID for history
}) {
  const results = [];
  
  // Use transactionId for history, or try to find it by orderId
  let historyTransactionId = trx.transactionId;
  if (!historyTransactionId) {
    // Try to find transaction by orderId
    const transaction = await db.transaction.findFirst({
      where: { orderId: trx.id }
    });
    historyTransactionId = transaction?.id || trx.id;
  }
  
  // Формируем payload с id (orderId), amount и status
  const payload = {
    id: trx.id, // orderId for payload
    amount: trx.amount || 0,
    status: trx.status
  };
  
  // Отправляем на success/fail URL в зависимости от статуса
  if (trx.status === 'READY' && trx.successUri && trx.successUri !== 'none' && trx.successUri !== '') {
    const result = await sendCallbackWithHistory(trx.successUri, payload, historyTransactionId, trx.merchantId);
    results.push(result);
  } else if ((trx.status === 'CANCELED' || trx.status === 'EXPIRED') && trx.failUri && trx.failUri !== 'none' && trx.failUri !== '') {
    const result = await sendCallbackWithHistory(trx.failUri, payload, historyTransactionId, trx.merchantId);
    results.push(result);
  }
  
  // Всегда отправляем на callbackUri при любом изменении статуса
  if (trx.callbackUri && trx.callbackUri !== 'none' && trx.callbackUri !== '') {
    const result = await sendCallbackWithHistory(trx.callbackUri, payload, historyTransactionId, trx.merchantId);
    results.push(result);
  }
  
  return results.length > 0 ? results : undefined;
}

// Упрощенная функция для отправки callback'ов с минимальными данными
export async function sendTransactionCallbacks(transaction: any, status?: string) {
  const finalStatus = status || transaction.status;
  
  console.log(`[Callback] Sending callbacks for transaction ${transaction.id} with status ${finalStatus}`);
  
  return await notifyByStatus({
    id: transaction.orderId, // Pass orderId for payload
    transactionId: transaction.id, // Pass real transaction ID for history
    status: finalStatus,
    successUri: transaction.successUri || '',
    failUri: transaction.failUri || '',  
    callbackUri: transaction.callbackUri || '',
    amount: transaction.amount || 0,
    merchantId: transaction.merchantId || undefined
  });
}
