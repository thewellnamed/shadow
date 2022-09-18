import { BuffId } from 'src/app/logs/models/buff-id.enum';
import { IBuffData } from 'src/app/logs/interfaces';
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

  public static get(id: number, settings: Settings) {
    const baseData = Buff.data[id];
    const dynamic = baseData.dynamic ? baseData.dynamic.call(null, baseData, settings) : {};

    return Object.assign({ id }, baseData, dynamic);
  }

  public static data: IBuffLookup = {
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

    [BuffId.DRUMS_OF_BATTLE]: buff({
      hasteRating: 80,
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

    [BuffId.MOONKIN_AURA]: buff({
      trigger: BuffTrigger.EXTERNAL,
      doesNotStackWith: [BuffId.RETRIBUTION_AURA],
      dynamic: (baseData, settings) => ({
        haste: settings.improvedMoonkinAura ? 0.03 : 0
      })
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
