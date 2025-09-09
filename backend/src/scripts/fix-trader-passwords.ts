import { db } from '../db';
import { sha256 } from '../utils/hash';

async function fixPasswords() {
  // Fix test trader
  const test123Hash = await sha256('test123');
  await db.user.update({
    where: { email: 'trader@test.com' },
    data: { password: test123Hash }
  });
  
  // Fix our test traders
  const testHash = await sha256('Test123!');
  await db.user.updateMany({
    where: { 
      email: { in: ['small-balance@test.com', 'large-balance@test.com'] } 
    },
    data: { password: testHash }
  });
  
  console.log('✅ Fixed trader passwords');
}

fixPasswords();