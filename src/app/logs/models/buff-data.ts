import { BuffId } from 'src/app/logs/models/buff-id.enum';

const BUFF_DEFAULTS: Partial<IBuffDetails> = {
  haste: 0,
  hasteRating: 0
}

function buff(params: Partial<IBuffDetails> = {}) {
  return Object.assign({}, BUFF_DEFAULTS, params) as IBuffDetails;
}

export const BuffData: IBuffData = {
  // note: berserking haste amount overridden from cast data based on player health. This is base value
  [BuffId.BERSERKING]: buff({ haste: 0.1 }),
  [BuffId.BLOODLUST]: buff({ haste: 0.3 }),
  [BuffId.FOCUS]: buff({ hasteRating: 320 }),
  [BuffId.HEROISM]: buff({ haste: 0.3 }),
  [BuffId.POWER_INFUSION]: buff({ haste: 0.2 }),
  [BuffId.QUAGS_EYE]: buff({ hasteRating: 320 })
};

export interface IBuffData {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  haste: number;
  hasteRating: number;
}
