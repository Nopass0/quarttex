import { db } from "../db";

async function disableMerchantEmulator() {
  // Find the service config
  const serviceConfig = await db.serviceConfig.findUnique({
    where: { serviceKey: "MerchantEmulatorService" }
  });

  if (serviceConfig) {
    console.log("Current status:", serviceConfig.isEnabled ? "ENABLED" : "DISABLED");
    
    if (serviceConfig.isEnabled) {
      // Disable the service
      await db.serviceConfig.update({
        where: { serviceKey: "MerchantEmulatorService" },
        data: { isEnabled: false }
      });
      
      console.log("✅ MerchantEmulatorService has been DISABLED");
    } else {
      console.log("Service is already disabled");
    }
  } else {
    console.log("Service config not found - creating disabled config");
    
    // Create disabled config
    await db.serviceConfig.create({
      data: {
        serviceKey: "MerchantEmulatorService",
        isEnabled: false,
        config: {
          enabled: false,
          autoStart: false
        }
      }
    });
    
    console.log("✅ Created disabled config for MerchantEmulatorService");
  }

  // Also fix the notification processor config
  const notificationConfig = await db.serviceConfig.findUnique({
    where: { serviceKey: "notification_auto_processor" }
  });

  if (notificationConfig) {
    const config = notificationConfig.config as any;
    if (config.minTimeDiffMs && config.minTimeDiffMs < 0) {
      console.log("\nAlso fixing NotificationAutoProcessorService config...");
      config.minTimeDiffMs = Math.abs(config.minTimeDiffMs);
      
      await db.serviceConfig.update({
        where: { serviceKey: "notification_auto_processor" },
        data: { config }
      });
      
      console.log("✅ Fixed minTimeDiffMs:", config.minTimeDiffMs);
    }
  }

  process.exit(0);
}

disableMerchantEmulator().catch(console.error);