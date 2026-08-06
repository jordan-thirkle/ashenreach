// Tier-1 integration verification. Run AFTER the 3 subagents complete.
// Single serialized build (dist/ writes collide if parallel) + tests + e2e critic.
import { execSync } from 'node:child_process';

function step(name: string, cmd: string): void {
  console.log(`\n=== ${name} ===`);
  try {
    const out = execSync(cmd, { cwd: process.cwd(), stdio: 'pipe' }).toString();
    console.log(out.slice(-800));
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.log('FAILED:', (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? ''));
    process.exitCode = 1;
  }
}

step('TYPECHECK', 'npx tsc --noEmit');
step('UNIT TESTS', 'npx vitest run');
step('BUILD', 'npm run build');
console.log('\nIf all green above, run: node tests/e2e/run.mjs then node tests/e2e/critic.mjs');
