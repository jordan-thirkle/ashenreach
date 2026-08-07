// Ashenreach marketing site — shared identity + atmosphere.
// The site reads the SAME localStorage the game writes, so a player's bearer,
// souls, and scores appear here with no separate login.
(function () {
  // --- Ash-fall atmosphere (kept from v1, reduced-motion aware) ---
  const canvas = document.getElementById('ash');
  if (canvas) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    let w, h, particles; const COUNT = 90;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8, vy: 0.2 + Math.random() * 0.7,
        vx: -0.25 + Math.random() * 0.5, a: 0.15 + Math.random() * 0.5,
      }));
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y += p.vy; p.x += p.vx;
        if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4; if (p.x > w + 4) p.x = -4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217, 210, 197, ' + p.a + ')'; ctx.fill();
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize(); spawn();
    window.addEventListener('resize', () => { resize(); spawn(); });
    if (reduce) frame(); else requestAnimationFrame(frame);
  }

  // --- Shared identity: same save the game reads/writes ---
  const SAVE_KEY = 'ashenreach.save.v1';
  const SCORES_KEY = 'ashenreach.scores.v1';
  function read(key) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }
  function bearerName() {
    const s = read(SAVE_KEY);
    return (s && (s.name || (s.player && s.player.name))) || null;
  }
  function bestScore() {
    const sc = read(SCORES_KEY);
    if (Array.isArray(sc) && sc.length) return Math.max(...sc.map(r => r.score || 0));
    return null;
  }
  function bestSouls() {
    const s = read(SAVE_KEY);
    if (s && s.stats && typeof s.stats.soulsBanked === 'number') return s.stats.soulsBanked;
    return null;
  }

  function renderIdentity() {
    const name = bearerName();
    const bearerEl = document.getElementById('bearer-state');
    if (bearerEl) {
      if (name) { bearerEl.textContent = 'Bearer: ' + name; bearerEl.hidden = false; }
      else { bearerEl.hidden = true; }
    }
    // Update play CTAs to echo the bearer
    document.querySelectorAll('a[href="/play"]').forEach(a => {
      if (name && a.classList.contains('cta')) a.textContent = 'Play as ' + name;
    });

    const panel = document.getElementById('run-panel');
    if (!panel) return;
    if (!name) return; // leave the empty-state copy
    const score = bestScore(), souls = bestSouls();
    panel.innerHTML =
      '<p class="run-name">' + name + ', Bearer of the Reach</p>' +
      '<div class="run-stats">' +
        '<div class="run-stat"><div class="k">Best score</div><div class="v">' + (score != null ? score.toLocaleString() : '—') + '</div></div>' +
        '<div class="run-stat"><div class="k">Souls banked</div><div class="v">' + (souls != null ? souls : '—') + '</div></div>' +
        '<div class="run-stat"><div class="k">Saved on</div><div class="v">this device</div></div>' +
      '</div>' +
      '<p class="run-empty" style="margin-top:1rem">Open the game and your run continues from here. One save, one bearer, everywhere on this device.</p>';
  }

  renderIdentity();
  // The game may finish loading a save after this page mounts.
  window.addEventListener('storage', renderIdentity);
  window.addEventListener('ashenreach:save', renderIdentity);
})();
