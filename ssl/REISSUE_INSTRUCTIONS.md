# Инструкция по перевыпуску SSL сертификата для quattrex.pro

## ✅ Что уже готово:
1. **Приватный ключ**: `certificate.key` (2048 бит) - готов к использованию
2. **CSR для Sectigo**: `quattrex_nl.csr` - с кодом страны Нидерланды (NL)
3. **CA цепочка Sectigo**: `certificate_ca.crt` - готова к использованию
4. **Заглушка сертификата**: `certificate.crt` - замените на реальный от Sectigo
5. **Полная цепочка**: `fullchain.crt` - будет обновлена автоматически

## 📋 Что нужно сделать:

### Шаг 1: Перевыпуск сертификата в Sectigo

1. Зайдите в панель управления где вы покупали SSL сертификат
2. Найдите опцию "Reissue Certificate" или "Перевыпустить сертификат"
3. Вставьте CSR из файла `quattrex_nl.csr` (скопируйте всё включая BEGIN/END строки)
4. Подтвердите домен quattrex.pro (обычно через email или DNS)
5. Дождитесь получения нового сертификата на email

### Шаг 2: Установка нового сертификата

1. **Сохраните полученный от Sectigo сертификат** как: `/home/user/projects/quattrex/ssl/new_certificate.crt`
2. **Замените заглушку** на реальный сертификат:
   ```bash
   cd /home/user/projects/quattrex/ssl
   cp new_certificate.crt certificate.crt
   ```
3. **Обновите fullchain**:
   ```bash
   cat certificate.crt certificate_ca.crt > fullchain.crt
   ```

### Шаг 3: Перезапуск сервисов

```bash
cd /home/user/projects/quattrex
sudo docker-compose restart nginx
# или если nginx не в Docker:
sudo systemctl restart nginx
```

### Шаг 4: Проверка

Откройте в браузере: https://quattrex.pro

## ⚠️ Важно:

- **НЕ удаляйте** `certificate.key` - это ваш приватный ключ!
- **НЕ удаляйте** `certificate_ca.crt` - это CA цепочка Sectigo
- Храните приватный ключ в безопасности
- После успешной установки можете удалить `new_certificate.crt`

## 📝 Ваш CSR для копирования (с кодом страны Нидерланды):

```
-----BEGIN CERTIFICATE REQUEST-----
MIICwDCCAagCAQAwezELMAkGA1UEBhMCTkwxFjAUBgNVBAgMDU5vcnRoIEhvbGxh
bmQxEjAQBgNVBAcMCUFtc3RlcmRhbTERMA8GA1UECgwIUXVhdHRyZXgxFjAUBgNV
BAsMDUlUIERlcGFydG1lbnQxFTATBgNVBAMMDHF1YXR0cmV4LnBybzCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBAOzEuQWhRfnVXcWd3lgrqE2V1ISGzx8r
IoFsgpuRWwO3DhXFlHxXJojKUNiLJPKt8TpG7hjdR1NvDCt/oWs3ThcAkbTINhhM
M05mdERp8ggvZ3+uoHLeVsnw1uyrZNSFmNShLiTrO/Da7L0PFTE/a44ijFvXaScJ
EXv/B+AzkuGzI5ccFdCZOFsl7gxrogfCrf+CJ1WA5SFK8efiSFRBeeWrFpcFsfdh
a4UnIZXQPQqLCpnosqrDx74nsILm1k2WWgrsUaHIoGqHBIrfdm4EQd3EtDuV5UyD
BuIUrgYkklzFklS8QOhf1qN8nZY/ja5CjZDtZoWM9QwMgCwj80SYR+kCAwEAAaAA
MA0GCSqGSIb3DQEBCwUAA4IBAQCCYiBj4e8HXY5Z5L/igVJqAFs/w/+tVfycPDaM
p/YSSOfrle5O44lL/g+3KSGt/B/tP6IHUIAa3vIH60rOncMe8TO6km2ELRRKlOLc
iulL5HKb1p5iGrdvwibjkLIncxF47wSA2xtdDI2OwNmfRRQLvKCrxu5t+WyCgRz2
chtkZPm44XBermML1uKZWvskVqMCpmSEOQc7rYQF0DLwiaMqQnorI8keO8RrEuVk
IMIJXzdyZEv5W3PYWs2Acg99gUl9BmUM+wyYzYVRiTbXcnOhIm7OMes91EwFPg5i
D98zzaa4WwJMoKA5jsW2xLAcs2K5ZTuS0rJjI70tpvgUj8S/
-----END CERTIFICATE REQUEST-----
```

## 🔧 Текущие файлы:
- `certificate.key` - Приватный ключ (ХРАНИТЕ В БЕЗОПАСНОСТИ!)
- `quattrex_nl.csr` - CSR для перевыпуска (с кодом страны NL)
- `certificate_ca.crt` - CA цепочка Sectigo (уже готова)
- `certificate.crt` - Заглушка сертификата (замените на реальный)
- `fullchain.crt` - Полная цепочка (обновится автоматически)

## 🌍 Данные организации в CSR:
- **Страна:** Нидерланды (NL)
- **Регион:** Северная Голландия (North Holland)
- **Город:** Амстердам (Amsterdam)
- **Организация:** Quattrex
- **Подразделение:** IT Department
- **Домен:** quattrex.pro

## 🚀 Быстрая установка после получения сертификата:

```bash
cd /home/user/projects/quattrex/ssl
# 1. Сохраните сертификат от Sectigo как new_certificate.crt
# 2. Замените заглушку:
cp new_certificate.crt certificate.crt
# 3. Обновите fullchain:
cat certificate.crt certificate_ca.crt > fullchain.crt
# 4. Перезапустите nginx:
cd .. && sudo docker-compose restart nginx
```
