# Russian Banks Information

## Successfully Added Banks with SVG Logos

### 1. Т-Банк (T-Bank)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/f/fc/T-Bank_EN_logo.svg
- **Brand Colors**: 
  - Primary: #FFDD2D (Yellow)
  - Secondary: #FFC800
  - Text: #000000 (Black)
- **BIN Codes**: 553691, 521324, 437773, 548901

### 2. ВТБ (VTB)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/7/7c/VTB_Logo_2018.svg
- **Brand Colors**:
  - Primary: #002B7F (Blue)
  - Secondary: #0050A0
  - Text: #FFFFFF (White)
- **BIN Codes**: 427229, 447520, 546938, 527883

### 3. Райффайзен (Raiffeisen)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/3/3b/Raiffeisen_Bank_2022_RU_Logo.svg
- **Brand Colors**:
  - Primary: #FFE500 (Yellow)
  - Secondary: #000000 (Black)
  - Text: #000000 (Black)
- **BIN Codes**: 510126, 462730, 462729

### 4. Росбанк (Rosbank)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/c/c7/Rosbank_logo_2022.svg
- **Brand Colors**:
  - Primary: #E4002B (Red)
  - Secondary: #FF1744
  - Text: #FFFFFF (White)
- **BIN Codes**: 427644, 445440, 554386

### 5. Открытие (Otkritie)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/2/2a/Otkritie_Bank_logo.svg
- **Brand Colors**:
  - Primary: #00BFFF (Light Blue)
  - Secondary: #00A8E8
  - Text: #FFFFFF (White)
- **BIN Codes**: 434146, 544468, 405870

### 6. МКБ (Moscow Credit Bank)
- **Logo**: Custom SVG (text-based)
- **Brand Colors**:
  - Primary: #3d0b80 (Dark Purple)
  - Secondary: #530FAD (Purple)
  - Text: #FFFFFF (White)
- **BIN Codes**: 426740, 543298, 523003

### 7. Совкомбанк (Sovcombank)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/0/07/New_Sovcombank_logo_%28updated_version%29.svg
- **Brand Colors**:
  - Primary: #0033A0 (Blue)
  - Secondary: #005EB8
  - Text: #FFFFFF (White)
- **BIN Codes**: 446916, 418854, 522985

### 8. Хоум Кредит (Home Credit)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/9/90/Home_Credit_%26_Finance_Bank.svg
- **Brand Colors**:
  - Primary: #E30613 (Red)
  - Secondary: #FF0000
  - Text: #FFFFFF (White)
- **BIN Codes**: 406320, 445505, 522470

### 9. Уралсиб (Uralsib)
- **Logo**: Custom SVG (text-based)
- **Brand Colors**:
  - Primary: #005B9F (Blue)
  - Secondary: #0073C7
  - Text: #FFFFFF (White)
- **BIN Codes**: 402643, 430773, 544029

### 10. Промсвязьбанк/ПСБ (PSB)
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/e/ef/PSB_logo_23_Nov.svg
- **Brand Colors**:
  - Primary: #F26522 (Orange)
  - Secondary: #FF7F00
  - Text: #FFFFFF (White)
- **BIN Codes**: 415240, 444313, 546902

### 11. Ак Барс Банк
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/0/0f/Ak_Bars_Bank_Logo.svg
- **Brand Colors**:
  - Primary: #530FAD (Purple)
  - Secondary: #00A65D
  - Text: #FFFFFF (White)
- **BIN Codes**: 415669, 548601, 518901

### 12. Банк Санкт-Петербург
- **Logo**: Custom SVG (text-based)
- **Brand Colors**:
  - Primary: #ED1C24 (Red)
  - Secondary: #FF3333
  - Text: #FFFFFF (White)
- **BIN Codes**: 427833, 404279, 548764

### 13. Русский Стандарт
- **Official Logo URL**: https://upload.wikimedia.org/wikipedia/commons/0/01/Russian-Standard-Logo.svg
- **Brand Colors**:
  - Primary: #004C8C (Blue)
  - Secondary: #0066CC
  - Text: #FFFFFF (White)
- **BIN Codes**: 510621, 522237, 525768

## Implementation Notes

1. All banks have been added to the `russianBankBins` object with multiple BIN codes for better coverage.

2. Banks with Wikipedia SVG logos use direct URLs that can be embedded in web applications.

3. Some banks (МКБ, Уралсиб, Банк СПб, Почта Банк) use custom SVG logos as fallbacks since official SVG logos weren't readily available.

4. Each bank has a custom gradient background style that matches their brand colors.

5. The text color is automatically adjusted based on the background for optimal contrast.

## Demo Page

A demo page has been created at `/app/russian-banks-demo/page.tsx` to showcase all the Russian bank cards with both full-size and miniature versions.

## Testing

To test the implementation:

1. Navigate to `/russian-banks-demo` in your application
2. Enter card numbers starting with any of the BIN codes listed above
3. The appropriate bank logo and styling will be applied automatically