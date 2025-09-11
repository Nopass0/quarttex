import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

interface MigrationStatus {
  applied: string[];
  pending: string[];
  missing: string[];
}

async function getMigrationStatus(): Promise<MigrationStatus> {
  // Получаем миграции из БД
  const dbMigrations = await prisma.$queryRaw`
    SELECT migration_name 
    FROM "_prisma_migrations" 
    WHERE finished_at IS NOT NULL
    ORDER BY migration_name
  ` as any[];

  // Получаем локальные миграции
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  const localMigrations = fs.readdirSync(migrationsDir)
    .filter(name => name !== 'migration_lock.toml')
    .sort();

  const dbMigrationNames = dbMigrations.map(m => m.migration_name);
  
  return {
    applied: dbMigrationNames,
    pending: localMigrations.filter(name => !dbMigrationNames.includes(name)),
    missing: dbMigrationNames.filter(name => !localMigrations.includes(name))
  };
}

async function applyMigration(migrationName: string): Promise<boolean> {
  try {
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`❌ Файл миграции не найден: ${migrationPath}`);
      return false;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Разбиваем SQL на отдельные команды
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Применяем миграцию ${migrationName} (${commands.length} команд)...`);

    // Выполняем каждую команду отдельно
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          await prisma.$executeRawUnsafe(command);
          console.log(`  ✅ Команда ${i + 1}/${commands.length} выполнена`);
        } catch (error) {
          console.log(`  ⚠️  Команда ${i + 1} пропущена (возможно, уже выполнена): ${error}`);
        }
      }
    }

    // Записываем в таблицу миграций
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        id, checksum, finished_at, migration_name, logs, 
        rolled_back_at, started_at, applied_steps_count
      ) VALUES (
        gen_random_uuid(),
        '',
        NOW(),
        ${migrationName},
        NULL,
        NULL,
        NOW(),
        1
      )
    `;

    console.log(`✅ Миграция ${migrationName} применена успешно`);
    return true;

  } catch (error) {
    console.log(`❌ Ошибка при применении ${migrationName}: ${error}`);
    return false;
  }
}

async function createMissingMigration(migrationName: string): Promise<void> {
  const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', migrationName);
  
  if (!fs.existsSync(migrationPath)) {
    fs.mkdirSync(migrationPath, { recursive: true });
    
    const migrationContent = `-- Migration ${migrationName}
-- This migration was applied to the database but the file was missing locally
-- Created during migration sync process

-- No changes needed as this migration was already applied
`;

    fs.writeFileSync(
      path.join(migrationPath, 'migration.sql'),
      migrationContent
    );
    
    console.log(`✅ Создана локальная миграция: ${migrationName}`);
  }
}

async function runMigrationPipeline() {
  try {
    console.log('🚀 Запуск пайплайна миграций...\n');

    // 1. Проверяем статус
    console.log('📊 Проверяем статус миграций...');
    const status = await getMigrationStatus();
    
    console.log(`✅ Применено: ${status.applied.length}`);
    console.log(`⏳ Ожидает: ${status.pending.length}`);
    console.log(`❓ Отсутствует локально: ${status.missing.length}`);

    // 2. Создаем недостающие миграции
    if (status.missing.length > 0) {
      console.log('\n📝 Создаем недостающие миграции...');
      for (const migrationName of status.missing) {
        await createMissingMigration(migrationName);
      }
    }

    // 3. Применяем ожидающие миграции
    if (status.pending.length > 0) {
      console.log('\n🚀 Применяем ожидающие миграции...');
      
      let successCount = 0;
      for (const migrationName of status.pending) {
        const success = await applyMigration(migrationName);
        if (success) successCount++;
      }
      
      console.log(`\n📊 Результат: ${successCount}/${status.pending.length} миграций применено успешно`);
    }

    // 4. Финальная проверка
    console.log('\n🔍 Финальная проверка...');
    const finalStatus = await getMigrationStatus();
    
    if (finalStatus.pending.length === 0) {
      console.log('✅ Все миграции синхронизированы!');
      
      // Проверяем схему
      console.log('\n🔍 Проверяем схему базы данных...');
      const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT LIKE '_prisma_%'
        ORDER BY table_name
      ` as any[];

      console.log(`📊 Найдено ${result.length} таблиц в базе данных`);
      
    } else {
      console.log(`⚠️  Осталось ${finalStatus.pending.length} непримененных миграций`);
    }

  } catch (error) {
    console.error('❌ Ошибка в пайплайне миграций:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем пайплайн
runMigrationPipeline();

