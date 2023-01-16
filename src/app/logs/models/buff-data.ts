import { AuraId } from 'src/app/logs/models/aura-id.enum';
import { IAbilityData, IBuffData } from 'src/app/logs/interfaces';
import { Settings } from 'src/app/settings';

export enum BuffTrigger {
  CAST_END,
  ON_USE,
  EXTERNAL
}

function buff(params: Partial<IBuffDetails> = {}) {
  return Object.assign({}, Buff.DEFAULTS, params) as IBuffDetails;
}

export class Buff {
  public static DEFAULTS: Partial<IBuffDetails> = {
    haste: 0,
    hasteRating: 0,
    trigger: BuffTrigger.EXTERNAL,
    doesNotStackWith: [],
    summaryIcon: false,
    detailsIcon: true,
    debuff: false
  };

  public static get(ability: IAbilityData, settings: Settings): IBuffDetails {
    const baseData = Buff.data[ability.guid];
    const dynamic = baseData.dynamic ? baseData.dynamic.call(null, baseData, settings) : {};

    return Object.assign({ id: ability.guid, name: ability.name }, baseData, dynamic);
  }

  public static isDebuff(id: AuraId) {
    return Buff.data[id]?.debuff;
  }

  public static data: IBuffLookup = {
    [AuraId.ARGENT_VALOR]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.BERSERKING]: buff({
      haste: 0.2,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.BLACK_MAGIC]: buff({
      hasteRating: 250,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.BLOODLUST]: buff({
      haste: 0.3,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [AuraId.POWER_INFUSION],
      summaryIcon: true
    }),

    [AuraId.BREATH_HASTE]: buff({
      haste: 0.25,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.DARK_IRON_PIPE]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.DESTRUCTION]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.DRUMS_OF_BATTLE]: buff({
      hasteRating: 80,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.DYING_CURSE]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.EMBRACE_SPIDER]: buff({
      hasteRating: 505,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.GREATER_DRUMS_OF_BATTLE]: buff({
      hasteRating: 80,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.FEL_INFUSION]: buff({
      hasteRating: 175,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.FOCUS]: buff({
      hasteRating: 320,
      trigger: BuffTrigger.CAST_END,
      summaryIcon: true
    }),

    [AuraId.FORGE_EMBER]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.HASTE]: buff({
      hasteRating: 400,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.HEROISM]: buff({
      haste: 0.3,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [AuraId.POWER_INFUSION],
      summaryIcon: true
    }),

    [AuraId.HYPERSPEED_ACCELERATION]: buff({
      hasteRating: 340,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.ICON_CRESCENT]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.INNER_FOCUS]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.LIGHTWEAVE]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.LIMITLESS_POWER]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.MOONKIN_AURA]: buff({
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [AuraId.RETRIBUTION_AURA],
      dynamic: (baseData, settings) => ({
        haste: settings.improvedMoonkinAura ? 0.03 : 0
      })
    }),

    [AuraId.MOJO_MADNESS]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.POWER_INFUSION]: buff({
      haste: 0.2,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [AuraId.HEROISM, AuraId.BLOODLUST],
      summaryIcon: true
    }),

    [AuraId.QUAGS_EYE]: buff({
      hasteRating: 320,
      trigger: BuffTrigger.CAST_END,
      summaryIcon: true
    }),

    [AuraId.RETRIBUTION_AURA]: buff({
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [AuraId.MOONKIN_AURA],
      dynamic: (baseData, settings) => ({
        haste: settings.improvedRetAura ? 0.03 : 0
      })
    }),

    [AuraId.RUNE_OF_POWER]: buff({
      trigger: BuffTrigger.EXTERNAL,
      debuff: true,
      summaryIcon: true
    }),

    [AuraId.SHADOWY_INSIGHT]: buff({
      trigger: BuffTrigger.EXTERNAL
    }),

    [AuraId.SLAG_IMBUED]: buff({
      trigger: BuffTrigger.EXTERNAL,
      haste: 1,
      debuff: true,
      summaryIcon: true
    }),

    [AuraId.SPEED_POTION]: buff({
      hasteRating: 500,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.SUNDIAL]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [AuraId.TOME_ARCANE_PHENOMENA]: buff({
      hasteRating: 256,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.TWILIGHT_SERPENT]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.WAR_PRISONER]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.WILD_MAGIC]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [AuraId.WRATH_OF_AIR]: buff({
      haste: 0.05,
      trigger: BuffTrigger.EXTERNAL
    })
  }
}

interface IBuffLookup {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  id: AuraId;
  name: string;
  debuff: boolean;
  haste: number;
  hasteRating: number;
  trigger: BuffTrigger;
  doesNotStackWith: AuraId[];
  summaryIcon: boolean;
  detailsIcon: boolean;
  dynamic?: (baseData: IBuffDetails, settings: Settings) => Partial<IBuffDetails>
}

export interface IBuffEvent {
  id: AuraId,
  data: IBuffDetails,
  event: IBuffData
}
