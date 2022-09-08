import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { HasteUtils, IHasteStats } from 'src/app/report/models/haste';

export enum DamageType {
  NONE,
  DIRECT,
  DOT,
  CHANNEL,
  AOE
}

function data(params: Partial<ISpellData> = {}): ISpellData {
  return Object.assign({}, Spell.DEFAULTS, params) as ISpellData;
}

export class Spell {
  public static readonly DEFAULTS: Partial<ISpellData> = {
    rankIds: [],
    damageIds: [],
    baseCastTime: 0,
    maxDamageInstances: 0,
    maxDuration: 0,
    cooldown: 0,
    gcd: true,
    dotHaste: false,
    statsByTick: false
  };

  public static get(id: SpellId, haste?: number): ISpellData {
    if (!haste) {
      return Spell.dataBySpellId[id];
    }

    const data = Object.assign({}, Spell.dataBySpellId[id]);
    if (data.damageType === DamageType.DOT && data.dotHaste) {
      data.maxDuration = HasteUtils.duration(id, haste);
    }

    return data;
  }

  public static fromDamageId(id: number): ISpellData|undefined {
    if (this.dataBySpellId.hasOwnProperty(id)) {
      return this.dataBySpellId[id];
    }

    return Object.values(this.data).find((spell) => spell.damageIds.includes(id));
  }

  public static damageIds(spellId: number, data: ISpellData) {
    return data.damageIds.length === 0 ? [spellId] : data.damageIds;
  }

  public static data: {[spellId: number]: ISpellData} = {
    [SpellId.ADAMANTITE_GRENDADE]: data({
      damageType: DamageType.AOE,
      baseCastTime: 1,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.BERSERKING]: data({
      damageType: DamageType.NONE,
      gcd: false
    }),

    [SpellId.DEATH]: data({
      rankIds: [32379, 32996, 48157],
      damageType: DamageType.DIRECT,
      maxDamageInstances: 1,
      cooldown: 12
    }),

    [SpellId.DENSE_DYNAMITE]: data({
      damageType: DamageType.AOE,
      baseCastTime: 1,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.DEVOURING_PLAGUE]: data({
      rankIds: [19278, 19279, 19280],
      damageIds: [SpellId.DEVOURING_PLAGUE, SpellId.IMPROVED_DEVOURING_PLAGUE],
      damageType: DamageType.DOT,
      dotHaste: true,
      maxDamageInstances: 9, // +1 for improved devouring plague
      maxDuration: 24,
      maxInstancesPerDamageId: {
        [SpellId.IMPROVED_DEVOURING_PLAGUE]: 1,
        [SpellId.DEVOURING_PLAGUE]: 8
      }
    }),

    [SpellId.DISPEL_MAGIC]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.DISPERSION]: data({
      damageType: DamageType.NONE,
      gcd: true
    }),

    [SpellId.FADE]: data({
      damageType: DamageType.NONE,
      maxDuration: 10,
      cooldown: 30
    }),

    [SpellId.FEAR_WARD]: data({
      damageType: DamageType.NONE,
      maxDuration: 180,
      cooldown: 180
    }),

    [SpellId.FEL_IRON_BOMB]: data({
      damageType: DamageType.AOE,
      baseCastTime: 1,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.GOBLIN_LAND_MINE]: data({
      damageType: DamageType.NONE,
    }),

    [SpellId.GOBLIN_SAPPER]: data({
      damageType: DamageType.AOE,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.HOLY_NOVA]: data({
      damageType: DamageType.AOE,
      rankIds: [27801, 25331, 48077],
      maxDamageInstances: 20,
      gcd: true,
    }),

    [SpellId.MASS_DISPEL]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.MELEE]: data({
      damageType: DamageType.DIRECT,
      gcd: false
    }),

    [SpellId.MIND_BLAST]: data({
      rankIds: [25372, 25375],
      damageType: DamageType.DIRECT,
      baseCastTime: 1.5,
      maxDamageInstances: 1,
      cooldown: 5.5
    }),

    [SpellId.MIND_FLAY]: data({
      rankIds: [18807, 25387, 48155],
      damageIds: [58381],
      damageType: DamageType.CHANNEL,
      maxDamageInstances: 3,
      maxDuration: 3,
      statsByTick: true
    }),

    [SpellId.NETHERWEAVE_NET]: data({
      damageType: DamageType.NONE,
      cooldown: 60
    }),

    [SpellId.PAIN]: data({
      rankIds: [25367, 25368, 48124],
      damageType: DamageType.DOT,
      dotHaste: false
    }),

    [SpellId.SHADOW_FIEND]: data({
      damageType: DamageType.DIRECT,
      maxDuration: 15,
      cooldown: 180
    }),

    [SpellId.SHIELD]: data({
      rankIds: [25217, 25218, 48065],
      damageType: DamageType.NONE,
      maxDuration: 30,
      cooldown: 4
    }),

    [SpellId.SUPER_SAPPER]: data({
      damageType: DamageType.AOE,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.THORNLING]: data({
      damageType: DamageType.NONE,
    }),

    [SpellId.VAMPIRIC_EMBRACE]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.VAMPIRIC_TOUCH]: data({
      rankIds: [34916, 34917, 48159],
      damageType: DamageType.DOT,
      dotHaste: true,
      baseCastTime: 1.5,
      maxDamageInstances: 5,
      maxDuration: 15
    })
  }

  public static dataBySpellId: {[spellId: number]: ISpellData} =
    Object.keys(Spell.data).reduce((lookup, next) => {
      const spellId = parseInt(next),
        data: ISpellData = Spell.data[spellId];

      data.mainId = spellId;
      lookup[spellId] = data;

      for (let rankId of data.rankIds) {
        lookup[rankId] = data;
      }

      return lookup;
    }, {} as {[spellId: number]: ISpellData});
}

export interface ISpellData {
  mainId: number;
  damageType: DamageType;
  rankIds: number[];
  damageIds: number[]
  baseCastTime: number;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
  gcd: boolean;
  dotHaste: boolean;
  statsByTick: boolean;
  maxInstancesPerDamageId?: {[id: number]: number};
}
