import { Game } from './Game';
import './styles.css';

function mount(): void {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app missing');

  const loader = document.getElementById('boot');
  const game = new Game(root);
  game.boot();
  (window as unknown as { __game: unknown }).__game = game.testApi();

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (loader) {
        loader.classList.add('gone');
        window.setTimeout(() => loader.remove(), 600);
      }
    }, 260);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
