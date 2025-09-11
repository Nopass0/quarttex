import { db } from "../db";
import { TrafficType } from "@prisma/client";

export class TrafficClassificationService {
  private static instance: TrafficClassificationService;

  static getInstance(): TrafficClassificationService {
    if (!TrafficClassificationService.instance) {
      TrafficClassificationService.instance = new TrafficClassificationService();
    }
    return TrafficClassificationService.instance;
  }

  /**
   * Определяет тип трафика для выплаты на основе clientIdentifier
   * @param merchantId - ID мерчанта
   * @param clientIdentifier - Идентификатор клиента
   * @returns TrafficType (PRIMARY, SECONDARY, VIP)
   */
  async classifyPayoutTraffic(merchantId: string, clientIdentifier?: string): Promise<TrafficType> {
    // Если нет clientIdentifier, считаем первичным трафиком
    if (!clientIdentifier) {
      return TrafficType.PRIMARY;
    }

    // Подсчитываем количество успешных выплат от этого клиента у данного мерчанта
    const completedPayoutsCount = await db.payout.count({
      where: {
        merchantId,
        clientIdentifier,
        status: {
          in: ["SUCCESS", "COMPLETED"]
        }
      }
    });

    // Классификация трафика:
    // 0 выплат = первичный трафик
    // 1 выплата = вторичный трафик (это уже вторая выплата)
    // 10+ выплат = VIP трафик
    if (completedPayoutsCount === 0) {
      return TrafficType.PRIMARY;
    } else if (completedPayoutsCount >= 10) {
      return TrafficType.VIP;
    } else {
      return TrafficType.SECONDARY;
    }
  }

  /**
   * Определяет тип трафика для транзакции на основе clientIdentifier
   * @param merchantId - ID мерчанта
   * @param clientIdentifier - Идентификатор клиента
   * @returns TrafficType (PRIMARY, SECONDARY, VIP)
   */
  async classifyTransactionTraffic(merchantId: string, clientIdentifier?: string): Promise<TrafficType> {
    // Если нет clientIdentifier, считаем первичным трафиком
    if (!clientIdentifier) {
      return TrafficType.PRIMARY;
    }

    // Подсчитываем количество успешных транзакций от этого клиента у данного мерчанта
    const completedTransactionsCount = await db.transaction.count({
      where: {
        merchantId,
        clientIdentifier,
        status: "READY" // Успешные транзакции
      }
    });

    // Классификация трафика:
    // 0 транзакций = первичный трафик
    // 1 транзакция = вторичный трафик (это уже вторая транзакция)
    // 10+ транзакций = VIP трафик
    if (completedTransactionsCount === 0) {
      return TrafficType.PRIMARY;
    } else if (completedTransactionsCount >= 10) {
      return TrafficType.VIP;
    } else {
      return TrafficType.SECONDARY;
    }
  }

  /**
   * Универсальный метод для классификации трафика (обратная совместимость)
   */
  async classifyTraffic(merchantId: string, clientIdentifier?: string): Promise<TrafficType> {
    return this.classifyPayoutTraffic(merchantId, clientIdentifier);
  }

  /**
   * Получает трейдеров для выплат, которые работают с определенным типом трафика
   * @param trafficType - Тип трафика
   * @param merchantId - ID мерчанта
   * @param excludeTraderIds - ID трейдеров для исключения
   * @returns Массив ID трейдеров
   */
  async getEligibleTradersForPayoutTrafficType(
    trafficType: TrafficType,
    merchantId: string,
    excludeTraderIds: string[] = []
  ): Promise<string[]> {
    // Получаем трейдеров, подключенных к мерчанту с включенными выплатами
    const connectedTraders = await db.traderMerchant.findMany({
      where: {
        merchantId,
        isMerchantEnabled: true,
        isFeeOutEnabled: true,
      },
      select: { traderId: true },
    });

    const connectedTraderIds = connectedTraders.map(ct => ct.traderId);

    // Получаем трейдеров с настройками трафика
    const tradersWithTrafficSettings = await db.user.findMany({
      where: {
        id: { in: connectedTraderIds },
        banned: false,
        trafficEnabled: true,
        id: { notIn: excludeTraderIds },
        trafficSettings: {
          isEnabled: true,
          trafficType: trafficType,
        }
      },
      include: {
        trafficSettings: true,
      }
    });

    // Если нет трейдеров с настройками трафика для этого типа,
    // возвращаем всех доступных трейдеров (для обратной совместимости)
    if (tradersWithTrafficSettings.length === 0) {
      const allAvailableTraders = await db.user.findMany({
        where: {
          id: { in: connectedTraderIds },
          banned: false,
          trafficEnabled: true,
          id: { notIn: excludeTraderIds },
          // Либо нет настроек трафика, либо трафик отключен
          OR: [
            { trafficSettings: null },
            { trafficSettings: { isEnabled: false } }
          ]
        }
      });

      return allAvailableTraders.map(t => t.id);
    }

    return tradersWithTrafficSettings.map(t => t.id);
  }

