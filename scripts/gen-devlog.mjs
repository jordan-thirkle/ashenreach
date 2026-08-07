// Generates docs/DEVLOG.md from docs/devlog-data.json.
// This is the canonical markdown mirror of the live /devlog page, so the two
// never drift. Run: node scripts/gen-devlog.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'docs/devlog-data.json'), 'utf8'));

function commitLink(repoUrl, sha, subject) {
  if (repoUrl) return `[${sha}](https://github.com/jordan-thirkle/${repoUrl.replace('https://github.com/jordan-thirkle/','')}/commit/${sha})`;
  return sha;
}

function bulleted(arr) {
  return arr.map((x) => `- ${x}`).join('\n');
}

const out = [];
out.push(`# ${data.title}`);
out.push('');
out.push(`> ${data.subtitle}`);
out.push('');
out.push(`_Generated ${data.generated} from \`docs/devlog-data.json\`. This document is the canonical mirror of the live [dev-log page](https://ashenreach.vercel.app/devlog) — both are generated from the same source so they always match._`);
out.push('');
out.push(`By JTT builds in the open. Below is every commit across the lineage that became Ashenreach, from the very first prompt to the live game — including the parts that failed. No curation, no spin.`);
out.push('');

// Repo legend
out.push('## Repositories');
out.push('');
for (const key of Object.keys(data.repos)) {
  const r = data.repos[key];
  const link = r.url ? `[${r.url}](${r.url})` : '_unpublished (local only)_';
  out.push(`- **${r.label}** — ${r.status}. ${link}`);
}
out.push('');

// Totals
const totalCommits = data.phases.reduce((n, p) => n + p.commits.length, 0);
out.push(`**${totalCommits} commits** across **${data.phases.length} phases**. Each phase below is a contiguous slice of real git history.`);
out.push('');

// Phases
for (const phase of data.phases) {
  const repo = data.repos[phase.repo];
  out.push(`## ${phase.name}`);
  out.push('');
  out.push(`_${phase.range} · ${repo.label}_`);
  out.push('');
  out.push(phase.summary);
  out.push('');
  if (phase.failures && phase.failures.length) {
    out.push('### What went wrong (documented, not hidden)');
    out.push('');
    out.push(bulleted(phase.failures));
    out.push('');
  }
  out.push('### Commits');
  out.push('');
  out.push('| Commit | Date | Author | Change |');
  out.push('| --- | --- | --- | --- |');
  for (const c of phase.commits) {
    const subj = c.subject.replace(/\|/g, '\\|');
    out.push(`| ${commitLink(repo.url, c.sha, c.subject)} | ${c.date} | ${c.author} | ${subj} |`);
  }
  out.push('');
  if (phase.failures && phase.failures.length) {
    // map failures to which commit fixed them where possible
  }
  out.push('---');
  out.push('');
}

out.push('## How to read this log');
out.push('');
out.push('- **Waves / Tiers / Gauntlet rounds** are the studio\'s build units. Each is one reviewable slice, not a dump.');
out.push('- **Critic rounds** are named follow-throughs where an automated harsh critic (blind A/B vs. CoD/Warzone/Battlefield/Arena Breakout) found a gap and we closed it in the next Wave.');
out.push('- **Failures are kept on purpose.** If a deploy rendered black, an enemy never shot, or a critic returned TIE/LOSE, it is recorded here. By JTT publishes evidence that leads to conclusions — not just wins.');
out.push('');
out.push('---');
out.push('');
out.push(`_This dev log is regenerated from \`docs/devlog-data.json\`. To add an entry, edit that file and run \`node scripts/gen-devlog.mjs\` — the page and this document update together._`);

const md = out.join('\n');
writeFileSync(join(root, 'docs/DEVLOG.md'), md, 'utf8');
console.log(`Wrote docs/DEVLOG.md (${md.length} bytes, ${totalCommits} commits)`);

// Emit the browser data module from the same canonical JSON, so the live page
// and the markdown doc can never drift. devlog.js reads window.DEVLOG_DATA.
const js = `// AUTO-GENERATED from docs/devlog-data.json by scripts/gen-devlog.mjs.
// Do not edit by hand — edit the JSON and re-run the generator.
window.DEVLOG_DATA = ${JSON.stringify(data, null, 2)};
`;
writeFileSync(join(root, 'web/devlog-data.js'), js, 'utf8');
console.log(`Wrote web/devlog-data.js (${js.length} bytes)`);
