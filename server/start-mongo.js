/**
 * start-mongo.js
 * Starts MongoDB on port 27017 using the binary already cached by
 * mongodb-memory-server during `npm test`. Runs persistently so the
 * dev server can connect to it.
 *
 * Usage: node start-mongo.js
 */
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const MONGOD = path.join(
  __dirname,
  'node_modules/.cache/mongodb-memory-server/mongod-x64-win32-7.0.24.exe'
);

const DATA_DIR = path.join(__dirname, 'mongodb-data');

if (!fs.existsSync(MONGOD)) {
  console.error('mongod binary not found at:', MONGOD);
  console.error('Run `npm test` once first so it gets downloaded.');
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('Starting MongoDB on 127.0.0.1:27017 ...');
console.log('Data dir:', DATA_DIR);

const mongod = spawn(MONGOD, [
  '--dbpath', DATA_DIR,
  '--port', '27017',
  '--bind_ip', '127.0.0.1',
  '--noauth',
], { stdio: 'inherit' });

mongod.on('error', (err) => {
  console.error('Failed to start mongod:', err.message);
  process.exit(1);
});

mongod.on('exit', (code) => {
  console.log('mongod exited with code', code);
});

process.on('SIGINT', () => { mongod.kill(); process.exit(0); });
process.on('SIGTERM', () => { mongod.kill(); process.exit(0); });

console.log('MongoDB starting... (PID will appear above)');
