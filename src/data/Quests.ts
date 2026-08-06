import type { QuestDef, SkillDef, CodexEntry } from '../core/Types';

export const QUESTS: QuestDef[] = [
  {
    id: 'q_first_stone', act: 1, title: 'The First Stone', giver: 'Keeper Maud',
    summary: 'Maud says a soul has been circling the shrine for nine days. Take it home.',
    steps: [
      { text: 'Take the waiting soul', kind: 'collect', target: 'soul', count: 1 },
      { text: 'Carry it to any cairn', kind: 'carry', target: 'cairn', count: 1 },
    ],
    rewards: [{ kind: 'xp', amount: 120 }, { kind: 'embers', amount: 40 }, { kind: 'skillpoint', amount: 1 }],
    chain: 'q_husk_cull',
  },
  {
    id: 'q_husk_cull', act: 1, title: 'Thinning', giver: 'Keeper Maud',
    summary: 'The husks near the shrine have grown bold. Reduce them.',
    steps: [{ text: 'Destroy husks', kind: 'kill', target: 'husk', count: 8 }],
    rewards: [{ kind: 'xp', amount: 220 }, { kind: 'item', itemDefId: 'w_reachspear' }],
    chain: 'q_moor_survey',
  },
  {
    id: 'q_moor_survey', act: 1, title: 'Survey of the Moor', giver: 'Keeper Maud',
    summary: 'Nobody has mapped Wetmoor since the burning. Walk it and mark what stands.',
    steps: [{ text: 'Discover landmarks', kind: 'discover', target: 'any', count: 5 }],
    rewards: [{ kind: 'xp', amount: 300 }, { kind: 'skillpoint', amount: 1 }, { kind: 'codex', codexId: 'c_moor' }],
    chain: 'q_pinewood_hounds',
  },
  {
    id: 'q_pinewood_hounds', act: 2, title: 'Three at a Time', giver: 'Hollis the Lame',
    summary: 'Hollis lost a leg to a pack in the Blackpine. He would like the pack lost too.',
    steps: [{ text: 'Destroy hounds', kind: 'kill', target: 'hound', count: 12 }],
    rewards: [{ kind: 'xp', amount: 420 }, { kind: 'item', itemDefId: 'g_wardencloak' }],
    chain: 'q_bank_souls',
  },
  {
    id: 'q_bank_souls', act: 2, title: 'The Long Carry', giver: 'Hollis the Lame',
    summary: 'Souls left uncarried curdle. Bank ten of them before the Embertide takes hold.',
    steps: [{ text: 'Bank souls at cairns', kind: 'carry', target: 'cairn', count: 10 }],
    rewards: [{ kind: 'xp', amount: 600 }, { kind: 'embers', amount: 220 }, { kind: 'skillpoint', amount: 2 }],
    chain: 'q_wight_silence',
  },
  {
    id: 'q_wight_silence', act: 2, title: 'Quiet the Throwers', giver: 'Hollis the Lame',
    summary: 'Wights on the crags are shelling the road. Silence them.',
    steps: [{ text: 'Destroy wights', kind: 'kill', target: 'wight', count: 9 }],
    rewards: [{ kind: 'xp', amount: 780 }, { kind: 'item', itemDefId: 'r_hollowbell' }],
    chain: 'q_fallen_warden',
  },
  {
    id: 'q_fallen_warden', act: 3, title: 'One of Ours', giver: 'The Hollow Bell',
    summary: 'A warden still walks the crags with a soul it cannot place. End the circuit.',
    steps: [{ text: 'Destroy fallen wardens', kind: 'kill', target: 'warden', count: 4 }],
    rewards: [{ kind: 'xp', amount: 1400 }, { kind: 'skillpoint', amount: 2 }, { kind: 'codex', codexId: 'c_wardens' }],
    chain: 'q_hold_the_scorch',
  },
  {
    id: 'q_hold_the_scorch', act: 3, title: 'Hold the Scorch', giver: 'The Hollow Bell',
    summary: 'Stand in the crater while the Embertide crests. Do not leave.',
    steps: [{ text: 'Survive in the Scorch', kind: 'survive', target: 'scorch', count: 90 }],
    rewards: [{ kind: 'xp', amount: 2000 }, { kind: 'embers', amount: 600 }, { kind: 'item', itemDefId: 'w_slagbreaker' }],
    chain: 'q_ashen_crown',
  },
  {
    id: 'q_ashen_crown', act: 3, title: 'The Ashen Crown', giver: 'The Hollow Bell',
    summary: 'The thing at the centre of the crater has been waiting. Finish it.',
    steps: [{ text: 'Destroy the Ashen Crown', kind: 'kill', target: 'colossus', count: 1 }],
    rewards: [
      { kind: 'xp', amount: 6000 }, { kind: 'embers', amount: 2000 },
      { kind: 'skillpoint', amount: 4 }, { kind: 'item', itemDefId: 'r_ashencrown' },
      { kind: 'codex', codexId: 'c_crown' },
    ],
  },
  {
    id: 'q_ashbridge', act: 2, title: 'The Ashbridge', giver: 'Hollis the Lame',
    summary: 'A cairn-bridge over Wetmoor collapsed. Light its two pylons so the dead may cross.',
    steps: [
      { text: 'Reach the northern pylon', kind: 'reach', target: 'ashbridge_north', count: 1 },
      { text: 'Light both bridge pylons', kind: 'carry', target: 'pylon', count: 2 },
    ],
    rewards: [{ kind: 'xp', amount: 380 }, { kind: 'embers', amount: 120 }, { kind: 'skillpoint', amount: 1 }],
  },
  {
    id: 'q_wakecall', act: 3, title: 'Wake the Silent', giver: 'Keeper Maud',
    summary: 'Three souls sleep in the Grey Crags and will not answer the wind. Rouse each where it rests.',
    steps: [
      { text: 'Rouse the sleeper in the hollow', kind: 'collect', target: 'slumberer', count: 1 },
      { text: 'Rouse the sleeper by the falls', kind: 'collect', target: 'slumberer', count: 1 },
      { text: 'Rouse the sleeper at the crag top', kind: 'collect', target: 'slumberer', count: 1 },
    ],
    rewards: [{ kind: 'xp', amount: 540 }, { kind: 'embers', amount: 180 }, { kind: 'codex', codexId: 'c_wakecall' }],
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);

export const SKILLS: SkillDef[] = [
  // Warden branch: survivability, carry, stamina.
  { id: 's_w1', name: 'Braced', branch: 'warden', tier: 1, desc: '+12 Guard. You take less from every source.', apply: { guard: 12 } },
  { id: 's_w2', name: 'Deep Lungs', branch: 'warden', tier: 1, desc: '+0.35 stamina regeneration.', apply: { staminaRegen: 0.35 } },
  { id: 's_w3', name: 'Broad Shoulders', branch: 'warden', tier: 2, desc: '+40 Vigour. Carry burden reduced 25%.', requires: 's_w1', apply: { vigor: 40 } },
  { id: 's_w4', name: 'Second Wind', branch: 'warden', tier: 3, desc: 'Once per life, survive a fatal blow at 1 HP and heal 35.', requires: 's_w3', apply: { vigor: 20 }, grants: 'second-wind' },
  { id: 's_w5', name: 'Stone Discipline', branch: 'warden', tier: 4, desc: '+28 Guard, +60 Vigour. Parry window widened.', requires: 's_w4', apply: { guard: 28, vigor: 60 } },

  // Ember branch: raw damage, fire.
  { id: 's_e1', name: 'Kindling', branch: 'ember', tier: 1, desc: '+10 Power.', apply: { power: 10 } },
  { id: 's_e2', name: 'Keen', branch: 'ember', tier: 1, desc: '+6% critical chance.', apply: { critChance: 0.06 } },
  { id: 's_e3', name: 'Dash Burn', branch: 'ember', tier: 2, desc: 'Dashing leaves a trail of fire that burns enemies.', requires: 's_e1', apply: { emberDmg: 12 }, grants: 'dash-burn' },
  { id: 's_e4', name: 'Butchery', branch: 'ember', tier: 3, desc: '+55% critical damage.', requires: 's_e2', apply: { critMult: 0.55 } },
  { id: 's_e5', name: 'Slagheart', branch: 'ember', tier: 4, desc: '+34 Power, +30 Ember damage, 4% lifesteal.', requires: 's_e4', apply: { power: 34, emberDmg: 30, lifesteal: 0.04 } },

  // Wake branch: souls, movement, utility.
  { id: 's_k1', name: 'Light Step', branch: 'wake', tier: 1, desc: '+9% movement speed.', apply: { moveSpeed: 0.09 } },
  { id: 's_k2', name: 'Seeking', branch: 'wake', tier: 1, desc: '+20% discovery radius. Landmarks show further.', apply: { discovery: 0.2 } },
  { id: 's_k3', name: 'Ash Veil', branch: 'wake', tier: 2, desc: 'Carrying a soul no longer increases enemy aggro range.', requires: 's_k1', apply: { swiftness: 8 }, grants: 'ash-veil' },
  { id: 's_k4', name: 'Cairn Echo', branch: 'wake', tier: 3, desc: 'Banking a soul heals you for 30 and grants 8s of +20% speed.', requires: 's_k3', apply: { focus: 14 }, grants: 'cairn-echo' },
  { id: 's_k5', name: 'Soul Nova', branch: 'wake', tier: 4, desc: 'Ability: spend 3 carried souls to detonate for heavy area damage.', requires: 's_k4', apply: { focus: 26, power: 14 }, grants: 'soul-nova' },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);

export const CODEX: CodexEntry[] = [
  { id: 'c_reach', category: 'lore', title: 'The Reach', body: 'A highland basin two hundred miles across, ringed by crags. Before the burning it held nine villages and a road. It holds neither now, but the road is still visible from high ground, which is how most wardens navigate.' },
  { id: 'c_burning', category: 'lore', title: 'The Burning', body: 'Nobody agrees what was burned or by whom. What is agreed: the sky took the colour of wet ash and never gave it back, and the dead stopped completing the journey.' },
  { id: 'c_cairns', category: 'places', title: 'Cairn Stones', body: 'Stacked slate, waist high, one per soul. A soul set on its own cairn finishes. A soul set on the wrong cairn returns to circling. Wardens learn to read the stones by the fifth or sixth carry.' },
  { id: 'c_moor', category: 'places', title: 'Wetmoor', body: 'Peat and heather over standing water. The bog preserves. Wardens who go under come back up eventually, and not always alone.' },
  { id: 'c_scorch', category: 'places', title: 'The Scorch', body: 'The crater at the centre. Ground glass underfoot, heat with no source, and a silence that is not the absence of sound but the presence of something listening.' },
  { id: 'c_husks', category: 'bestiary', title: 'Husks', body: 'Bodies that kept their orders. They do not hunt so much as patrol. A husk that has seen you will follow for hours across open ground.' },
  { id: 'c_hounds', category: 'bestiary', title: 'Ash Hounds', body: 'Faster than you. Always in threes. Kill the two you can see quickly, because the third is already behind you.' },
  { id: 'c_wights', category: 'bestiary', title: 'Wights', body: 'They throw pieces of themselves and regrow them. Closing distance is the only counter. Wardens who trade at range with a wight lose the trade.' },
  { id: 'c_wardens', category: 'bestiary', title: 'Fallen Wardens', body: 'The worst of it. They still carry. They still walk the route. They have simply forgotten which stone, and they will not put the soul down for you.' },
  { id: 'c_crown', category: 'bestiary', title: 'The Ashen Crown', body: 'Twelve metres of fused slate and bone standing in its own crater. It does not patrol. It waits. When it moves the ash falls upward.' },
  { id: 'c_embertide', category: 'lore', title: 'The Embertide', body: 'The heat rises on a cycle nobody has timed reliably. As it climbs the dead grow bolder and the relics grow richer. Wardens who leave before the crest live longer. Wardens who stay get paid.' },
  { id: 'c_relics', category: 'relics', title: 'On Relics', body: 'Objects that were near the burning and survived. Every one is warm. Every one is useful. Every one has an owner who has not entirely finished with it.' },
  { id: 'c_wakecall', category: 'lore', title: 'The Silent Sleep', body: 'Some souls never answer the wind. They settle in the cold places — hollows, falls, crag tops — and wait for a warden to name them. To wake one is to carry it the last step it could not take alone.' },
];

export const CODEX_BY_ID: Record<string, CodexEntry> = Object.fromEntries(
  CODEX.map((c) => [c.id, c]),
);
