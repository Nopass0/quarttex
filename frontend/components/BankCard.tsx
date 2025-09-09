import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

/**
 * BankCard component – полностью без локальных ассетов.
 * Картинки карт, логотипы банков и платёжных систем подгружаются
 *   с публичных API (Clearbit и Unsplash) «на лету».
 *
 * Props:
 *  - cardNumber : string – номер карты (обязателен)
 *  - showScheme : boolean – показывать/скрывать логотип платёжной системы
 *  - themeSeed  : string  – ключевое слово для Unsplash, если банк не найден
 */

interface BankCardProps {
  cardNumber: string;
  showScheme?: boolean;
  themeSeed?: string;
  cardHolderName?: string;
  validThru?: string;
  showCardHolder?: boolean;
  showValidThru?: boolean;
  miniature?: boolean;
}

// 1. Regex‑карта для определения схемы
const schemeRegexes: Record<string, RegExp> = {
  visa: /^4[0-9]{0,}$/,
  mastercard: /^(5[1-5][0-9]{0,}|2(2[2-9][0-9]{0,}|[3-6][0-9]{0,}|7[01][0-9]{0,}|720[0-9]{0,}))$/,
  mir: /^220[0-4][0-9]{0,}$/,
  unionpay: /^62[0-9]{0,}$/,
  amex: /^3[47][0-9]{0,}$/,
};

// 2. Сопоставление схем → домены (для Clearbit logos)
const schemeDomains: Record<string, string> = {
  visa: "visa.com",
  mastercard: "mastercard.com",
  mir: "mironline.ru",
  unionpay: "unionpayintl.com",
  amex: "americanexpress.com",
};

