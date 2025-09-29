// 새 사용자를 생성하는 스크립트
// 사용법: node src/scripts/create-user.js

const bcrypt = require('bcryptjs');

async function createHashedPassword() {
  const password = '123456'; // 원하는 비밀번호로 변경
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('=== 사용자 생성 정보 ===');
  console.log('원본 비밀번호:', password);
  console.log('해시된 비밀번호:', hashedPassword);
  console.log('\n=== Supabase SQL 쿼리 ===');
  console.log(`INSERT INTO users (name, password, api_key) VALUES ('admin', '${hashedPassword}', 'sk-test-api-key-12345');`);
}

createHashedPassword().catch(console.error);
