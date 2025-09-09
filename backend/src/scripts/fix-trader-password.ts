import { db } from "../db";
import { sha256 } from "../utils/hash";

async function fixTraderPassword() {
  const hashedPassword = await sha256("test123");
  
  const trader = await db.user.update({
    where: {
      email: "trader@test.com"
    },
    data: {
      password: hashedPassword
    }
  });
  
  console.log("Updated trader password to hashed version of 'test123'");
  console.log("Trader:", trader.email);
  
  process.exit(0);
}

fixTraderPassword().catch(console.error);