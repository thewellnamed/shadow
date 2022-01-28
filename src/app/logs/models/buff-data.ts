import { BuffId } from 'src/app/logs/models/buff-id.enum';
import { IBuffData, ICastData } from 'src/app/logs/interfaces';

const BUFF_DEFAULTS: Partial<IBuffDetails> = {
  haste: 0,
  hasteRating: 0
}

function buff(params: Partial<IBuffDetails> = {}) {
  return Object.assign({}, BUFF_DEFAULTS, params) as IBuffDetails;
}

export const BuffData: IBuffLookup = {
  // note: berserking haste amount overridden from cast data based on player health. This is base value
  [BuffId.BERSERKING]: buff({ haste: 0.1 }),
  [BuffId.BLOODLUST]: buff({ haste: 0.3 }),
  [BuffId.BREATH_HASTE]: buff({ haste: 0.25 }),
  [BuffId.DRUMS_OF_BATTLE]: buff({ hasteRating: 80 }),
  [BuffId.GREATER_DRUMS_OF_BATTLE]: buff({ hasteRating: 80 }),
  [BuffId.FEL_INFUSION]: buff({ hasteRating: 175 }),
  [BuffId.FOCUS]: buff({ hasteRating: 320 }),
  [BuffId.HEROISM]: buff({ haste: 0.3 }),
  [BuffId.POWER_INFUSION]: buff({ haste: 0.2 }),
  [BuffId.QUAGS_EYE]: buff({ hasteRating: 320 })
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
    baseHaste = BuffData[BuffId.BERSERKING].haste;

  // determined via some in-game experimentation
  // 10% haste at full health, scaling to a max of 30% haste at 40% health
  const haste = Math.min(baseHaste + (1 - healthPercent) / 3, .3);

  return { event, buff: { hasteRating: 0, haste } };
}

interface IBuffLookup {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  haste: number;
  hasteRating: number;
}

export interface IBuffEvent {
  id: BuffId,
  data: IBuffDetails,
  event: IBuffData
}
