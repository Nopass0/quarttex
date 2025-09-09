import { db } from '@/db'

/**
 * Получить курс для трейдера с учетом индивидуальных настроек
 */
export async function getTraderRate(traderId: string): Promise<{
  baseRate: number;
  kkkPercent: number;
  kkkOperation: 'PLUS' | 'MINUS';
  rate: number;
  source: 'rapira' | 'bybit';
  sourceName: string;
  isCustom: boolean;
}> {
  console.log(`[getTraderRate] Getting rate for trader: ${traderId}`)
  
  // Получаем активный источник курса для трейдера
  const traderData = await db.user.findUnique({
    where: { id: traderId },
    include: {
      rateSourceConfig: true
    }
  })
  
  console.log(`[getTraderRate] Trader data:`, traderData ? { 
    id: traderData.id, 
    email: traderData.email,
    rateSourceConfig: traderData.rateSourceConfig 
  } : null)

  if (!traderData?.rateSourceConfig) {
    // Если у трейдера нет привязанного источника, используем Rapira по умолчанию
    const defaultSource = await db.rateSourceConfig.findFirst({
      where: { source: 'rapira', isActive: true }
    })

    if (!defaultSource) {
      throw new Error('Нет доступных источников курса')
    }

    // Получаем базовый курс от Rapira
    let baseRate = null
    try {
      const { rapiraService } = await import("@/services/rapira.service")
      baseRate = await rapiraService.getUsdtRubRate()
    } catch (error) {
      baseRate = defaultSource.baseRate || 96.0
    }

    // Применяем процент КК источника
    const adjustedRate = baseRate * (1 + (defaultSource.kkkPercent / 100) * (defaultSource.kkkOperation === 'MINUS' ? -1 : 1))

    return {
      baseRate,
      kkkPercent: defaultSource.kkkPercent,
      kkkOperation: defaultSource.kkkOperation,
      rate: adjustedRate,
      source: defaultSource.source,
      sourceName: defaultSource.displayName,
      isCustom: false
    }
  }

  // Получаем индивидуальные настройки трейдера для этого источника
  const traderSettings = await db.traderRateSourceSettings.findUnique({
    where: {
      traderId_rateSourceId: {
        traderId: traderId,
        rateSourceId: traderData.rateSourceConfig.id
      }
    }
  })

  // Получаем базовый курс от источника
  let baseRate = null
  try {
    if (traderData.rateSourceConfig.source === 'bybit') {
      const { bybitService } = await import("@/services/bybit.service")
      baseRate = await bybitService.getUsdtRubRate()
    } else if (traderData.rateSourceConfig.source === 'rapira') {
      const { rapiraService } = await import("@/services/rapira.service")
      baseRate = await rapiraService.getUsdtRubRate()
    }
  } catch (error) {
    baseRate = traderData.rateSourceConfig.baseRate || (traderData.rateSourceConfig.source === 'bybit' ? 95.0 : 96.0)
  }

  // Определяем какой процент КК использовать
  let kkkPercent = traderData.rateSourceConfig.kkkPercent
  let kkkOperation = traderData.rateSourceConfig.kkkOperation
  let isCustom = false

  if (traderSettings && traderSettings.customKkkPercent !== null) {
    kkkPercent = traderSettings.customKkkPercent
    kkkOperation = traderSettings.customKkkOperation || 'MINUS'
    isCustom = true
  }

  // Применяем процент КК
  const adjustedRate = baseRate * (1 + (kkkPercent / 100) * (kkkOperation === 'MINUS' ? -1 : 1))

  return {
    baseRate,
    kkkPercent,
    kkkOperation,
    rate: adjustedRate,
    source: traderData.rateSourceConfig.source,
    sourceName: traderData.rateSourceConfig.displayName,
    isCustom
  }
}
