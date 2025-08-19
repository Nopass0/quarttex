import { PayoutStatus, Status } from '@prisma/client'

/**
 * Maps internal statuses to Wellbit payment statuses
 * Supports both PayoutStatus and Status (Transaction) enums
 * 
 * Internal -> Wellbit mapping:
 * - CREATED, IN_PROGRESS -> new (платеж создан и в процессе)
 * - READY -> complete (платеж выполнен)
 * - CANCELED, EXPIRED -> cancel (платеж отменен)
 * - DISPUTE, MILK -> chargeback (возврат средств)
 */
export function mapToWellbitStatus(internalStatus: PayoutStatus | Status): string {
  // Handle PayoutStatus enum
  if (Object.values(PayoutStatus).includes(internalStatus as PayoutStatus)) {
    switch (internalStatus as PayoutStatus) {
      case PayoutStatus.CREATED:
      case PayoutStatus.ACTIVE:
        return 'new'
      
      case PayoutStatus.CHECKING:
      case PayoutStatus.COMPLETED:
        return 'complete'
      
      case PayoutStatus.CANCELLED:
      case PayoutStatus.EXPIRED:
        return 'cancel'
      
      case PayoutStatus.DISPUTED:
        return 'chargeback'
      
      default:
        return 'new'
    }
  }
  
  // Handle Status enum (Transaction)
  switch (internalStatus as Status) {
    case Status.CREATED:
    case Status.IN_PROGRESS:
      return 'new'

    case Status.READY:
      return 'complete'

    case Status.CANCELED:
    case Status.EXPIRED:
      return 'cancel'

    case Status.DISPUTE:
    case Status.MILK:
      return 'chargeback'
    
    default:
      return 'new'
  }
}

/**
 * Maps Wellbit payment statuses to internal payout statuses
 * 
 * Wellbit -> Internal mapping:
 * - new -> CREATED (новый платеж)
 * - complete -> COMPLETED (платеж выполнен)
 * - cancel -> CANCELLED (платеж отменен)
 * - chargeback -> DISPUTED (возврат средств)
 */
export function mapFromWellbitStatus(wellbitStatus: string): PayoutStatus {
  switch (wellbitStatus) {
    case 'new':
      return PayoutStatus.CREATED
    
    case 'complete':
      return PayoutStatus.COMPLETED
    
    case 'cancel':
      return PayoutStatus.CANCELLED
    
    case 'chargeback':
      return PayoutStatus.DISPUTED
    
    default:
      return PayoutStatus.CREATED // Default to created for unknown statuses
  }
}

/**
 * Maps Wellbit payment statuses to internal transaction statuses
 * 
 * Wellbit -> Internal mapping:
 * - new -> CREATED (новый платеж)
 * - complete -> READY (платеж выполнен)
 * - cancel -> CANCELLED (платеж отменен)
 * - chargeback -> MILK (возврат средств)
 */
export function mapFromWellbitStatusToTransaction(wellbitStatus: string): Status {
  switch (wellbitStatus) {
    case 'new':
      return Status.CREATED
    
    case 'complete':
      return Status.READY
    
    case 'cancel':
      return Status.CANCELED
    
    case 'chargeback':
      return Status.MILK
    
    default:
      return Status.CREATED // Default to created for unknown statuses
  }
}

/**
 * Get Wellbit status description in Russian
 */
export function getWellbitStatusDescription(status: string): string {
  switch (status) {
    case 'new':
      return 'Новый платеж. Статус присваивается платежу при создании.'
    case 'complete':
      return 'Платёж выполнен. Финальный статус.'
    case 'cancel':
      return 'Платёж отменен. Финальный статус.'
    case 'chargeback':
      return 'По платежу произведён возврат средств. Финальный статус.'
    default:
      return 'Неизвестный статус'
  }
}