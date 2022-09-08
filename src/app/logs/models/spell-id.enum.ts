export const PSEUDO_SPELL_BASE = 10000000;

export enum SpellId {
  NONE = 0,

  // Shadow Priest Abilities
  BERSERKING = 26297,
  DEATH = 48158,
  DEVOURING_PLAGUE = 25467,
  DISPERSION = 47585,
  FADE = 586,
  FEAR_WARD = 6346,
  HOLY_NOVA = 48078,
  IMPROVED_DEVOURING_PLAGUE = 63675,
  MIND_BLAST = 48126,
  MIND_FLAY = 48156,
  PAIN = 48125,
  SHADOW_FIEND = 34433,
  SHIELD = 48066,
  VAMPIRIC_EMBRACE = 15286,
  VAMPIRIC_TOUCH = 48160,
  DISPEL_MAGIC = 988,
  MASS_DISPEL = 32375,

  // Engineering
  ADAMANTITE_GRENDADE = 30217,
  DENSE_DYNAMITE = 23063,
  FEL_IRON_BOMB = 30216,
  GOBLIN_LAND_MINE = 4100,
  GOBLIN_SAPPER = 13241,
  SUPER_SAPPER = 30486,

  // Misc spells
  NETHERWEAVE_NET = 31367,
  THORNLING = 22792,

  // Pseudo spell IDs (map to WCL negative values)
  MELEE = PSEUDO_SPELL_BASE + 32
}

// Map WCL ability IDS (ability.guid) to a local spell ID
// Mostly here now to allow processing of shadowfiend melee
export function mapSpellId(guid: number) {
  if (guid > 0) {
    return guid;
  }

  return PSEUDO_SPELL_BASE + Math.abs(guid);
}
