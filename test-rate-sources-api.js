#!/usr/bin/env node

// Тест API rate-sources с правильными заголовками CORS
const https = require('https');
const http = require('http');

// Отключаем проверку SSL для тестирования
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const testApi = async () => {
  console.log('🧪 Тестируем API rate-sources...\n');

  const options = {
    hostname: 'quattrex.pro',
    port: 443,
    path: '/api/admin/rate-sources',
    method: 'GET',
    headers: {
      'x-admin-key': 'test-key',
      'Content-Type': 'application/json',
      'Origin': 'https://quattrex.pro',
      'User-Agent': 'Mozilla/5.0 (Test)'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`📊 Статус: ${res.statusCode}`);
      console.log(`📋 Заголовки ответа:`);
      console.log(`   - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'НЕТ'}`);
      console.log(`   - Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'НЕТ'}`);
      console.log(`   - Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'НЕТ'}`);
      console.log(`   - Content-Type: ${res.headers['content-type'] || 'НЕТ'}`);
      console.log('');

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Ответ API:');
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n🎉 API работает корректно!');
            resolve(jsonData);
          } else {
            console.log(`\n❌ Ошибка API: ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ Ошибка парсинга JSON:', error.message);
          console.log('📄 Сырой ответ:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Ошибка запроса:', error.message);
      reject(error);
    });

    req.end();
  });
};

const testCorsPreflight = async () => {
  console.log('\n🔄 Тестируем CORS preflight (OPTIONS)...\n');

  const options = {
    hostname: 'quattrex.pro',
    port: 443,
    path: '/api/admin/rate-sources',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://quattrex.pro',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'x-admin-key,content-type'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`📊 Preflight статус: ${res.statusCode}`);
      console.log(`📋 CORS заголовки:`);
      console.log(`   - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'НЕТ'}`);
      console.log(`   - Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'НЕТ'}`);
      console.log(`   - Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'НЕТ'}`);
      console.log(`   - Access-Control-Max-Age: ${res.headers['access-control-max-age'] || 'НЕТ'}`);
      
      if (res.statusCode === 204) {
        console.log('\n✅ CORS preflight работает!');
        resolve(true);
      } else {
        console.log(`\n❌ CORS preflight ошибка: ${res.statusCode}`);
        reject(new Error(`CORS preflight failed: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      console.log('❌ Ошибка preflight:', error.message);
      reject(error);
    });

    req.end();
  });
};

// Запускаем тесты
(async () => {
  try {
    await testCorsPreflight();
    await testApi();
    console.log('\n🎯 Все тесты прошли успешно!');
  } catch (error) {
    console.log('\n💥 Тест завершился с ошибкой:', error.message);
    process.exit(1);
  }
})();
