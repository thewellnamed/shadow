import { IAbilityData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/spell-id.enum';

export class CastDetails {
  spellId: SpellId;
  targetId: number;
  targetInstance: number;
  castStart: number;
  castEnd: number;
  totalDamage: number;
  ticks: number;
  delay: number;

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
