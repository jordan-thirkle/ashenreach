import * as THREE from 'three';
import type { Item, ItemSlot, Settings, SaveData, PoiDef } from './core/Types';
import { InputManager, isTouchDevice, DEFAULT_SETTINGS } from './core/Input';
import { GameCamera } from './core/Camera';
import { AudioEngine } from './core/Audio';
import { makeRNG, type RNG } from './core/RNG';
import { PALETTE } from './core/Palette';
import {
  newSave, saveGame, loadGame, hasSave,
  saveSettings, loadSettings, submitScore, loadScores, computeScore,
} from './core/Save';
import { Terrain, BIOMES, WORLD_HALF } from './world/Terrain';
import { generateWorld, type WorldLayout } from './world/WorldGen';
import { WorldRenderer } from './world/WorldRenderer';
import {
  makeSoulOrb, makeLootDrop, makeCairn, lightCairn, updatePickups, makePoiStructure,
  type SoulOrb, type LootDrop, type CairnObject,
} from './world/Objects';
import { Player } from './entities/Player';
import { updateEnemy, alertNearby, type Enemy } from './systems/EnemyAI';
import { Spawner } from './systems/Spawner';
import { JuiceSystem } from './systems/Juice';
import { shortLabel, type EquippedRelicView } from './systems/Inventory';
import { updateRelics } from './ui/Hud';
import {
  deriveStats, maxHp, computePlayerDamage, computeEnemyDamage,
  comboTier, carryPenalty, soulBankXp, DIFFICULTY, applyStrikeJuice,
} from './systems/Combat';
import { QuestEngine, initQuests, initProgress, applyReward, grantXp, levelFromXp, type Progress } from './systems/Quests';
import { runIntro } from './systems/Onboarding';
import { FIRST_OBJECTIVE_FRAME } from './systems/Lore';
import { rollLoot, makeConsumable } from './data/Items';
import { QUEST_BY_ID } from './data/Quests';
import { buildHud, updateVitals, updateCombo, updateEmbertide, updateQuests, toast, subtitle, updateMarkers, updateCompass, showInteract, showBoss, lootPopup, type HudRefs, type MarkerSpec } from './ui/Hud';
import { Screens } from './ui/Screens';
import { MobileControls } from './ui/MobileControls';

export type GameMode = 'menu' | 'playing' | 'paused' | 'dead' | 'won';

const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;

export class Game {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private clock = new THREE.Clock();
  private accumulator = 0;

  private input: InputManager;
  private audio: AudioEngine;
  private juice!: JuiceSystem;
  private hud!: HudRefs;
  private screens: Screens;
  private mobile: MobileControls | null = null;

  private terrain!: Terrain;
  private layout!: WorldLayout;
  private world!: WorldRenderer;
  private camera!: GameCamera;
  private player!: Player;
  private spawner!: Spawner;
  private quests!: QuestEngine;
  private rng!: RNG;

  private souls: SoulOrb[] = [];
  private loot: LootDrop[] = [];
  private cairns: CairnObject[] = [];
  private poiGroups: THREE.Group[] = [];

  mode: GameMode = 'menu';
  private save!: SaveData;
  private settings: Settings = DEFAULT_SETTINGS;
  private progress: Progress = initProgress();
  private stats = deriveStats(1, [], {});

  private embertide = 0;
  private embertideProgress = 0;
  private bossEnemy: Enemy | null = null;
  private bossActive = false;
  private bossKilled = false;
  private runStartMs = 0;
  private lastSaveMs = 0;
  private deathPile: { x: number; z: number; souls: number } | null = null;
  private frameCount = 0;
  private fpsAccum = 0;
  private fpsTimer = 0;
  private lastFps = 60;
  private autoQualityDone = false;
  private running = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.settings = loadSettings();

