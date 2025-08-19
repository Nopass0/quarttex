import { Elysia } from "elysia";
import { db } from "@/db";

interface Connection {
  ws: any;
  userId?: string;
  role?: string;
  subscribedDevices: Set<string>;
}

const connections = new Map<string, Connection>();

// Helper function to broadcast device status updates
export async function broadcastDeviceStatus(deviceId: string, status: any) {
  for (const [connId, conn] of connections) {
    if (conn.subscribedDevices.has(deviceId)) {
      try {
        conn.ws.send(JSON.stringify({
          type: "device-status",
          deviceId,
          ...status,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`[DeviceStatus] Failed to send update to ${connId}:`, error);
      }
    }
  }
}

// Helper function to broadcast bank details status updates
export async function broadcastBankDetailsStatus(deviceId: string, status: any) {
  for (const [connId, conn] of connections) {
    if (conn.subscribedDevices.has(deviceId)) {
      try {
        conn.ws.send(JSON.stringify({
          type: "bank-details-status",
          deviceId,
          ...status,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`[DeviceStatus] Failed to send bank details update to ${connId}:`, error);
      }
    }
  }
}

const deviceStatusRoutes = (app: Elysia) =>
  app.ws("/ws/device-status", {
    async open(ws) {
      const connId = Math.random().toString(36).substring(7);
      connections.set(connId, {
        ws,
        subscribedDevices: new Set()
      });
      
      console.log(`[DeviceStatus] New WebSocket connection: ${connId}`);
      
      // Send connection ID to client
      ws.send(JSON.stringify({ 
        type: "connected",
        connectionId: connId
      }));
    },

    async message(ws, message) {
      try {
        // Handle different message types
        let data: any;
        
        if (typeof message === 'string') {
          data = JSON.parse(message);
        } else if (message instanceof Buffer) {
          data = JSON.parse(message.toString());
        } else if (typeof message === 'object' && message !== null) {
          // If it's already an object, use it directly
          data = message;
        } else {
          console.error('[DeviceStatus] Unknown message type:', typeof message);
          return;
        }

        const connId = Array.from(connections.entries())
          .find(([_, conn]) => conn.ws === ws)?.[0];

        if (!connId) return;

        const conn = connections.get(connId)!;

        switch (data.type) {
          case "auth":
            // Authenticate the connection using session token
            try {
              const token = data.token;
              
              // Find session by token
              const session = await db.session.findUnique({
                where: { token },
                include: { user: true }
              });

              if (session && session.user && new Date() < session.expiredAt) {
                conn.userId = session.user.id;
                conn.role = session.user.role;
                console.log(`[DeviceStatus] Connection ${connId} authenticated as user ${session.user.id}`);
                
                // Send auth success
                ws.send(JSON.stringify({ 
                  type: "auth-success",
                  userId: session.user.id,
                  role: conn.role
                }));

                // Send initial status for all user's devices
                const devices = await db.device.findMany({
                  where: { userId: session.user.id }
                });

                for (const device of devices) {
                  ws.send(JSON.stringify({
                    type: "device-status",
                    deviceId: device.id,
                    isOnline: device.isOnline,
                    batteryLevel: device.energy,
                    networkSpeed: device.ethernetSpeed,
                    timestamp: new Date().toISOString()
                  }));
                }
              } else {
                throw new Error("Invalid or expired session");
              }
            } catch (error) {
              console.error(`[DeviceStatus] Auth error:`, error);
              ws.send(JSON.stringify({ 
                type: "auth-error",
                message: "Invalid or expired token"
              }));
            }
            break;

          case "subscribe-device":
            // Subscribe to specific device updates
            if (data.deviceId) {
              conn.subscribedDevices.add(data.deviceId);
              console.log(`[DeviceStatus] Connection ${connId} subscribed to device ${data.deviceId}`);
              
              // Send current device status
              const device = await db.device.findUnique({
                where: { id: data.deviceId }
              });

              if (device) {
                ws.send(JSON.stringify({
                  type: "device-status",
                  deviceId: device.id,
                  isOnline: device.isOnline,
                  batteryLevel: device.energy,
                  networkSpeed: device.ethernetSpeed,
                  timestamp: new Date().toISOString()
                }));
              }
            }
            break;

          case "unsubscribe-device":
            // Unsubscribe from device updates
            if (data.deviceId) {
              conn.subscribedDevices.delete(data.deviceId);
              console.log(`[DeviceStatus] Connection ${connId} unsubscribed from device ${data.deviceId}`);
            }
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.log(`[DeviceStatus] Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`[DeviceStatus] Error processing message:`, error);
      }
    },

    async close(ws) {
      // Find and remove connection
      const connId = Array.from(connections.entries())
        .find(([_, conn]) => conn.ws === ws)?.[0];
      
      if (connId) {
        connections.delete(connId);
        console.log(`[DeviceStatus] WebSocket connection closed: ${connId}`);
      }
    }
  });

export { deviceStatusRoutes };
export default deviceStatusRoutes;