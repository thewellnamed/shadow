import { BuffId } from 'src/app/logs/models/buff-id.enum';
import { IBuffData, ICastData } from 'src/app/logs/interfaces';

export enum BuffTrigger {
  CAST_END,
  ON_USE,
  EXTERNAL
}

const BUFF_DEFAULTS: Partial<IBuffDetails> = {
  haste: 0,
  hasteRating: 0,
  trigger: BuffTrigger.EXTERNAL
}

function buff(params: Partial<IBuffDetails> = {}) {
  return Object.assign({}, BUFF_DEFAULTS, params) as IBuffDetails;
}

export const BuffData: IBuffLookup = {
  // note: berserking haste amount overridden from cast data based on player health. This is base value
  [BuffId.BERSERKING]: buff({ haste: 0.1, trigger: BuffTrigger.ON_USE }),
  [BuffId.BLOODLUST]: buff({ haste: 0.3, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.BREATH_HASTE]: buff({ haste: 0.25, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.DRUMS_OF_BATTLE]: buff({ hasteRating: 80, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.GREATER_DRUMS_OF_BATTLE]: buff({ hasteRating: 80, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.FEL_INFUSION]: buff({ hasteRating: 175, trigger: BuffTrigger.ON_USE }),
  [BuffId.FOCUS]: buff({ hasteRating: 320, trigger: BuffTrigger.CAST_END }),
  [BuffId.HEROISM]: buff({ haste: 0.3, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.POWER_INFUSION]: buff({ haste: 0.2, trigger: BuffTrigger.EXTERNAL }),
  [BuffId.QUAGS_EYE]: buff({ hasteRating: 320, trigger: BuffTrigger.CAST_END })
};

// create Buff details for Berserking from cast, to track player health
export function berserkingFromCast(cast: ICastData) {
  const event: IBuffData = {
    type: 'applybuff',
    ability: { guid: BuffId.BERSERKING, name: 'Berserking' },
    timestamp: cast.timestamp,
    targetID: cast.targetID,
    targetInstance: cast.targetInstance,
    read: false
  };

  const healthPercent = cast.hitPoints / cast.maxHitPoints,
    baseData = BuffData[BuffId.BERSERKING];

  // determined via some in-game experimentation
  // 10% haste at full health, scaling to a max of 30% haste at 40% health
  const haste = Math.min(baseData.haste + (1 - healthPercent) / 3, .3);

  return { event, buff: { hasteRating: 0, haste, trigger: baseData.trigger } };
}

interface IBuffLookup {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  haste: number;
  hasteRating: number;
  trigger: BuffTrigger;
}

export interface IBuffEvent {
  id: BuffId,
  data: IBuffDetails,
  event: IBuffData
}
