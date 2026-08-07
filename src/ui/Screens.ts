import type { Item, ItemSlot, Settings, SkillDef, Stats, RunStats, PoiDef } from '../core/Types';
import { el, icon, itemCard, formatAffix, rarityPip } from './Widgets';
import { SKILLS } from '../data/Quests';
import { CODEX } from '../data/Quests';
import { statSummary } from './Hud';
import type { ScoreRow } from '../core/Save';

export type ScreenName =
  | 'menu' | 'create' | 'inventory' | 'skills' | 'map'
  | 'codex' | 'settings' | 'pause' | 'death' | 'victory' | 'none';

export interface ScreenCallbacks {
  onNewRun: (seed: string, name: string, daily: boolean, biome?: 'highland' | 'winter') => void;
  onContinue: () => void;
  onResume: () => void;
  onQuitToMenu: () => void;
  onEquip: (item: Item) => void;
  onDrop: (item: Item) => void;
  onUse: (item: Item) => void;
  onLearnSkill: (id: string) => void;
  onSettings: (s: Settings) => void;
  onRespawn: () => void;
  onShare: (text: string) => void;
}

export class Screens {
  private overlay: HTMLElement;
  private cb: ScreenCallbacks;
  current: ScreenName = 'none';

  constructor(parent: HTMLElement, cb: ScreenCallbacks) {
    this.cb = cb;
    this.overlay = el('div', 'overlay');
    this.overlay.style.display = 'none';
    parent.appendChild(this.overlay);
  }

  get isOpen(): boolean {
    return this.current !== 'none';
  }

  close(): void {
    this.current = 'none';
    this.overlay.style.display = 'none';
    this.overlay.replaceChildren();
  }

  private open(name: ScreenName, content: HTMLElement, wide = false): void {
    this.current = name;
    this.overlay.replaceChildren();
    this.overlay.className = `overlay${wide ? ' wide' : ''}`;
    this.overlay.style.display = 'flex';
    this.overlay.appendChild(content);
  }

  private panel(title: string, onClose?: () => void): HTMLElement {
    const p = el('div', 'panel');
    const head = el('div', 'panel-head');
    head.appendChild(el('h2', 'panel-title', title));
    if (onClose) {
      const btn = el('button', 'icon-btn');
      btn.setAttribute('aria-label', 'Close');
      btn.appendChild(icon('close', 20));
      btn.addEventListener('click', onClose);
      head.appendChild(btn);
    }
    p.appendChild(head);
    return p;
  }

  // ---------------------------------------------------------------- MENU
  showMenu(hasSave: boolean, scores: ScoreRow[], dailyDone: boolean): void {
    const wrap = el('div', 'menu-screen');

    const title = el('div', 'title-block');
    title.appendChild(el('h1', 'game-title', 'ASHENREACH'));
    title.appendChild(el('p', 'game-tagline', 'Carry the dead home.'));
    wrap.appendChild(title);

    const menu = el('div', 'menu-buttons');

    if (hasSave) {
      const cont = el('button', 'btn primary', 'Continue');
      cont.addEventListener('click', () => this.cb.onContinue());
      menu.appendChild(cont);
    }

    const nw = el('button', `btn ${hasSave ? '' : 'primary'}`, 'New Run');
    nw.addEventListener('click', () => this.showCreate(false));
    menu.appendChild(nw);

    const daily = el('button', 'btn', dailyDone ? 'Daily Challenge (done today)' : 'Daily Challenge');
    daily.addEventListener('click', () => this.showCreate(true));
    menu.appendChild(daily);

    const set = el('button', 'btn ghost', 'Settings');
    set.addEventListener('click', () => this.showSettings(this.lastSettings));
    menu.appendChild(set);
    wrap.appendChild(menu);

    if (scores.length > 0) {
      const board = el('div', 'leaderboard');
      board.appendChild(el('h3', '', 'Best Runs'));
      const list = el('div', 'score-list');
      scores.slice(0, 6).forEach((s, i) => {
        const row = el('div', 'score-row');
        row.appendChild(el('span', 'score-rank', `${i + 1}`));
        row.appendChild(el('span', 'score-name', s.name));
        row.appendChild(el('span', 'score-val', s.score.toLocaleString()));
        row.appendChild(el('span', 'score-meta', `Lv${s.level} · ${s.souls} souls`));
        list.appendChild(row);
      });
      board.appendChild(list);
      wrap.appendChild(board);
    }

    const hint = el('div', 'menu-hint',
      'WASD move · Mouse look · Left click attack · Space dash · Shift parry · E interact');
    wrap.appendChild(hint);

    this.open('menu', wrap);
  }

