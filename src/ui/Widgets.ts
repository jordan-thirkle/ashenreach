import type { Item, Rarity } from '../core/Types';
import { RARITY_CSS } from '../core/Palette';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function statLabel(stat: string): string {
  const map: Record<string, string> = {
    power: 'Power', guard: 'Guard', swiftness: 'Swiftness', vigor: 'Vigour',
    focus: 'Focus', critChance: 'Crit Chance', critMult: 'Crit Damage',
    emberDmg: 'Ember', frostDmg: 'Frost', rotDmg: 'Rot', lifesteal: 'Lifesteal',
    moveSpeed: 'Move Speed', staminaRegen: 'Stamina Regen', discovery: 'Discovery',
  };
  return map[stat] ?? stat;
}

export function formatAffix(stat: string, value: number): string {
  const pct = ['critChance', 'critMult', 'lifesteal', 'moveSpeed', 'discovery'];
  if (pct.includes(stat)) return `+${Math.round(value * 100)}% ${statLabel(stat)}`;
  return `+${Math.round(value)} ${statLabel(stat)}`;
}

/** Colourblind-safe rarity pip: shape encodes rarity, colour merely reinforces it. */
export function rarityPip(rarity: Rarity): HTMLElement {
  const shapes: Record<Rarity, string> = {
    common: 'pip-circle', fine: 'pip-square', rare: 'pip-diamond',
    relic: 'pip-hex', mythic: 'pip-star',
  };
  const p = el('span', `pip ${shapes[rarity]}`);
  p.style.background = RARITY_CSS[rarity] ?? '#A6A094';
  p.setAttribute('aria-label', rarity);
  p.title = rarity;
  return p;
}

/** Inline SVG icon set. No emoji, no icon font, no network fetch. */
export function icon(name: string, size = 20): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const paths: Record<string, string[]> = {
    blade: ['M14 3l7 7-9 9-3-1-1-3 9-9z', 'M5 19l3 1'],
    maul: ['M5 19l7-7', 'M14 4h6v6h-6z'],
    spear: ['M4 20L20 4', 'M16 4h4v4'],
    censer: ['M12 3v6', 'M8 13a4 4 0 1 0 8 0z'],
    cloak: ['M12 3l6 4v10l-6 4-6-4V7z'],
    charm: ['M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z'],
    relic: ['M12 2l3 6 6 1-4.5 4.3 1 6.2L12 16.7 6.5 19.5l1-6.2L3 9l6-1z'],
    potion: ['M9 3h6', 'M10 3v5l-3 8a4 4 0 0 0 4 5h2a4 4 0 0 0 4-5l-3-8V3'],
    soul: ['M12 3a5 5 0 0 0-5 5c0 4 5 13 5 13s5-9 5-13a5 5 0 0 0-5-5z', 'M12 8v.01'],
    ember: ['M12 2s5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-8z'],
    map: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14', 'M15 6v14'],
    bag: ['M6 8h12l-1 12H7z', 'M9 8V6a3 3 0 0 1 6 0v2'],
    skills: ['M12 3v18', 'M5 8l7-5 7 5', 'M5 16l7 5 7-5'],
    codex: ['M4 4h7v16H4z', 'M13 4h7v16h-7z'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M20 12h-2M6 12H4M12 4v2M12 18v2'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    quest: ['M12 3l9 9-9 9-9-9z'],
    cairn: ['M6 20h12', 'M8 16h8', 'M9 12h6', 'M10 8h4'],
    skull: ['M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7z', 'M9 11v.01', 'M15 11v.01'],
    share: ['M12 3v12', 'M8 7l4-4 4 4', 'M4 15v4h16v-4'],
    heart: ['M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z'],
    bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
    trophy: ['M7 4h10v5a5 5 0 0 1-10 0z', 'M5 4h2v3a2 2 0 0 1-2-2z', 'M19 4h-2v3a2 2 0 0 0 2-2z', 'M10 20h4', 'M12 14v6'],
  };

  for (const d of paths[name] ?? paths.close!) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}

export function itemCard(item: Item, compact = false): HTMLElement {
  const card = el('div', `item-card r-${item.rarity}`);
  const head = el('div', 'item-head');
  head.appendChild(rarityPip(item.rarity));
  const ic = icon(item.icon.replace('icon_', ''), compact ? 16 : 20);
  ic.classList.add('item-icon');
  head.appendChild(ic);
  const nm = el('span', 'item-name', item.name);
  nm.style.color = RARITY_CSS[item.rarity] ?? '#EFE9DC';
  head.appendChild(nm);
  card.appendChild(head);

  if (item.weapon) {
    const w = el('div', 'item-stat',
      `${item.weapon.baseDamage} damage  ·  ${item.weapon.archetype}  ·  ${item.weapon.damageType}`);
    card.appendChild(w);
  }
  for (const a of item.affixes) {
    card.appendChild(el('div', 'item-affix', formatAffix(a.stat, a.value)));
  }
  if (!compact && item.flavor) {
    card.appendChild(el('div', 'item-flavor', item.flavor));
  }
  if (item.stackable && (item.count ?? 1) > 1) {
    card.appendChild(el('div', 'item-count', `x${item.count}`));
  }
  return card;
}

export function bar(value: number, max: number, cls: string): HTMLElement {
  const wrap = el('div', `bar ${cls}`);
  const fill = el('div', 'bar-fill');
  fill.style.width = `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`;
  wrap.appendChild(fill);
  const label = el('span', 'bar-label', `${Math.ceil(value)} / ${Math.ceil(max)}`);
  wrap.appendChild(label);
  return wrap;
}
