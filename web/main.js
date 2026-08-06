// Animated ash-fall for the hero. Lightweight, reduced-motion aware.
(function () {
  const canvas = document.getElementById('ash');
  if (!canvas) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const COUNT = 90;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.2 + Math.random() * 0.7,
      vx: -0.25 + Math.random() * 0.5,
      a: 0.15 + Math.random() * 0.5,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y += p.vy; p.x += p.vx;
      if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
      if (p.x < -4) p.x = w + 4; if (p.x > w + 4) p.x = -4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217, 210, 197, ' + p.a + ')';
      ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  resize(); spawn();
  window.addEventListener('resize', () => { resize(); spawn(); });
  if (reduce) { frame(); } else { requestAnimationFrame(frame); }
})();
