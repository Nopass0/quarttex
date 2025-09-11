import { db } from "@/db";
import { Aggregator, IntegrationDirection, AggregatorApiSchema } from "@prisma/client";
import axios from "axios";
import { pspwareAdapterService } from "./pspware-adapter.service";
import { rapiraService } from "./rapira.service";

export interface AggregatorDealRequest {
  ourDealId: string;
  amount: number;
  rate: number;
  paymentMethod: "SBP" | "C2C";
  bankType?: string;
  clientIdentifier?: string;
  callbackUrl: string;
  expiresAt?: string;
  metadata?: any;
  merchantId?: string;
  successUrl?: string;
  failureUrl?: string;
  merchantRate?: number;
}

export interface AggregatorDealResponse {
  accepted: boolean;
  partnerDealId?: string;
  requisites?: {
    id?: string;
    bankType?: string;
    cardNumber?: string;
    phoneNumber?: string;
    recipientName?: string;
    bankName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
  dealDetails?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    paymentMethod: string;
    metadata?: any;
  };
  message?: string;
  aggregator?: {
    id: string;
    name: string;
    apiBaseUrl: string | null;
  };
  // Формат ответа как у трейдера
  id?: string;
  numericId?: number;
  amount?: number;
  crypto?: number | null;
  status?: string;
  traderId?: string;
  createdAt?: string;
  updatedAt?: string;
  expired_at?: string;
  method?: {
    id: string;
    code: string;
    name: string;
    type: string;
    currency: string;
  };
}

export class AggregatorQueueService {
  private static instance: AggregatorQueueService;
  private lastUsedAggregatorId: string | null = null;
  private queueRotationTime = new Map<string, Date>();

  static getInstance(): AggregatorQueueService {
    if (!AggregatorQueueService.instance) {
      AggregatorQueueService.instance = new AggregatorQueueService();
    }
    return AggregatorQueueService.instance;
  }

