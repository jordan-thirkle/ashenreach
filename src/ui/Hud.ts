import type { Item, QuestDef, PoiDef, Stats } from '../core/Types';
import { el, icon, itemCard, formatAffix, rarityPip } from './Widgets';
import { CSS } from '../core/Palette';
import { comboTier } from '../systems/Combat';

export interface HudRefs {
  root: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  stamFill: HTMLElement;
  xpFill: HTMLElement;
  levelText: HTMLElement;
  soulCount: HTMLElement;
  soulRing: HTMLElement;
  emberCount: HTMLElement;
  comboEl: HTMLElement;
  questPanel: HTMLElement;
  toastWrap: HTMLElement;
  markerWrap: HTMLElement;
  crosshair: HTMLElement;
  interactPrompt: HTMLElement;
  embertide: HTMLElement;
  biomeName: HTMLElement;
  compass: HTMLElement;
  bossBar: HTMLElement;
  bossFill: HTMLElement;
  bossName: HTMLElement;
  subtitle: HTMLElement;
}

export function buildHud(parent: HTMLElement): HudRefs {
  const root = el('div', 'hud');
  parent.appendChild(root);

  // --- top-left: vitals ---
  const vitals = el('div', 'hud-vitals');
  const hpRow = el('div', 'vital-row');
  const hpIcon = icon('heart', 16);
  hpIcon.classList.add('vital-icon', 'hp');
  hpRow.appendChild(hpIcon);
  const hpBar = el('div', 'vital-bar hp');
  const hpFill = el('div', 'vital-fill');
  hpBar.appendChild(hpFill);
  const hpText = el('span', 'vital-text', '100');
  hpBar.appendChild(hpText);
  hpRow.appendChild(hpBar);
  vitals.appendChild(hpRow);

  const stRow = el('div', 'vital-row');
  const stIcon = icon('bolt', 14);
  stIcon.classList.add('vital-icon', 'stam');
  stRow.appendChild(stIcon);
  const stBar = el('div', 'vital-bar stam');
  const stamFill = el('div', 'vital-fill');
  stBar.appendChild(stamFill);
  stRow.appendChild(stBar);
  vitals.appendChild(stRow);

  const xpRow = el('div', 'vital-row xp-row');
  const levelText = el('span', 'level-badge', '1');
  xpRow.appendChild(levelText);
  const xpBar = el('div', 'vital-bar xp');
  const xpFill = el('div', 'vital-fill');
  xpBar.appendChild(xpFill);
  xpRow.appendChild(xpBar);
  vitals.appendChild(xpRow);
  root.appendChild(vitals);

  // --- top-right: souls, embers, embertide ---
  const res = el('div', 'hud-resources');
  const soulRing = el('div', 'soul-ring');
  const soulIcon = icon('soul', 22);
  soulRing.appendChild(soulIcon);
  const soulCount = el('span', 'soul-count', '0');
  soulRing.appendChild(soulCount);
  res.appendChild(soulRing);

  const emberBox = el('div', 'ember-box');
  emberBox.appendChild(icon('ember', 16));
  const emberCount = el('span', 'ember-count', '0');
  emberBox.appendChild(emberCount);
  res.appendChild(emberBox);

  const embertide = el('div', 'embertide-meter');
  embertide.appendChild(el('span', 'et-label', 'EMBERTIDE'));
  const etTrack = el('div', 'et-track');
  etTrack.appendChild(el('div', 'et-fill'));
  embertide.appendChild(etTrack);
  embertide.appendChild(el('span', 'et-level', '0'));
  res.appendChild(embertide);
  root.appendChild(res);

  // --- centre ---
  const crosshair = el('div', 'crosshair');
  root.appendChild(crosshair);

  const comboEl = el('div', 'combo-display');
  root.appendChild(comboEl);

  const interactPrompt = el('div', 'interact-prompt');
  interactPrompt.style.display = 'none';
  root.appendChild(interactPrompt);

  const markerWrap = el('div', 'marker-layer');
  root.appendChild(markerWrap);

  // --- boss bar ---
  const bossBar = el('div', 'boss-bar');
  bossBar.style.display = 'none';
  const bossName = el('div', 'boss-name', '');
  bossBar.appendChild(bossName);
  const bossTrack = el('div', 'boss-track');
  const bossFill = el('div', 'boss-fill');
  bossTrack.appendChild(bossFill);
  bossBar.appendChild(bossTrack);
  root.appendChild(bossBar);

  // --- right: quest tracker ---
  const questPanel = el('div', 'quest-panel');
  root.appendChild(questPanel);

  // --- bottom-left: location + compass ---
  const locBox = el('div', 'loc-box');
  const compass = el('div', 'compass');
  locBox.appendChild(compass);
  const biomeName = el('div', 'biome-name', '');
  locBox.appendChild(biomeName);
  root.appendChild(locBox);

  // --- toasts ---
  const toastWrap = el('div', 'toast-wrap');
  root.appendChild(toastWrap);

  const subtitle = el('div', 'subtitle-line');
  root.appendChild(subtitle);

  return {
    root, hpFill, hpText, stamFill, xpFill, levelText,
    soulCount, soulRing, emberCount, comboEl, questPanel, toastWrap,
    markerWrap, crosshair, interactPrompt, embertide, biomeName,
    compass, bossBar, bossFill, bossName, subtitle,
  };
}

