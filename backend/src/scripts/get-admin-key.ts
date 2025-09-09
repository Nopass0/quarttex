import { MASTER_KEY, ADMIN_KEY } from "../utils/constants";

console.log("🔑 Admin Key Information:");
console.log(`Master Key: ${MASTER_KEY}`);
console.log(`Dynamic Admin Key: ${ADMIN_KEY}`);
console.log(`Super Admin Key from ENV: ${Bun.env.SUPER_ADMIN_KEY || "не установлен"}`);

