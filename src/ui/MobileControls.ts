import type { InputManager } from '../core/Input';
import { el, icon } from './Widgets';

/**
 * Virtual stick + action buttons. 44px minimum tap targets, safe-area aware,
 * touch-action none. Only mounted on touch devices.
 */
export class MobileControls {
  private root: HTMLElement;
  private input: InputManager;
  private stickBase: HTMLElement;
  private stickKnob: HTMLElement;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private baseCenter = { x: 0, y: 0 };
  private readonly MAX_DIST = 46;

  constructor(parent: HTMLElement, input: InputManager) {
    this.input = input;
    this.root = el('div', 'mobile-controls');
    parent.appendChild(this.root);

    this.stickBase = el('div', 'stick-base');
    this.stickKnob = el('div', 'stick-knob');
    this.stickBase.appendChild(this.stickKnob);
    this.root.appendChild(this.stickBase);

    const buttons = el('div', 'touch-buttons');
    const mk = (name: string, label: string, iconName: string, big = false): HTMLElement => {
      const b = el('button', `touch-btn${big ? ' big' : ''} tb-${name}`);
      b.setAttribute('aria-label', label);
      b.appendChild(icon(iconName, big ? 30 : 22));
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.press(name, true);
        b.classList.add('active');
      }, { passive: false });
      b.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.press(name, false);
        b.classList.remove('active');
      }, { passive: false });
      buttons.appendChild(b);
      return b;
    };

    mk('attack', 'Attack', 'blade', true);
    mk('dash', 'Dash', 'bolt');
    mk('parry', 'Parry', 'cloak');
    mk('interact', 'Interact', 'quest');
    mk('ability1', 'Ability one', 'ember');
    this.root.appendChild(buttons);

    const menuRow = el('div', 'touch-menu');
    const mkMenu = (label: string, iconName: string, key: string): void => {
      const b = el('button', 'touch-menu-btn');
      b.setAttribute('aria-label', label);
      b.appendChild(icon(iconName, 18));
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
      }, { passive: false });
      menuRow.appendChild(b);
    };
    mkMenu('Map', 'map', 'KeyM');
    mkMenu('Kit', 'bag', 'KeyI');
    mkMenu('Wake', 'skills', 'KeyK');
    mkMenu('Pause', 'settings', 'Escape');
    this.root.appendChild(menuRow);

    this.bindTouch(parent);
  }

  private press(name: string, down: boolean): void {
    const map = this.input.touchBtn as unknown as Record<string, boolean>;
    if (down) map[name] = true;
    else if (name === 'parry') map[name] = false;
  }

  private bindTouch(surface: HTMLElement): void {
    const rect = (): DOMRect => this.stickBase.getBoundingClientRect();

    surface.addEventListener('touchstart', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        const target = t.target as HTMLElement;
        if (target.closest('.touch-btn') || target.closest('.touch-menu-btn')) continue;

        const half = window.innerWidth * 0.5;
        if (t.clientX < half && this.stickId === null) {
          this.stickId = t.identifier;
          const r = rect();
          this.baseCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          this.input.stick.active = true;
          this.moveStick(t.clientX, t.clientY);
        } else if (t.clientX >= half && this.lookId === null) {
          this.lookId = t.identifier;
          this.lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });

    surface.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.stickId) {
          this.moveStick(t.clientX, t.clientY);
        } else if (t.identifier === this.lookId) {
          this.input.look.x += (t.clientX - this.lookLast.x) * 0.06;
          this.input.look.y += (t.clientY - this.lookLast.y) * 0.06;
          this.lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });

    const end = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.stickId) {
          this.stickId = null;
          this.input.stick.active = false;
          this.input.stick.x = 0;
          this.input.stick.y = 0;
          this.stickKnob.style.transform = 'translate(-50%, -50%)';
        } else if (t.identifier === this.lookId) {
          this.lookId = null;
        }
      }
    };
    surface.addEventListener('touchend', end, { passive: true });
    surface.addEventListener('touchcancel', end, { passive: true });
  }

  private moveStick(cx: number, cy: number): void {
    let dx = cx - this.baseCenter.x;
    let dy = cy - this.baseCenter.y;
    const d = Math.hypot(dx, dy);
    if (d > this.MAX_DIST) {
      dx = (dx / d) * this.MAX_DIST;
      dy = (dy / d) * this.MAX_DIST;
    }
    this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.input.stick.x = dx / this.MAX_DIST;
    this.input.stick.y = dy / this.MAX_DIST;
  }

  show(v: boolean): void {
    this.root.style.display = v ? 'block' : 'none';
  }
}