export function updateVitals(
  h: HudRefs, hp: number, maxHp: number, stam: number, maxStam: number,
  xpInto: number, xpNeed: number, level: number, souls: number, embers: number,
): void {
  const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  h.hpFill.style.width = `${hpPct}%`;
  h.hpText.textContent = String(Math.ceil(hp));
  h.hpFill.classList.toggle('critical', hpPct < 30);
  h.stamFill.style.width = `${Math.max(0, Math.min(100, (stam / Math.max(1, maxStam)) * 100))}%`;
  h.xpFill.style.width = `${Math.max(0, Math.min(100, (xpInto / Math.max(1, xpNeed)) * 100))}%`;
  h.levelText.textContent = String(level);
  h.soulCount.textContent = String(souls);
  h.soulRing.classList.toggle('carrying', souls > 0);
  h.soulRing.classList.toggle('heavy', souls >= 6);
  h.emberCount.textContent = String(embers);
}

export function updateCombo(h: HudRefs, combo: number): void {
  if (combo < 2) {
    h.comboEl.textContent = '';
    h.comboEl.className = 'combo-display';
    return;
  }
  const t = comboTier(combo);
  h.comboEl.textContent = `${combo}`;
  h.comboEl.className = `combo-display active t-${t.tier}`;
  h.comboEl.style.color = `#${t.color.toString(16).padStart(6, '0')}`;
  // Retrigger the pop animation.
  h.comboEl.style.animation = 'none';
  void h.comboEl.offsetHeight;
  h.comboEl.style.animation = '';
}