// 3. Российские банки по BIN
const russianBankBins: Record<string, { name: string; colors: string[]; textColor: string }> = {
  // Сбер
  "427683": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  "427684": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  "427685": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  "427631": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  "427638": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  "427901": { name: "Сбер", colors: ["#21A038", "#309C42", "#FFFFFF"], textColor: "#FFFFFF" },
  // Т-Банк (Tinkoff)
  "553691": { name: "Т-Банк", colors: ["#FFDD2D", "#FFC800", "#000000"], textColor: "#000000" },
  "521324": { name: "Т-Банк", colors: ["#FFDD2D", "#FFC800", "#000000"], textColor: "#000000" },
  "437773": { name: "Т-Банк", colors: ["#FFDD2D", "#FFC800", "#000000"], textColor: "#000000" },
  "548901": { name: "Т-Банк", colors: ["#FFDD2D", "#FFC800", "#000000"], textColor: "#000000" },
  // ВТБ
  "427229": { name: "ВТБ", colors: ["#002B7F", "#0050A0", "#FFFFFF"], textColor: "#FFFFFF" },
  "447520": { name: "ВТБ", colors: ["#002B7F", "#0050A0", "#FFFFFF"], textColor: "#FFFFFF" },
  "546938": { name: "ВТБ", colors: ["#002B7F", "#0050A0", "#FFFFFF"], textColor: "#FFFFFF" },
  "527883": { name: "ВТБ", colors: ["#002B7F", "#0050A0", "#FFFFFF"], textColor: "#FFFFFF" },
  // Альфа-Банк
  "415428": { name: "Альфа-Банк", colors: ["#EF3B39", "#FF5A5A", "#FFFFFF"], textColor: "#EF3B39" },
  "548673": { name: "Альфа-Банк", colors: ["#EF3B39", "#FF5A5A", "#FFFFFF"], textColor: "#EF3B39" },
  "521178": { name: "Альфа-Банк", colors: ["#EF3B39", "#FF5A5A", "#FFFFFF"], textColor: "#EF3B39" },
  "493018": { name: "Альфа-Банк", colors: ["#EF3B39", "#FF5A5A", "#FFFFFF"], textColor: "#EF3B39" },
  // Райффайзен
  "510126": { name: "Райффайзен", colors: ["#FFE500", "#000000", "#FFFFFF"], textColor: "#000000" },
  "462730": { name: "Райффайзен", colors: ["#FFE500", "#000000", "#FFFFFF"], textColor: "#000000" },
  "462729": { name: "Райффайзен", colors: ["#FFE500", "#000000", "#FFFFFF"], textColor: "#000000" },
  // Газпромбанк
  "427698": { name: "Газпромбанк", colors: ["#003E7E", "#0056A3", "#FFFFFF"], textColor: "#FFFFFF" },
  "548999": { name: "Газпромбанк", colors: ["#003E7E", "#0056A3", "#FFFFFF"], textColor: "#FFFFFF" },
  "526483": { name: "Газпромбанк", colors: ["#003E7E", "#0056A3", "#FFFFFF"], textColor: "#FFFFFF" },
  // Росбанк
  "427644": { name: "Росбанк", colors: ["#E4002B", "#FF1744", "#FFFFFF"], textColor: "#FFFFFF" },
  "445440": { name: "Росбанк", colors: ["#E4002B", "#FF1744", "#FFFFFF"], textColor: "#FFFFFF" },
  "554386": { name: "Росбанк", colors: ["#E4002B", "#FF1744", "#FFFFFF"], textColor: "#FFFFFF" },
  // Открытие
  "434146": { name: "Открытие", colors: ["#00BFFF", "#00A8E8", "#FFFFFF"], textColor: "#FFFFFF" },
  "544468": { name: "Открытие", colors: ["#00BFFF", "#00A8E8", "#FFFFFF"], textColor: "#FFFFFF" },
  "405870": { name: "Открытие", colors: ["#00BFFF", "#00A8E8", "#FFFFFF"], textColor: "#FFFFFF" },
  // Почта Банк
  "220074": { name: "Почта Банк", colors: ["#005CA9", "#0073D4", "#FFD500"], textColor: "#FFFFFF" },
  "485945": { name: "Почта Банк", colors: ["#005CA9", "#0073D4", "#FFD500"], textColor: "#FFFFFF" },
  "415481": { name: "Почта Банк", colors: ["#005CA9", "#0073D4", "#FFD500"], textColor: "#FFFFFF" },
  // МКБ (Moscow Credit Bank)
  "426740": { name: "МКБ", colors: ["#003F2D", "#00A651", "#FFFFFF"], textColor: "#FFFFFF" },
  "543298": { name: "МКБ", colors: ["#003F2D", "#00A651", "#FFFFFF"], textColor: "#FFFFFF" },
  "523003": { name: "МКБ", colors: ["#003F2D", "#00A651", "#FFFFFF"], textColor: "#FFFFFF" },
  // Совкомбанк
  "446916": { name: "Совкомбанк", colors: ["#0033A0", "#005EB8", "#FFFFFF"], textColor: "#FFFFFF" },
  "418854": { name: "Совкомбанк", colors: ["#0033A0", "#005EB8", "#FFFFFF"], textColor: "#FFFFFF" },
  "522985": { name: "Совкомбанк", colors: ["#0033A0", "#005EB8", "#FFFFFF"], textColor: "#FFFFFF" },
  // Хоум Кредит
  "406320": { name: "Хоум Кредит", colors: ["#E30613", "#FF0000", "#FFFFFF"], textColor: "#FFFFFF" },
  "445505": { name: "Хоум Кредит", colors: ["#E30613", "#FF0000", "#FFFFFF"], textColor: "#FFFFFF" },
  "522470": { name: "Хоум Кредит", colors: ["#E30613", "#FF0000", "#FFFFFF"], textColor: "#FFFFFF" },
  // Уралсиб
  "402643": { name: "Уралсиб", colors: ["#005B9F", "#0073C7", "#FFFFFF"], textColor: "#FFFFFF" },
  "430773": { name: "Уралсиб", colors: ["#005B9F", "#0073C7", "#FFFFFF"], textColor: "#FFFFFF" },
  "544029": { name: "Уралсиб", colors: ["#005B9F", "#0073C7", "#FFFFFF"], textColor: "#FFFFFF" },
  // Промсвязьбанк (ПСБ)
  "415240": { name: "ПСБ", colors: ["#F26522", "#FF7F00", "#FFFFFF"], textColor: "#FFFFFF" },
  "444313": { name: "ПСБ", colors: ["#F26522", "#FF7F00", "#FFFFFF"], textColor: "#FFFFFF" },
  "546902": { name: "ПСБ", colors: ["#F26522", "#FF7F00", "#FFFFFF"], textColor: "#FFFFFF" },
  // Ак Барс Банк
  "415669": { name: "Ак Барс", colors: ["#00954F", "#00A65D", "#FFFFFF"], textColor: "#FFFFFF" },
  "548601": { name: "Ак Барс", colors: ["#00954F", "#00A65D", "#FFFFFF"], textColor: "#FFFFFF" },
  "518901": { name: "Ак Барс", colors: ["#00954F", "#00A65D", "#FFFFFF"], textColor: "#FFFFFF" },
  // Банк Санкт-Петербург
  "427833": { name: "Банк СПб", colors: ["#ED1C24", "#FF3333", "#FFFFFF"], textColor: "#FFFFFF" },
  "404279": { name: "Банк СПб", colors: ["#ED1C24", "#FF3333", "#FFFFFF"], textColor: "#FFFFFF" },
  "548764": { name: "Банк СПб", colors: ["#ED1C24", "#FF3333", "#FFFFFF"], textColor: "#FFFFFF" },
  // Русский Стандарт
  "510621": { name: "Русский Стандарт", colors: ["#004C8C", "#0066CC", "#FFFFFF"], textColor: "#FFFFFF" },
  "522237": { name: "Русский Стандарт", colors: ["#004C8C", "#0066CC", "#FFFFFF"], textColor: "#FFFFFF" },
  "525768": { name: "Русский Стандарт", colors: ["#004C8C", "#0066CC", "#FFFFFF"], textColor: "#FFFFFF" },
};

