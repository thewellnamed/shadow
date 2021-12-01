export const PSEUDO_SPELL_BASE = 10000000;

export enum SpellId {
  NONE = 0,

  // Shadow Priest Abilities
  DEATH = 32996,
  DEVOURING_PLAGUE = 25467,
  FADE = 25429,
  FEAR_WARD = 6346,
  MIND_BLAST = 25375,
  MIND_FLAY = 25387,
  PAIN = 25368,
  SHADOW_FIEND = 34433,
  SHIELD = 25218,
  STARSHARDS = 25446,
  VAMPIRIC_EMBRACE = 15286,
  VAMPIRIC_TOUCH = 34917,

  // Engineering
  ADAMANTITE_GRENDADE = 30217,
  DENSE_DYNAMITE = 23063,
  GOBLIN_SAPPER = 13241,
  SUPER_SAPPER = 30486,

  // Misc spells

  // Pseudo spell IDs (map to WCL negative values)
  MELEE = PSEUDO_SPELL_BASE + 32
}

// Map WCL ability IDS (ability.guid) to a local spell ID
// Mostly here now to allow processing of shadowfiend melee
// TODO - can use this to handle multiple ranks of spells
export function mapSpellId(guid: number) {
  if (guid > 0) {
    return guid;
  }

  return PSEUDO_SPELL_BASE + Math.abs(guid);
}
