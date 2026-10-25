#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://app:app@localhost:5432/app',
  PORT: process.env.PORT || '3000',
};

const shell = process.platform === 'win32';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, shell });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

run('docker', ['compose', 'up', '-d', '--wait', 'db']);
run('npx', ['prisma', 'generate']);
run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['nx', 'serve', 'api']);
