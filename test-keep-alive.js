// Keep-Alive API 테스트 스크립트
// 사용법: node test-keep-alive.js

const https = require('https');
const http = require('http');

async function testKeepAlive() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/keep-alive',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Keep-Alive-Secret': 'fbc3ef61eedf966370360cee50741e2f68e67469c43ed1e628d9d735e502e04d'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('응답 상태 코드:', res.statusCode);
        console.log('응답 내용:', data);
        
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('요청 오류:', error);
      reject(error);
    });

    req.end();
  });
}

// 테스트 실행
console.log('🔄 Keep-Alive API 테스트 시작...');
testKeepAlive()
  .then(result => {
    console.log('✅ 테스트 완료');
    console.log('결과:', result);
  })
  .catch(error => {
    console.error('❌ 테스트 실패:', error);
  });
