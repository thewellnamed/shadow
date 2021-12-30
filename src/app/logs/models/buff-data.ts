import { BuffId } from 'src/app/logs/models/buff-id.enum';

const BUFF_DEFAULTS: Partial<IBuffDetails> = {
  haste: 0,
  hasteRating: 0,
  combine: 'none'
}

function buff(params: Partial<IBuffDetails> = {}) {
  return Object.assign({}, BUFF_DEFAULTS, params) as IBuffDetails;
}

export const BuffData: IBuffData = {
  [BuffId.BERSERKING]: buff({
    haste: 0.1,
    combine: 'multiply'
  })
};

export interface IBuffData {
  [id: number]: IBuffDetails
}

export interface IBuffDetails {
  haste: number;
  hasteRating: number;
  combine: 'none' | 'multiply' | 'add';
}
