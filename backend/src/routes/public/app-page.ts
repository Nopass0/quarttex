import { Elysia } from "elysia";

export default new Elysia()
  .get("/download-page", async ({ set }) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Скачать CHA$E Mobile</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 48px;
            max-width: 400px;
            text-align: center;
        }
        .logo {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 24px;
            color: #000;
        }
        .logo .dollar {
            color: #006039;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #333;
        }
        p {
            color: #666;
            margin-bottom: 32px;
            line-height: 1.5;
        }
        .download-btn {
            display: inline-block;
            background: #006039;
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 18px;
            transition: background 0.2s;
        }
        .download-btn:hover {
            background: #004d2d;
        }
        .version {
            margin-top: 24px;
            font-size: 14px;
            color: #999;
        }
        .requirements {
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
            text-align: left;
        }
        .requirements h3 {
            font-size: 16px;
            margin-bottom: 8px;
            color: #333;
        }
        .requirements ul {
            margin: 0;
            padding-left: 20px;
        }
        .requirements li {
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            CHA<span class="dollar">$</span>E
        </div>
        <h1>Мобильное приложение</h1>
        <p>Установите приложение CHA$E для управления транзакциями и мониторинга платежей</p>
        
        <a href="/api/app/download" class="download-btn">
            Скачать APK
        </a>
        
        <div class="version">
            Версия 1.0.0
        </div>
        
        <div class="requirements">
            <h3>Требования:</h3>
            <ul>
                <li>Android 7.0 и выше</li>
                <li>Разрешение на установку из неизвестных источников</li>
                <li>Доступ к уведомлениям для мониторинга платежей</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
    
    set.headers["content-type"] = "text/html; charset=utf-8";
    return htmlContent;
  });