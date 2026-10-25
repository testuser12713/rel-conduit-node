#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const serverEntry = path.join(repoRoot, 'dist', 'api', 'main.js');

const DEFAULT_MAX_ATTEMPTS = 15;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 2000;

function positiveIntegerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function describeError(error) {
  const message =
    error && typeof error.message === 'string' ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingDatabase() {
  let prisma;

  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    await prisma.$queryRawUnsafe('SELECT 1');
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(() => undefined);
    }
  }
}

async function waitForDatabase({ maxAttempts, baseDelayMs, maxDelayMs }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pingDatabase();
      console.log(
        `[start] database reachable (attempt ${attempt}/${maxAttempts})`,
      );
      return;
    } catch (error) {
      const message = describeError(error);
      console.error(
        `[start] database not reachable yet (attempt ${attempt}/${maxAttempts}): ${message}`,
      );

      if (attempt === maxAttempts) {
        throw new Error(
          `database did not become reachable after ${maxAttempts} attempts: ${message}`,
        );
      }

      const waitMs = Math.min(
        baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs,
      );
      console.error(`[start] retrying in ${waitMs}ms`);
      await delay(waitMs);
    }
  }
}

function runMigrations(env) {
  console.log('[start] running migrations (prisma migrate deploy)');
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(
      `[start] could not run migrations: ${result.error.message}`,
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      `[start] migrations failed with exit code ${
        result.status === null ? 1 : result.status
      }`,
    );
    process.exit(result.status === null ? 1 : result.status);
  }
}

function startServer(env) {
  if (!fs.existsSync(serverEntry)) {
    console.error(
      `[start] built server not found at ${serverEntry}; run "npx nx build api" first`,
    );
    process.exit(1);
  }

  console.log('[start] starting the api server (dist/api/main.js)');
  const child = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(`[start] could not start the api server: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[start] api server stopped by ${signal}`);
      process.exit(1);
    }

    process.exit(code === null ? 1 : code);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  }
}

async function main() {
  const env = { ...process.env };

  if (!env.DATABASE_URL) {
    console.error(
      '[start] DATABASE_URL is not set; the api cannot reach PostgreSQL',
    );
    process.exit(1);
  }

  const maxAttempts = positiveIntegerFromEnv(
    'DB_WAIT_MAX_ATTEMPTS',
    DEFAULT_MAX_ATTEMPTS,
  );
  const baseDelayMs = positiveIntegerFromEnv(
    'DB_WAIT_BASE_DELAY_MS',
    DEFAULT_BASE_DELAY_MS,
  );
  const maxDelayMs = positiveIntegerFromEnv(
    'DB_WAIT_MAX_DELAY_MS',
    DEFAULT_MAX_DELAY_MS,
  );

  console.log(
    `[start] waiting for the database (up to ${maxAttempts} attempts)`,
  );
  await waitForDatabase({ maxAttempts, baseDelayMs, maxDelayMs });
  runMigrations(env);
  startServer(env);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[start] ${describeError(error)}`);
    process.exit(1);
  });
}

module.exports = {
  describeError,
  pingDatabase,
  waitForDatabase,
};
