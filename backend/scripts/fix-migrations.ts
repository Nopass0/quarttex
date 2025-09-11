import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fixMigrations() {
  try {
    console.log('🔧 Исправляем состояние миграций...\n');

    // 1. Проверяем текущее состояние
    console.log('📊 Проверяем текущее состояние миграций...');
    
    const migrationTable = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC 
      LIMIT 10
    ` as any[];

    console.log('Последние миграции в базе данных:');
    migrationTable.forEach(m => {
      console.log(`- ${m.migration_name} (${m.finished_at})`);
    });

    // 2. Создаем недостающие записи миграций
    console.log('\n📝 Создаем недостающие записи миграций...');

    const missingMigrations = [
      '20250130_resolve_drift',
      '20250815_add_aggregator_merchants'
    ];

    for (const migrationName of missingMigrations) {
      try {
        await prisma.$executeRaw`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (
            gen_random_uuid(),
            '',
            NOW(),
            ${migrationName},
            NULL,
            NULL,
            NOW(),
            1
          )
          ON CONFLICT (migration_name) DO NOTHING
        `;
        console.log(`✅ Добавлена запись для миграции: ${migrationName}`);
      } catch (error) {
        console.log(`⚠️  Миграция ${migrationName} уже существует или ошибка: ${error}`);
      }
    }

    // 3. Проверяем финальное состояние
    console.log('\n✅ Проверяем финальное состояние...');
    
    const finalStatus = await prisma.$queryRaw`
      SELECT COUNT(*) as total_migrations
      FROM "_prisma_migrations"
    ` as any[];

    console.log(`Всего миграций в базе данных: ${finalStatus[0].total_migrations}`);

    // 4. Проверяем схему
    console.log('\n🔍 Проверяем схему базы данных...');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE '_prisma_%'
      ORDER BY table_name
    ` as any[];

    console.log('Таблицы в базе данных:');
    tables.forEach(t => console.log(`- ${t.table_name}`));

    console.log('\n🎉 Состояние миграций исправлено!');

  } catch (error) {
    console.error('❌ Ошибка при исправлении миграций:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrations();