  /**
   * Получает трейдеров для транзакций, которые работают с определенным типом трафика
   * @param trafficType - Тип трафика
   * @param merchantId - ID мерчанта
   * @param excludeTraderIds - ID трейдеров для исключения
   * @returns Массив ID трейдеров
   */
  async getEligibleTradersForTransactionTrafficType(
    trafficType: TrafficType,
    merchantId: string,
    excludeTraderIds: string[] = []
  ): Promise<string[]> {
    // Получаем трейдеров, подключенных к мерчанту с включенными входящими транзакциями
    const connectedTraders = await db.traderMerchant.findMany({
      where: {
        merchantId,
        isMerchantEnabled: true,
        isFeeInEnabled: true, // Для транзакций IN
      },
      select: { traderId: true },
    });

    const connectedTraderIds = connectedTraders.map(ct => ct.traderId);

    // Получаем трейдеров с настройками трафика
    const tradersWithTrafficSettings = await db.user.findMany({
      where: {
        id: { in: connectedTraderIds },
        banned: false,
        trafficEnabled: true,
        id: { notIn: excludeTraderIds },
        trafficSettings: {
          isEnabled: true,
          trafficType: trafficType,
        }
      },
      include: {
        trafficSettings: true,
      }
    });

    // Если нет трейдеров с настройками трафика для этого типа,
    // возвращаем всех доступных трейдеров (для обратной совместимости)
    if (tradersWithTrafficSettings.length === 0) {
      const allAvailableTraders = await db.user.findMany({
        where: {
          id: { in: connectedTraderIds },
          banned: false,
          trafficEnabled: true,
          id: { notIn: excludeTraderIds },
          // Либо нет настроек трафика, либо трафик отключен
          OR: [
            { trafficSettings: null },
            { trafficSettings: { isEnabled: false } }
          ]
        }
      });

      return allAvailableTraders.map(t => t.id);
    }

    return tradersWithTrafficSettings.map(t => t.id);
  }

  /**
   * Универсальный метод (обратная совместимость)
   */
  async getEligibleTradersForTrafficType(
    trafficType: TrafficType,
    merchantId: string,
    excludeTraderIds: string[] = []
  ): Promise<string[]> {
    return this.getEligibleTradersForPayoutTrafficType(trafficType, merchantId, excludeTraderIds);
  }

  /**
   * Проверяет, может ли трейдер взять выплату с учетом лимита контрагентов
   * @param traderId - ID трейдера
   * @param merchantId - ID мерчанта
   * @param clientIdentifier - Идентификатор клиента
   * @returns true, если трейдер может взять выплату
   */
  async canTraderTakePayout(
    traderId: string,
    merchantId: string,
    clientIdentifier?: string
  ): Promise<boolean> {
    // Получаем настройки трафика трейдера
    const trafficSettings = await db.trafficSettings.findUnique({
      where: { userId: traderId }
    });

    // Если настройки отключены, трейдер может взять любую выплату
    if (!trafficSettings || !trafficSettings.isEnabled) {
      return true;
    }

    // ВАЖНО: Если фильтрация включена, трейдер получает ТОЛЬКО выплаты с clientIdentifier
    if (!clientIdentifier) {
      console.log(`[TrafficClassification] Trader ${traderId} cannot take payout without clientIdentifier (filtering enabled)`);
      return false;
    }

    // Подсчитываем уникальных клиентов, с которыми работал трейдер от этого мерчанта
    const uniqueClientsCount = await db.payout.groupBy({
      by: ['clientIdentifier'],
      where: {
        traderId,
        merchantId,
        clientIdentifier: { not: null },
        status: {
          in: ["SUCCESS", "COMPLETED"]
        }
      },
      _count: {
        clientIdentifier: true
      }
    });

    const currentUniqueClients = uniqueClientsCount.length;

    // Проверяем, работал ли трейдер уже с этим клиентом
    const hasWorkedWithClient = await db.payout.findFirst({
      where: {
        traderId,
        merchantId,
        clientIdentifier,
        status: {
          in: ["SUCCESS", "COMPLETED"]
        }
      }
    });

    // Если уже работал с этим клиентом, может взять выплату
    if (hasWorkedWithClient) {
      return true;
    }

    // Если не работал и не достиг лимита, может взять
    return currentUniqueClients < trafficSettings.maxCounterparties;
  }