  // -------------------------------------------------------------- CREATE
  private showCreate(daily: boolean): void {
    const p = this.panel(daily ? 'Daily Challenge' : 'New Run', () => this.close());

    const nameRow = el('div', 'form-row');
    nameRow.appendChild(el('label', '', 'Warden name'));
    const nameIn = el('input', 'text-input');
    nameIn.type = 'text';
    nameIn.value = 'Warden';
    nameIn.maxLength = 18;
    nameRow.appendChild(nameIn);
    p.appendChild(nameRow);

    const seedRow = el('div', 'form-row');
    seedRow.appendChild(el('label', '', 'World seed'));
    const seedIn = el('input', 'text-input');
    seedIn.type = 'text';
    seedIn.value = daily ? dailySeedLabel() : randomSeedWord();
    seedIn.disabled = daily;
    seedRow.appendChild(seedIn);
    if (!daily) {
      const reroll = el('button', 'btn tiny', 'Reroll');
      reroll.addEventListener('click', () => {
        seedIn.value = randomSeedWord();
      });
      seedRow.appendChild(reroll);
    }
    p.appendChild(seedRow);

    if (daily) {
      p.appendChild(el('p', 'note',
        'Every player gets this exact world today. Score is banked on the leaderboard.'));
    }

    const diffRow = el('div', 'form-row');
    diffRow.appendChild(el('label', '', 'Difficulty'));
    const diffSel = el('select', 'select-input');
    for (const [v, label] of [
      ['wanderer', 'Wanderer — forgiving'],
      ['warden', 'Warden — intended'],
      ['ashborn', 'Ashborn — punishing'],
    ] as const) {
      const o = el('option', '', label);
      o.value = v;
      if (v === 'warden') o.selected = true;
      diffSel.appendChild(o);
    }
    diffRow.appendChild(diffSel);
    p.appendChild(diffRow);

    const biomeRow = el('div', 'form-row');
    biomeRow.appendChild(el('label', '', 'Biome'));
    const biomeSel = el('select', 'select-input');
    for (const [v, label] of [
      ['highland', 'Highland — weathered moor'],
      ['winter', 'Winter — frozen slate'],
    ] as const) {
      const o = el('option', '', label);
      o.value = v;
      if (v === 'highland') o.selected = true;
      biomeSel.appendChild(o);
    }
    biomeRow.appendChild(biomeSel);
    p.appendChild(biomeRow);

    const go = el('button', 'btn primary wide-btn', 'Begin');
    go.addEventListener('click', () => {
      this.lastSettings.difficulty = diffSel.value as Settings['difficulty'];
      this.cb.onSettings(this.lastSettings);
      this.cb.onNewRun(
        seedIn.value.trim() || 'ashenreach',
        nameIn.value.trim() || 'Warden',
        daily,
        biomeSel.value as 'highland' | 'winter',
      );
    });
    p.appendChild(go);

    this.open('create', p);
  }

