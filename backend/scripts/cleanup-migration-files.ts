import fs from 'fs';
import path from 'path';

async function cleanupMigrationFiles() {
  try {
    console.log('🧹 Очищаем временные файлы миграций...\n');

    const projectDir = process.cwd();
    const tempFiles = [
      'fix_chase_aggregators.sql',
      'apply_chase_fix.ts',
      'check-quattrex-aggregator.ts',
      'update-quattrex-timeout.ts',
      'test-quattrex-timeout.ts',
      'monitor-aggregator-logs.ts',
      'update-quattrex-fast-timeout.ts',
      'update-all-aggregators-timeout.ts',
      'test-fast-timeout.ts',
      'test-fast-timeout-ssl.ts',
      'test-chase-compatible-endpoint.ts',
      'test-correct-endpoint.ts',
      'check-integration-logs.ts',
      'test-admin-endpoint.ts',
      'test-headers.ts',
      'test-fixed-format.ts',
      'test-auth-fix.ts',
      'test-extended-timeout.ts'
    ];

    let cleanedCount = 0;
    let notFoundCount = 0;

    for (const file of tempFiles) {
      const filePath = path.join(projectDir, file);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Удален: ${file}`);
          cleanedCount++;
        } catch (error) {
          console.log(`❌ Ошибка при удалении ${file}: ${error}`);
        }
      } else {
        notFoundCount++;
      }
    }

    console.log(`\n📊 Результат очистки:`);
    console.log(`✅ Удалено файлов: ${cleanedCount}`);
    console.log(`❓ Не найдено: ${notFoundCount}`);
    console.log(`📁 Всего проверено: ${tempFiles.length}`);

    // Проверяем, что основные файлы пайплайна на месте
    const requiredFiles = [
      'scripts/migration-pipeline.ts',
      'scripts/deploy-migrations.sh',
      'scripts/fix-migrations.ts',
      'Dockerfile.migrations',
      'docker-compose.migrations.yml',
      'MIGRATION_PIPELINE.md',
      'CHASE_MIGRATIONS.md'
    ];

    console.log(`\n🔍 Проверяем основные файлы пайплайна:`);
    
    for (const file of requiredFiles) {
      const filePath = path.join(projectDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ Отсутствует: ${file}`);
      }
    }

    console.log(`\n🎉 Очистка завершена!`);

  } catch (error) {
    console.error('❌ Ошибка при очистке файлов:', error);
  }
}

cleanupMigrationFiles();

