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

export const DamageSpells = [
  SpellId.DEATH,
  SpellId.PAIN,
  SpellId.MIND_BLAST,
  SpellId.MIND_FLAY,
  SpellId.VAMPIRIC_TOUCH
];

export const SpellData: {[spellId: number]: ISpellData} = {
  [SpellId.DEATH]: { maxInstances: 1, maxDuration: 0 },
  [SpellId.PAIN]: { maxInstances: 8, maxDuration: 24 },
  [SpellId.MIND_BLAST]: { maxInstances: 1, maxDuration: 0 },
  [SpellId.MIND_FLAY]: { maxInstances: 3, maxDuration: 3 },
  [SpellId.VAMPIRIC_TOUCH]: { maxInstances: 5, maxDuration: 15 }
}

export interface ISpellData {
  maxInstances: number;
  maxDuration: number;
}

