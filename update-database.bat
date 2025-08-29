@echo off
echo Обновление базы данных Quattrex...

rem Переход в директорию backend
cd backend

rem Генерация Prisma клиента
echo Генерация Prisma клиента...
call npx prisma generate

rem Применение миграций для разработки
echo Применение миграций...
call npx prisma migrate dev

rem Проверка состояния миграций
echo Проверка состояния миграций...
call npx prisma migrate status

echo База данных успешно обновлена!
pause