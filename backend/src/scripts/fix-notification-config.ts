import { db } from "../db";

async function fixNotificationConfig() {
  // Find the service config
  const serviceConfig = await db.serviceConfig.findUnique({
    where: { serviceKey: "notification_auto_processor" }
  });

  if (serviceConfig) {
    console.log("Current config:", JSON.stringify(serviceConfig.config, null, 2));
    
    // Fix the config if minTimeDiffMs is negative
    const config = serviceConfig.config as any;
    if (config.minTimeDiffMs && config.minTimeDiffMs < 0) {
      console.log("\nFixing negative minTimeDiffMs...");
      config.minTimeDiffMs = Math.abs(config.minTimeDiffMs);
      
      await db.serviceConfig.update({
        where: { serviceKey: "notification_auto_processor" },
        data: { config }
      });
      
      console.log("Fixed! New minTimeDiffMs:", config.minTimeDiffMs);
    }
  } else {
    console.log("Service config not found");
  }

  process.exit(0);
}

fixNotificationConfig().catch(console.error);