
import { db } from '../db';

async function checkBalance() {
  const user = await db.user.findFirst({
    select: {
      id: true,
      email: true,
      profitFromDeals: true,
      profitFromPayouts: true,
      trustBalance: true,
      balanceUsdt: true
    }
  });
  
  console.log('User balances:', user);
  
  await db.$disconnect();
}

checkBalance();

