export enum SpellId {
  DEATH = 32996,
  FADE = 25429,
  FEAR_WARD = 6346,
  MIND_BLAST = 25375,
  MIND_FLAY = 25387,
  PAIN = 25368,
  SHADOW_FIEND = 34433,
  SHIELD = 25218,
  VAMPIRIC_EMBRACE = 15286,
  VAMPIRIC_TOUCH = 34917
}

export const Spells = [
  SpellId.DEATH,
  SpellId.FADE,
  SpellId.FEAR_WARD,
  SpellId.MIND_BLAST,
  SpellId.MIND_FLAY,
  SpellId.PAIN,
  SpellId.SHADOW_FIEND,
  SpellId.SHIELD,
  SpellId.VAMPIRIC_EMBRACE,
  SpellId.VAMPIRIC_TOUCH
];

export const SpellData: {[spellId: number]: ISpellData} = {
  [SpellId.DEATH]: { damage: true, maxDamageInstances: 1, maxDuration: 0, cooldown: 12 },
  [SpellId.FADE]: { damage: false, maxDamageInstances: 0, maxDuration: 10, cooldown: 30 },
  [SpellId.FEAR_WARD]: { damage: false, maxDamageInstances: 0, maxDuration: 180, cooldown: 180 },
  [SpellId.MIND_BLAST]: { damage: true, maxDamageInstances: 1, maxDuration: 0, cooldown: 5.5 },
  [SpellId.MIND_FLAY]: { damage: true, maxDamageInstances: 3, maxDuration: 3, cooldown: 0 },
  [SpellId.PAIN]: { damage: true, maxDamageInstances: 8, maxDuration: 24, cooldown: 0 },
  [SpellId.SHADOW_FIEND]: { damage: false, maxDamageInstances: 0, maxDuration: 15, cooldown: 300 },
  [SpellId.SHIELD]: { damage: false, maxDamageInstances: 0, maxDuration: 30, cooldown: 4 },
  [SpellId.VAMPIRIC_EMBRACE]: { damage: false, maxDamageInstances: 0, maxDuration: 60, cooldown: 10 },
  [SpellId.VAMPIRIC_TOUCH]: { damage: true, maxDamageInstances: 5, maxDuration: 15, cooldown: 0 }
}

export interface ISpellData {
  damage: boolean;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
}

