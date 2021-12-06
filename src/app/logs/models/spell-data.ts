import { SpellId } from 'src/app/logs/models/spell-id.enum';

export enum DamageType {
  NONE,
  DIRECT,
  DOT,
  CHANNEL,
  AOE
}

const SPELL_DEFAULTS: Partial<ISpellData> = {
  maxDamageInstances: 0,
  maxDuration: 0,
  cooldown: 0,
  statsByTick: false
};

function spellData(params: Partial<ISpellData> = {}): ISpellData {
  return Object.assign({}, SPELL_DEFAULTS, params) as ISpellData;
}

export const SpellData: {[spellId: number]: ISpellData} = {
  [SpellId.ADAMANTITE_GRENDADE]: spellData({
    damageType: DamageType.AOE,
    maxDamageInstances: 20,
  }),

  [SpellId.DEATH]: spellData({
    damageType: DamageType.DIRECT,
    maxDamageInstances: 1,
    cooldown: 12
  }),

  [SpellId.DENSE_DYNAMITE]: spellData({
    damageType: DamageType.AOE,
    maxDamageInstances: 20,
  }),

  [SpellId.DESPERATE_PRAYER]: spellData({
    damageType: DamageType.NONE
  }),

  [SpellId.DEVOURING_PLAGUE]: spellData({
    damageType: DamageType.DOT,
    maxDamageInstances: 8,
    maxDuration: 24,
    cooldown: 180
  }),

  [SpellId.FADE]: spellData({
    damageType: DamageType.NONE,
    maxDuration: 10,
    cooldown: 30
  }),

  [SpellId.FEAR_WARD]: spellData({
    damageType: DamageType.NONE,
    maxDuration: 180,
    cooldown: 180
  }),

  [SpellId.GOBLIN_LAND_MINE]: spellData({
    damageType: DamageType.NONE,
  }),

  [SpellId.GOBLIN_SAPPER]: spellData({
    damageType: DamageType.AOE,
    maxDamageInstances: 20,
  }),

  [SpellId.MELEE]: spellData({
    damageType: DamageType.DIRECT,
  }),

  [SpellId.MIND_BLAST]: spellData({
    damageType: DamageType.DIRECT,
    maxDamageInstances: 1,
    cooldown: 5.5
  }),

  [SpellId.MIND_FLAY]: spellData({
    damageType: DamageType.CHANNEL,
    maxDamageInstances: 3,
    maxDuration: 3,
    statsByTick: true
  }),

  [SpellId.NETHERWEAVE_NET]: spellData({
    damageType: DamageType.NONE,
    cooldown: 60
  }),

  [SpellId.PAIN]: spellData({
    damageType: DamageType.DOT,
    maxDamageInstances: 8,
    maxDuration: 24,
  }),

  [SpellId.SHADOW_FIEND]: spellData({
    damageType: DamageType.DIRECT,
    maxDamageInstances: 30,
    maxDuration: 15,
    cooldown: 300
  }),

  [SpellId.SHIELD]: spellData({
    damageType: DamageType.NONE,
    maxDuration: 30,
    cooldown: 4
  }),

  [SpellId.STARSHARDS]: spellData({
    damageType: DamageType.DOT,
    maxDamageInstances: 5,
    maxDuration: 15,
    cooldown: 30
  }),

  [SpellId.SUPER_SAPPER]: spellData({
    damageType: DamageType.AOE,
    maxDamageInstances: 20,
  }),

  [SpellId.THORNLING]: spellData({
    damageType: DamageType.NONE,
  }),

  [SpellId.VAMPIRIC_EMBRACE]: spellData({
    damageType: DamageType.NONE,
    maxDuration: 60,
    cooldown: 10
  }),

  [SpellId.VAMPIRIC_TOUCH]: spellData({
    damageType: DamageType.DOT,
    maxDamageInstances: 5,
    maxDuration: 15
  })
};

export interface ISpellData {
  damageType: DamageType;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
  statsByTick: boolean;
}