  /**
   * Маппит русские названия банков на коды для валидации
   */
  public mapBankNameToCode(bankName: string): string {
    const bankMapping: { [key: string]: string } = {
      // Основные российские банки
      'Сбербанк': 'SBERBANK',
      'Сбер': 'SBERBANK',
      'sberbank': 'SBERBANK',
      'ВТБ': 'VTB',
      'vtb': 'VTB',
      'Альфа-Банк': 'ALFABANK',
      'Альфабанк': 'ALFABANK',
      'alfabank': 'ALFABANK',
      'Газпромбанк': 'GAZPROMBANK',
      'gazprombank': 'GAZPROMBANK',
      'Райффайзенбанк': 'RAIFFEISEN',
      'raiffeisenbank': 'RAIFFEISEN',
      'rayfayzen': 'RAIFFEISEN',
      'Почта Банк': 'POCHTABANK',
      'ПочтаБанк': 'POCHTABANK',
      'pochta-bank': 'POCHTABANK',
      'pochta': 'POCHTABANK',
      'Россельхозбанк': 'ROSSELKHOZBANK',
      'rosselhozbank': 'ROSSELKHOZBANK',
      'rshb': 'ROSSELKHOZBANK',
      'УралСиб': 'URALSIB',
      'uralsib': 'URALSIB',
      'Локо-Банк': 'LOKOBANK',
      'lockobank': 'LOKOBANK',
      'Ак Барс': 'AKBARS',
      'akbars': 'AKBARS',
      'ak_bars_bank': 'AKBARS',
      'МКБ': 'MKB',
      'mkb': 'MKB',
      'moscow_credit_bank': 'MKB',
      'СПБ': 'SPBBANK',
      'saint_petersburg_bank': 'SPBBANK',
      'bank-spb': 'SPBBANK',
      'bspb': 'SPBBANK',
      'МТС Банк': 'MTSBANK',
      'mts': 'MTSBANK',
      'mtcbank': 'MTSBANK',
      'mtsdengi_rub': 'MTSBANK',
      'Промсвязьбанк': 'PROMSVYAZBANK',
      'promsvyazbank': 'PROMSVYAZBANK',
      'promsvyaz': 'PROMSVYAZBANK',
      'Озон Банк': 'OZONBANK',
      'ozon': 'OZONBANK',
      'Ренессанс': 'RENAISSANCE',
      'rencredit': 'RENAISSANCE',
      'Отп Банк': 'OTPBANK',
      'otp': 'OTPBANK',
      'otp_rub': 'OTPBANK',
      'Авангард': 'AVANGARD',
      'avangard': 'AVANGARD',
      'akb-avangard': 'AVANGARD',
      'ВладБизнесБанк': 'VLADBUSINESSBANK',
      'vladbiznesbank': 'VLADBUSINESSBANK',
      'Таврический': 'TAVRICHESKIY',
      'tavrichesky_bank': 'TAVRICHESKIY',
      'tavrich': 'TAVRICHESKIY',
      'Фора Банк': 'FORABANK',
      'fora': 'FORABANK',
      'БЦС Банк': 'BCSBANK',
      'bcs': 'BCSBANK',
      'bcs_bank': 'BCSBANK',
      'bksbank': 'BCSBANK',
      'Хоум Кредит': 'HOMECREDIT',
      'home-credit': 'HOMECREDIT',
      'homecreditbank_kzt': 'HOMECREDIT',
      'ББР Банк': 'BBRBANK',
      'bbr-bank': 'BBRBANK',
      'Кредит Европа': 'CREDITEUROPE',
      'credit-europe-bank': 'CREDITEUROPE',
      'crediteurope': 'CREDITEUROPE',
      'РНКБ': 'RNKB',
      'rnkb': 'RNKB',
      'rncb': 'RNKB',
      'УБРиР': 'UBRIR',
      'ubrir-bank': 'UBRIR',
      'ubrib': 'UBRIR',
      'Генбанк': 'GENBANK',
      'genbank': 'GENBANK',
      'Синара': 'SINARA',
      'sinara': 'SINARA',
      'bank-sinara': 'SINARA',
      'Абсолют Банк': 'ABSOLUTBANK',
      'akb-absolut-bank': 'ABSOLUTBANK',
      'absolute_bank': 'ABSOLUTBANK',
      'МТС Деньги': 'MTSMONEY',
      'mtsdengi_rub': 'MTSMONEY',
      'Свой Банк': 'SVOYBANK',
      'svoi': 'SVOYBANK',
      'svoibank': 'SVOYBANK',
      'Транскапиталбанк': 'TRANSKAPITALBANK',
      'transcapital': 'TRANSKAPITALBANK',
      'Долинск': 'DOLINSK',
      'kb-dolinsk': 'DOLINSK',
      'Т-Банк': 'TBANK',
      'tbank': 'TBANK',
      'Совкомбанк': 'SOVCOMBANK',
      'sovkom': 'SOVCOMBANK',
      'sovkombank': 'SOVCOMBANK',
      'Росбанк': 'ROSBANK',
      'rosbank': 'ROSBANK',
      'ros_bank': 'ROSBANK',
      'ЮниКредит': 'UNICREDIT',
      'uni-credit': 'UNICREDIT',
      'unicreditbank': 'UNICREDIT',
      'Ситибанк': 'CITIBANK',
      'Русский Стандарт': 'RUSSIANSTANDARD',
      'russkiy-standart': 'RUSSIANSTANDARD',
      'rsb': 'RUSSIANSTANDARD',
      'Открытие': 'OTKRITIE',
      'otkitie': 'OTKRITIE',
      'ОТП': 'OTP',
      'otp_rub': 'OTP',
      'РНКБ': 'RNCB',
      'Райффайзен': 'RAIFFEISENBANK',
      'УралСиб Банк': 'URALSIBBANK',
      'УБРР Банк': 'UBRRBANK',
      'Цифра Банк': 'CIFRABANK',
      'cifra': 'CIFRABANK',
      'ДомРФ Банк': 'DOMRFBANK',
      'dom-rf': 'DOMRFBANK',
      'domrfbank': 'DOMRFBANK',
      'ВТБ Банк': 'VTBBANK',
      'Ак Барс Банк': 'AKBARSBANK',
      'Хоум Банк': 'HOMEBANK',
      'РенКредит Банк': 'RENCREDITBANK',
      'Зенит Банк': 'ZENITBANK',
      'zenit': 'ZENITBANK',
      'РСХБ Банк': 'RSHBBANK',
      'ПС Банк': 'PSBANK',
      'psb': 'PSBANK',
      'РС Банк': 'RSBANK',
      'Авангард Банк': 'AVANGARDBANK',
      'Солид Банк': 'SOLIDBANK',
      'solid-bank': 'SOLIDBANK',
      'solid': 'SOLIDBANK',
      'ДВ Банк': 'DVBANK',
      'dvbank': 'DVBANK',
      'dv-bank': 'DVBANK',
      'ЮниКредит Банк': 'UNICREDITBANK',
      'ЦМР Банк': 'CMRBANK',
      'cmr_bank': 'CMRBANK',
      'Свой Банк': 'SVOIBANK',
      'ИНГО Банк': 'INGOBANK',
      'ingo': 'INGOBANK',
      'МКБ Банк': 'MKBBANK',
      'Модуль Банк': 'MODULBANK',
      'module-bank': 'MODULBANK',
      'kb-modulbank': 'MODULBANK',
      'Яндекс Банк': 'YANDEXBANK',
      'yandex-bank': 'YANDEXBANK',
      'jandeks-bank': 'YANDEXBANK',
      'yandexpay': 'YANDEXBANK',
      'Юнистрим Банк': 'UNISTREAMBANK',
      'kb-unistream': 'UNISTREAMBANK',
      'unistream': 'UNISTREAMBANK',
      'БСПБ': 'BSPB',
      'Кубань Кредит': 'KUBANKREDIT',
      'kuban_credit': 'KUBANKREDIT',
      'kb-kuban-credit': 'KUBANKREDIT',
      'kkbank': 'KUBANKREDIT',
      'Новиком': 'NOVIKOM',
      'novikom': 'NOVIKOM',
      'novikombank': 'NOVIKOM',
      'АгроРосБанк': 'AGROROSBANK',
      'bank-agroros': 'AGROROSBANK',
      'Клуков Банк': 'KLOOKVABANK',
      'klyukva_bank': 'KLOOKVABANK',
      'ТКБ Банк': 'TKBBANK',
      'tkbbank': 'TKBBANK',
      'СНГБ Банк': 'SNGBBANK',
      'sngb': 'SNGBBANK',
      'РостФинанс Банк': 'ROSTFINANCEBANK',
      'rost_finance': 'ROSTFINANCEBANK',
      'Амра Банк': 'AMRABANK',
      'amra': 'AMRABANK',
      'Металлинвест Банк': 'METALLINVESTBANK',
      'metallinvestbank': 'METALLINVESTBANK',
      'metkombank': 'METALLINVESTBANK',
      'АБР Банк': 'ABRBANK',
      'abr': 'ABRBANK',
      'abrussia': 'ABRBANK',
      'Норвик Банк': 'NORVIKBANK',
      'norvikbank': 'NORVIKBANK',
      'Аврора Банк': 'AURORABANK',
      'aurora-bank': 'AURORABANK',
      'aurorabank': 'AURORABANK',
      'АТБ Банк': 'ATBBANK',
      'СДМ Банк': 'SDMBANK',
      'sdm': 'SDMBANK',
      'МП Банк': 'MPBANK',
      'mp-bank': 'MPBANK',
      'mp_bank': 'MPBANK',
      'НС Банк': 'NSBANK',
      'ns_bank': 'NSBANK',
      'Точка': 'TOCHKA',
      'tochka-bank': 'TOCHKA',
      'tochka_bank': 'TOCHKA',
      'Татсоц Банк': 'TATSOTSBANK',
      'tatsotsbank': 'TATSOTSBANK',
      'Севергаз Банк': 'SEVERGAZBANK',
      'severgazbank': 'SEVERGAZBANK',
      'ЮMoney': 'YOOMONEY',
      'yoomoney': 'YOOMONEY',
      'nko-umani': 'YOOMONEY',
      'umani': 'YOOMONEY',
      'Синара Банк': 'SINARABANK',
      'Купис Кошелек': 'CUPISWALLET',
      'cupis_rub': 'CUPISWALLET',
      'ФинСБ': 'FINSB',
      'Банк Долинск': 'BANKDOLINSK',
      'УМ Банк': 'UMBANK',
      'ПСКБ': 'PSKB',
      'pscb': 'PSKB',
      'bank_pskb': 'PSKB',
      'Экспо Банк': 'EXPOBANK',
      'expo-bank': 'EXPOBANK',
      'expobank': 'EXPOBANK',
      'Кошелев Банк': 'KOSHELEVBANK',
      'koshelev-bank': 'KOSHELEVBANK',
      'Банк Казани': 'BANKOFKAZAN',
      'bank-kazan': 'BANKOFKAZAN',
      'kber-bank-kazani': 'BANKOFKAZAN',
      'НСКБЛ': 'NSKBL',
      'nskbl': 'NSKBL',
      'ИПБ': 'IPB',
      'bank-ipb': 'IPB',
      'Локо Банк': 'LOCKOBANK',
      'Банк Оранж': 'BANKORANGE',
      'bank-orange': 'BANKORANGE',
      'bankorange': 'BANKORANGE',
      'А Банк': 'ABANK',
      'Живаго Банк': 'ZHIVAGOBANK',
      'bank_zhivago': 'ZHIVAGOBANK',
      'Пойдем Банк': 'POIDEMBANK',
      'kb_poidem': 'POIDEMBANK',
      'bank_pojdem': 'POIDEMBANK',
      'Прим Банк': 'PRIMBANK',
      'primbank': 'PRIMBANK',
      'ВБРР': 'VBRR',
      'vbrr': 'VBRR',
      'ГазЭнерго': 'GASENERGO',
      'gazenergobank': 'GASENERGO',
      'gebank': 'GASENERGO',
      'Банк Калуга': 'BANKKALUGA',
      'Тендер Банк': 'TENDERBANK',
      'tender-bank': 'TENDERBANK',
      'tenderbank': 'TENDERBANK',
      'МТС Деньги': 'MTSDENGI',
      'ДТБ1': 'DTB1',
      'dtb1': 'DTB1',
      'Челябинвест': 'CHELINVEST',
      'chelinvest': 'CHELINVEST',
      'Акцепт': 'AKCEPT',
      'akcept': 'AKCEPT',
      'akcept-bank': 'AKCEPT',
      'А Мобайл': 'AMOBILE',
      'amobile_rub': 'AMOBILE',
      'ПСБСТ': 'PSBST',
      'Юнайтед Банк': 'UNITEDBANK',
      'БСД Банк': 'BSDBANK',
      'bsdbank': 'BSDBANK',
      'Дата Банк': 'DATABANK',
      'databank': 'DATABANK',
      'datatabnk': 'DATABANK',
      'Хлынов': 'HLYNOV',
      'hlynov': 'HLYNOV',
      'bank-hlynov': 'HLYNOV',
      'kb-hlinov': 'HLYNOV',
      'Ланта': 'LANTA',
      'lanta': 'LANTA',
      'Национальный Стандарт Банк': 'NATIONALSTANDARTBANK',
      'bank-nacionalni-standart': 'NATIONALSTANDARTBANK',
      'Кредит Урал': 'CREDITURAL',
      'credit-ural-bank': 'CREDITURAL',
      'bank_kredit_ural': 'CREDITURAL',
      'Трансстрой Банк': 'TRANSSTROYBANK',
      'transstroybank': 'TRANSSTROYBANK',
      'Банк ВЛ': 'BANKVL',
      'Приовтб': 'PRIOVTB',
      'НИКО Банк': 'NICO_BANK',
      'nico_bank': 'NICO_BANK',
      'Итуруп Банк': 'ITURUPBANK',
      'iturup-bank': 'ITURUPBANK',
      'Реалист Банк': 'REALISTBANK',
      'realist-bank': 'REALISTBANK',
      'realistbank': 'REALISTBANK',
      'bank_reali': 'REALISTBANK',
      'Авито': 'AVITO',
      'avito': 'AVITO',
      'Юни Банк': 'UNIBANK',
      'uni': 'UNIBANK',
      'Автоторг Банк': 'AVTOTORGBANK',
      'avtotorgbank': 'AVTOTORGBANK',
      'Банк РМП': 'BANKRMP',
      'bank-rmp': 'BANKRMP',
      'bankrmp': 'BANKRMP',
      'БГФ Банк': 'BGFBANK',
      'bgf-bank': 'BGFBANK',
      'Энерго Банк': 'ENERGOBANK',
      'energobank': 'ENERGOBANK',
      'Финам Банк': 'FINAMBANK',
      'finam': 'FINAMBANK',
      'Таврич': 'TAVRICH',
      'Вайлдберриз': 'WILDBERRIES',
      'wb_rub': 'WILDBERRIES',
      'bank_wildberries': 'WILDBERRIES',
      'ДКТЖ': 'DCTJ',
      'Центринвест': 'CENTRINVEST',
      'centrinvest': 'CENTRINVEST',
      'Фин Банк': 'FINBANK',
      'finbank': 'FINBANK',
      'ДрайвКлик Банк': 'DRIVECLICKBANK',
      'drive-click-bank': 'DRIVECLICKBANK',
      'drajv-klik-bank': 'DRIVECLICKBANK',
      'Камком Банк': 'KAMKOMBANK',
      'kamkombank': 'KAMKOMBANK',
      'kamkom-bank': 'KAMKOMBANK',
      'ЭлПлат': 'ELPLAT',
      'elpat': 'ELPLAT',
      'pnko-elplat': 'ELPLAT',
      'Банка Интеза': 'BANCAINTESA',
      'bank-intesa': 'BANCAINTESA',
      'bancaintesa': 'BANCAINTESA',
      'ИЦБРУ': 'ICBRU',
      'Далена Банк': 'DALENABANK',
      'dalenabank': 'DALENABANK',
      'Аки Банк': 'AKIBANK',
      'akibank': 'AKIBANK',
      'КБХМБ': 'KBHMB',
      'kbhmb': 'KBHMB',
      'Эсхата': 'ESKHATA',
      'esxata_rub': 'ESKHATA',
      'Спитамен Банк': 'SPITAMENBANK',
      'spitamen_rub': 'SPITAMENBANK',
      'Энерготранс Банк': 'ENERGOTRANSBANK',
      'energotransbank': 'ENERGOTRANSBANK',
      'Ориен Банк': 'ORIENBANK',
      'orienbank': 'ORIENBANK',
      'Эконом Банк': 'ECONOMBANK',
      'econombank': 'ECONOMBANK',
      'Арванд Банк': 'ARVANDBANK',
      'arvard_rub': 'ARVANDBANK',
      'Социум Банк': 'SOCIUMBANK',
      'socium-bank': 'SOCIUMBANK',
      'ВЛББ': 'VLBB',
      'vlbb': 'VLBB',
      'Банк Саратов': 'BANKSARATOV',
      'banksaratov': 'BANKSARATOV',
      'bank-saratov': 'BANKSARATOV',
      'Форштадт': 'FORSHTADT',
      'forshtadt': 'FORSHTADT',
      'Еврофинанс': 'EVROFINANCE',
      'evrofinance': 'EVROFINANCE',
      'АНКБ': 'ANKB',
      'ankb': 'ANKB',
      'Челинд Банк': 'CHELINDBANK',
      'chelindbank': 'CHELINDBANK',
      'Амонат Бонк': 'AMONATBONK',
      'amonatbank_rub': 'AMONATBONK',
      'Евроальянс': 'EUROALLIANCE',
      'euroalliance': 'EUROALLIANCE',
      'ИН Банк': 'INBANK',
      'in-bank': 'INBANK',
      'Таухид Банк': 'TAWHIDBANK',
      'tavhidbank_rub': 'TAWHIDBANK',
      'Руснар Банк': 'RUSNARBANK',
      'rusnarbank': 'RUSNARBANK',
      'М10': 'M10',
      'm10_azerbaijan': 'M10',
      'ПУ Банк': 'PUBANK',
      'ОР Банк': 'ORBANK',
      'Банк Элита': 'BANKELITA',
      'bank-elita': 'BANKELITA',
      'bank_jelita': 'BANKELITA',
      'Газтранс Банк': 'GAZTRANSBANK',
      'gaztransbank': 'GAZTRANSBANK',
      'ВАСЛ': 'VASL',
      'nbko_vasl': 'VASL',
      'ИНВБ': 'INVB',
      'Куз Банк': 'KUZBANK',
      'kuznetskiy': 'KUZBANK',
      'kuznetskbusinessbank': 'KUZBANK',
      'БКТБ': 'BKTB',
      'bktb': 'BKTB',
      'ТКПБ': 'TKPB',
      'tkpb': 'TKPB',
      'ВК Пей': 'VKPAY',
      'vk': 'VKPAY',
      'Солид': 'SOLID',
      'Матин': 'MATIN',
      'matin': 'MATIN',
      'АЛ Банк': 'ALBANK',
      'Компаньон': 'KOMPANION',
      'companion': 'KOMPANION',
      'Бакай': 'BAKAI',
      'Bakai': 'BAKAI',
      'ИБТ': 'IBT',
      'Телселл': 'TELCELL',
      'telcell': 'TELCELL',
      'ЧБРР': 'CHBRR',
      'chbrr': 'CHBRR',
      'Альфа Банк Бай': 'ALFABANKBY',
      'alfabankby': 'ALFABANKBY',
      'Алиф': 'ALIF',
      'alif_rub': 'ALIF',
      'Маритим Банк': 'MARITIMEBANK',
      'maritimebank': 'MARITIMEBANK',
      'Хумо ТЖ': 'HUMOTJ',
      'humo': 'HUMOTJ',
      'humo_bank': 'HUMOTJ',
      'Лайф ТЖ': 'LIFETJ',
      'lifetj': 'LIFETJ',
      'Азизи Молия': 'AZIZIMOLIYA',
      'azizimoliya': 'AZIZIMOLIYA',
      'ФастШифт': 'FASTSHIFT',
      'fastshift': 'FASTSHIFT',
      'Гарант Банк': 'GARANTBANK',
      'garant-bank': 'GARANTBANK',
      'garantbank': 'GARANTBANK',
      'ТХ Банк': 'THBANK',
      'thbank': 'THBANK',
      'Ново Банк': 'NOVOBANK',
      'novo_bank': 'NOVOBANK',
      'ВТБ АМ': 'VTBAM',
      'ИБ АМ': 'IBAM',
      'Монета': 'MONETA',
      'moneta': 'MONETA',
      'Ола Банк': 'OLABANK',
      'ola-bank': 'OLABANK',
      'Метком': 'METCOM',
      'metcom': 'METCOM',
      'Рокет Банк': 'ROCKETBANK',
      'rocketbank': 'ROCKETBANK',
      'СБИ Банк ЛЛК': 'SBIBANKLLC',
      'sbi_bank': 'SBIBANKLLC',
      'Ипакюли Банк': 'IPAKYULIBANK',
      'ipac_yuli': 'IPAKYULIBANK',
      'М Банк': 'MBANK',
      'mb_bank': 'MBANK',
      'Узум Банк': 'UZUMBANK',
      'uzum': 'UZUMBANK',
      'Uzum': 'UZUMBANK'
    };

    // Сначала проверяем точное совпадение
    if (bankMapping[bankName]) {
      return bankMapping[bankName];
    }

    // Затем проверяем частичное совпадение (регистронезависимо)
    const lowerBankName = bankName.toLowerCase();
    for (const [key, value] of Object.entries(bankMapping)) {
      if (key.toLowerCase().includes(lowerBankName) || lowerBankName.includes(key.toLowerCase())) {
        return value;
      }
    }

    // Если ничего не найдено, возвращаем SBERBANK как дефолт
    return 'SBERBANK';
  }

