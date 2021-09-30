import { IAbilityData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageInstance } from 'src/app/report/models/damage-instance';

export class CastDetails {
  spellId: SpellId;
  castStart: number;
  castEnd: number;
  targetId: number;
  targetInstance: number;
  instances: DamageInstance[] = [];
  totalDamage = 0;
  ticks = 0;

  // for spells with multiple ticks, delta from point the spell clipped (or ended) until next cast
  clipLatency = 0;

  // for spells with cooldown, delta from the point the spell was off cooldown until this cast started
  timeOffCooldown = 0;

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
