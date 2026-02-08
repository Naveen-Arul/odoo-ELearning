const { execSync } = require('child_process');

const port = process.env.PORT || 3000;

try {
  const output = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();

  if (!output) {
    process.exit(0);
  }

  const pids = output
    .split('\n')
    .map((pid) => pid.trim())
    .filter(Boolean);

  if (pids.length === 0) {
    process.exit(0);
  }

  execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
  // eslint-disable-next-line no-console
  console.log(`Killed process(es) on port ${port}: ${pids.join(', ')}`);
} catch (error) {
  process.exit(0);
}
