import { EventEmitter } from 'events';

interface DeviceStatusUpdate {
  deviceId: string;
  isOnline: boolean;
  batteryLevel?: number;
  networkSpeed?: number;
  timestamp: string;
}

class DeviceStatusWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

  constructor() {
    super();
  }

  connect() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.WebSocket) {
      console.warn('[DeviceStatusWS] WebSocket not available in this environment');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[DeviceStatusWS] Already connected');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      let wsUrl = apiUrl.replace('https:', 'wss:').replace('http:', 'ws:');
      
      // Remove /api from the end if it exists since we'll add it with the path
      if (wsUrl.endsWith('/api')) {
        wsUrl = wsUrl.slice(0, -4);
      }
      
      // Ensure we have a valid WebSocket URL
      if (!wsUrl || wsUrl === '') {
        console.error('[DeviceStatusWS] Invalid WebSocket URL configuration');
        return;
      }
      
      const fullUrl = `${wsUrl}/ws/device-status`;

      console.log('[DeviceStatusWS] Connecting to:', fullUrl);
      console.log('[DeviceStatusWS] Base URL:', process.env.NEXT_PUBLIC_API_URL);

      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        console.log('[DeviceStatusWS] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');

        // Send auth if needed
        const token = localStorage.getItem('trader_token');
        if (token) {
          this.send({
            type: 'auth',
            token: token
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DeviceStatusWS] Message received:', data);

          if (data.type === 'device-status') {
            const update: DeviceStatusUpdate = {
              deviceId: data.deviceId,
              isOnline: data.isOnline,
              batteryLevel: data.batteryLevel,
              networkSpeed: data.networkSpeed,
              timestamp: data.timestamp
            };

            this.emit('device-status-update', update);

            // Emit specific event for device going offline
            if (!data.isOnline) {
              this.emit('device-offline', data.deviceId);
            }
          } else if (data.type === 'bank-details-disabled') {
            this.emit('bank-details-disabled', {
              deviceId: data.deviceId,
              count: data.disabledCount
            });
          } else if (data.type === 'bank-details-enabled') {
            this.emit('bank-details-enabled', {
              deviceId: data.deviceId,
              count: data.enabledCount
            });
          }
        } catch (error) {
          console.error('[DeviceStatusWS] Error parsing message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[DeviceStatusWS] WebSocket error occurred');
        // WebSocket error events don't contain detailed error information
        // We emit a custom error object instead
        const error = new Error('WebSocket connection error');
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        console.log('[DeviceStatusWS] Disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected');

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[DeviceStatusWS] Connection error:', error);
      // Only emit error if it's a meaningful error object
      if (error instanceof Error) {
        this.emit('error', error);
      } else {
        this.emit('error', new Error('Failed to connect to WebSocket'));
      }
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);

    console.log(`[DeviceStatusWS] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[DeviceStatusWS] Cannot send message - not connected');
    }
  }

  subscribeToDevice(deviceId: string) {
    this.send({
      type: 'subscribe-device',
      deviceId: deviceId
    });
  }

  unsubscribeFromDevice(deviceId: string) {
    this.send({
      type: 'unsubscribe-device',
      deviceId: deviceId
    });
  }

  disconnect() {
    console.log('[DeviceStatusWS] Disconnecting...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  isConnectedStatus() {
    return this.isConnected;
  }
}

// Singleton instance
let instance: DeviceStatusWebSocket | null = null;

export function getDeviceStatusWebSocket(): DeviceStatusWebSocket {
  if (!instance) {
    instance = new DeviceStatusWebSocket();
  }
  return instance;
}

export type { DeviceStatusUpdate };