export function updateEmbertide(h: HudRefs, level: number, progress01: number): void {
  const fill = h.embertide.querySelector('.et-fill') as HTMLElement | null;
  const lvl = h.embertide.querySelector('.et-level') as HTMLElement | null;
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, progress01 * 100))}%`;
  if (lvl) lvl.textContent = String(level);
  h.embertide.classList.toggle('hot', level >= 3);
  h.embertide.classList.toggle('critical', level >= 5);
}

export function updateQuests(
  h: HudRefs, active: QuestDef[], progress: Record<string, number[]>,
): void {
  h.questPanel.replaceChildren();
  if (active.length === 0) return;
  const title = el('div', 'quest-panel-title', 'OBJECTIVES');
  h.questPanel.appendChild(title);
  for (const q of active.slice(0, 3)) {
    const box = el('div', 'quest-item');
    const qt = el('div', 'quest-title');
    const qi = icon('quest', 12);
    qt.appendChild(qi);
    qt.appendChild(el('span', '', q.title));
    box.appendChild(qt);
    const prog = progress[q.id] ?? [];
    q.steps.forEach((s, i) => {
      const have = prog[i] ?? 0;
      const done = have >= s.count;
      const line = el('div', `quest-step${done ? ' done' : ''}`);
      line.textContent = `${s.text}  ${Math.min(have, s.count)}/${s.count}`;
      box.appendChild(line);
    });
    h.questPanel.appendChild(box);
  }
}

export function toast(h: HudRefs, text: string, tone: 'info' | 'good' | 'bad' | 'gold'): void {
  const t = el('div', `toast t-${tone}`, text);
  h.toastWrap.appendChild(t);
  window.setTimeout(() => {
    t.classList.add('out');
    window.setTimeout(() => t.remove(), 420);
  }, 2600);
  while (h.toastWrap.children.length > 5) h.toastWrap.firstChild?.remove();
}

export function subtitle(h: HudRefs, text: string, ms = 4200): void {
  h.subtitle.textContent = text;
  h.subtitle.classList.add('visible');
  window.setTimeout(() => h.subtitle.classList.remove('visible'), ms);
}

export interface MarkerSpec {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  dist: number;
  kind: 'quest' | 'poi' | 'cairn' | 'boss' | 'loot' | 'enemy';
  label?: string;
  offscreenAngle?: number;
}

/** Diegetic markers: shape encodes kind so colourblind players lose nothing. */
export function updateMarkers(h: HudRefs, specs: MarkerSpec[], colorblind: boolean): void {
  const existing = new Map<string, HTMLElement>();
  for (const child of Array.from(h.markerWrap.children)) {
    const e = child as HTMLElement;
    existing.set(e.dataset.id ?? '', e);
  }
  const seen = new Set<string>();

  for (const s of specs) {
    seen.add(s.id);
    let m = existing.get(s.id);
    if (!m) {
      m = el('div', `marker m-${s.kind}`);
      m.dataset.id = s.id;
      const glyph = el('span', 'marker-glyph');
      m.appendChild(glyph);
      const lab = el('span', 'marker-label');
      m.appendChild(lab);
      h.markerWrap.appendChild(m);
    }
    m.className = `marker m-${s.kind}${s.visible ? '' : ' offscreen'}${colorblind ? ' cb' : ''}`;
    m.style.left = `${s.x}px`;
    m.style.top = `${s.y}px`;
    const lab = m.querySelector('.marker-label') as HTMLElement | null;
    if (lab) {
      lab.textContent = s.label ? `${s.label}  ${Math.round(s.dist)}m` : `${Math.round(s.dist)}m`;
    }
    m.style.opacity = String(Math.max(0.28, 1 - s.dist / 420));
    if (!s.visible && s.offscreenAngle !== undefined) {
      m.style.transform = `translate(-50%,-50%) rotate(${s.offscreenAngle}rad)`;
    } else {
      m.style.transform = 'translate(-50%,-50%)';
    }
  }
  for (const [id, e] of existing) {
    if (!seen.has(id)) e.remove();
  }
}

export function updateCompass(h: HudRefs, yaw: number, biome: string): void {
  const deg = ((-yaw * 180) / Math.PI) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  h.compass.textContent = dirs[idx] ?? 'N';
  h.biomeName.textContent = biome;
}

export function showInteract(h: HudRefs, text: string | null): void {
  if (!text) {
    h.interactPrompt.style.display = 'none';
    return;
  }
  h.interactPrompt.style.display = 'flex';
  h.interactPrompt.replaceChildren();
  const key = el('kbd', 'key', 'E');
  h.interactPrompt.appendChild(key);
  h.interactPrompt.appendChild(el('span', '', text));
}

export function showBoss(h: HudRefs, name: string | null, hp01 = 1, phase = 1): void {
  if (!name) {
    h.bossBar.style.display = 'none';
    return;
  }
  h.bossBar.style.display = 'block';
  h.bossName.textContent = `${name}   ·   PHASE ${phase}`;
  h.bossFill.style.width = `${Math.max(0, Math.min(100, hp01 * 100))}%`;
}

export function lootPopup(parent: HTMLElement, item: Item): void {
  const p = el('div', 'loot-popup');
  p.appendChild(itemCard(item, true));
  parent.appendChild(p);
  window.setTimeout(() => {
    p.classList.add('out');
    window.setTimeout(() => p.remove(), 400);
  }, 2400);
}

export function statSummary(stats: Stats): HTMLElement {
  const box = el('div', 'stat-grid');
  const order: Array<keyof Stats> = [
    'power', 'guard', 'vigor', 'swiftness', 'focus',
    'critChance', 'critMult', 'moveSpeed', 'staminaRegen', 'discovery',
  ];
  for (const k of order) {
    const row = el('div', 'stat-row');
    row.appendChild(el('span', 'stat-k', formatAffix(k, 0).replace('+0 ', '').replace('+0% ', '')));
    const v = stats[k];
    const pct = ['critChance', 'critMult', 'lifesteal', 'moveSpeed', 'discovery'];
    row.appendChild(el('span', 'stat-v',
      pct.includes(k) ? `${Math.round(v * 100)}%` : String(Math.round(v))));
    box.appendChild(row);
  }
  return box;
}

export function poiListEntry(p: PoiDef, dist: number, discovered: boolean): HTMLElement {
  const row = el('div', `poi-row${discovered ? ' found' : ''}`);
  row.appendChild(icon(p.kind === 'cairn' ? 'cairn' : 'map', 14));
  row.appendChild(el('span', 'poi-name', discovered ? p.name : 'Unknown'));
  row.appendChild(el('span', 'poi-dist', `${Math.round(dist)}m`));
  return row;
}

export const HUD_ACCENT = CSS;
export { rarityPip };
