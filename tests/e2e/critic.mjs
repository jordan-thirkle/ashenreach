import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const here = join(process.cwd(), 'tests/e2e');

async function loadMetrics() {
  try {
    return JSON.parse(await readFile(join(here, 'metrics.json'), 'utf8'));
  } catch {
    return null;
  }
}

const m = await loadMetrics();
const gates = [];
function gate(name, pass, detail) {
  gates.push({ name, pass, detail });
}

if (!m) {
  gate('metrics-present', false, 'metrics.json not found - harness did not complete');
} else {
  const r = m.render ?? {};
  gate('no-black-screen', (r.meanLuminance ?? 0) >= 0.02,
    `meanLuminance=${(r.meanLuminance ?? 0).toFixed(4)} (gate >=0.02)`);
  gate('not-flat-render', (r.uniqueColors ?? 0) >= 32,
    `uniqueColors=${r.uniqueColors ?? 0} (gate >=32)`);
  gate('no-console-errors', (m.consoleErrors ?? []).length === 0,
    `errors=${(m.consoleErrors ?? []).length}`);
  const fps = m.metrics?.fps ?? 0;
  gate('fps-acceptable', fps >= 30 || fps === 0, `fps=${fps} (gate >=30; 0 = not measured in headless)`);
  gate('game-booted', !!m.metrics && m.metrics.frame > 0, `frame=${m.metrics?.frame ?? 0}`);
  gate('enemies-spawned', (m.metrics?.enemies ?? 0) > 0, `enemies=${m.metrics?.enemies ?? 0}`);
}

const pass = gates.every((g) => g.pass);
const report = {
  timestamp: new Date().toISOString(),
  verdict: pass ? 'PASS' : 'FAIL',
  gates,
  raw: m,
};

await writeFile(join(here, 'report.json'), JSON.stringify(report, null, 2));

const md = [`# Ashenreach QA Critic Report`, '', `**Verdict: ${pass ? 'PASS ✅' : 'FAIL ❌'}**`, '', '| Gate | Result | Detail |', '| --- | --- | --- |',
  ...gates.map((g) => `| ${g.name} | ${g.pass ? 'PASS' : 'FAIL'} | ${g.detail} |`), '',
  `Shots: ${(m?.shots ?? []).join(', ') || 'n/a'}`,
  `Console errors: ${(m?.consoleErrors ?? []).length}`, ''];
await writeFile(join(here, 'REPORT.md'), md.join('\n'));

console.log('VERDICT=' + report.verdict);
for (const g of gates) console.log(`  ${g.pass ? 'PASS' : 'FAIL'}  ${g.name} — ${g.detail}`);
process.exit(pass ? 0 : 1);