  /**
   * Проверяет, может ли трейдер взять транзакцию с учетом лимита контрагентов
   * @param traderId - ID трейдера
   * @param merchantId - ID мерчанта
   * @param clientIdentifier - Идентификатор клиента
   * @param counterpartyLimit - Лимит контрагентов из реквизита (опционально)
   * @returns true, если трейдер может взять транзакцию
   */
  async canTraderTakeTransaction(
    traderId: string,
    merchantId: string,
    clientIdentifier?: string,
    counterpartyLimit?: number
  ): Promise<boolean> {
    // Если есть counterpartyLimit из реквизита, используем его
    if (counterpartyLimit !== undefined && counterpartyLimit > 0) {
      // Если нет clientIdentifier и есть лимит, то нельзя взять сделку
      if (!clientIdentifier) {
        console.log(`[TrafficClassification] Trader ${traderId} cannot take transaction without clientIdentifier (counterpartyLimit=${counterpartyLimit})`);
        return false;
      }
    } else {
      // Если counterpartyLimit = 0 или не задан, проверяем настройки трафика трейдера
      const trafficSettings = await db.trafficSettings.findUnique({
        where: { userId: traderId }
      });

      // Если настройки отключены и нет counterpartyLimit, трейдер может взять любую транзакцию
      if (!trafficSettings || !trafficSettings.isEnabled) {
        return true;
      }

      // ВАЖНО: Если фильтрация включена в настройках трейдера, трейдер получает ТОЛЬКО сделки с clientIdentifier
      if (!clientIdentifier) {
        console.log(`[TrafficClassification] Trader ${traderId} cannot take transaction without clientIdentifier (filtering enabled in settings)`);
        return false;
      }
    }

    // Подсчитываем уникальных клиентов, с которыми работал трейдер от этого мерчанта по транзакциям
    const uniqueClientsCount = await db.transaction.groupBy({
      by: ['clientIdentifier'],
      where: {
        traderId,
        merchantId,
        clientIdentifier: { not: null },
        status: "READY" // Успешные транзакции
      },
      _count: {
        clientIdentifier: true
      }
    });

    const currentUniqueClients = uniqueClientsCount.length;

    // Проверяем, работал ли трейдер уже с этим клиентом
    const hasWorkedWithClient = await db.transaction.findFirst({
      where: {
        traderId,
        merchantId,
        clientIdentifier,
        status: "READY"
      }
    });

    // Если уже работал с этим клиентом, может взять транзакцию
    if (hasWorkedWithClient) {
      return true;
    }

    // Определяем какой лимит использовать
    let maxLimit: number;
    if (counterpartyLimit !== undefined && counterpartyLimit > 0) {
      // Используем лимит из реквизита
      maxLimit = counterpartyLimit;
    } else {
      // Используем лимит из настроек трейдера (если есть)
      const trafficSettings = await db.trafficSettings.findUnique({
        where: { userId: traderId }
      });
      maxLimit = trafficSettings?.maxCounterparties || Number.MAX_SAFE_INTEGER;
    }

    // Если не работал и не достиг лимита, может взять
    return currentUniqueClients < maxLimit;
  }
}

export const trafficClassificationService = TrafficClassificationService.getInstance();
