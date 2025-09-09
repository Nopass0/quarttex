import { db } from '../db';
import { sha256 } from '../utils/hash';

async function checkPassword() {
  const trader = await db.user.findUnique({ where: { email: 'trader@test.com' } });
  console.log('Password hash in DB:', trader?.password);
  
  const test123Hash = await sha256('test123');
  console.log('SHA256 of test123:', test123Hash);
  
  console.log('Match:', trader?.password === test123Hash);
}

checkPassword();