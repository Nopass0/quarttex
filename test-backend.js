const { spawn } = require('child_process');

// Test if the backend can compile
const testBackend = spawn('bun', ['check', 'src/index.ts'], {
  cwd: '/home/user/projects/quattrex/backend',
  stdio: 'inherit'
});

testBackend.on('close', (code) => {
  console.log(`Backend compilation test exited with code ${code}`);
  process.exit(code);
});

testBackend.on('error', (error) => {
  console.error('Failed to start backend test:', error);
  process.exit(1);
});