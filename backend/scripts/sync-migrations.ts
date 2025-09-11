import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function syncMigrations() {
  try {
    console.log('🔄 Синхронизируем миграции...\n');

    // 1. Получаем список миграций из базы данных
    const dbMigrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at
    ` as any[];

    console.log(`📊 Найдено ${dbMigrations.length} миграций в базе данных`);

    // 2. Получаем список локальных миграций
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const localMigrations = fs.readdirSync(migrationsDir)
      .filter(name => name !== 'migration_lock.toml')
      .sort();

    console.log(`📁 Найдено ${localMigrations.length} локальных миграций`);

    // 3. Находим миграции, которые есть в БД, но нет локально
    const missingLocally = dbMigrations
      .map(m => m.migration_name)
      .filter(name => !localMigrations.includes(name));

    if (missingLocally.length > 0) {
      console.log('\n⚠️  Миграции в БД, но отсутствующие локально:');
      missingLocally.forEach(name => console.log(`- ${name}`));
    }

    // 4. Находим миграции, которые есть локально, но не применены в БД
    const dbMigrationNames = dbMigrations.map(m => m.migration_name);
    const notApplied = localMigrations.filter(name => !dbMigrationNames.includes(name));

    if (notApplied.length > 0) {
      console.log('\n📝 Локальные миграции, не примененные в БД:');
      notApplied.forEach(name => console.log(`- ${name}`));
    }

    // 5. Создаем недостающие миграции локально (пустые)
    for (const migrationName of missingLocally) {
      const migrationPath = path.join(migrationsDir, migrationName);
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

    // 6. Применяем непримененные миграции
    if (notApplied.length > 0) {
      console.log('\n🚀 Применяем непримененные миграции...');
      
      for (const migrationName of notApplied) {
        try {
          const migrationPath = path.join(migrationsDir, migrationName, 'migration.sql');
          if (fs.existsSync(migrationPath)) {
            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            // Выполняем миграцию
            await prisma.$executeRawUnsafe(sql);
            
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
            
            console.log(`✅ Применена миграция: ${migrationName}`);
          }
        } catch (error) {
          console.log(`❌ Ошибка при применении ${migrationName}: ${error}`);
        }
      }
    }

    // 7. Финальная проверка
    console.log('\n🔍 Финальная проверка...');
    
    const finalDbMigrations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
    ` as any[];

    const finalLocalMigrations = fs.readdirSync(migrationsDir)
      .filter(name => name !== 'migration_lock.toml').length;

    console.log(`📊 Миграций в БД: ${finalDbMigrations[0].count}`);
    console.log(`📁 Локальных миграций: ${finalLocalMigrations}`);

    if (finalDbMigrations[0].count === finalLocalMigrations) {
      console.log('✅ Миграции синхронизированы!');
    } else {
      console.log('⚠️  Миграции не полностью синхронизированы');
    }

  } catch (error) {
    console.error('❌ Ошибка при синхронизации миграций:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncMigrations();