  // ----------------------------------------------------------- INVENTORY
  showInventory(
    bag: Item[], equipped: Partial<Record<ItemSlot, Item | null>>,
    stats: Stats, embers: number,
  ): void {
    const p = this.panel('Kit', () => this.close());
    const grid = el('div', 'inv-grid');

    const eqCol = el('div', 'inv-col');
    eqCol.appendChild(el('h3', '', 'Equipped'));
    const slots: ItemSlot[] = ['weapon', 'cloak', 'charm', 'relic'];
    for (const slot of slots) {
      const item = equipped[slot] ?? null;
      const box = el('div', `equip-slot${item ? ' filled' : ''}`);
      box.appendChild(el('div', 'slot-label', slot.toUpperCase()));
      if (item) {
        box.appendChild(itemCard(item, true));
        const un = el('button', 'btn tiny', 'Unequip');
        un.addEventListener('click', () => this.cb.onDrop(item));
        box.appendChild(un);
      } else {
        box.appendChild(el('div', 'slot-empty', 'empty'));
      }
      eqCol.appendChild(box);
    }
    grid.appendChild(eqCol);

    const bagCol = el('div', 'inv-col bag-col');
    bagCol.appendChild(el('h3', '', `Bag  (${bag.length}/40)`));
    const bagList = el('div', 'bag-list');
    if (bag.length === 0) bagList.appendChild(el('div', 'slot-empty', 'Nothing carried.'));
    for (const item of bag) {
      const row = el('div', 'bag-row');
      row.appendChild(itemCard(item, true));
      const actions = el('div', 'bag-actions');
      if (item.slot === 'consumable') {
        const use = el('button', 'btn tiny primary', 'Use');
        use.addEventListener('click', () => this.cb.onUse(item));
        actions.appendChild(use);
      } else if (item.slot !== 'material') {
        const eq = el('button', 'btn tiny primary', 'Equip');
        eq.addEventListener('click', () => this.cb.onEquip(item));
        actions.appendChild(eq);
      }
      const dr = el('button', 'btn tiny', 'Discard');
      dr.addEventListener('click', () => this.cb.onDrop(item));
      actions.appendChild(dr);
      row.appendChild(actions);
      bagList.appendChild(row);
    }
    bagCol.appendChild(bagList);
    grid.appendChild(bagCol);

    const statCol = el('div', 'inv-col');
    statCol.appendChild(el('h3', '', 'Standing'));
    statCol.appendChild(statSummary(stats));
    const emberRow = el('div', 'ember-line');
    emberRow.appendChild(icon('ember', 15));
    emberRow.appendChild(el('span', '', `${embers} embers`));
    statCol.appendChild(emberRow);
    grid.appendChild(statCol);

    p.appendChild(grid);
    this.open('inventory', p, true);
  }

  // -------------------------------------------------------------- SKILLS
  showSkills(learned: string[], points: number): void {
    const p = this.panel(`Wake  ·  ${points} point${points === 1 ? '' : 's'} unspent`, () => this.close());
    const branches: Array<SkillDef['branch']> = ['warden', 'ember', 'wake'];
    const grid = el('div', 'skill-grid');

    const blurb: Record<string, string> = {
      warden: 'Endure. Carry more, fall less.',
      ember: 'Burn. Kill faster than they close.',
      wake: 'Move. Souls answer sooner.',
    };

    for (const b of branches) {
      const col = el('div', `skill-col b-${b}`);
      col.appendChild(el('h3', '', b.toUpperCase()));
      col.appendChild(el('p', 'branch-blurb', blurb[b] ?? ''));
      const tree = SKILLS.filter((s) => s.branch === b).sort((a, c) => a.tier - c.tier);
      for (const s of tree) {
        const has = learned.includes(s.id);
        const reqMet = !s.requires || learned.includes(s.requires);
        const can = !has && reqMet && points > 0;
        const node = el('div', `skill-node${has ? ' learned' : ''}${!reqMet ? ' locked' : ''}`);
        const head = el('div', 'skill-head');
        head.appendChild(el('span', 'skill-tier', `T${s.tier}`));
        head.appendChild(el('span', 'skill-name', s.name));
        node.appendChild(head);
        node.appendChild(el('div', 'skill-desc', s.desc));
        if (has) {
          node.appendChild(el('div', 'skill-state', 'learned'));
        } else if (!reqMet) {
          const req = SKILLS.find((x) => x.id === s.requires);
          node.appendChild(el('div', 'skill-state', `requires ${req?.name ?? '?'}`));
        } else {
          const btn = el('button', `btn tiny${can ? ' primary' : ''}`, can ? 'Learn' : 'No points');
          btn.disabled = !can;
          btn.addEventListener('click', () => this.cb.onLearnSkill(s.id));
          node.appendChild(btn);
        }
        col.appendChild(node);
      }
      grid.appendChild(col);
    }
    p.appendChild(grid);
    this.open('skills', p, true);
  }

