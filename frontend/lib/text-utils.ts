/**
 * Утилиты для безопасной работы с текстом
 */

/**
 * Экранирует HTML символы для безопасного отображения
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Санитизирует текст для безопасного отображения в React
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Удаляем потенциально опасные символы и конструкции
  return text
    .replace(/<[^>]*>/g, '') // Удаляем HTML теги
    .replace(/javascript:/gi, '') // Удаляем javascript: ссылки
    .replace(/on\w+\s*=/gi, '') // Удаляем event handlers
    .replace(/\{\{.*?\}\}/g, '') // Удаляем template expressions
    .replace(/\$\{.*?\}/g, '') // Удаляем template literals
    .trim();
}

/**
 * Безопасно отображает имя пользователя/устройства
 */
export function safeName(name: string | null | undefined): string {
  if (!name) return 'Без названия';
  
  const sanitized = sanitizeText(name);
  
  // Если после санитизации ничего не осталось, возвращаем fallback
  if (!sanitized.trim()) {
    return 'Некорректное название';
  }
  
  return sanitized;
}

/**
 * Безопасно отображает номер карты/телефона
 */
export function safeCardNumber(cardNumber: string | null | undefined): string {
  if (!cardNumber) return '****';
  
  const sanitized = sanitizeText(cardNumber);
  
  // Оставляем только цифры, пробелы и дефисы
  const cleaned = sanitized.replace(/[^\d\s\-]/g, '');
  
  if (!cleaned.trim()) {
    return '****';
  }
  
  return cleaned;
}
