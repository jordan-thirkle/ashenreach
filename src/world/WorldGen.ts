import type { PoiDef, PoiKind, BiomeId, Vec3 } from '../core/Types';
import type { RNG } from '../core/RNG';
import { makeRNG } from '../core/RNG';
import { Terrain, WORLD_HALF, BIOMES } from './Terrain';

const NAME_A = ['Grey', 'Ashen', 'Hollow', 'Bitter', 'Cold', 'Long', 'Broken', 'Quiet', 'Wind', 'Black', 'Pale', 'Old'];
const NAME_B = ['barrow', 'cairn', 'watch', 'hollow', 'fell', 'reach', 'gate', 'stead', 'moss', 'crag', 'ford', 'wick'];

const POI_WEIGHTS: Record<PoiKind, number> = {
  cairn: 30, ruin: 16, camp: 14, shrine: 8, barrow: 10, watchtower: 7, hollow: 9, grove: 6,
  lookout: 7, cache: 11, hazard: 9,
};

export interface WorldLayout {
  seed: string;
  pois: PoiDef[];
  cairns: PoiDef[];
  home: Vec3;
  bossPos: Vec3;
}

function poiName(rng: RNG, kind: PoiKind): string {
  const a = rng.pick(NAME_A);
  const b = rng.pick(NAME_B);
  const label: Record<PoiKind, string> = {
    cairn: 'Cairn', ruin: 'Ruin', camp: 'Camp', shrine: 'Shrine',
    barrow: 'Barrow', watchtower: 'Watchtower', hollow: 'Hollow', grove: 'Grove',
    lookout: 'Lookout', cache: 'Cache', hazard: 'Hazard',
  };
  return `${a}${b} ${label[kind]}`;
}

/**
 * Poisson-ish scattering via jittered grid rejection. Guarantees spacing
 * without an O(n^2) blowup, and is fully deterministic from the seed.
 */
export function generateWorld(seedStr: string, terrain: Terrain): WorldLayout {
  const rng = makeRNG(`${seedStr}:layout`);
  const pois: PoiDef[] = [];
  const kinds = Object.keys(POI_WEIGHTS) as PoiKind[];
  const weights = kinds.map((k) => POI_WEIGHTS[k]);

  const cell = 78;
  const span = Math.floor((WORLD_HALF * 2) / cell);
  let idx = 0;

  for (let gz = 0; gz < span; gz++) {
    for (let gx = 0; gx < span; gx++) {
      const baseX = -WORLD_HALF + gx * cell + cell * 0.5;
      const baseZ = -WORLD_HALF + gz * cell + cell * 0.5;
      const x = baseX + rng.range(-cell * 0.38, cell * 0.38);
      const z = baseZ + rng.range(-cell * 0.38, cell * 0.38);

      const d = Math.hypot(x, z);
      if (d > WORLD_HALF - 70) continue;
      if (d < 95) continue; // keep the crater clear for the boss arena
      if (!terrain.walkable(x, z)) continue;
      if (rng.next() > 0.62) continue;

      const biome: BiomeId = terrain.biome(x, z);
      const kind = rng.weighted(kinds, weights);
      const tier = Math.max(
        1,
        Math.min(4, Math.round(BIOMES[biome].enemyTier + (1 - d / WORLD_HALF) * 1.6)),
      );

      pois.push({
        id: `poi_${idx++}`,
        kind,
        name: poiName(rng, kind),
        pos: { x, y: terrain.height(x, z), z },
        biome,
        radius: kind === 'camp' ? 16 : kind === 'ruin' ? 20 : 11,
        tier,
      });
    }
  }

  // Guarantee a healthy cairn count - they are the core loop's sink.
  let cairns = pois.filter((p) => p.kind === 'cairn');
  if (cairns.length < 14) {
    for (let i = cairns.length; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const r = rng.range(170, WORLD_HALF - 130);
      const g = terrain.findGround(Math.cos(ang) * r, Math.sin(ang) * r);
      const p: PoiDef = {
        id: `poi_c${idx++}`, kind: 'cairn', name: poiName(rng, 'cairn'),
        pos: g, biome: terrain.biome(g.x, g.z), radius: 11,
        tier: Math.max(1, Math.min(4, Math.round(1 + (1 - Math.hypot(g.x, g.z) / WORLD_HALF) * 3))),
      };
      pois.push(p);
    }
    cairns = pois.filter((p) => p.kind === 'cairn');
  }

  // Home shrine: the safe start. Placed on the ring, always walkable.
  const homeAng = rng.range(0, Math.PI * 2);
  const home = terrain.findGround(Math.cos(homeAng) * 260, Math.sin(homeAng) * 260);
  pois.push({
    id: 'poi_home', kind: 'shrine', name: 'Maud\u2019s Shrine',
    pos: home, biome: terrain.biome(home.x, home.z), radius: 20, tier: 1,
  });

  const bossPos: Vec3 = { x: 0, y: terrain.height(0, 0), z: 0 };
  return { seed: seedStr, pois, cairns, home, bossPos };
}

export interface ScatterInstance {
  kind: 'pine' | 'deadtree' | 'rock' | 'grass' | 'boulder' | 'stump';
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
}

/**
 * Deterministic environmental scatter for one terrain chunk.
 * Density is biome-driven; slope and water reject placement.
 */
export function scatterChunk(
  terrain: Terrain, cx: number, cz: number, size: number, seedStr: string, quality: number,
): ScatterInstance[] {
  const rng = makeRNG(`${seedStr}:scatter:${cx}:${cz}`);
  const out: ScatterInstance[] = [];
  const attempts = Math.round(size * size * 0.062 * quality);

  for (let i = 0; i < attempts; i++) {
    const x = cx + rng.range(0, size);
    const z = cz + rng.range(0, size);
    if (!terrain.walkable(x, z)) continue;
    const biome = terrain.biome(x, z);
    const prof = BIOMES[biome];
    const y = terrain.height(x, z);
    const slope = terrain.slope(x, z);
    const r = rng.next();

    if (r < prof.treeDensity * 0.42 && slope < 0.34) {
      out.push({
        kind: biome === 'pinewood' || biome === 'moorland' ? 'pine' : 'deadtree',
        x, y, z, scale: rng.range(0.75, 1.5), rot: rng.range(0, Math.PI * 2),
      });
    } else if (r < prof.treeDensity * 0.42 + prof.rockDensity * 0.3) {
      out.push({
        kind: rng.bool(0.22) ? 'boulder' : 'rock',
        x, y, z, scale: rng.range(0.55, 1.9), rot: rng.range(0, Math.PI * 2),
      });
    } else if (r < prof.treeDensity * 0.42 + prof.rockDensity * 0.3 + prof.grassDensity * 0.5) {
      out.push({
        kind: 'grass', x, y, z, scale: rng.range(0.7, 1.4), rot: rng.range(0, Math.PI * 2),
      });
    } else if (r < 0.985 && prof.treeDensity > 0.2 && rng.bool(0.04)) {
      out.push({ kind: 'stump', x, y, z, scale: rng.range(0.6, 1.0), rot: rng.range(0, Math.PI * 2) });
    }
  }
  return out;
}
