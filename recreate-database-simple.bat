@echo off
echo ВНИМАНИЕ! Этот скрипт полностью удалит и пересоздаст базу данных!
echo Все данные будут безвозвратно удалены!
echo.
set /p confirm="Вы уверены? (yes/no): "
if /i not "%confirm%"=="yes" goto :end

rem Параметры подключения к PostgreSQL
set DB_USER=postgres
set DB_PASS=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=quattrex

echo.
echo Используются следующие параметры:
echo Пользователь: %DB_USER%
echo Хост: %DB_HOST%
echo Порт: %DB_PORT%
echo База данных: %DB_NAME%
echo.

cd backend

echo Удаление базы данных %DB_NAME%...
set PGPASSWORD=%DB_PASS%
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"

echo Создание новой базы данных %DB_NAME%...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "CREATE DATABASE %DB_NAME%;"

echo Добавление расширения uuid-ossp...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo Исправление миграций перед применением...
powershell -Command "(Get-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql') -replace 'gen_random_uuid\(\)', 'uuid_generate_v4()' | Set-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql'"
powershell -Command "(Get-Content 'prisma\migrations\20250723000006_add_missing_columns\migration.sql') -replace 'gen_random_uuid\(\)', 'uuid_generate_v4()' | Set-Content 'prisma\migrations\20250723000006_add_missing_columns\migration.sql'"

echo Применение всех миграций...
call npx prisma migrate deploy

echo Генерация Prisma клиента...
call npx prisma generate

echo Проверка состояния миграций...
call npx prisma migrate status

echo База данных успешно пересоздана!

:end
cd ..
pause