    const capture = typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.settings.quality !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: capture, // enables reliable readback for the e2e harness
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === 'high' ? 2 : 1.35));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';

    this.input = new InputManager(this.renderer.domElement, this.settings);
    this.audio = new AudioEngine(this.settings);

    this.screens = new Screens(container, {
      onNewRun: (seed, name, daily, biome) => this.startRun(seed, name, daily, biome ?? 'highland'),
      onContinue: () => this.continueRun(),
      onResume: () => this.resume(),
      onQuitToMenu: () => this.quitToMenu(),
      onEquip: (item) => this.equip(item),
      onDrop: (item) => this.discard(item),
      onUse: (item) => this.useItem(item),
      onLearnSkill: (id) => this.learnSkill(id),
      onSettings: (s) => this.applySettings(s),
      onRespawn: () => this.respawn(),
      onShare: (text) => this.share(text),
    });
    this.screens.lastSettings = { ...this.settings };

    window.addEventListener('resize', () => this.onResize());
    this.bindMenuKeys();
    // Expose for the automated harness and for debugging.
    (window as unknown as Record<string, unknown>).__ASHENREACH__ = this;
  }

  // ------------------------------------------------------------ lifecycle

  boot(): void {
    this.screens.showMenu(hasSave(), loadScores(), false);
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.camera) this.camera.resize(w / h);
  }

  private bindMenuKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'playing' && this.mode !== 'paused') return;
      switch (e.code) {
        case 'Escape':
          if (this.screens.isOpen) {
            this.resume();
          } else {
            this.pause();
          }
          break;
        case 'KeyI':
          this.toggleScreen(() => this.screens.showInventory(
            this.save.bag, this.save.equipment, this.stats, this.progress.embers));
          break;
        case 'KeyK':
          this.toggleScreen(() => this.screens.showSkills(
            this.progress.learned, this.progress.skillPoints));
          break;
        case 'KeyM':
          this.toggleScreen(() => this.screens.showMap(
            [...this.layout.pois, ...this.layout.cairns], this.progress.discovered,
            this.player.pos.x, this.player.pos.z, WORLD_HALF, this.layout.bossPos));
          break;
        case 'KeyJ':
          this.toggleScreen(() => this.screens.showCodex(this.progress.codex));
          break;
        default:
          break;
      }
    });
  }

  private toggleScreen(open: () => void): void {
    if (this.screens.isOpen) {
      this.resume();
    } else {
      this.input.releasePointer();
      this.mode = 'paused';
      open();
    }
  }

  private pause(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.releasePointer();
    this.audio.duck(0.35);
    this.screens.showPause();
  }

  private resume(): void {
    this.screens.close();
    if (this.mode === 'dead' || this.mode === 'won') return;
    this.mode = 'playing';
    this.audio.duck(1);
    this.persist();
  }

  private quitToMenu(): void {
    this.persist();
    this.teardownRun();
    this.mode = 'menu';
    this.screens.showMenu(hasSave(), loadScores(), false);
  }

  private applySettings(s: Settings): void {
    this.settings = { ...s };
    saveSettings(this.settings);
    this.input.settings = this.settings;
    this.audio.applySettings(this.settings);
    if (this.juice) {
      this.juice.setShakeScale(this.settings.screenShake);
      this.juice.setReduceFlashing(this.settings.reduceFlashing);
    }
  }

  private share(text: string): void {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    if (this.hud) toast(this.hud, 'Run card copied to clipboard', 'gold');
  }

  // ----------------------------------------------------------- run setup

  private startRun(seed: string, name: string, daily: boolean, biome: 'highland' | 'winter' = 'highland'): void {
    this.teardownRun();
    this.save = newSave(seed, name);
    this.save.daily = daily;
    this.save.biome = biome;
    this.progress = initProgress();
    this.buildWorld(seed, biome);
    this.screens.close();
    this.mode = 'playing';
    this.runStartMs = performance.now();
    void this.audio.resume();
    this.audio.startMusic();
    subtitle(this.hud, 'The Reach remembers every step you take.', 5200);
    toast(this.hud, `Seed: ${seed}`, 'info');
    this.persist();
  }

  private syncRelicHud(): void {
    if (!this.hud) return;
    const r = this.save.equipment.relic;
    const view: EquippedRelicView[] = r
      ? [{
          uid: r.uid, defId: r.defId, name: r.name, short: shortLabel(r.name),
          icon: r.icon, rarity: r.rarity, tier: r.tier, affixes: r.affixes ?? [], flavor: r.flavor ?? '',
        }]
      : [];
    updateRelics(this.hud, view);
  }

  private continueRun(): void {
    const data = loadGame();
    if (!data) {
      this.screens.close();
      return;
    }
    this.teardownRun();
    this.save = data;
    this.save.biome = data.biome ?? 'highland';
    this.progress = {
      xp: data.xp, level: data.level, skillPoints: data.skillPoints,
      learned: data.learned, embers: data.embers,
      codex: data.codex, discovered: data.discovered,
    };
    this.buildWorld(data.seed);
    this.player.pos.set(data.pos.x, data.pos.y, data.pos.z);
    this.embertide = data.embertide;
    for (const id of data.litCairns) {
      const c = this.cairns.find((x) => x.def.id === id);
      if (c) lightCairn(c);
    }
    this.quests.state = data.quests;
    this.recomputeStats();
    this.player.hp = Math.min(data.hp, this.player.maxHp);
    this.screens.close();
    this.mode = 'playing';
    this.runStartMs = performance.now() - data.stats.timeMs;
    void this.audio.resume();
    this.audio.startMusic();
  }

  private buildWorld(seed: string, biome: 'highland' | 'winter' = 'highland'): void {
    this.rng = makeRNG(`${seed}:run`);
    this.terrain = new Terrain(seed, biome);
    this.layout = generateWorld(seed, this.terrain);
    this.world = new WorldRenderer(this.scene, this.terrain, seed, this.settings.quality, biome);
    this.camera = new GameCamera(window.innerWidth / window.innerHeight, this.terrain);
    this.juice = new JuiceSystem(this.scene);
    this.juice.attachDom(this.container);
    this.juice.setShakeScale(this.settings.screenShake);
    this.juice.setReduceFlashing(this.settings.reduceFlashing);
    this.hud = buildHud(this.container);
    this.syncRelicHud();

    if (isTouchDevice()) {
      this.mobile = new MobileControls(this.container, this.input);
      this.mobile.show(true);
    }

    this.recomputeStats();
    this.player = new Player(this.stats);
    this.player.maxHp = maxHp(this.stats);
    this.player.hp = this.player.maxHp;
    this.player.pos.set(this.layout.home.x, this.layout.home.y, this.layout.home.z);
    this.scene.add(this.player.rig.root);
    this.equipStartingKit();

    this.spawner = new Spawner(this.scene, this.terrain, seed);
    this.spawner.spawnAround(this.player.pos.x, this.player.pos.z, 1, 0, 8);

    for (const c of this.layout.cairns) {
      const obj = makeCairn(c, this.terrain);
      this.scene.add(obj.group);
      this.cairns.push(obj);
    }
    for (const p of this.layout.pois) {
      const g = makePoiStructure(p, this.terrain);
      this.scene.add(g);
      this.poiGroups.push(g);
    }

    this.quests = new QuestEngine(
      this.save.quests ?? initQuests(),
      (q) => this.onQuestComplete(q.id),
      (q, i) => toast(this.hud, `${q.steps[i]?.text ?? 'Objective'} — done`, 'good'),
      (q) => {
        toast(this.hud, `New objective: ${q.title}`, 'gold');
        if (this.settings.subtitles) subtitle(this.hud, q.summary);
      },
    );
    this.world.setEmbertide(this.embertide);

    // First-spawn onboarding: lore + direction + voice (Ashenreach v1).
    const firstObj = this.quests.activeDefs[0]?.summary ?? FIRST_OBJECTIVE_FRAME;
    runIntro(this.hud, this.audio, firstObj);
  }

  private equipStartingKit(): void {
    if (this.save.equipment.weapon) {
      const w = this.save.equipment.weapon.weapon;
      if (w) this.player.setWeapon(w.archetype, PALETTE.rust, w.swingTime);
      return;
    }
    const starter = rollLoot(this.rng, 1, false, false, 0)
      .find((i) => i.slot === 'weapon');
    if (starter) {
      this.save.equipment.weapon = starter;
      const w = starter.weapon;
      if (w) this.player.setWeapon(w.archetype, PALETTE.rust, w.swingTime);
    }
    this.save.bag.push(makeConsumable(this.rng, 'draught', 3));
    this.recomputeStats();
  }

  private teardownRun(): void {
    if (this.spawner) this.spawner.clear();
    if (this.world) this.world.dispose();
    for (const s of this.souls) this.scene.remove(s.mesh);
    for (const l of this.loot) this.scene.remove(l.mesh);
    for (const c of this.cairns) this.scene.remove(c.group);
    for (const g of this.poiGroups) this.scene.remove(g);
    this.souls = [];
    this.loot = [];
    this.cairns = [];
    this.poiGroups = [];
    if (this.player) this.scene.remove(this.player.rig.root);
    if (this.hud) this.hud.root.remove();
    if (this.mobile) this.mobile.show(false);
    this.bossEnemy = null;
    this.bossActive = false;
    this.bossKilled = false;
    this.embertide = 0;
    this.embertideProgress = 0;
    this.deathPile = null;
  }

  private recomputeStats(): void {
    this.stats = deriveStats(this.progress.level, this.progress.learned, this.save?.equipment ?? {});
    if (this.player) {
      this.player.setStats(this.stats);
      const nm = maxHp(this.stats);
      const ratio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
      this.player.maxHp = nm;
      this.player.hp = Math.min(nm, Math.max(1, Math.round(nm * ratio)));
    }
  }

  // -------------------------------------------------------------主 loop

  private frame(): void {
    if (!this.running) return;
    const raw = Math.min(0.25, this.clock.getDelta());

    this.fpsTimer += raw;
    this.fpsAccum++;
    if (this.fpsTimer >= 1) {
      this.lastFps = this.fpsAccum / this.fpsTimer;
      this.fpsAccum = 0;
      this.fpsTimer = 0;
      this.autoQuality();
    }

    if (this.mode === 'playing') {
      const scaled = raw * (this.juice?.scale ?? 1);
      this.accumulator += scaled;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
        this.step(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (steps === MAX_STEPS) this.accumulator = 0;
      this.renderFrame(raw);
    } else if (this.camera) {
      this.renderFrame(raw);
    }
    this.frameCount++;
  }

  /** Drop quality once if the machine clearly cannot hold 60. */
  private autoQuality(): void {
    if (this.autoQualityDone || this.mode !== 'playing') return;
    if (this.frameCount < 240) return;
    if (this.lastFps < 34 && this.settings.quality !== 'low') {
      this.autoQualityDone = true;
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      toast(this.hud, 'Quality reduced to hold framerate', 'info');
    }
  }

  private renderFrame(dt: number): void {
    if (!this.camera) return;
    if (this.juice) this.juice.update(dt);
    this.camera.resetShake();
    if (this.juice) this.juice.applyShake(this.camera.cam);
    this.renderer.render(this.scene, this.camera.cam);
  }

  // ---------------------------------------------------------------- step

  private step(dt: number): void {
    const frame = this.input.poll(dt);

    // Camera look
    this.camera.rotate(
      -frame.lookX * 0.0026 * this.settings.sensitivity,
      (this.settings.invertY ? frame.lookY : -frame.lookY) * 0.0022 * this.settings.sensitivity,
    );
    if (frame.zoom !== 0) this.camera.zoom(frame.zoom * 0.0016);

    // Carry penalty is the core risk dial.
    const carry = carryPenalty(
      this.player.souls,
      this.progress.learned.includes('s_ashveil'),
      this.progress.learned.includes('s_broadshoulders'),
    );
    this.player.carrySpeedMult = carry.speedMult;

    const before = { x: this.player.pos.x, z: this.player.pos.z };
    this.player.update(
      frame, dt, this.terrain, this.camera.yaw,
      (chain) => this.onSwing(chain),
      () => {
        this.audio.dash();
        this.juice.burst(this.player.pos.clone().setY(this.player.pos.y + 0.7), 12, PALETTE.ash, 4, 0.36, 0.2, -2);
      },
      () => this.audio.parryReady(),
      (speed) => {
        this.audio.footstep(speed > 7 ? 1 : 0);
        if (Math.random() < 0.5) {
          this.juice.burst(
            this.player.pos.clone().setY(this.player.pos.y + 0.05), 3, PALETTE.ash, 2.2, 0.18, 0.12, -1,
          );
        }
      },
    );
    const moved = Math.hypot(this.player.pos.x - before.x, this.player.pos.z - before.z);
    this.save.stats.distance += moved;

    const speed01 = Math.min(1, Math.hypot(this.player.vel.x, this.player.vel.z) / 9);
    this.camera.setSpeedFov(speed01);
    this.camera.update(this.player.pos, this.player.vel, dt);

    // Enemies
    let nearestEnemyDist = 999;
    for (const e of this.spawner.enemies) {
      if (!e.alive) continue;
      updateEnemy(
        e, this.player.pos, dt, this.terrain, carry.aggroMult,
        (en) => this.enemyStrike(en),
        (en) => this.audio.telegraph(en.def.boss === true),
      );
      nearestEnemyDist = Math.min(nearestEnemyDist, e.distToPlayer);
      if (e.flashT > 0) this.tintRig(e);
    }
    this.camera.setCombatFraming(nearestEnemyDist < 22);
    this.spawner.update(dt, this.player.pos.x, this.player.pos.z,
      this.progress.level, this.embertide, this.bossActive);

    // Pickups
    const magnet = 4.2 + (this.progress.learned.includes('s_soulcall') ? 5 : 0);
    updatePickups(this.souls, this.loot, this.player.pos, dt, magnet,
      (s) => this.collectSoul(s), (l) => this.collectLoot(l));

    this.world.update(this.player.pos, dt, this.camera.cam);
    this.updateEmbertideMeter(dt);
    this.updateInteraction();
    this.updateHud(dt);
    this.updateBoss(dt);

    this.save.stats.timeMs = performance.now() - this.runStartMs;
    if (performance.now() - this.lastSaveMs > 12000) this.persist();
  }

  // ------------------------------------------------------------- combat

  /** Player swing: arc query, not a raycast, so sweeps feel generous. */
  private onSwing(chain: number): void {
    const weapon = this.save.equipment.weapon?.weapon;
    const reach = (weapon?.reach ?? 2.6) + (chain === 3 ? 0.9 : 0);
    const arc = (weapon?.arc ?? 1.5) * (chain === 3 ? 1.55 : 1);
    this.audio.swing(chain);

    const fwd = new THREE.Vector3(Math.sin(this.player.facing), 0, Math.cos(this.player.facing));
    let hits = 0;

    for (const e of this.spawner.enemies) {
      if (!e.alive) continue;
      const to = new THREE.Vector3(
        e.pos.x - this.player.pos.x, 0, e.pos.z - this.player.pos.z,
      );
      const dist = to.length();
      const hitRadius = reach + e.def.scale * 0.7;
      if (dist > hitRadius) continue;
      to.normalize();
      if (fwd.dot(to) < Math.cos(arc / 2)) continue;

      hits++;
      const tier = comboTier(this.player.combo);
      const swing = {
        baseDamage: weapon?.baseDamage ?? 12,
        damageType: weapon?.damageType ?? 'physical',
        range: reach,
        arc,
      };
      const { damage, crit } = computePlayerDamage(
        this.stats, swing, () => this.rng.next(),
        tier.mult * this.player.chainDamageMult, this.settings.difficulty,
      );
      this.damageEnemy(e, damage, crit);
    }

    if (hits > 0) {
      this.player.combo += hits;
      this.player.comboTimer = 3.2;
      this.save.stats.bestCombo = Math.max(this.save.stats.bestCombo, this.player.combo);
      const t = comboTier(this.player.combo);
      this.juice.feedback(chain === 3 ? 'large' : 'medium',
        this.player.pos.clone().addScaledVector(fwd, reach * 0.6).setY(this.player.pos.y + 1.1),
        t.color);
      this.audio.impact(chain === 3, this.player.combo);
      if (this.stats.lifesteal > 0) {
        this.player.hp = Math.min(this.player.maxHp,
          this.player.hp + Math.round(hits * 3 * this.stats.lifesteal * 10));
      }
    } else {
      this.juice.addTrauma(0.05);
      this.audio.whiff();
    }
  }

  private damageEnemy(e: Enemy, damage: number, crit: boolean): void {
    e.hp -= damage;
    e.flashT = 0.14;
    // Hit-stop sells weight: a brief global freeze on impact (proven JuiceSystem
    // timeScale freeze). Longer on crits so they land with real punch.
    this.juice.hitStop(crit ? 110 : 55);
    e.staggerT = Math.max(e.staggerT, crit ? 0.34 : 0.16);
    // Knockback reads as impact and creates spacing.
    const away = new THREE.Vector3(e.pos.x - this.player.pos.x, 0, e.pos.z - this.player.pos.z)
      .normalize().multiplyScalar(crit ? 5.5 : 3.2);
    e.vel.add(away);

    const head = e.pos.clone().setY(e.pos.y + 1.7 * e.def.scale);
    const sp = this.camera.worldToScreen(head, window.innerWidth, window.innerHeight);
    if (sp.visible) {
      this.juice.number(String(damage), sp.x, sp.y, crit ? 'crit' : 'hit');
    }
    this.juice.burst(head, crit ? 18 : 9, PALETTE.blood, crit ? 6 : 3.6, 0.42, 0.22);
    alertNearby(this.spawner.enemies, e.pos, 16);

    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.alive = false;
    e.state = 'dead';
    e.stateT = 0;
    e.rig.root.rotation.x = Math.PI / 2.4;
    e.rig.root.position.y = this.terrain.height(e.pos.x, e.pos.z) + 0.2;

    this.save.stats.kills++;
    this.juice.feedback(e.def.boss ? 'huge' : e.def.elite ? 'large' : 'medium',
      e.pos.clone().setY(e.pos.y + 1.1), PALETTE.rust);
    this.audio.enemyDeath(e.def.boss === true);

    // Souls drop as physical objects the player must walk over.
    for (let i = 0; i < e.soulValue; i++) {
      const orb = makeSoulOrb(
        e.pos.x + this.rng.range(-1.2, 1.2), e.pos.y,
        e.pos.z + this.rng.range(-1.2, 1.2), 1,
      );
      this.scene.add(orb.mesh);
      this.souls.push(orb);
    }

    const drops = rollLoot(this.rng, e.def.tier, e.def.elite === true, e.def.boss === true,
      this.stats.discovery);
    for (const item of drops) {
      const d = makeLootDrop(
        e.pos.x + this.rng.range(-1.4, 1.4), e.pos.y,
        e.pos.z + this.rng.range(-1.4, 1.4), item,
      );
      this.scene.add(d.mesh);
      this.loot.push(d);
    }

    grantXp(this.progress, e.def.xp * DIFFICULTY[this.settings.difficulty].xp);
    this.quests.notify('kill', e.def.id, 1);
    if (e.def.boss) this.onBossDefeated();
  }

  private enemyStrike(e: Enemy): void {
    const dist = e.pos.distanceTo(this.player.pos);
    if (dist > e.def.attackRange * 1.35) return;
    this.audio.enemyAttack(e.def.boss === true);

    const raw = computeEnemyDamage(
      e.damage, this.stats, this.embertide, this.settings.difficulty, () => this.rng.next(),
    );
    const res = this.player.takeDamage(raw);

    if (res.parried) {
      // Parry: stagger the attacker, refund stamina, big feedback.
      e.staggerT = 1.1;
      e.state = 'stagger';
      this.juice.feedback('large', this.player.pos.clone().setY(this.player.pos.y + 1.2), PALETTE.palegold);
      applyStrikeJuice({ parried: true, blocked: false, pos: this.player.pos.clone().setY(this.player.pos.y + 1.2) }, this.juice);
      this.audio.parrySuccess();
      toast(this.hud, 'Parried', 'gold');
      this.player.combo += 2;
      this.player.comboTimer = 3.2;
      return;
    }
    if (res.blocked) {
      this.audio.dodge();
      return;
    }

    this.juice.addTrauma(0.42);
    this.juice.flash('#6E2A28', 0.28, 200);
    this.audio.playerHurt();
    this.player.combo = 0;
    this.player.chain = 0;

    // Souls spill when you are hit while carrying - the pressure valve.
    if (this.player.souls > 0) {
      const lost = Math.min(this.player.souls, Math.max(1, Math.round(this.player.souls * 0.28)));
      this.player.souls -= lost;
      for (let i = 0; i < lost; i++) {
        const orb = makeSoulOrb(
          this.player.pos.x + this.rng.range(-2.4, 2.4), this.player.pos.y,
          this.player.pos.z + this.rng.range(-2.4, 2.4), 1,
        );
        this.scene.add(orb.mesh);
        this.souls.push(orb);
      }
      toast(this.hud, `${lost} soul${lost === 1 ? '' : 's'} spilled`, 'bad');
    }

    if (res.died) this.onPlayerDeath(`Struck down by ${e.def.name}`);
  }

  private tintRig(e: Enemy): void {
    const k = e.flashT / 0.14;
    e.rig.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.emissive) m.emissiveIntensity = 0.2 + k * 2.6;
      }
    });
  }

  // ---------------------------------------------------------- embertide

  /** Escalation clock: rises while you hold souls, resets when you bank. */
  private updateEmbertideMeter(dt: number): void {
    const carrying = this.player.souls;
    if (carrying > 0) {
      this.embertideProgress += dt * (0.014 + carrying * 0.0075);
    } else {
      this.embertideProgress = Math.max(0, this.embertideProgress - dt * 0.02);
    }
    if (this.embertideProgress >= 1 && this.embertide < 6) {
      this.embertideProgress = 0;
      this.embertide++;
      this.save.stats.embertideLevel = Math.max(this.save.stats.embertideLevel, this.embertide);
      this.world.setEmbertide(this.embertide);
      this.audio.embertideRise(this.embertide);
      this.juice.flash('#A6552F', 0.34, 700);
      toast(this.hud, `Embertide ${this.embertide} — the Reach wakes`, 'bad');
      if (this.settings.subtitles) {
        subtitle(this.hud, 'The ash falls harder. Something out there counts your steps.');
      }
      // Escalation is a real threat change, not just a colour shift.
      this.spawner.maxAlive = Math.min(46, 26 + this.embertide * 4);
      this.spawner.spawnPack(
        this.player.pos.x + this.rng.range(-40, 40),
        this.player.pos.z + this.rng.range(-40, 40),
        2 + this.embertide, this.progress.level, this.embertide,
      );
    }
    this.juice.setVignette(Math.min(0.5, this.embertide * 0.085 +
      (1 - this.player.hp / this.player.maxHp) * 0.4));
  }

  // -------------------------------------------------------- interaction

  private updateInteraction(): void {
    let best: { kind: string; label: string; ref: unknown; d: number } | null = null;
    const px = this.player.pos.x;
    const pz = this.player.pos.z;

    for (const c of this.cairns) {
      const d = Math.hypot(c.def.pos.x - px, c.def.pos.z - pz);
      if (d < 4.5 && (!best || d < best.d)) {
        best = {
          kind: 'cairn',
          label: this.player.souls > 0
            ? `Lay ${this.player.souls} soul${this.player.souls === 1 ? '' : 's'} at ${c.def.name}`
            : (c.lit ? `Rest at ${c.def.name}` : `Light ${c.def.name}`),
          ref: c, d,
        };
      }
    }
    for (const p of this.layout.pois) {
      const d = Math.hypot(p.pos.x - px, p.pos.z - pz);
      if (d < 6 && !this.progress.discovered.includes(p.id) && (!best || d < best.d)) {
        best = { kind: 'poi', label: `Search ${p.name}`, ref: p, d };
      }
    }

    showInteract(this.hud, best ? best.label : null);

    if (best && this.input.consumeInteract()) {
      if (best.kind === 'cairn') this.useCairn(best.ref as CairnObject);
      else this.discoverPoi(best.ref as PoiDef);
    }
  }

  private useCairn(c: CairnObject): void {
    if (!c.lit) {
      lightCairn(c);
      if (!this.save.litCairns.includes(c.def.id)) this.save.litCairns.push(c.def.id);
      this.quests.notify('discover', 'cairn', 1);
      this.audio.cairnLight();
      this.juice.feedback('large', new THREE.Vector3(c.def.pos.x, c.def.pos.y + 1.4, c.def.pos.z), PALETTE.palegold);
      toast(this.hud, `${c.def.name} lit — a safe stone`, 'gold');
      grantXp(this.progress, 120);
    }

    if (this.player.souls > 0) {
      const n = this.player.souls;
      const xp = soulBankXp(n, this.embertide);
      grantXp(this.progress, xp);
      this.progress.embers += n * 12;
      this.save.stats.soulsBanked += n;
      this.player.souls = 0;
      this.embertide = Math.max(0, this.embertide - 1);
      this.embertideProgress = 0;
      this.world.setEmbertide(this.embertide);
      this.quests.notify('carry', 'cairn', n);
      this.audio.bankSouls(n);
      this.juice.feedback('huge', new THREE.Vector3(c.def.pos.x, c.def.pos.y + 1.6, c.def.pos.z), PALETTE.palegold);
      toast(this.hud, `${n} souls laid to rest  ·  +${xp} experience`, 'gold');
    }

    // Resting heals and is the natural save beat.
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
    this.persist();
  }

  private discoverPoi(p: PoiDef): void {
    this.progress.discovered.push(p.id);
    this.save.stats.poisFound++;
    this.quests.notify('discover', p.kind, 1);
    this.quests.notify('reach', p.id, 1);
    grantXp(this.progress, 180);
    this.audio.discover();
    toast(this.hud, `Found ${p.name}`, 'good');
    if (this.settings.subtitles && p.lore) subtitle(this.hud, p.lore);

    const drops = rollLoot(this.rng, Math.max(1, Math.floor(this.progress.level / 5)), true, false,
      this.stats.discovery);
    for (const item of drops) {
      const d = makeLootDrop(p.pos.x + this.rng.range(-2, 2), p.pos.y,
        p.pos.z + this.rng.range(-2, 2), item);
      this.scene.add(d.mesh);
      this.loot.push(d);
    }
    // Landmarks are guarded - discovery should cost something.
    this.spawner.spawnPack(p.pos.x, p.pos.z, 3, this.progress.level, this.embertide);
  }

  private collectSoul(s: SoulOrb): void {
    this.scene.remove(s.mesh);
    this.player.souls += s.value;
    this.audio.soulPickup(this.player.souls);
    this.souls = this.souls.filter((x) => x !== s);
    this.quests.notify('collect', 'soul', s.value);
  }

  private collectLoot(l: LootDrop): void {
    this.scene.remove(l.mesh);
    this.loot = this.loot.filter((x) => x !== l);
    if (this.save.bag.length >= 40) {
      toast(this.hud, 'Bag full', 'bad');
      return;
    }
    const existing = l.item.stackable
      ? this.save.bag.find((i) => i.defId === l.item.defId)
      : undefined;
    if (existing) existing.count = (existing.count ?? 1) + (l.item.count ?? 1);
    else this.save.bag.push(l.item);
    this.audio.pickup(l.item.rarity);
    lootPopup(this.container, l.item);
    this.quests.notify('collect', l.item.defId, l.item.count ?? 1);
  }

  // ------------------------------------------------------------- items

  private equip(item: Item): void {
    const slot = item.slot as ItemSlot;
    if (slot === 'consumable' || slot === 'material') return;
    const prev = this.save.equipment[slot];
    this.save.equipment[slot] = item;
    this.save.bag = this.save.bag.filter((i) => i.uid !== item.uid);
    if (prev) this.save.bag.push(prev);
    if (slot === 'weapon' && item.weapon) {
      this.player.setWeapon(item.weapon.archetype, PALETTE.rust, item.weapon.swingTime);
    }
    this.recomputeStats();
    this.audio.equip();
    this.screens.showInventory(this.save.bag, this.save.equipment, this.stats, this.progress.embers);
    this.syncRelicHud();
  }

  private discard(item: Item): void {
    const slot = item.slot as ItemSlot;
    if (this.save.equipment[slot]?.uid === item.uid) {
      this.save.equipment[slot] = null;
      this.save.bag.push(item);
    } else {
      this.save.bag = this.save.bag.filter((i) => i.uid !== item.uid);
      this.progress.embers += 8;
    }
    this.recomputeStats();
    this.screens.showInventory(this.save.bag, this.save.equipment, this.stats, this.progress.embers);
    this.syncRelicHud();
  }

  private useItem(item: Item): void {
    if (item.defId === 'draught') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.45));
      this.juice.flash('#8B9A6B', 0.16, 260);
    } else if (item.defId === 'emberdraught') {
      this.player.stamina = this.player.maxStamina;
    } else {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    }
    item.count = (item.count ?? 1) - 1;
    if (item.count <= 0) this.save.bag = this.save.bag.filter((i) => i.uid !== item.uid);
    this.audio.drink();
    this.screens.showInventory(this.save.bag, this.save.equipment, this.stats, this.progress.embers);
  }

  private learnSkill(id: string): void {
    if (this.progress.skillPoints <= 0 || this.progress.learned.includes(id)) return;
    this.progress.learned.push(id);
    this.progress.skillPoints--;
    this.recomputeStats();
    this.audio.levelUp();
    toast(this.hud, 'Skill learned', 'gold');
    this.screens.showSkills(this.progress.learned, this.progress.skillPoints);
  }

  private onQuestComplete(id: string): void {
    const q = QUEST_BY_ID[id];
    if (!q) return;
    this.save.stats.questsDone++;
    const lines: string[] = [];
    for (const r of q.rewards) {
      for (const l of applyReward(this.progress, r, (i) => this.save.bag.push(i))) lines.push(l);
    }
    this.recomputeStats();
    this.audio.questComplete();
    toast(this.hud, `${q.title} — complete`, 'gold');
    for (const l of lines) toast(this.hud, l, 'good');
    if (this.quests.bossUnlocked && !this.bossActive && !this.bossKilled) {
      toast(this.hud, 'The Ashen Crown stirs in the crater', 'bad');
      if (this.settings.subtitles) {
        subtitle(this.hud, 'Something enormous shifts at the centre of the Reach.', 6000);
      }
    }
  }

  // -------------------------------------------------------------- boss

  private updateBoss(_dt: number): void {
    const d = Math.hypot(this.player.pos.x - this.layout.bossPos.x,
      this.player.pos.z - this.layout.bossPos.z);

    if (!this.bossActive && !this.bossKilled && d < 40 && this.quests.bossUnlocked) {
      this.bossEnemy = this.spawner.spawnBoss(
        this.layout.bossPos.x, this.layout.bossPos.z, this.progress.level, this.embertide);
      if (this.bossEnemy) {
        this.bossActive = true;
        this.audio.bossStart();
        this.audio.setMood('boss');
        this.audio.setTension(0.5);
        this.juice.addTrauma(0.9);
        subtitle(this.hud, 'THE ASHEN CROWN', 5000);
        this.audio.narrate('The Ashen Crown. The debt you carry ends here.');
      }
    }

    if (this.bossActive && this.bossEnemy) {
      const b = this.bossEnemy;
      const hp01 = b.hp / b.maxHp;
      // Phase transitions change behaviour, not just numbers.
      const wantPhase = hp01 < 0.33 ? 3 : hp01 < 0.66 ? 2 : 1;
      if (wantPhase > b.phase) {
        b.phase = wantPhase;
        b.staggerT = 1.4;
        this.juice.feedback('huge', b.pos.clone().setY(b.pos.y + 4), PALETTE.rustBright);
        this.juice.addTrauma(0.7);
        this.audio.bossPhase(wantPhase);
        this.audio.setTension(0.35 + wantPhase * 0.22);
        toast(this.hud, `The Crown breaks — phase ${wantPhase}`, 'bad');
        if (wantPhase === 3) {
          subtitle(this.hud, 'It remembers what it was. Hold.', 4200);
          this.audio.narrate('It remembers what it was. Hold, Bearer.');
        }
        this.spawner.spawnPack(b.pos.x, b.pos.z, 3 + wantPhase, this.progress.level, this.embertide);
      }
      showBoss(this.hud, b.def.name, Math.max(0, hp01), b.phase);
      if (!b.alive) showBoss(this.hud, null);
    } else {
      showBoss(this.hud, null);
      if (this.bossKilled) this.audio.setTension(0);
    }
  }

  private onBossDefeated(): void {
    this.bossActive = false;
    this.bossKilled = true;
    this.save.stats.bossKilled = true;
    showBoss(this.hud, null);
    this.audio.victory();
    this.quests.notify('kill', 'e_crown', 1);
    window.setTimeout(() => {
      this.mode = 'won';
      const score = computeScore(this.save.stats, this.progress.level);
      submitScore({
        name: this.save.name, score, level: this.progress.level,
        souls: this.save.stats.soulsBanked, seed: this.save.seed, at: Date.now(),
        kills: this.save.stats.kills, timeMs: this.save.stats.timeMs, daily: this.save.daily,
      });
      this.screens.showVictory(this.save.stats, score);
    }, 2600);
  }

  // ------------------------------------------------------- death / hud

  private onPlayerDeath(cause: string): void {
    if (this.mode !== 'playing') return;
    // Second Wind: one free save per run if the skill is learned.
    if (this.progress.learned.includes('s_secondwind') && !this.player.secondWindUsed) {
      this.player.secondWindUsed = true;
      this.player.hp = Math.round(this.player.maxHp * 0.4);
      this.player.iframes = 1.6;
      this.juice.flash('#C9A227', 0.4, 600);
      this.audio.secondWind();
      toast(this.hud, 'Second Wind', 'gold');
      return;
    }

    this.mode = 'dead';
    this.player.kill();
    this.save.stats.deaths++;
    const lost = this.player.souls;
    if (lost > 0) {
      this.deathPile = { x: this.player.pos.x, z: this.player.pos.z, souls: lost };
      for (let i = 0; i < lost; i++) {
        const orb = makeSoulOrb(
          this.player.pos.x + this.rng.range(-2, 2), this.player.pos.y,
          this.player.pos.z + this.rng.range(-2, 2), 1);
        this.scene.add(orb.mesh);
        this.souls.push(orb);
      }
      this.player.souls = 0;
    }
    this.audio.playerDeath();
    this.juice.setVignette(0.9);
    this.input.releasePointer();

    const score = computeScore(this.save.stats, this.progress.level);
    window.setTimeout(() => {
      this.screens.showDeath(cause, this.save.stats, score, lost);
    }, 1500);
    this.persist();
  }

  private respawn(): void {
    const lit = this.cairns.filter((c) => c.lit);
    let target = this.layout.home;
    if (lit.length > 0) {
      // Respawn at the nearest lit cairn - lighting them must matter.
      let bestD = Infinity;
      for (const c of lit) {
        const d = Math.hypot(c.def.pos.x - this.player.pos.x, c.def.pos.z - this.player.pos.z);
        if (d < bestD) {
          bestD = d;
          target = c.def.pos;
        }
      }
    }
    const p = new THREE.Vector3(target.x, this.terrain.height(target.x, target.z), target.z);
    this.player.revive(p, Math.round(this.player.maxHp * 0.7));
    this.juice.setVignette(0.1);
    this.screens.close();
    this.mode = 'playing';
    this.audio.duck(1);
    if (this.deathPile) {
      toast(this.hud, 'Your souls are still out there', 'info');
    }
    this.persist();
  }

  private updateHud(_dt: number): void {
    const lv = levelFromXp(this.progress.xp);
    updateVitals(this.hud, this.player.hp, this.player.maxHp,
      this.player.stamina, this.player.maxStamina,
      lv.into, lv.need, lv.level, this.player.souls, this.progress.embers);
    updateCombo(this.hud, this.player.combo);
    updateEmbertide(this.hud, this.embertide, this.embertideProgress);
    updateQuests(this.hud, this.quests.activeDefs, this.quests.state.progress);
    updateCompass(this.hud, this.camera.yaw,
      BIOMES[this.terrain.biome(this.player.pos.x, this.player.pos.z)].name);

    // Markers: quests, unlit cairns, the boss, and the death pile.
    const w = window.innerWidth;
    const h = window.innerHeight;
    const specs: MarkerSpec[] = [];
    const push = (id: string, pos: { x: number; y: number; z: number },
      kind: MarkerSpec['kind'], label?: string): void => {
      const v = new THREE.Vector3(pos.x, pos.y + 2.2, pos.z);
      const s = this.camera.worldToScreen(v, w, h);
      const dist = Math.hypot(pos.x - this.player.pos.x, pos.z - this.player.pos.z);
      if (dist > 420) return;
      if (s.visible) {
        specs.push({ id, x: s.x, y: s.y, visible: true, dist, kind, label });
      } else {
        // Clamp off-screen markers to the edge so they still guide.
        const ang = Math.atan2(v.z - this.camera.cam.position.z, v.x - this.camera.cam.position.x);
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.4;
        const rel = ang - this.camera.yaw - Math.PI / 2;
        specs.push({
          id, x: cx + Math.cos(rel) * r, y: cy + Math.sin(rel) * r,
          visible: false, dist, kind, label, offscreenAngle: rel + Math.PI / 2,
        });
      }
    };

    for (const c of this.cairns) {
      if (!c.lit || this.player.souls > 0) push(`cairn:${c.def.id}`, c.def.pos, 'cairn', c.def.name);
    }
    if (this.bossActive || this.quests.bossUnlocked) {
      push('boss', this.layout.bossPos, 'boss', 'The Ashen Crown');
    }
    if (this.deathPile) {
      push('pile', { x: this.deathPile.x, y: this.terrain.height(this.deathPile.x, this.deathPile.z), z: this.deathPile.z },
        'loot', 'Your souls');
    }
    updateMarkers(this.hud, specs, this.settings.colorblindMarkers);
  }

  private persist(): void {
    this.lastSaveMs = performance.now();
    if (!this.save) return;
    this.save.pos = { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z };
    this.save.hp = this.player.hp;
    this.save.xp = this.progress.xp;
    this.save.level = this.progress.level;
    this.save.skillPoints = this.progress.skillPoints;
    this.save.learned = this.progress.learned;
    this.save.embers = this.progress.embers;
    this.save.codex = this.progress.codex;
    this.save.discovered = this.progress.discovered;
    this.save.embertide = this.embertide;
    this.save.quests = this.quests.state;
    this.save.litCairns = this.cairns.filter((c) => c.lit).map((c) => c.def.id);
    saveGame(this.save);
  }

  // Test hooks used by the automated harness.
  get debug(): Record<string, unknown> {
    return {
      mode: this.mode,
      fps: this.lastFps,
      enemies: this.spawner?.enemies.filter((e) => e.alive).length ?? 0,
      souls: this.player?.souls ?? 0,
      hp: this.player?.hp ?? 0,
      pos: this.player ? { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z } : null,
      embertide: this.embertide,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      frame: this.frameCount,
    };
  }

  /** Test/automation hook: exposes a minimal, safe control surface. */
  testApi(): { startRun: (seed: string, name: string, daily: boolean, biome?: 'highland' | 'winter') => void; debug: Record<string, unknown> } {
    const self = this;
    return {
      startRun: (seed, name, daily, biome) =>
        self.startRun(seed ?? `seed-${Date.now().toString(36)}`, name ?? 'Warden', daily ?? false, biome ?? 'highland'),
      get debug() { return self.debug; },
    };
  }
}
