import { db } from "../db";

async function testAcceptPayout() {
  // Find the trader
  const trader = await db.user.findFirst({
    where: {
      email: "trader@test.com"
    }
  });

  if (!trader) {
    console.log("Trader not found");
    process.exit(1);
  }

  // Login as trader to get a session token
  console.log("Logging in as trader...");
  const loginResponse = await fetch("http://localhost:3000/api/user/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "trader@test.com",
      password: "test123"
    })
  });

  if (!loginResponse.ok) {
    console.error("Failed to login:", await loginResponse.text());
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log("Got trader token:", token);

  // Find the unassigned payout
  const payout = await db.payout.findFirst({
    where: {
      status: "CREATED",
      traderId: null,
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!payout) {
    console.log("No unassigned payouts found");
    process.exit(1);
  }

  console.log("\nFound unassigned payout:", {
    id: payout.id,
    numericId: payout.numericId,
    amount: payout.amount,
    status: payout.status
  });

  // Call the accept endpoint with x-trader-token header
  const response = await fetch(`http://localhost:3000/api/trader/payouts/${payout.id}/accept`, {
    method: "POST",
    headers: {
      "x-trader-token": token,
      "Content-Type": "application/json"
    }
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log("\nSuccessfully accepted payout:", result);
    
    // Check the updated payout
    const updatedPayout = await db.payout.findUnique({
      where: { id: payout.id },
      include: { trader: true }
    });
    
    console.log("\nUpdated payout:", {
      id: updatedPayout?.id,
      numericId: updatedPayout?.numericId,
      status: updatedPayout?.status,
      traderId: updatedPayout?.traderId,
      traderEmail: updatedPayout?.trader?.email
    });
    
    // Check trader balance
    const updatedTrader = await db.user.findUnique({
      where: { id: trader.id }
    });
    
    console.log("\nTrader balance after accepting:", {
      balanceRub: updatedTrader?.balanceRub,
      frozenRub: updatedTrader?.frozenRub
    });
  } else {
    console.error("Failed to accept payout:", result);
  }

  process.exit(0);
}

testAcceptPayout().catch(console.error);