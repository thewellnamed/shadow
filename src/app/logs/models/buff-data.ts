import { BuffId } from 'src/app/logs/models/buff-id.enum';
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
    detailsIcon: true
  };

  public static get(ability: IAbilityData, settings: Settings): IBuffDetails {
    const baseData = Buff.data[ability.guid];
    const dynamic = baseData.dynamic ? baseData.dynamic.call(null, baseData, settings) : {};

    return Object.assign({ id: ability.guid, name: ability.name }, baseData, dynamic);
  }

  public static data: IBuffLookup = {
    [BuffId.ARGENT_VALOR]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.BERSERKING]: buff({
      haste: 0.2,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.BLOODLUST]: buff({
      haste: 0.3,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.POWER_INFUSION],
      summaryIcon: true
    }),

    [BuffId.BREATH_HASTE]: buff({
      haste: 0.25,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.DARK_IRON_PIPE]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.DESTRUCTION]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.DRUMS_OF_BATTLE]: buff({
      hasteRating: 80,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.DYING_CURSE]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.EMBRACE_SPIDER]: buff({
      hasteRating: 505,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.GREATER_DRUMS_OF_BATTLE]: buff({
      hasteRating: 80,
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.FEL_INFUSION]: buff({
      hasteRating: 175,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.FOCUS]: buff({
      hasteRating: 320,
      trigger: BuffTrigger.CAST_END,
      summaryIcon: true
    }),

    [BuffId.FORGE_EMBER]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.HASTE]: buff({
      hasteRating: 400,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.HEROISM]: buff({
      haste: 0.3,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.POWER_INFUSION],
      summaryIcon: true
    }),

    [BuffId.HYPERSPEED_ACCELERATION]: buff({
      hasteRating: 340,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.ICON_CRESCENT]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.INNER_FOCUS]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.LIGHTWEAVE]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.LIMITLESS_POWER]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.MOONKIN_AURA]: buff({
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.RETRIBUTION_AURA],
      dynamic: (baseData, settings) => ({
        haste: settings.improvedMoonkinAura ? 0.03 : 0
      })
    }),

    [BuffId.MOJO_MADNESS]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.POWER_INFUSION]: buff({
      haste: 0.2,
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.HEROISM, BuffId.BLOODLUST],
      summaryIcon: true
    }),

    [BuffId.QUAGS_EYE]: buff({
      hasteRating: 320,
      trigger: BuffTrigger.CAST_END,
      summaryIcon: true
    }),

    [BuffId.RETRIBUTION_AURA]: buff({
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.MOONKIN_AURA],
      dynamic: (baseData, settings) => ({
        haste: settings.improvedRetAura ? 0.03 : 0
      })
    }),

    [BuffId.SHADOWY_INSIGHT]: buff({
      trigger: BuffTrigger.EXTERNAL
    }),

    [BuffId.SPEED_POTION]: buff({
      hasteRating: 500,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.SUNDIAL]: buff({
      trigger: BuffTrigger.EXTERNAL,
      summaryIcon: true
    }),

    [BuffId.TOME_ARCANE_PHENOMENA]: buff({
      hasteRating: 256,
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.TWILIGHT_SERPENT]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.WAR_PRISONER]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.WILD_MAGIC]: buff({
      trigger: BuffTrigger.ON_USE,
      summaryIcon: true
    }),

    [BuffId.WRATH_OF_AIR]: buff({
      haste: 0.05,
      trigger: BuffTrigger.EXTERNAL
    })
  }
}

interface IBuffLookup {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  id: BuffId;
  name: string;
  haste: number;
  hasteRating: number;
  trigger: BuffTrigger;
  doesNotStackWith: BuffId[];
  summaryIcon: boolean;
  detailsIcon: boolean;
  dynamic?: (baseData: IBuffDetails, settings: Settings) => Partial<IBuffDetails>
}

export interface IBuffEvent {
  id: BuffId,
  data: IBuffDetails,
  event: IBuffData
}