  /**
   * Рассчитывает прибыль для сделки с агрегатором
   */
  private async calculateProfit(
    merchantId: string,
    methodId: string,
    aggregatorId: string,
    amountRub: number,
    usdtRubRate: number
  ): Promise<{
    merchantProfit: number;
    aggregatorProfit: number;
    platformProfit: number;
    merchantFeeInPercent: number;
    aggregatorFeeInPercent: number;
  }> {
    // Получаем ставку мерчанта
    const merchantMethod = await db.merchantMethod.findUnique({
      where: { merchantId_methodId: { merchantId, methodId } },
      include: { method: true }
    });

    const merchantFeeInPercent = merchantMethod?.method.commissionPayin || 0;

    // Получаем ставку агрегатора для этого мерчанта
    const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
      where: {
        aggregatorId_merchantId_methodId: {
          aggregatorId,
          merchantId,
          methodId
        }
      }
    });

    const aggregatorFeeInPercent = aggregatorMerchant?.feeIn || 0;

    // Рассчитываем прибыль в USDT
    const amountUsdt = amountRub / usdtRubRate;
    
    // Прибыль от мерчанта (ценник мерчанта)
    const merchantProfit = amountUsdt * (merchantFeeInPercent / 100);
    
    // Прибыль от агрегатора (ценник агрегатора)
    const aggregatorProfit = amountUsdt * (aggregatorFeeInPercent / 100);
    
    // Общая прибыль платформы
    const platformProfit = merchantProfit - aggregatorProfit;

    return {
      merchantProfit,
      aggregatorProfit,
      platformProfit,
      merchantFeeInPercent,
      aggregatorFeeInPercent
    };
  }

  /**
   * Получить следующего агрегатора из очереди
   * @param excludeIds - ID агрегаторов, которых нужно исключить из выбора
   * @param merchantId - ID мерчанта для фильтрации
   * @param methodId - ID метода для фильтрации
   */
  private async getNextAggregator(excludeIds: string[] = [], merchantId?: string, methodId?: string): Promise<Aggregator | null> {
    console.log(`[AggregatorQueue] getNextAggregator called with merchantId: ${merchantId}, methodId: ${methodId}, excludeIds: ${excludeIds.join(', ')}`);
    
    // Получаем всех активных агрегаторов, исключая уже попробованных
    const aggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        apiBaseUrl: { not: null },
        id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        // Фильтруем по мерчантам и методам, если указаны
        ...(merchantId && methodId ? {
          merchants: {
            some: {
              merchantId: merchantId,
              methodId: methodId,
              isTrafficEnabled: true
            }
          }
        } : {})
      },
      orderBy: [
        { priority: 'desc' }, // Сначала с высоким приоритетом
        { updatedAt: 'asc' }  // Затем давно не использованные
      ]
    });

    if (aggregators.length === 0) {
      console.log('[AggregatorQueue] No active aggregators found');
      return null;
    }

    console.log(`[AggregatorQueue] Found ${aggregators.length} active aggregators:`, aggregators.map(a => ({ 
      name: a.name, 
      email: a.email,
      isChaseProject: a.isChaseProject, 
      isChaseCompatible: a.isChaseCompatible,
      requiresInsuranceDeposit: a.requiresInsuranceDeposit,
      depositUsdt: a.depositUsdt,
      balanceUsdt: a.balanceUsdt,
      minBalance: a.minBalance
    })));

    // Фильтруем агрегаторов по балансу и дневному лимиту
    console.log(`[AggregatorQueue] Filtering ${aggregators.length} aggregators...`);
    const availableAggregators = aggregators.filter(agg => {
      console.log(`[AggregatorQueue] Checking aggregator ${agg.name}:`, {
        isActive: agg.isActive,
        isChaseProject: agg.isChaseProject,
        isChaseCompatible: agg.isChaseCompatible,
        requiresInsuranceDeposit: agg.requiresInsuranceDeposit,
        depositUsdt: agg.depositUsdt,
        balanceUsdt: agg.balanceUsdt,
        minBalance: agg.minBalance
      });
      // Проверка минимального депозита (1000 USDT) только если требуется страховой депозит
      if (agg.requiresInsuranceDeposit && agg.depositUsdt < 1000) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - insufficient deposit (${agg.depositUsdt} < 1000 USDT)`);
        return false;
      }

      // Проверка минимального баланса
      if (agg.minBalance > 0 && agg.balanceUsdt < agg.minBalance) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - insufficient balance`);
        return false;
      }

      // Проверка дневного объёма
      if (agg.maxDailyVolume && agg.currentDailyVolume >= agg.maxDailyVolume) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - daily volume exceeded`);
        return false;
      }

      // Проверка времени ротации (минимум 1 секунда между запросами к одному агрегатору)
      const lastRotation = this.queueRotationTime.get(agg.id);
      if (lastRotation && (Date.now() - lastRotation.getTime()) < 1000) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - too soon after last request`);
        return false;
      }

      return true;
    });

    if (availableAggregators.length === 0) {
      return null;
    }

    // Берём первого доступного агрегатора (уже отсортированы по приоритету)
    const selectedAggregator = availableAggregators[0];
    
    // Обновляем время последнего использования
    this.queueRotationTime.set(selectedAggregator.id, new Date());

    return selectedAggregator;
  }

  /**
   * Отправить запрос на создание сделки агрегатору
   */
  private async sendDealToAggregator(
    aggregator: Aggregator,
    request: AggregatorDealRequest,
    transactionId?: string
  ): Promise<AggregatorDealResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[AggregatorQueue] Sending deal to ${aggregator.name} (${aggregator.apiBaseUrl})`);
      console.log(`[AggregatorQueue] Aggregator flags:`, {
        isChaseProject: aggregator.isChaseProject,
        isChaseCompatible: aggregator.isChaseCompatible,
        apiSchema: aggregator.apiSchema
      });
      
      // Check if this is a Chase project or Chase-compatible aggregator
      // This check must come BEFORE apiSchema checks
      if (aggregator.isChaseProject || aggregator.isChaseCompatible) {
        const { chaseAdapterService } = await import('./chase-adapter.service');
        
        console.log(`[AggregatorQueue] Routing to Chase aggregator (isChaseProject: ${aggregator.isChaseProject}, isChaseCompatible: ${aggregator.isChaseCompatible}): ${aggregator.name}`);
        
        const chaseResult = await chaseAdapterService.createDeal({
          merchantId: request.merchantId || 'default',
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          bankType: request.bankType,
          callbackUrl: request.callbackUrl,
          successUrl: request.successUrl,
          failureUrl: request.failureUrl,
          metadata: request.metadata
        }, aggregator.id);
        
        // Log the integration
        const endpoint = aggregator.isChaseCompatible 
          ? `${aggregator.apiBaseUrl}/merchant/transactions/in`
          : `${aggregator.apiBaseUrl}/merchant/create-transaction`;
          
        // Формируем правильный запрос для логирования
        const chaseRequestForLog = aggregator.isChaseCompatible ? {
          amount: request.amount,
          orderId: request.ourDealId || `deal_${Date.now()}`,
          methodId: request.metadata?.methodId || 'default',
          rate: request.rate,
          expired_at: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          userIp: request.metadata?.userIp,
          clientIdentifier: request.clientIdentifier,
          callbackUri: request.callbackUrl || `${process.env.BASE_URL}/api/aggregator/chase-callback/${aggregator.id}`,
          isMock: request.metadata?.isMock || false,
        } : request;

        await this.logIntegration({
          aggregatorId: aggregator.id,
          direction: IntegrationDirection.OUT,
          eventType: 'chase_deal_create',
          method: 'POST',
          url: endpoint,
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-api-key': aggregator.apiToken
          },
          requestBody: chaseRequestForLog,
          responseBody: chaseResult,
          statusCode: chaseResult.success ? 200 : 400,
          responseTimeMs: Date.now() - startTime,
          slaViolation: (Date.now() - startTime) > (aggregator.maxSlaMs || 2000),
          ourDealId: transactionId,
          partnerDealId: chaseResult.transactionId || null,
          error: chaseResult.success ? null : chaseResult.error || null
        });
        
        if (chaseResult.success && chaseResult.transactionId) {
          console.log(`[AggregatorQueue] Chase aggregator accepted deal: ${chaseResult.transactionId}`);
          
          // Рассчитываем прибыль для сделки
          let profitData = null;
          if (transactionId && request.merchantId && request.metadata?.methodId) {
            try {
              // Получаем курс USDT/RUB
              const usdtRubRate = await rapiraService.getUsdtRubRate();
              
              profitData = await this.calculateProfit(
                request.merchantId,
                request.metadata.methodId,
                aggregator.id,
                request.amount,
                usdtRubRate
              );
            } catch (error) {
              console.error('[AggregatorQueue] Error calculating profit:', error);
            }
          }
          
          // Сохраняем ID партнерской сделки и данные о прибыли
          if (transactionId) {
            const updateData: any = { 
              partnerDealId: chaseResult.transactionId,
              aggregatorRequisites: chaseResult.requisites
            };
            
            if (profitData) {
              updateData.merchantProfit = profitData.merchantProfit;
              updateData.aggregatorProfit = profitData.aggregatorProfit;
              updateData.platformProfit = profitData.platformProfit;
              updateData.merchantFeeInPercent = profitData.merchantFeeInPercent;
              updateData.aggregatorFeeInPercent = profitData.aggregatorFeeInPercent;
              updateData.usdtRubRate = request.rate;
            }
            
            await db.transaction.update({
              where: { id: transactionId },
              data: updateData
            });
          }
          
          return {
            accepted: true,
            partnerDealId: chaseResult.transactionId,
            // Формат ответа как у трейдера
            id: transactionId || `agg_${Date.now()}`,
            numericId: Math.floor(Math.random() * 1000000),
            amount: request.amount,
            crypto: null,
            status: 'IN_PROGRESS',
            traderId: aggregator.id || `agg_${Date.now()}`, // Используем ID агрегатора как traderId
            requisites: chaseResult.requisites ? {
              id: `req_${Date.now()}`,
              bankType: this.mapBankNameToCode(chaseResult.requisites.bankName || chaseResult.requisites.bankCode || 'UNKNOWN'),
              cardNumber: chaseResult.requisites.cardNumber || '',
              phoneNumber: chaseResult.requisites.phoneNumber || '',
              recipientName: chaseResult.requisites.recipientName || '',
              bankName: chaseResult.requisites.bankName || '',
              bankCode: chaseResult.requisites.bankCode || '',
              additionalInfo: chaseResult.requisites.additionalInfo || ''
            } : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expired_at: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            method: {
              id: request.metadata?.methodId || 'default',
              code: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
              name: request.paymentMethod === 'SBP' ? 'СБП' : 'C2C',
              type: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
              currency: 'rub'
            },
            aggregator: {
              id: aggregator.id,
              name: aggregator.name,
              apiBaseUrl: aggregator.apiBaseUrl
            },
            message: 'Deal accepted by Chase aggregator'
          };
        } else {
          console.log(`[AggregatorQueue] Chase aggregator rejected deal: ${chaseResult.error}`);
          return {
            accepted: false,
            message: chaseResult.error || 'Chase aggregator rejected the deal'
          };
        }
      }
      
      // Check if aggregator uses PSPWare API schema
      if (aggregator.apiSchema === AggregatorApiSchema.PSPWARE) {
        console.log(`[AggregatorQueue] Using PSPWare adapter for ${aggregator.name}`);
        
        const pspwareResult = await pspwareAdapterService.sendDealToPSPWare(aggregator, {
          ourDealId: request.ourDealId,
          amount: request.amount,
          rate: request.rate,
          paymentMethod: request.paymentMethod,
          bankType: request.bankType,
          clientIdentifier: request.clientIdentifier,
          callbackUrl: request.callbackUrl,
          expiresAt: request.expiresAt,
          metadata: request.metadata
        });
        
        const responseTime = Date.now() - startTime;
        
        // Log integration
        const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
          ? aggregator.apiBaseUrl.slice(0, -9)
          : aggregator.apiBaseUrl;
        
        await this.logIntegration({
          aggregatorId: aggregator.id,
          direction: IntegrationDirection.OUT,
          eventType: 'pspware_deal_create',
          method: 'POST',
          url: `${baseUrl}/merchant/v2/orders`,
          headers: pspwareResult.actualHeaders || {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': aggregator.pspwareApiKey || aggregator.customApiToken || aggregator.apiToken
          },
          requestBody: pspwareResult.actualRequestBody || request,
          responseBody: pspwareResult.actualResponseBody || pspwareResult,
          statusCode: pspwareResult.success ? 200 : 400,
          responseTimeMs: responseTime,
          ourDealId: request.ourDealId,
          partnerDealId: pspwareResult.pspwareOrderId,
          slaViolation: responseTime > (aggregator.maxSlaMs || 2000),
          error: pspwareResult.error
        });
        
        if (pspwareResult.success) {
          console.log(`[AggregatorQueue] PSPWare deal accepted: ${pspwareResult.pspwareOrderId}`);
          
          // Рассчитываем прибыль для сделки
          let profitData = null;
          if (transactionId && request.merchantId && request.metadata?.methodId) {
            try {
              // Получаем курс USDT/RUB
              const usdtRubRate = await rapiraService.getUsdtRubRate();
              
              profitData = await this.calculateProfit(
                request.merchantId,
                request.metadata.methodId,
                aggregator.id,
                request.amount,
                usdtRubRate
              );
            } catch (error) {
              console.error('[AggregatorQueue] Error calculating profit:', error);
            }
          }
          
          // Сохраняем данные о прибыли в транзакцию
          if (transactionId && profitData) {
            await db.transaction.update({
              where: { id: transactionId },
              data: {
                partnerDealId: pspwareResult.pspwareOrderId,
                aggregatorRequisites: pspwareResult.requisites,
                merchantProfit: profitData.merchantProfit,
                aggregatorProfit: profitData.aggregatorProfit,
                platformProfit: profitData.platformProfit,
                merchantFeeInPercent: profitData.merchantFeeInPercent,
                aggregatorFeeInPercent: profitData.aggregatorFeeInPercent,
                usdtRubRate: request.rate,
              }
            });
          }
          
          // Update daily volume
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              currentDailyVolume: { increment: request.amount },
              updatedAt: new Date()
            }
          });
          
          return {
            accepted: true,
            partnerDealId: pspwareResult.pspwareOrderId,
            // Формат ответа как у трейдера
            id: transactionId || `agg_${Date.now()}`,
            numericId: Math.floor(Math.random() * 1000000),
            amount: request.amount,
            crypto: null,
            status: 'IN_PROGRESS',
            traderId: aggregator.id || `agg_${Date.now()}`, // Используем ID агрегатора как traderId
            requisites: pspwareResult.requisites ? {
              id: `req_${Date.now()}`,
              bankType: this.mapBankNameToCode(pspwareResult.requisites.bankName || pspwareResult.requisites.bankCode || 'UNKNOWN'),
              cardNumber: pspwareResult.requisites.cardNumber || '',
              phoneNumber: pspwareResult.requisites.phoneNumber || '',
              recipientName: pspwareResult.requisites.recipientName || '',
              bankName: pspwareResult.requisites.bankName || '',
              bankCode: pspwareResult.requisites.bankCode || '',
              additionalInfo: pspwareResult.requisites.additionalInfo || ''
            } : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            expired_at: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            method: {
              id: request.metadata?.methodId || 'default',
              code: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
              name: request.paymentMethod === 'SBP' ? 'СБП' : 'C2C',
              type: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
              currency: 'rub'
            },
            aggregator: {
              id: aggregator.id,
              name: aggregator.name,
              apiBaseUrl: aggregator.apiBaseUrl
            },
            message: pspwareResult.message
          };
        } else {
          console.log(`[AggregatorQueue] PSPWare deal rejected: ${pspwareResult.error}`);
          
          // Check if it's a NO_REQUISITE error
          const isNoRequisite = pspwareResult.error === 'NO_REQUISITE' || 
                                pspwareResult.message === 'NO_REQUISITE' ||
                                (pspwareResult.error && pspwareResult.error.includes('NO_REQUISITE'));
          
          return {
            accepted: false,
            message: isNoRequisite ? 'NO_REQUISITE' : (pspwareResult.error || pspwareResult.message || 'PSPWare rejected the deal')
          };
        }
      }
      
      // Default behavior for standard API schema
      const authToken = aggregator.customApiToken || aggregator.apiToken;
      
      // Определяем правильный эндпоинт в зависимости от типа агрегатора
      const endpoint = aggregator.isChaseCompatible 
        ? `${aggregator.apiBaseUrl}/merchant/transactions/in`
        : `${aggregator.apiBaseUrl}/deals`;
      
      // Формируем правильный запрос в зависимости от типа агрегатора
      let requestData = request;
      if (aggregator.isChaseCompatible) {
        requestData = {
          amount: request.amount,
          orderId: request.ourDealId || `deal_${Date.now()}`,
          methodId: request.metadata?.methodId || 'method_1a2b3c4d5e6f',
          rate: request.rate,
          expired_at: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          userIp: request.metadata?.userIp || '127.0.0.1',
          clientIdentifier: request.clientIdentifier || 'client_user_12345',
          callbackUri: request.callbackUrl || `${process.env.BASE_URL}/api/aggregator/chase-callback/${aggregator.id}`,
          // Убираем isMock - его нет в API
        };
      }
      
      console.log(`[AggregatorQueue] Sending request to ${endpoint}:`, requestData);
      
      const response = await axios.post(
        endpoint,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(aggregator.isChaseCompatible ? {
              'x-merchant-api-key': authToken
            } : {
              'Authorization': `Bearer ${authToken}`,
              'x-aggregator-token': authToken,
              'x-api-token': authToken
            })
          },
          timeout: aggregator.maxSlaMs || 2000,
          validateStatus: () => true // Принимаем любой статус для логирования
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Подготавливаем заголовки для логирования (маскируем чувствительные данные)
      const logHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [MASKED]',
        'x-aggregator-token': '[MASKED]',
        'x-api-token': '[MASKED]'
      };
      
      // Логируем интеграцию
      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: 'deal_create',
        method: 'POST',
        url: endpoint,
        headers: logHeaders,
        requestBody: requestData,
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs: responseTime,
        ourDealId: request.ourDealId,
        partnerDealId: response.data?.partnerDealId || response.data?.id,
        slaViolation: responseTime > (aggregator.maxSlaMs || 2000)
      });

      // Проверяем успешный ответ (как 200, так и 201)
      const isSuccess = (response.status === 200 || response.status === 201) && 
        (response.data?.accepted || (aggregator.isChaseCompatible && response.data?.id));
      
      if (isSuccess) {
        const partnerDealId = response.data?.partnerDealId || response.data?.id;
        console.log(`[AggregatorQueue] Deal accepted by ${aggregator.name}: ${partnerDealId}`);
        console.log(`[AggregatorQueue] Full response from ${aggregator.name}:`, {
          status: response.status,
          hasRequisites: !!response.data?.requisites,
          requisites: response.data?.requisites,
          fullData: response.data
        });
        
        // Рассчитываем прибыль для сделки
        let profitData = null;
        if (transactionId && request.merchantId && request.metadata?.methodId) {
          try {
            // Получаем курс USDT/RUB
            const usdtRubRate = await rapiraService.getUsdtRubRate();
            
            profitData = await this.calculateProfit(
              request.merchantId,
              request.metadata.methodId,
              aggregator.id,
              request.amount,
              usdtRubRate
            );
          } catch (error) {
            console.error('[AggregatorQueue] Error calculating profit:', error);
          }
        }
        
        // Сохраняем данные о прибыли в транзакцию
        if (transactionId && profitData) {
          await db.transaction.update({
            where: { id: transactionId },
            data: {
              partnerDealId: partnerDealId,
              aggregatorRequisites: response.data?.requisites,
              merchantProfit: profitData.merchantProfit,
              aggregatorProfit: profitData.aggregatorProfit,
              platformProfit: profitData.platformProfit,
              merchantFeeInPercent: profitData.merchantFeeInPercent,
              aggregatorFeeInPercent: profitData.aggregatorFeeInPercent,
              usdtRubRate: request.rate,
            }
          });
        }
        
        // Обновляем дневной объём агрегатора
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            currentDailyVolume: { increment: request.amount },
            updatedAt: new Date() // Обновляем время для ротации очереди
          }
        });

        // Возвращаем ответ в правильном формате
        return {
          accepted: true,
          partnerDealId: partnerDealId,
          // Формат ответа как у трейдера
          id: transactionId || `agg_${Date.now()}`,
          numericId: Math.floor(Math.random() * 1000000),
          amount: request.amount,
          crypto: null,
          status: 'IN_PROGRESS',
          traderId: aggregator.id, // Используем ID агрегатора как traderId
          requisites: response.data?.requisites ? {
            id: `req_${Date.now()}`,
            bankType: this.mapBankNameToCode(response.data.requisites.bankName || response.data.requisites.bankCode || 'UNKNOWN'),
            cardNumber: response.data.requisites.cardNumber || '',
            phoneNumber: response.data.requisites.phoneNumber || '',
            recipientName: response.data.requisites.recipientName || '',
            bankName: response.data.requisites.bankName || '',
            bankCode: response.data.requisites.bankCode || '',
            additionalInfo: response.data.requisites.additionalInfo || ''
          } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expired_at: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          method: {
            id: request.metadata?.methodId || 'default',
            code: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
            name: request.paymentMethod === 'SBP' ? 'СБП' : 'C2C',
            type: request.paymentMethod === 'SBP' ? 'sbp' : 'c2c',
            currency: 'rub'
          },
          aggregator: {
            id: aggregator.id,
            name: aggregator.name,
            apiBaseUrl: aggregator.apiBaseUrl
          },
          message: aggregator.isChaseCompatible ? 'Deal accepted by Chase-compatible aggregator' : 'Deal accepted by aggregator'
        };
      }

      console.log(`[AggregatorQueue] Deal rejected by ${aggregator.name}: ${response.data?.message || response.status}`);
      return {
        accepted: false,
        message: response.data?.message || `Rejected with status ${response.status}`
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Подготавливаем заголовки для логирования ошибки
      const errorLogHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [MASKED]',
        'x-aggregator-token': '[MASKED]',
        'x-api-token': '[MASKED]'
      };
      
      // Логируем ошибку
      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: 'deal_create_error',
        method: 'POST',
        url: `${aggregator.apiBaseUrl}/deals`,
        headers: errorLogHeaders,
        requestBody: request,
        statusCode: 0,
        responseTimeMs: responseTime,
        ourDealId: request.ourDealId,
        error: error instanceof Error ? error.message : String(error),
        slaViolation: true
      });

      console.error(`[AggregatorQueue] Error sending to ${aggregator.name}:`, error);
      
      return {
        accepted: false,
        message: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Рассчитать стоимость сделки для агрегатора и платформы
   */
  private async calculateDealCosts(
    aggregator: any,
    request: AggregatorDealRequest,
    merchantFeePercent: number = 0
  ): Promise<{
    aggregatorCostUsdt: number;
    merchantCostUsdt: number;
    platformProfit: number;
    rate: number;
    aggregatorFeePercent: number;
  }> {
    // Получаем источник курса для агрегатора
    const aggregatorRateSource = await db.aggregatorRateSource.findUnique({
      where: { aggregatorId: aggregator.id },
      include: { rateSource: true }
    });

    // Получаем базовый курс
    let rate = 100; // Default rate
    if (aggregatorRateSource?.rateSource) {
      rate = aggregatorRateSource.rateSource.baseRate || 100;
      
      // Применяем ККК агрегатора
      if (aggregatorRateSource.kkkPercent) {
        const kkkAmount = rate * (aggregatorRateSource.kkkPercent / 100);
        if (aggregatorRateSource.kkkOperation === 'PLUS') {
          rate += kkkAmount;
        } else {
          rate -= kkkAmount;
        }
      }
    }

    // Получаем процент агрегатора для данного метода
    let aggregatorFeePercent = 0;
    if (request.paymentMethod) {
      // Пытаемся найти метод по коду
      const method = await db.method.findFirst({
        where: { code: request.paymentMethod }
      });
      
      if (method) {
        const methodFee = await db.aggregatorMethodFee.findUnique({
          where: {
            aggregatorId_methodId: {
              aggregatorId: aggregator.id,
              methodId: method.id
            }
          }
        });
        
        if (methodFee && methodFee.isActive) {
          aggregatorFeePercent = methodFee.feePercent;
        }
      }
    }

    // Рассчитываем стоимости
    const baseUsdt = request.amount / rate;
    const aggregatorCostUsdt = baseUsdt * (1 + aggregatorFeePercent / 100);
    const merchantCostUsdt = baseUsdt * (1 + merchantFeePercent / 100);
    const platformProfit = merchantCostUsdt - aggregatorCostUsdt;

    return {
      aggregatorCostUsdt,
      merchantCostUsdt,
      platformProfit,
      rate,
      aggregatorFeePercent
    };
  }

  /**
   * Попытаться распределить сделку через агрегаторов
   */
  async routeDealToAggregators(
    request: AggregatorDealRequest,
    merchantFeePercent: number = 0,
    transactionId?: string
  ): Promise<{
    success: boolean;
    aggregator?: Aggregator;
    response?: AggregatorDealResponse;
    triedAggregators: string[];
    platformProfit?: number;
  }> {
    console.log(`[AggregatorQueue] Starting routing for deal:`, {
      ourDealId: request.ourDealId,
      amount: request.amount,
      paymentMethod: request.paymentMethod,
      merchantId: request.metadata?.merchantId
    });
    const triedAggregators: string[] = [];
    const maxAttempts = 10; // Максимум попыток (чтобы избежать бесконечного цикла)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Получаем следующего агрегатора из очереди, исключая уже попробованных
      const aggregator = await this.getNextAggregator(triedAggregators, request.metadata?.merchantId, request.metadata?.methodId);
      
      if (!aggregator) {
        console.log('[AggregatorQueue] No available aggregators');
        break;
      }

      console.log(`[AggregatorQueue] Selected aggregator: ${aggregator.name} (${aggregator.id})`);

      triedAggregators.push(aggregator.id);
      
      console.log(`[AggregatorQueue] Trying aggregator ${aggregator.name} (priority: ${aggregator.priority}, isChaseProject: ${aggregator.isChaseProject}, isChaseCompatible: ${aggregator.isChaseCompatible})`);

      // Рассчитываем стоимость сделки
      const costs = await this.calculateDealCosts(aggregator, request, merchantFeePercent);
      
      // Проверяем достаточность баланса с учетом замороженных средств
      const availableBalance = aggregator.balanceUsdt - aggregator.frozenBalance;
      
      // Если агрегатор работает без страхового депозита, пропускаем проверку баланса
      if (aggregator.requiresInsuranceDeposit && availableBalance < costs.aggregatorCostUsdt) {
        console.log(`[AggregatorQueue] Aggregator ${aggregator.name} has insufficient balance for deal (available: ${availableBalance} < ${costs.aggregatorCostUsdt})`);
        continue;
      }

      // Замораживаем баланс перед отправкой запроса
      if (aggregator.requiresInsuranceDeposit) {
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            frozenBalance: { increment: costs.aggregatorCostUsdt }
          }
        });
      }

      // Отправляем запрос агрегатору
      console.log(`[AggregatorQueue] Sending deal to aggregator ${aggregator.name} via sendDealToAggregator`);
      const response = await this.sendDealToAggregator(aggregator, request, transactionId);
      
      if (response.accepted) {
        // Размораживаем и списываем баланс, обновляем метрики и время использования
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            frozenBalance: aggregator.requiresInsuranceDeposit ? { decrement: costs.aggregatorCostUsdt } : undefined,
            balanceUsdt: { decrement: costs.aggregatorCostUsdt },
            totalPlatformProfit: { increment: costs.platformProfit },
            updatedAt: new Date() // Обновляем время, чтобы агрегатор ушел в конец очереди
          }
        });

        console.log(`[AggregatorQueue] Deal accepted by ${aggregator.name}:`, {
          amount: request.amount,
          rate: costs.rate,
          aggregatorCost: costs.aggregatorCostUsdt,
          platformProfit: costs.platformProfit
        });

        return {
          success: true,
          aggregator,
          response,
          triedAggregators,
          platformProfit: costs.platformProfit
        };
      } else {
        // Если сделка не принята, размораживаем баланс
        if (aggregator.requiresInsuranceDeposit) {
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              frozenBalance: { decrement: costs.aggregatorCostUsdt }
            }
          });
        }
      }

      console.log(`[AggregatorQueue] Aggregator ${aggregator.name} declined, trying next...`);
      console.log(`[AggregatorQueue] Response from ${aggregator.name}:`, response);
    }

    return {
      success: false,
      triedAggregators
    };
  }

  /**
   * Логирование интеграции
   */
  private async logIntegration(params: {
    aggregatorId: string;
    direction: IntegrationDirection;
    eventType: string;
    method: string;
    url: string;
    headers?: any;
    requestBody?: any;
    responseBody?: any;
    statusCode?: number;
    responseTimeMs?: number;
    ourDealId?: string;
    partnerDealId?: string;
    error?: string;
    slaViolation?: boolean;
  }) {
    try {
      await db.aggregatorIntegrationLog.create({
        data: {
          aggregatorId: params.aggregatorId,
          direction: params.direction,
          eventType: params.eventType,
          method: params.method,
          url: params.url,
          headers: params.headers || {}, // Переданные заголовки
          requestBody: params.requestBody || null,
          responseBody: params.responseBody || null,
          statusCode: params.statusCode || null,
          responseTimeMs: params.responseTimeMs || null,
          slaViolation: params.slaViolation || false,
          ourDealId: params.ourDealId || null,
          partnerDealId: params.partnerDealId || null,
          error: params.error || null,
        }
      });
    } catch (e) {
      console.error('[AggregatorQueue] Error logging integration:', e);
    }
  }

  /**
   * Сброс дневных объёмов (вызывается по расписанию)
   */
  async resetDailyVolumes() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await db.aggregator.updateMany({
      where: {
        lastVolumeReset: { lt: yesterday }
      },
      data: {
        currentDailyVolume: 0,
        lastVolumeReset: now
      }
    });
    
    console.log('[AggregatorQueue] Daily volumes reset');
  }
}

export const aggregatorQueueService = AggregatorQueueService.getInstance();