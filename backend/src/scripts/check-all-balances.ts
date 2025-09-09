
import { db } from '../db';

async function checkAllBalances() {
  const users = await db.user.findMany({
    where: {
      profitFromDeals: {
        gte: 10,
        lte: 11
      }
    },
    select: {
      id: true,
      email: true,
      profitFromDeals: true
    }
  });
  
  console.log('Users with profitFromDeals between 10 and 11:', users);
  
  await db.$disconnect();
}

checkAllBalances();

