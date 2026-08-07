// Renders the Ashenreach build dev log from window.DEVLOG_DATA.
// That data is generated from docs/devlog-data.json by scripts/gen-devlog.mjs,
// so the live page and docs/DEVLOG.md are always in sync.
(function () {
  const data = window.DEVLOG_DATA;
  const timeline = document.getElementById('timeline');
  const filtersEl = document.getElementById('filters');
  if (!data) {
    timeline.innerHTML = '<p class="err">Dev log data failed to load.</p>';
    return;
  }

  const totalCommits = data.phases.reduce((n, p) => n + p.commits.length, 0);
  document.getElementById('stat-commits').textContent = totalCommits;
  document.getElementById('stat-phases').textContent = data.phases.length;

  // escape helper
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function repoFor(key) { return data.repos[key]; }

  function commitRow(c, repo) {
    const shaLink = repo.url
      ? `<a class="commit-sha" href="${repo.url}/commit/${c.sha}" rel="noopener">${esc(c.sha)}</a>`
      : `<span class="commit-sha">${esc(c.sha)}</span>`;
    return `
      <article class="commit">
        <div class="commit-top">
          ${shaLink}
          <span class="commit-date">${esc(c.date)}</span>
          <span class="commit-author">${esc(c.author)}</span>
        </div>
        <p class="commit-subj">${esc(c.subject)}</p>
        <p class="commit-note">${esc(c.note || '')}</p>
      </article>`;
  }

  function phaseBlock(phase, show) {
    const repo = repoFor(phase.repo);
    const failures = (phase.failures && phase.failures.length)
      ? `<div class="failures"><h3>What went wrong (documented, not hidden)</h3><ul>${phase.failures.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>`
      : '';
    const commits = phase.commits.map((c) => commitRow(c, repo)).join('');
    return `
      <section class="phase" data-phase="${esc(phase.id)}" ${show ? '' : 'hidden'}>
        <div class="phase-head">
          <h2>${esc(phase.name)}<span class="repo-badge">${esc(repo.label)}</span></h2>
          <p class="phase-meta">${esc(phase.range)}</p>
        </div>
        <p class="phase-summary">${esc(phase.summary)}</p>
        ${failures}
        ${commits}
      </section>`;
  }

  function render(filterId) {
    const blocks = data.phases
      .filter((p) => filterId === 'all' || p.id === filterId)
      .map((p) => phaseBlock(p, true))
      .join('');
    timeline.innerHTML = blocks || '<p class="err">No entries for this filter.</p>';
    // re-apply per-phase visibility handled by filter above; full render here
  }

  // Filters
  const opts = [{ id: 'all', label: 'All phases' }].concat(
    data.phases.map((p) => ({ id: p.id, label: p.name.replace(/^Phase \d+ — /, '') }))
  );
  filtersEl.innerHTML = opts.map((o, i) =>
    `<button type="button" data-filter="${esc(o.id)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(o.label)}</button>`
  ).join('');
  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    filtersEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    applyFilter(btn.getAttribute('data-filter'));
  });

  function applyFilter(id) {
    const sections = timeline.querySelectorAll('section.phase');
    sections.forEach((s) => {
      const match = id === 'all' || s.getAttribute('data-phase') === id;
      s.hidden = !match;
    });
  }

  // Initial render: all phases visible
  const allBlocks = data.phases.map((p) => phaseBlock(p, true)).join('');
  timeline.innerHTML = allBlocks || '<p class="err">No entries.</p>';
})();
