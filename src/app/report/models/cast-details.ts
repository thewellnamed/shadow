import { IAbilityData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

export class CastDetails {
  spellId: SpellId;
  castStart: number;
  castEnd: number;
  targetId: number;
  targetInstance: number;
  totalDamage = 0;
  ticks = 0;

  constructor({ ability, targetId, targetInstance, castStart, castEnd }: ICastDetailsParams) {
    this.spellId = ability.guid;

    this.targetId = targetId;
    this.targetInstance = targetInstance;
    this.castStart = castStart;
    this.castEnd = castEnd;
  }
}

interface ICastDetailsParams {
  ability: IAbilityData;
  targetId: number;
  targetInstance: number;
  castStart: number;
  castEnd: number;
}
