import { db } from "../src/db"

async function main() {
  try {
    console.log("🔍 Checking NotificationMatcherService status...")
    
    // Check if service exists in database
    let service = await db.service.findUnique({
      where: { name: "NotificationMatcherService" }
    })
    
    if (!service) {
      console.log("📝 Creating NotificationMatcherService in database...")
      service = await db.service.create({
        data: {
          name: "NotificationMatcherService",
          displayName: "Notification Matcher",
          description: "Automatically matches bank notifications with transactions",
          enabled: true,
          interval: 100, // 100ms for fast matching
          publicFields: {
            autoStart: true
          }
        }
      })
      console.log("✅ Service created and enabled with 100ms interval")
    } else if (!service.enabled) {
      console.log("🔄 Enabling NotificationMatcherService...")
      await db.service.update({
        where: { id: service.id },
        data: { 
          enabled: true,
          interval: 100, // Update interval directly
          publicFields: {
            ...service.publicFields as any,
            autoStart: true
          }
        }
      })
      console.log("✅ Service enabled with 100ms interval")
    } else {
      console.log("✅ Service is already enabled")
      
      // Update interval to 100ms if needed
      if (service.interval > 100) {
        console.log("⚡ Updating interval to 100ms for faster matching...")
        await db.service.update({
          where: { id: service.id },
          data: {
            interval: 100
          }
        })
        console.log("✅ Interval updated to 100ms")
      } else {
        console.log(`✅ Interval already set to ${service.interval}ms`)
      }
    }
    
    // Refresh service data to show updated values
    service = await db.service.findUnique({
      where: { name: "NotificationMatcherService" }
    })
    
    console.log("\n📊 Service info:")
    console.log(`   Name: ${service!.name}`)
    console.log(`   Enabled: ${service!.enabled}`)
    console.log(`   Interval: ${service!.interval}ms`)
    console.log(`   Public Fields:`, service!.publicFields)
    
    console.log("\n⚠️  IMPORTANT: Restart the backend for changes to take effect")
    console.log("   Run: cd backend && bun dev")
    
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

main()