// 4. Official bank logo URLs
const bankLogoUrls: Record<string, string> = {
  "Сбер": "https://upload.wikimedia.org/wikipedia/commons/9/9b/Sberbank_Logo_2020.svg",
  "Т-Банк": "https://upload.wikimedia.org/wikipedia/commons/f/fc/T-Bank_EN_logo.svg",
  "ВТБ": "https://upload.wikimedia.org/wikipedia/commons/7/7c/VTB_Logo_2018.svg",
  "Альфа-Банк": "https://upload.wikimedia.org/wikipedia/commons/7/77/Alfa-Bank.svg",
  "Райффайзен": "https://upload.wikimedia.org/wikipedia/commons/3/3b/Raiffeisen_Bank_2022_RU_Logo.svg",
  "Газпромбанк": "https://upload.wikimedia.org/wikipedia/commons/4/42/Gazprom_logo.svg",
  "Росбанк": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Rosbank_logo_2022.svg",
  "Открытие": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Otkritie_Bank_logo.svg",
  "Почта Банк": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 40'%3E%3Cpath d='M5 8h30v24h-30z' fill='%23005CA9'/%3E%3Cpath d='M5 8l15 12l15-12' fill='%23FFD500'/%3E%3Ctext x='40' y='25' font-family='Arial, sans-serif' font-size='16' font-weight='bold' fill='%23005CA9'%3EПочта Банк%3C/text%3E%3C/svg%3E",
  "МКБ": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Ctext x='50' y='28' font-family='Arial, sans-serif' font-size='22' font-weight='bold' text-anchor='middle' fill='%2300A651'%3EМКБ%3C/text%3E%3C/svg%3E",
  "Совкомбанк": "https://upload.wikimedia.org/wikipedia/commons/0/07/New_Sovcombank_logo_%28updated_version%29.svg",
  "Хоум Кредит": "https://upload.wikimedia.org/wikipedia/commons/9/90/Home_Credit_%26_Finance_Bank.svg",
  "Уралсиб": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 40'%3E%3Ctext x='60' y='28' font-family='Arial, sans-serif' font-size='20' font-weight='bold' text-anchor='middle' fill='%230073C7'%3EУРАЛСИБ%3C/text%3E%3C/svg%3E",
  "ПСБ": "https://upload.wikimedia.org/wikipedia/commons/e/ef/PSB_logo_23_Nov.svg",
  "Ак Барс": "https://upload.wikimedia.org/wikipedia/commons/0/0f/Ak_Bars_Bank_Logo.svg",
  "Банк СПб": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 40'%3E%3Ctext x='70' y='28' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%23ED1C24'%3EБанк СПб%3C/text%3E%3C/svg%3E",
  "Русский Стандарт": "https://upload.wikimedia.org/wikipedia/commons/0/01/Russian-Standard-Logo.svg",
  "Ситибанк": "https://upload.wikimedia.org/wikipedia/commons/5/5f/Citibank.svg",
  "ЮниКредит": "https://upload.wikimedia.org/wikipedia/commons/8/80/UniCredit_Logo_2017.svg",
};

