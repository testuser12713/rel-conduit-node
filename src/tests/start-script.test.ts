import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('start script', () => {
  jest.setTimeout(20000);

  it('retries an unreachable database and exits non-zero only after the attempts are exhausted', () => {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const result = spawnSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'start.js')],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://localhost:1/conduit',
          DB_WAIT_MAX_ATTEMPTS: '2',
          DB_WAIT_BASE_DELAY_MS: '10',
          DB_WAIT_MAX_DELAY_MS: '10',
        },
        encoding: 'utf8',
        timeout: 15000,
      },
    );

    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

    expect(result.status).toBe(1);
    expect(output).toContain('attempt 1/2');
    expect(output).toContain('attempt 2/2');
    expect(output).toContain(
      'database did not become reachable after 2 attempts',
    );
    expect(output).not.toContain('starting the api server');
  });
});
