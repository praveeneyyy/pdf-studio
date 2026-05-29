const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const services = [
  { name: 'api-gateway', dir: 'api-gateway', cmd: 'node', args: ['index.js'], color: '\x1b[36m' }, // Cyan
  { name: 'pdf-service', dir: 'pdf-service', cmd: 'node', args: ['index.js'], color: '\x1b[32m' }, // Green
  { name: 'conversion-service', dir: 'conversion-service', cmd: 'node', args: ['index.js'], color: '\x1b[33m' }, // Yellow
  { name: 'ocr-service', dir: 'ocr-service', cmd: 'node', args: ['index.js'], color: '\x1b[35m' }, // Magenta
  { name: 'ai-service', dir: 'ai-service', cmd: 'node', args: ['index.js'], color: '\x1b[34m' }, // Blue
  { name: 'office-service', dir: 'office-service', cmd: 'node', args: ['index.js'], color: '\x1b[37m' }, // White
  { name: 'frontend', dir: 'frontend', cmd: 'npm', args: ['run', 'dev'], color: '\x1b[31m' } // Red
];

const children = [];

console.log('\x1b[1m\x1b[34m%s\x1b[0m', '=== Starting PDF Tools Multi-Service Application ===');

for (const svc of services) {
  const dirPath = path.join(__dirname, svc.dir);
  
  // On Windows, npm needs to be run via shell or as npm.cmd
  const isWindows = process.platform === 'win32';
  const command = (svc.cmd === 'npm' && isWindows) ? 'npm.cmd' : svc.cmd;

  const child = spawn(command, svc.args, {
    cwd: dirPath,
    shell: true
  });

  const prefix = `${svc.color}[${svc.name}]\x1b[0m`;

  // Read stdout line by line
  const rlOut = readline.createInterface({
    input: child.stdout,
    terminal: false
  });
  rlOut.on('line', (line) => {
    console.log(`${prefix} ${line}`);
  });

  // Read stderr line by line
  const rlErr = readline.createInterface({
    input: child.stderr,
    terminal: false
  });
  rlErr.on('line', (line) => {
    console.error(`${prefix} \x1b[31m[ERROR]\x1b[0m ${line}`);
  });

  child.on('error', (err) => {
    console.error(`${prefix} \x1b[31mFailed to start:\x1b[0m`, err);
  });

  child.on('close', (code) => {
    console.log(`${prefix} exited with code ${code}`);
  });

  children.push(child);
}

// Handle exit of the main process to clean up children
function cleanup() {
  console.log('\n\x1b[1m\x1b[31m%s\x1b[0m', '=== Stopping all services... ===');
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
