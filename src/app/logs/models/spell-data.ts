import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { HasteUtils } from 'src/app/report/models/haste';
import { ISettings, Settings } from 'src/app/settings';

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

  public static baseData(id: SpellId) {
    return Spell.dataBySpellId[id];
  }

  public static get(id: SpellId, settings: Settings, currentHaste?: number): ISpellData {
    const baseData = Spell.dataBySpellId[id];

    // apply overrides for dynamic data
    const dynamic = baseData.dynamic ? baseData.dynamic.call(null, baseData, settings) : {};
    const data = Object.assign({}, Spell.dataBySpellId[id], dynamic);

    // apply haste adjustments if haste specified.
    if (currentHaste !== undefined && data.damageType === DamageType.DOT && data.dotHaste) {
      data.maxDuration = HasteUtils.duration(id, currentHaste);
    }

    return data;
  }

  public static fromDamageId(id: number): ISpellData|undefined {
    if (this.dataBySpellId.hasOwnProperty(id)) {
      return this.dataBySpellId[id];
    }

    return Object.values(this.data).find((spell) => spell.damageIds.includes(id));
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
      rankIds: {
        [32379]: 1,
        [32996]: 2,
        [48157]: 3
      },
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
      rankIds: {
        [19280]: 6,
        [25467]: 7,
        [48299]: 8
      },
      damageIds: [SpellId.IMPROVED_DEVOURING_PLAGUE],
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

    [SpellId.DIVINE_HYMN]: data({
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

    [SpellId.GOBLIN_SAPPER]: data({
      damageType: DamageType.AOE,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.HOLY_NOVA]: data({
      damageType: DamageType.AOE,
      rankIds: {
        [27801]: 6,
        [25331]: 7,
        [48077]: 8
      },
      maxDamageInstances: 20,
      gcd: true,
    }),

    [SpellId.HYMN_OF_HOPE]: data({
      damageType: DamageType.NONE,
      gcd: true
    }),

    [SpellId.MASS_DISPEL]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.MELEE]: data({
      damageType: DamageType.DIRECT,
      gcd: false
    }),

    [SpellId.MIND_BLAST]: data({
      rankIds: {
        [25372]: 10,
        [25375]: 11,
        [48126]: 12
      },
      damageType: DamageType.DIRECT,
      baseCastTime: 1.5,
      maxDamageInstances: 1,
      cooldown: 8,
      dynamic: (baseData, settings) => ({
        cooldown: baseData.cooldown - (0.5 * settings.improvedMindBlast)
      })
    }),

    [SpellId.MIND_FLAY]: data({
      rankIds: {
        [18807]: 6,
        [25387]: 7,
        [48155]: 8
      },
      damageIds: [SpellId.MIND_FLAY_TICK],
      damageType: DamageType.CHANNEL,
      maxDamageInstances: 3,
      maxDuration: 3,
      statsByTick: true
    }),

    [SpellId.PAIN]: data({
      rankIds: {
        [25367]: 9,
        [25368]: 10,
        [48124]: 11
      },
      damageType: DamageType.DOT,
      dotHaste: false
    }),

    [SpellId.SHADOW_FIEND]: data({
      damageType: DamageType.DIRECT,
      maxDuration: 15,
      cooldown: 180
    }),

    [SpellId.SHIELD]: data({
      rankIds: {
        [25217]: 11,
        [25218]: 12,
        [48065]: 13
      },
      damageType: DamageType.NONE,
      maxDuration: 30,
      cooldown: 4
    }),

    [SpellId.SUPER_SAPPER]: data({
      damageType: DamageType.AOE,
      maxDamageInstances: 20,
      gcd: false
    }),

    [SpellId.VAMPIRIC_EMBRACE]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.VAMPIRIC_TOUCH]: data({
      rankIds: {
        [34916]: 2,
        [34917]: 3,
        [48159]: 4
      },
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

      for (let rankId of Object.keys(data.rankIds)) {
        lookup[parseInt(rankId)] = data;
      }

      return lookup;
    }, {} as {[spellId: number]: ISpellData});
}

export interface ISpellData {
  mainId: number;
  damageType: DamageType;
  rankIds: {[id: number]: number };
  damageIds: number[]
  baseCastTime: number;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
  gcd: boolean;
  dotHaste: boolean;
  statsByTick: boolean;
  maxInstancesPerDamageId?: {[id: number]: number};
  dynamic?: (baseData: ISpellData, settings: ISettings) => Partial<ISpellData>
}