type BinData = {
  scheme: string;
  type: string;
  brand: string;
  bank?: { name?: string; url?: string; phone?: string; city?: string };
  country?: { name?: string; emoji?: string };
};

// 3. Luhn‑чек для валидности номера
const luhnCheck = (num: string): boolean => {
  const arr = num
    .replace(/\D/g, "")
    .split("")
    .reverse()
    .map((x) => parseInt(x, 10));
  const sum = arr.reduce((acc, val, idx) => {
    if (idx % 2 === 1) {
      const dbl = val * 2;
      return acc + (dbl > 9 ? dbl - 9 : dbl);
    }
    return acc + val;
  }, 0);
  return sum % 10 === 0;
};

// 4. Формат «#### #### #### ####»
const formatCardNumber = (num: string) =>
  num
    .replace(/\s+/g, "")
    .replace(/(\d{4})/g, "$1 ")
    .trim();

export default function BankCard({
  cardNumber,
  showScheme = true,
  themeSeed = "finance",
  cardHolderName = "IVAN PETROV",
  validThru = "12/28",
  showCardHolder = true,
  showValidThru = true,
  miniature = false,
}: BankCardProps) {
  const [scheme, setScheme] = useState<string | null>(null);
  const [binData, setBinData] = useState<BinData | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [russianBank, setRussianBank] = useState<{ name: string; colors: string[]; textColor: string } | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  // 5. Вычисляем БИН и схему, валидируем номер
  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, "");

    // Схема
    const foundScheme =
      Object.entries(schemeRegexes).find(([, regex]) => regex.test(clean))?.[0] ||
      null;
    setScheme(foundScheme);

    // Luhn
    setIsValid(clean.length >= 12 ? luhnCheck(clean) : null);

    // Проверяем российские банки
    if (clean.length >= 6) {
      const bin = clean.slice(0, 6);
      const russianBankInfo = russianBankBins[bin];
      
      if (russianBankInfo) {
        setRussianBank(russianBankInfo);
      } else {
        setRussianBank(null);
        // BIN‑lookup только если не российский банк
        fetch(`https://lookup.binlist.net/${bin}`)
          .then((res) => res.json())
          .then((data: BinData) => setBinData(data))
          .catch(() => setBinData(null));
      }
    } else {
      setBinData(null);
      setRussianBank(null);
    }
  }, [cardNumber]);

  // 6. Стилизация карты
  useEffect(() => {
    if (russianBank) {
      // Для российских банков используем градиенты на основе их цветов
      const [primary, secondary, accent] = russianBank.colors;
      
      const bankStyles: Record<string, React.CSSProperties> = {
        "Сбер": {
          background: `linear-gradient(135deg, #21A038 0%, #1B8A30 50%, #147025 100%)`,
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 50%),
            linear-gradient(135deg, #21A038 0%, #1B8A30 50%, #147025 100%)
          `,
        },
        "Т-Банк": {
          background: `linear-gradient(135deg, #FFDD2D 0%, #FFC800 50%, #FFB000 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.05) 0%, transparent 70%),
            linear-gradient(135deg, #FFDD2D 0%, #FFC800 50%, #FFB000 100%)
          `,
        },
        "ВТБ": {
          background: `linear-gradient(135deg, #002C77 0%, #003D9D 50%, #0050C8 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at top right, rgba(255,255,255,0.1) 0%, transparent 60%),
            linear-gradient(135deg, #002C77 0%, #003D9D 50%, #0050C8 100%)
          `,
        },
        "Альфа-Банк": {
          background: `linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 50%, #FFFFFF 100%)`,
          backgroundImage: `
            radial-gradient(circle at 30% 50%, rgba(239,59,57,0.05) 0%, transparent 50%),
            linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 50%, #FFFFFF 100%)
          `,
        },
        "Райффайзен": {
          background: `linear-gradient(135deg, #FFE500 0%, #FFF200 50%, #FFD700 100%)`,
          backgroundImage: `
            radial-gradient(circle at 70% 70%, rgba(0,0,0,0.1) 0%, transparent 50%),
            linear-gradient(135deg, #FFE500 0%, #FFF200 50%, #FFD700 100%)
          `,
        },
        "Газпромбанк": {
          background: `linear-gradient(135deg, #003E7E 0%, #004A94 40%, #0056A3 100%)`,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
            linear-gradient(135deg, #003E7E 0%, #004A94 40%, #0056A3 100%)
          `,
        },
        "Росбанк": {
          background: `linear-gradient(135deg, #E4002B 0%, #FF1744 50%, #D50000 100%)`,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #E4002B 0%, #FF1744 50%, #D50000 100%)
          `,
        },
        "Открытие": {
          background: `linear-gradient(135deg, #00BFFF 0%, #00A8E8 50%, #0091EA 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at bottom left, rgba(255,255,255,0.2) 0%, transparent 60%),
            linear-gradient(135deg, #00BFFF 0%, #00A8E8 50%, #0091EA 100%)
          `,
        },
        "Почта Банк": {
          background: `linear-gradient(135deg, #005CA9 0%, #0073D4 40%, #FFD500 98%, #FFE633 100%)`,
          backgroundImage: `
            radial-gradient(circle at 90% 90%, #FFD500 0%, transparent 30%),
            linear-gradient(135deg, #005CA9 0%, #0073D4 60%, #005CA9 100%)
          `,
        },
        "МКБ": {
          background: `linear-gradient(135deg, #003F2D 0%, #00A651 50%, #00C774 100%)`,
          backgroundImage: `
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
            linear-gradient(135deg, #003F2D 0%, #00A651 50%, #00C774 100%)
          `,
        },
        "Совкомбанк": {
          background: `linear-gradient(135deg, #0033A0 0%, #005EB8 50%, #0080FF 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #0033A0 0%, #005EB8 50%, #0080FF 100%)
          `,
        },
        "Хоум Кредит": {
          background: `linear-gradient(135deg, #E30613 0%, #FF0000 50%, #CC0000 100%)`,
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%),
            linear-gradient(135deg, #E30613 0%, #FF0000 50%, #CC0000 100%)
          `,
        },
        "Уралсиб": {
          background: `linear-gradient(135deg, #005B9F 0%, #0073C7 50%, #0090FF 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at bottom right, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #005B9F 0%, #0073C7 50%, #0090FF 100%)
          `,
        },
        "ПСБ": {
          background: `linear-gradient(135deg, #F26522 0%, #FF7F00 50%, #FF9933 100%)`,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 60%),
            linear-gradient(135deg, #F26522 0%, #FF7F00 50%, #FF9933 100%)
          `,
        },
        "Ак Барс": {
          background: `linear-gradient(135deg, #00954F 0%, #00A65D 50%, #00C96F 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 50%),
            linear-gradient(135deg, #00954F 0%, #00A65D 50%, #00C96F 100%)
          `,
        },
        "Банк СПб": {
          background: `linear-gradient(135deg, #ED1C24 0%, #FF3333 50%, #CC0000 100%)`,
          backgroundImage: `
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 60%),
            linear-gradient(135deg, #ED1C24 0%, #FF3333 50%, #CC0000 100%)
          `,
        },
        "Русский Стандарт": {
          background: `linear-gradient(135deg, #004C8C 0%, #0066CC 50%, #0080FF 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at top left, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #004C8C 0%, #0066CC 50%, #0080FF 100%)
          `,
        },
        "Ситибанк": {
          background: `linear-gradient(135deg, #052169 0%, #0644A3 50%, #0061B9 100%)`,
          backgroundImage: `
            radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%),
            linear-gradient(135deg, #052169 0%, #0644A3 50%, #0061B9 100%)
          `,
        },
        "ЮниКредит": {
          background: `linear-gradient(135deg, #e2001a 0%, #ef3e42 50%, #e2001a 100%)`,
          backgroundImage: `
            radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #e2001a 0%, #ef3e42 50%, #e2001a 100%)
          `,
        },
      };
      
      setCardStyle(bankStyles[russianBank.name] || {});
    } else if (scheme) {
      // Для международных карт используем стили по схеме
      const schemeStyles: Record<string, React.CSSProperties> = {
        visa: {
          background: `linear-gradient(135deg, #1A1F71 0%, #2942B3 50%, #1A1F71 100%)`,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
            linear-gradient(135deg, #1A1F71 0%, #2942B3 50%, #1A1F71 100%)
          `,
        },
        mastercard: {
          background: `linear-gradient(135deg, #252525 0%, #3A3A3A 50%, #252525 100%)`,
          backgroundImage: `
            radial-gradient(circle at 35% 50%, #EB001B 0%, transparent 30%),
            radial-gradient(circle at 65% 50%, #F79E1B 0%, transparent 30%),
            linear-gradient(135deg, #252525 0%, #3A3A3A 50%, #252525 100%)
          `,
        },
        mir: {
          background: `linear-gradient(135deg, #0F754E 0%, #00A651 50%, #00D95F 100%)`,
          backgroundImage: `
            radial-gradient(ellipse at bottom right, rgba(255,255,255,0.15) 0%, transparent 60%),
            linear-gradient(135deg, #0F754E 0%, #00A651 50%, #00D95F 100%)
          `,
        },
        unionpay: {
          background: `linear-gradient(135deg, #003B6F 0%, #CF0A2C 33%, #003B6F 66%, #0084C7 100%)`,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(207,10,44,0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(0,132,199,0.3) 0%, transparent 50%),
            linear-gradient(135deg, #003B6F 0%, #004080 100%)
          `,
        },
        amex: {
          background: `linear-gradient(135deg, #006FCF 0%, #00A6E2 50%, #006FCF 100%)`,
          backgroundImage: `
            radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%),
            linear-gradient(135deg, #006FCF 0%, #00A6E2 50%, #006FCF 100%)
          `,
        },
      };
      
      setCardStyle(schemeStyles[scheme] || {
        background: `linear-gradient(135deg, #374151 0%, #1F2937 100%)`,
      });
    } else {
      // Дефолтный стиль
      setCardStyle({
        background: `linear-gradient(135deg, #374151 0%, #1F2937 100%)`,
      });
    }
  }, [russianBank, scheme]);

  // 7. Логотип банка
  const bankName = russianBank?.name || binData?.bank?.name || "Unknown Bank";
  const bankLogoUrl = russianBank 
    ? null // Для российских банков будем использовать текст
    : binData?.bank?.url
      ? `https://logo.clearbit.com/${new URL(binData.bank.url).hostname}`
      : null;

  // 8. Логотип схемы
  const schemeLogoUrl = scheme ? `https://logo.clearbit.com/${schemeDomains[scheme]}` : null;

  // Get text color based on bank
  const textColor = russianBank?.textColor || "#FFFFFF";

  // For miniature mode
  if (miniature) {
    return (
      <motion.div
        className="w-[200px] h-[126px] rounded-xl relative select-none"
        style={{
          ...cardStyle,
          boxShadow: "0 10px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        
        <div className="relative h-full p-4 flex flex-col justify-between">
          {/* Bank logo */}
          <div className="flex justify-between items-start">
            {russianBank && (
              <>
                {bankLogoUrls[russianBank.name] ? (
                  <img 
                    src={bankLogoUrls[russianBank.name]} 
                    alt={russianBank.name}
                    className="h-6"
                    style={{ 
                      maxWidth: "80px",
                      filter: (russianBank.name === "Газпромбанк" || russianBank.name === "Сбер") ? "brightness(0) invert(1)" : "none"
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div 
                    className="text-sm font-bold"
                    style={{
                      color: textColor,
                      textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                    }}
                  >
                    {russianBank.name}
                  </div>
                )}
              </>
            )}
            {!russianBank && bankName !== "Unknown Bank" && (
              <div 
                className="text-sm font-semibold"
                style={{
                  color: textColor,
                  textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                {bankName}
              </div>
            )}
          </div>

          {/* Payment system logo */}
          {showScheme && scheme && (
            <div className="self-end">
              <div 
                className="text-xs font-bold italic"
                style={{
                  color: textColor,
                  opacity: 0.8,
                  textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                {scheme === "visa" && "VISA"}
                {scheme === "mastercard" && "MC"}
                {scheme === "mir" && "МИР"}
                {scheme === "unionpay" && "UP"}
                {scheme === "amex" && "AMEX"}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-[350px] h-[220px] rounded-2xl relative select-none"
      style={{
        ...cardStyle,
        boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
        transform: "rotateX(5deg)",
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 40, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.02, rotateX: 0 }}
    >
      {/* Glossy overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
      
      {/* Texture pattern */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)`,
        }}
      />

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top section with bank logo */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            {russianBank && (
              <>
                {bankLogoUrls[russianBank.name] ? (
                  <img 
                    src={bankLogoUrls[russianBank.name]} 
                    alt={russianBank.name}
                    className="h-10"
                    style={{ 
                      maxWidth: "120px",
                      filter: (russianBank.name === "Газпромбанк" || russianBank.name === "Сбер") ? "brightness(0) invert(1)" : "none"
                    }}
                    onError={(e) => {
                      // Hide image on error
                      const parent = e.currentTarget.parentElement;
                      e.currentTarget.style.display = 'none';
                      // Show text fallback
                      const fallback = parent?.querySelector('.bank-name-fallback');
                      if (fallback) {
                        (fallback as HTMLElement).style.display = 'block';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="bank-name-fallback text-xl font-bold"
                  style={{
                    color: textColor,
                    textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                    display: bankLogoUrls[russianBank.name] ? 'none' : 'block'
                  }}
                >
                  {russianBank.name}
                </div>
              </>
            )}
            {!russianBank && bankName !== "Unknown Bank" && (
              <div 
                className="text-xl font-semibold"
                style={{
                  color: textColor,
                  textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                {bankName}
              </div>
            )}
          </div>
        </div>

        {/* Card number */}
        <div className="mt-2">
          <div
            className="text-[18px] tracking-[0.2em] font-mono whitespace-nowrap"
            style={{
              color: textColor,
              textShadow: `1px 1px 2px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)`,
              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            }}
          >
            {formatCardNumber(cardNumber) || "•••• •••• •••• ••••"}
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex justify-between items-end">
          <div className="flex gap-8">
            {/* Valid thru */}
            {showValidThru && cardNumber.replace(/\D/g, "").length >= 12 && (
              <div>
                <div 
                  className="text-[8px] uppercase tracking-wider opacity-70"
                  style={{ color: textColor }}
                >
                  Valid Thru
                </div>
                <div 
                  className="text-sm font-mono"
                  style={{
                    color: textColor,
                    textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                  }}
                >
                  {validThru}
                </div>
              </div>
            )}

            {/* Cardholder name */}
            {showCardHolder && cardNumber.replace(/\D/g, "").length >= 12 && (
              <div>
                <div 
                  className="text-[8px] uppercase tracking-wider opacity-70"
                  style={{ color: textColor }}
                >
                  Card Holder
                </div>
                <div 
                  className="text-sm font-medium uppercase tracking-wide"
                  style={{
                    color: textColor,
                    textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                  }}
                >
                  {cardHolderName}
                </div>
              </div>
            )}
          </div>

          {/* Payment system logo - embossed style */}
          {showScheme && scheme && (
            <div className="relative">
              <div 
                className="text-lg font-bold italic"
                style={{
                  color: textColor,
                  opacity: 0.8,
                  textShadow: `2px 2px 3px rgba(0,0,0,0.4), -1px -1px 1px rgba(255,255,255,0.2)`,
                  filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
                }}
              >
                {scheme === "visa" && "VISA"}
                {scheme === "mastercard" && "MasterCard"}
                {scheme === "mir" && "МИР"}
                {scheme === "unionpay" && "UnionPay"}
                {scheme === "amex" && "AMEX"}
              </div>
            </div>
          )}
        </div>

        {/* Holographic strip (decorative) */}
        <div 
          className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-20 rounded-lg opacity-20"
          style={{
            background: `linear-gradient(135deg, 
              transparent 0%, 
              rgba(255,255,255,0.3) 25%, 
              transparent 50%, 
              rgba(255,255,255,0.3) 75%, 
              transparent 100%)`,
            transform: "rotate(15deg)",
          }}
        />
      </div>
    </motion.div>
  );
}