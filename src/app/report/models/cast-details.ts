import { IAbilityData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageInstance } from 'src/app/report/models/damage-instance';

export class CastDetails {
  spellId: SpellId;
  name: string;
  castStart: number;
  castEnd: number;
  targetId: number;
  targetInstance: number;
  instances: DamageInstance[] = [];
  totalDamage = 0;
  ticks = 0;

  // for DoTs/flay (spells with multiple damage ticks), did this cast clip a previous cast
  clippedPreviousCast = false;
  clippedTicks = 0;

  // for channeled spells, delta from the last damage tick (effective end of channel) until next cast (of any spell)
  nextCastLatency = 0;

  // for DoTs, downtime between last tick and first tick of this cast
  dotDowntime = 0;

  // for spells with a cooldown, delta from the point the spell was off cooldown until this cast started
  timeOffCooldown = 0;

  constructor({ ability, targetId, targetInstance, castStart, castEnd }: ICastDetailsParams) {
    this.spellId = ability.guid;
    this.name = ability.name;

    this.targetId = targetId;
    this.targetInstance = targetInstance;
    this.castStart = castStart;
    this.castEnd = castEnd;
  }

  hasSameTarget(other: CastDetails) {
    return other.targetId === this.targetId && other.targetInstance === this.targetInstance;
  }

  get lastDamageTimestamp() {
    return this.instances[this.instances.length - 1].timestamp;
  }
}

interface ICastDetailsParams {
  ability: IAbilityData;
  targetId: number;
  targetInstance: number;
  castStart: number;
  castEnd: number;
}
