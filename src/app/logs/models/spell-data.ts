import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CombatantInfo } from 'src/app/logs/models/combatant-info';

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
    baseCastTime: 0,
    maxDamageInstances: 0,
    maxDuration: 0,
    cooldown: 0,
    gcd: true,
    statsByTick: false
  };

  public static get(id: SpellId, actorInfo?: CombatantInfo) {
    const data = Spell.data[id], bonus = actorInfo?.bonuses[id];

    if (data && bonus) {
      return Object.assign({}, data, bonus);
    }

    return data;
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

    [SpellId.DESPERATE_PRAYER]: data({
      damageType: DamageType.NONE
    }),

    [SpellId.DEVOURING_PLAGUE]: data({
      damageType: DamageType.DOT,
      maxDamageInstances: 8,
      maxDuration: 24,
      cooldown: 180
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

    [SpellId.MELEE]: data({
      damageType: DamageType.DIRECT,
      gcd: false
    }),

    [SpellId.MIND_BLAST]: data({
      damageType: DamageType.DIRECT,
      baseCastTime: 1.5,
      maxDamageInstances: 1,
      cooldown: 5.5
    }),

    [SpellId.MIND_FLAY]: data({
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
      damageType: DamageType.DOT,
      maxDamageInstances: 8,
      maxDuration: 24,
    }),

    [SpellId.SHADOW_FIEND]: data({
      damageType: DamageType.DIRECT,
      maxDuration: 15,
      cooldown: 300
    }),

    [SpellId.SHIELD]: data({
      damageType: DamageType.NONE,
      maxDuration: 30,
      cooldown: 4
    }),

    [SpellId.STARSHARDS]: data({
      damageType: DamageType.DOT,
      maxDamageInstances: 5,
      maxDuration: 15,
      cooldown: 30
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
      damageType: DamageType.NONE,
      maxDuration: 60,
      cooldown: 10
    }),

    [SpellId.VAMPIRIC_TOUCH]: data({
      damageType: DamageType.DOT,
      baseCastTime: 1.5,
      maxDamageInstances: 5,
      maxDuration: 15
    })
  }
}

export interface ISpellData {
  damageType: DamageType;
  baseCastTime: number;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
  gcd: boolean;
  statsByTick: boolean;
}
