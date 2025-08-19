const BANKS_RAW = [
  {
    "code": "SBERBANK",
    "label": "Сбербанк"
  },
  {
    "code": "TBANK",
    "label": "Т-Банк"
  },
  {
    "code": "VTB",
    "label": "ВТБ"
  },
  {
    "code": "ALFABANK",
    "label": "Альфа-Банк"
  },
  {
    "code": "RAIFFEISEN",
    "label": "Райффайзенбанк"
  },
  {
    "code": "GAZPROMBANK",
    "label": "Газпромбанк"
  },
  {
    "code": "OTPBANK",
    "label": "ОТП Банк"
  },
  {
    "code": "OTKRITIE",
    "label": "Открытие"
  },
  {
    "code": "ROSBANK",
    "label": "Росбанк"
  },
  {
    "code": "PROMSVYAZBANK",
    "label": "Промсвязьбанк"
  },
  {
    "code": "SOVCOMBANK",
    "label": "Совкомбанк"
  },
  {
    "code": "POCHTABANK",
    "label": "Почта Банк"
  },
  {
    "code": "ROSSELKHOZBANK",
    "label": "Россельхозбанк"
  },
  {
    "code": "MKB",
    "label": "МКБ"
  },
  {
    "code": "URALSIB",
    "label": "Уралсиб"
  },
  {
    "code": "AKBARS",
    "label": "Ак Барс"
  },
  {
    "code": "SPBBANK",
    "label": "Банк Санкт-Петербург"
  },
  {
    "code": "MTSBANK",
    "label": "МТС Банк"
  },
  {
    "code": "OZONBANK",
    "label": "Озон Банк"
  },
  {
    "code": "RENAISSANCE",
    "label": "Ренессанс"
  },
  {
    "code": "OTP",
    "label": "ОТП Банк"
  },
  {
    "code": "AVANGARD",
    "label": "Авангард"
  },
  {
    "code": "RNKB",
    "label": "РНКБ"
  },
  {
    "code": "LOKOBANK",
    "label": "Локо-Банк"
  },
  {
    "code": "RUSSIANSTANDARD",
    "label": "Русский Стандарт"
  },
  {
    "code": "HOMECREDIT",
    "label": "Хоум Кредит"
  },
  {
    "code": "UNICREDIT",
    "label": "ЮниКредит"
  },
  {
    "code": "CITIBANK",
    "label": "Ситибанк"
  },
  {
    "code": "BCSBANK",
    "label": "БКС Банк"
  },
  {
    "code": "ABSOLUTBANK",
    "label": "Абсолют Банк"
  },
  {
    "code": "SVOYBANK",
    "label": "Свой Банк"
  },
  {
    "code": "TRANSKAPITALBANK",
    "label": "Транскапиталбанк"
  },
  {
    "code": "MTSMONEY",
    "label": "МТС Деньги"
  },
  {
    "code": "FORABANK",
    "label": "Фора-Банк"
  },
  {
    "code": "CREDITEUROPE",
    "label": "Кредит Европа"
  },
  {
    "code": "BBRBANK",
    "label": "ББР Банк"
  },
  {
    "code": "UBRIR",
    "label": "УБРиР"
  },
  {
    "code": "GENBANK",
    "label": "Генбанк"
  },
  {
    "code": "SINARA",
    "label": "Синара"
  },
  {
    "code": "VLADBUSINESSBANK",
    "label": "Владбизнесбанк"
  },
  {
    "code": "TAVRICHESKIY",
    "label": "Таврический"
  },
  {
    "code": "DOLINSK",
    "label": "Долинск"
  },
  {
    "code": "RNCB",
    "label": "RNCB"
  },
  {
    "code": "RAIFFEISENBANK",
    "label": "RAIFFEISENBANK"
  },
  {
    "code": "URALSIBBANK",
    "label": "URALSIBBANK"
  },
  {
    "code": "UBRRBANK",
    "label": "UBRRBANK"
  },
  {
    "code": "CIFRABANK",
    "label": "CIFRABANK"
  },
  {
    "code": "DOMRFBANK",
    "label": "DOMRFBANK"
  },
  {
    "code": "VTBBANK",
    "label": "VTBBANK"
  },
  {
    "code": "AKBARSBANK",
    "label": "AKBARSBANK"
  },
  {
    "code": "HOMEBANK",
    "label": "HOMEBANK"
  },
  {
    "code": "RENCREDITBANK",
    "label": "RENCREDITBANK"
  },
  {
    "code": "ZENITBANK",
    "label": "ZENITBANK"
  },
  {
    "code": "RSHBBANK",
    "label": "RSHBBANK"
  },
  {
    "code": "PSBANK",
    "label": "PSBANK"
  },
  {
    "code": "RSBANK",
    "label": "RSBANK"
  },
  {
    "code": "AVANGARDBANK",
    "label": "AVANGARDBANK"
  },
  {
    "code": "SOLIDBANK",
    "label": "SOLIDBANK"
  },
  {
    "code": "DVBANK",
    "label": "DVBANK"
  },
  {
    "code": "UNICREDITBANK",
    "label": "UNICREDITBANK"
  },
  {
    "code": "CMRBANK",
    "label": "CMRBANK"
  },
  {
    "code": "SVOIBANK",
    "label": "SVOIBANK"
  },
  {
    "code": "INGOBANK",
    "label": "INGOBANK"
  },
  {
    "code": "MKBBANK",
    "label": "MKBBANK"
  },
  {
    "code": "MODULBANK",
    "label": "MODULBANK"
  },
  {
    "code": "YANDEXBANK",
    "label": "YANDEXBANK"
  },
  {
    "code": "UNISTREAMBANK",
    "label": "UNISTREAMBANK"
  },
  {
    "code": "BSPB",
    "label": "BSPB"
  },
  {
    "code": "KUBANKREDIT",
    "label": "KUBANKREDIT"
  },
  {
    "code": "NOVIKOM",
    "label": "NOVIKOM"
  },
  {
    "code": "AGROROSBANK",
    "label": "AGROROSBANK"
  },
  {
    "code": "KLOOKVABANK",
    "label": "KLOOKVABANK"
  },
  {
    "code": "TKBBANK",
    "label": "TKBBANK"
  },
  {
    "code": "SNGBBANK",
    "label": "SNGBBANK"
  },
  {
    "code": "ROSTFINANCEBANK",
    "label": "ROSTFINANCEBANK"
  },
  {
    "code": "AMRABANK",
    "label": "AMRABANK"
  },
  {
    "code": "METALLINVESTBANK",
    "label": "METALLINVESTBANK"
  },
  {
    "code": "ABRBANK",
    "label": "ABRBANK"
  },
  {
    "code": "NORVIKBANK",
    "label": "NORVIKBANK"
  },
  {
    "code": "AURORABANK",
    "label": "AURORABANK"
  },
  {
    "code": "ATBBANK",
    "label": "ATBBANK"
  },
  {
    "code": "SDMBANK",
    "label": "SDMBANK"
  },
  {
    "code": "MPBANK",
    "label": "MPBANK"
  },
  {
    "code": "NSBANK",
    "label": "NSBANK"
  },
  {
    "code": "TOCHKA",
    "label": "TOCHKA"
  },
  {
    "code": "TATSOTSBANK",
    "label": "TATSOTSBANK"
  },
  {
    "code": "SEVERGAZBANK",
    "label": "SEVERGAZBANK"
  },
  {
    "code": "YOOMONEY",
    "label": "YOOMONEY"
  },
  {
    "code": "SINARABANK",
    "label": "SINARABANK"
  },
  {
    "code": "CUPISWALLET",
    "label": "CUPISWALLET"
  },
  {
    "code": "FINSB",
    "label": "FINSB"
  },
  {
    "code": "BANKDOLINSK",
    "label": "BANKDOLINSK"
  },
  {
    "code": "UMBANK",
    "label": "UMBANK"
  },
  {
    "code": "PSKB",
    "label": "PSKB"
  },
  {
    "code": "EXPOBANK",
    "label": "EXPOBANK"
  },
  {
    "code": "KOSHELEVBANK",
    "label": "KOSHELEVBANK"
  },
  {
    "code": "BANKOFKAZAN",
    "label": "BANKOFKAZAN"
  },
  {
    "code": "NSKBL",
    "label": "NSKBL"
  },
  {
    "code": "IPB",
    "label": "IPB"
  },
  {
    "code": "LOCKOBANK",
    "label": "LOCKOBANK"
  },
  {
    "code": "BANKORANGE",
    "label": "BANKORANGE"
  },
  {
    "code": "ABANK",
    "label": "ABANK"
  },
  {
    "code": "ZHIVAGOBANK",
    "label": "ZHIVAGOBANK"
  },
  {
    "code": "POIDEMBANK",
    "label": "POIDEMBANK"
  },
  {
    "code": "PRIMBANK",
    "label": "PRIMBANK"
  },
  {
    "code": "VBRR",
    "label": "VBRR"
  },
  {
    "code": "GASENERGO",
    "label": "GASENERGO"
  },
  {
    "code": "BANKKALUGA",
    "label": "BANKKALUGA"
  },
  {
    "code": "TENDERBANK",
    "label": "TENDERBANK"
  },
  {
    "code": "MTSDENGI",
    "label": "MTSDENGI"
  },
  {
    "code": "DTB1",
    "label": "DTB1"
  },
  {
    "code": "CHELINVEST",
    "label": "CHELINVEST"
  },
  {
    "code": "AKCEPT",
    "label": "AKCEPT"
  },
  {
    "code": "AMOBILE",
    "label": "AMOBILE"
  },
  {
    "code": "PSBST",
    "label": "PSBST"
  },
  {
    "code": "UNITEDBANK",
    "label": "UNITEDBANK"
  },
  {
    "code": "BSDBANK",
    "label": "BSDBANK"
  },
  {
    "code": "DATABANK",
    "label": "DATABANK"
  },
  {
    "code": "HLYNOV",
    "label": "HLYNOV"
  },
  {
    "code": "LANTA",
    "label": "LANTA"
  },
  {
    "code": "NATIONALSTANDARTBANK",
    "label": "NATIONALSTANDARTBANK"
  },
  {
    "code": "CREDITURAL",
    "label": "CREDITURAL"
  },
  {
    "code": "TRANSSTROYBANK",
    "label": "TRANSSTROYBANK"
  },
  {
    "code": "BANKVL",
    "label": "BANKVL"
  },
  {
    "code": "PRIOVTB",
    "label": "PRIOVTB"
  },
  {
    "code": "NICO_BANK",
    "label": "NICO_BANK"
  },
  {
    "code": "ITURUPBANK",
    "label": "ITURUPBANK"
  },
  {
    "code": "REALISTBANK",
    "label": "REALISTBANK"
  },
  {
    "code": "AVITO",
    "label": "AVITO"
  },
  {
    "code": "UNIBANK",
    "label": "UNIBANK"
  },
  {
    "code": "AVTOTORGBANK",
    "label": "AVTOTORGBANK"
  },
  {
    "code": "BANKRMP",
    "label": "BANKRMP"
  },
  {
    "code": "BGFBANK",
    "label": "BGFBANK"
  },
  {
    "code": "ENERGOBANK",
    "label": "ENERGOBANK"
  },
  {
    "code": "FINAMBANK",
    "label": "FINAMBANK"
  },
  {
    "code": "TAVRICH",
    "label": "TAVRICH"
  },
  {
    "code": "WILDBERRIES",
    "label": "WILDBERRIES"
  },
  {
    "code": "DCTJ",
    "label": "DCTJ"
  },
  {
    "code": "CENTRINVEST",
    "label": "CENTRINVEST"
  },
  {
    "code": "FINBANK",
    "label": "FINBANK"
  },
  {
    "code": "DRIVECLICKBANK",
    "label": "DRIVECLICKBANK"
  },
  {
    "code": "KAMKOMBANK",
    "label": "KAMKOMBANK"
  },
  {
    "code": "ELPLAT",
    "label": "ELPLAT"
  },
  {
    "code": "BANCAINTESA",
    "label": "BANCAINTESA"
  },
  {
    "code": "ICBRU",
    "label": "ICBRU"
  },
  {
    "code": "DALENABANK",
    "label": "DALENABANK"
  },
  {
    "code": "AKIBANK",
    "label": "AKIBANK"
  },
  {
    "code": "KBHMB",
    "label": "KBHMB"
  },
  {
    "code": "ESKHATA",
    "label": "ESKHATA"
  },
  {
    "code": "SPITAMENBANK",
    "label": "SPITAMENBANK"
  },
  {
    "code": "ENERGOTRANSBANK",
    "label": "ENERGOTRANSBANK"
  },
  {
    "code": "ORIENBANK",
    "label": "ORIENBANK"
  },
  {
    "code": "ECONOMBANK",
    "label": "ECONOMBANK"
  },
  {
    "code": "ARVANDBANK",
    "label": "ARVANDBANK"
  },
  {
    "code": "SOCIUMBANK",
    "label": "SOCIUMBANK"
  },
  {
    "code": "VLBB",
    "label": "VLBB"
  },
  {
    "code": "BANKSARATOV",
    "label": "BANKSARATOV"
  },
  {
    "code": "FORSHTADT",
    "label": "FORSHTADT"
  },
  {
    "code": "EVROFINANCE",
    "label": "EVROFINANCE"
  },
  {
    "code": "ANKB",
    "label": "ANKB"
  },
  {
    "code": "CHELINDBANK",
    "label": "CHELINDBANK"
  },
  {
    "code": "AMONATBONK",
    "label": "AMONATBONK"
  },
  {
    "code": "EUROALLIANCE",
    "label": "EUROALLIANCE"
  },
  {
    "code": "INBANK",
    "label": "INBANK"
  },
  {
    "code": "TAWHIDBANK",
    "label": "TAWHIDBANK"
  },
  {
    "code": "RUSNARBANK",
    "label": "RUSNARBANK"
  },
  {
    "code": "M10",
    "label": "M10"
  },
  {
    "code": "PUBANK",
    "label": "PUBANK"
  },
  {
    "code": "ORBANK",
    "label": "ORBANK"
  },
  {
    "code": "BANKELITA",
    "label": "BANKELITA"
  },
  {
    "code": "GAZTRANSBANK",
    "label": "GAZTRANSBANK"
  },
  {
    "code": "VASL",
    "label": "VASL"
  },
  {
    "code": "INVB",
    "label": "INVB"
  },
  {
    "code": "KUZBANK",
    "label": "KUZBANK"
  },
  {
    "code": "BKTB",
    "label": "BKTB"
  },
  {
    "code": "TKPB",
    "label": "TKPB"
  },
  {
    "code": "VKPAY",
    "label": "VKPAY"
  },
  {
    "code": "SOLID",
    "label": "SOLID"
  },
  {
    "code": "MATIN",
    "label": "MATIN"
  },
  {
    "code": "ALBANK",
    "label": "ALBANK"
  },
  {
    "code": "KOMPANION",
    "label": "KOMPANION"
  },
  {
    "code": "BAKAI",
    "label": "BAKAI"
  },
  {
    "code": "IBT",
    "label": "IBT"
  },
  {
    "code": "TELCELL",
    "label": "TELCELL"
  },
  {
    "code": "CHBRR",
    "label": "CHBRR"
  },
  {
    "code": "ALFABANKBY",
    "label": "ALFABANKBY"
  },
  {
    "code": "ALIF",
    "label": "ALIF"
  },
  {
    "code": "MARITIMEBANK",
    "label": "MARITIMEBANK"
  },
  {
    "code": "HUMOTJ",
    "label": "HUMOTJ"
  },
  {
    "code": "LIFETJ",
    "label": "LIFETJ"
  },
  {
    "code": "AZIZIMOLIYA",
    "label": "AZIZIMOLIYA"
  },
  {
    "code": "FASTSHIFT",
    "label": "FASTSHIFT"
  },
  {
    "code": "GARANTBANK",
    "label": "GARANTBANK"
  },
  {
    "code": "THBANK",
    "label": "THBANK"
  },
  {
    "code": "NOVOBANK",
    "label": "NOVOBANK"
  },
  {
    "code": "VTBAM",
    "label": "VTBAM"
  },
  {
    "code": "IBAM",
    "label": "IBAM"
  },
  {
    "code": "MONETA",
    "label": "MONETA"
  },
  {
    "code": "OLABANK",
    "label": "OLABANK"
  },
  {
    "code": "METCOM",
    "label": "METCOM"
  },
  {
    "code": "ROCKETBANK",
    "label": "ROCKETBANK"
  },
  {
    "code": "SBIBANKLLC",
    "label": "SBIBANKLLC"
  },
  {
    "code": "IPAKYULIBANK",
    "label": "IPAKYULIBANK"
  },
  {
    "code": "MBANK",
    "label": "MBANK"
  },
  {
    "code": "UZUMBANK",
    "label": "UZUMBANK"
  }
];

export const BANKS = Array.from(
  new Map(BANKS_RAW.map((b) => [b.label, b])).values(),
) as typeof BANKS_RAW;