  // ----------------------------------------------------------------- MAP
  showMap(
    pois: PoiDef[], discovered: string[], playerX: number, playerZ: number,
    worldHalf: number, bossPos: { x: number; z: number },
  ): void {
    const p = this.panel('The Reach', () => this.close());
    const size = Math.min(620, window.innerWidth - 120);
    const canvas = el('canvas', 'map-canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const toPx = (wx: number, wz: number): [number, number] => [
        ((wx + worldHalf) / (worldHalf * 2)) * size,
        ((wz + worldHalf) / (worldHalf * 2)) * size,
      ];
      ctx.fillStyle = '#2B3036';
      ctx.fillRect(0, 0, size, size);

      // Basin ring
      ctx.strokeStyle = '#3B4149';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
      ctx.stroke();

      // Scorch crater
      const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size * 0.14);
      grad.addColorStop(0, 'rgba(166,85,47,0.55)');
      grad.addColorStop(1, 'rgba(110,42,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.14, 0, Math.PI * 2);
      ctx.fill();

      for (const poi of pois) {
        const found = discovered.includes(poi.id);
        const [x, y] = toPx(poi.pos.x, poi.pos.z);
        ctx.fillStyle = found
          ? (poi.kind === 'cairn' ? '#EFE9DC' : '#C9A227')
          : 'rgba(217,210,197,0.20)';
        ctx.beginPath();
        if (poi.kind === 'cairn') {
          ctx.moveTo(x, y - 5);
          ctx.lineTo(x + 5, y + 4);
          ctx.lineTo(x - 5, y + 4);
          ctx.closePath();
        } else {
          ctx.arc(x, y, found ? 3.4 : 2, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      const [bx, by] = toPx(bossPos.x, bossPos.z);
      ctx.strokeStyle = '#D4763F';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = bx + Math.cos(a) * 8;
        const py = by + Math.sin(a) * 8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      const [px, py] = toPx(playerX, playerZ);
      ctx.fillStyle = '#EFE9DC';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3B4149';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    p.appendChild(canvas);

    const legend = el('div', 'map-legend');
    for (const [label, cls] of [
      ['You', 'lg-you'], ['Cairn', 'lg-cairn'],
      ['Landmark', 'lg-poi'], ['The Ashen Crown', 'lg-boss'],
    ] as const) {
      const item = el('div', 'legend-item');
      item.appendChild(el('span', `legend-dot ${cls}`));
      item.appendChild(el('span', '', label));
      legend.appendChild(item);
    }
    p.appendChild(legend);
    p.appendChild(el('div', 'note',
      `${discovered.length} of ${pois.length} landmarks found.`));
    this.open('map', p, true);
  }

  // --------------------------------------------------------------- CODEX
  showCodex(unlocked: string[]): void {
    const p = this.panel('Codex', () => this.close());
    const cats = ['lore', 'places', 'bestiary', 'relics'] as const;
    const grid = el('div', 'codex-grid');
    for (const c of cats) {
      const col = el('div', 'codex-col');
      col.appendChild(el('h3', '', c.toUpperCase()));
      const entries = CODEX.filter((e) => e.category === c);
      for (const e of entries) {
        const has = unlocked.includes(e.id);
        const box = el('div', `codex-entry${has ? '' : ' locked'}`);
        box.appendChild(el('div', 'codex-title', has ? e.title : '— sealed —'));
        if (has) box.appendChild(el('p', 'codex-body', e.body));
        col.appendChild(box);
      }
      grid.appendChild(col);
    }
    p.appendChild(grid);
    p.appendChild(el('div', 'note', `${unlocked.length} of ${CODEX.length} entries recovered.`));
    this.open('codex', p, true);
  }

  // ------------------------------------------------------------ SETTINGS
  lastSettings: Settings = {} as Settings;

  showSettings(s: Settings): void {
    this.lastSettings = { ...s };
    const p = this.panel('Settings', () => this.close());
    const form = el('div', 'settings-form');

    const slider = (
      label: string, key: keyof Settings, min: number, max: number, step: number,
    ): void => {
      const row = el('div', 'form-row');
      row.appendChild(el('label', '', label));
      const input = el('input', 'range-input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(this.lastSettings[key] as number);
      const val = el('span', 'range-val', String(Math.round((this.lastSettings[key] as number) * 100)));
      input.addEventListener('input', () => {
        (this.lastSettings[key] as number) = Number(input.value);
        val.textContent = String(Math.round(Number(input.value) * 100));
        this.cb.onSettings(this.lastSettings);
      });
      row.appendChild(input);
      row.appendChild(val);
      form.appendChild(row);
    };

    slider('Master volume', 'masterVolume', 0, 1, 0.05);
    slider('Music volume', 'musicVolume', 0, 1, 0.05);
    slider('Effects volume', 'sfxVolume', 0, 1, 0.05);
    slider('Screen shake', 'screenShake', 0, 2, 0.1);
    slider('Look sensitivity', 'sensitivity', 0.2, 3, 0.1);

    const toggle = (label: string, key: keyof Settings, note?: string): void => {
      const row = el('div', 'form-row toggle-row');
      const lab = el('label', '', label);
      row.appendChild(lab);
      const input = el('input', 'check-input');
      input.type = 'checkbox';
      input.checked = Boolean(this.lastSettings[key]);
      input.addEventListener('change', () => {
        (this.lastSettings[key] as boolean) = input.checked;
        this.cb.onSettings(this.lastSettings);
      });
      row.appendChild(input);
      if (note) row.appendChild(el('span', 'note inline', note));
      form.appendChild(row);
    };

    toggle('Colourblind-safe markers', 'colorblindMarkers', 'shape encodes meaning');
    toggle('Subtitles', 'subtitles');
    toggle('Voiceover (narrated lore)', 'voiceover');
    toggle('Reduce flashing', 'reduceFlashing');
    toggle('Invert vertical look', 'invertY');

    const qRow = el('div', 'form-row');
    qRow.appendChild(el('label', '', 'Quality'));
    const qSel = el('select', 'select-input');
    for (const q of ['low', 'medium', 'high'] as const) {
      const o = el('option', '', q);
      o.value = q;
      if (q === this.lastSettings.quality) o.selected = true;
      qSel.appendChild(o);
    }
    qSel.addEventListener('change', () => {
      this.lastSettings.quality = qSel.value as Settings['quality'];
      this.cb.onSettings(this.lastSettings);
    });
    qRow.appendChild(qSel);
    form.appendChild(qRow);
    form.appendChild(el('div', 'note', 'Quality changes apply on the next run.'));

    const dRow = el('div', 'form-row');
    dRow.appendChild(el('label', '', 'Difficulty'));
    const dSel = el('select', 'select-input');
    for (const d of ['wanderer', 'warden', 'ashborn'] as const) {
      const o = el('option', '', d);
      o.value = d;
      if (d === this.lastSettings.difficulty) o.selected = true;
      dSel.appendChild(o);
    }
    dSel.addEventListener('change', () => {
      this.lastSettings.difficulty = dSel.value as Settings['difficulty'];
      this.cb.onSettings(this.lastSettings);
    });
    dRow.appendChild(dSel);
    form.appendChild(dRow);

    p.appendChild(form);
    this.open('settings', p);
  }

  // --------------------------------------------------------------- PAUSE
  showPause(): void {
    const p = this.panel('Paused', () => this.cb.onResume());
    const menu = el('div', 'menu-buttons');
    const resume = el('button', 'btn primary', 'Resume');
    resume.addEventListener('click', () => this.cb.onResume());
    menu.appendChild(resume);
    const set = el('button', 'btn', 'Settings');
    set.addEventListener('click', () => this.showSettings(this.lastSettings));
    menu.appendChild(set);
    const quit = el('button', 'btn ghost', 'Abandon run');
    quit.addEventListener('click', () => this.cb.onQuitToMenu());
    menu.appendChild(quit);
    p.appendChild(menu);
    this.open('pause', p);
  }

  // --------------------------------------------------------------- DEATH
  showDeath(cause: string, stats: RunStats, score: number, soulsLost: number): void {
    const p = this.panel('You fell', undefined);
    p.classList.add('death-panel');
    p.appendChild(el('p', 'death-cause', cause));

    if (soulsLost > 0) {
      p.appendChild(el('p', 'death-souls',
        `${soulsLost} soul${soulsLost === 1 ? '' : 's'} spilled where you dropped. Go back for them.`));
    }

    p.appendChild(this.runCard(stats, score));

    const menu = el('div', 'menu-buttons');
    const again = el('button', 'btn primary', 'Rise again');
    again.addEventListener('click', () => this.cb.onRespawn());
    menu.appendChild(again);
    const share = el('button', 'btn', 'Copy run card');
    share.addEventListener('click', () => this.cb.onShare(shareText(stats, score, cause)));
    menu.appendChild(share);
    const quit = el('button', 'btn ghost', 'Back to menu');
    quit.addEventListener('click', () => this.cb.onQuitToMenu());
    menu.appendChild(quit);
    p.appendChild(menu);
    this.open('death', p);
  }

  // ------------------------------------------------------------- VICTORY
  showVictory(stats: RunStats, score: number): void {
    const p = this.panel('The Crown falls', undefined);
    p.classList.add('victory-panel');
    p.appendChild(el('p', 'victory-text',
      'The Ashen Crown comes apart in the crater it made. The ash keeps falling. It will always keep falling. But the road is quiet now, and the stones are waiting.'));
    p.appendChild(this.runCard(stats, score));
    const menu = el('div', 'menu-buttons');
    const share = el('button', 'btn primary', 'Copy run card');
    share.addEventListener('click', () => this.cb.onShare(shareText(stats, score, 'Cleared the Reach')));
    menu.appendChild(share);
    const cont = el('button', 'btn', 'Keep wandering');
    cont.addEventListener('click', () => this.cb.onResume());
    menu.appendChild(cont);
    const quit = el('button', 'btn ghost', 'Back to menu');
    quit.addEventListener('click', () => this.cb.onQuitToMenu());
    menu.appendChild(quit);
    p.appendChild(menu);
    this.open('victory', p);
  }

  private runCard(stats: RunStats, score: number): HTMLElement {
    const card = el('div', 'run-card');
    card.appendChild(el('div', 'run-score', score.toLocaleString()));
    card.appendChild(el('div', 'run-score-label', 'SCORE'));
    const grid = el('div', 'run-grid');
    const rows: Array<[string, string]> = [
      ['Souls banked', String(stats.soulsBanked)],
      ['Kills', String(stats.kills)],
      ['Landmarks', String(stats.poisFound)],
      ['Quests', String(stats.questsDone)],
      ['Best combo', String(stats.bestCombo)],
      ['Embertide', String(stats.embertideLevel)],
      ['Distance', `${Math.round(stats.distance)}m`],
      ['Time', formatTime(stats.timeMs)],
    ];
    for (const [k, v] of rows) {
      const r = el('div', 'run-row');
      r.appendChild(el('span', 'run-k', k));
      r.appendChild(el('span', 'run-v', v));
      grid.appendChild(r);
    }
    card.appendChild(grid);
    card.appendChild(el('div', 'run-seed', `seed: ${stats.seed}`));
    return card;
  }
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

function shareText(stats: RunStats, score: number, cause: string): string {
  return [
    `ASHENREACH — ${score.toLocaleString()} points`,
    `${cause}`,
    `${stats.soulsBanked} souls banked · ${stats.kills} kills · ${stats.poisFound} landmarks`,
    `Embertide ${stats.embertideLevel} · best combo ${stats.bestCombo} · ${formatTime(stats.timeMs)}`,
    `seed: ${stats.seed}`,
  ].join('\n');
}

const SEED_WORDS = [
  'ashfall', 'cairnlight', 'greymoor', 'hollowbell', 'emberwake', 'boglantern',
  'slatewind', 'barrowdust', 'pinefall', 'coldhearth', 'rimefast', 'longcarry',
];

function randomSeedWord(): string {
  const a = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)] ?? 'ashfall';
  return `${a}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function dailySeedLabel(): string {
  const d = new Date();
  return `daily-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export { rarityPip, formatAffix };
