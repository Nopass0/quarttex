console.log('Starting WebSocket test...');

try {
  const WebSocket = require('ws');
  console.log('WebSocket module loaded');
  
  const ws = new WebSocket('ws://localhost:3001/device-status');
  console.log('WebSocket instance created');

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  // Test with a simple auth message
  const authMessage = {
    type: 'auth',
    token: 'test-token'
  };
  
  console.log('Sending auth message:', authMessage);
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

  // Keep the script running
  setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
  }, 5000);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}