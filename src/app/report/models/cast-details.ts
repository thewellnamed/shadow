import { IAbilityData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageInstance } from 'src/app/report/models/damage-instance';
import { HitType } from 'src/app/logs/models/hit-type.enum';

export class CastDetails {
  spellId: SpellId;
  name: string;
  castStart: number;
  castEnd: number;
  targetId: number;
  targetInstance: number;
  hitType: HitType;
  instances: DamageInstance[] = [];
  totalDamage = 0;
  totalAbsorbed = 0;
  totalResisted = 0;
  ticks = 0;
  spellPower = 0;

  // for DoTs/flay (spells with multiple damage ticks), did this cast clip a previous cast
  clippedPreviousCast = false;
  clippedTicks = 0;

  // for channeled spells, delta from the last damage tick (effective end of channel) until next cast (of any spell)
  nextCastLatency?: number;

  // for DoTs, downtime between last tick and first tick of this cast
  dotDowntime?: number;

  // for spells with a cooldown, delta from the point the spell was off cooldown until this cast started
  timeOffCooldown?: number;

  constructor({ ability, targetId, targetInstance, castStart, castEnd, spellPower }: ICastDetailsParams) {
    this.spellId = ability.guid;
    this.name = ability.name;

    this.targetId = targetId;
    this.targetInstance = targetInstance;
    this.castStart = castStart;
    this.castEnd = castEnd;

    this.spellPower = spellPower;
  }

  setInstances(instances: DamageInstance[]) {
    this.instances = instances;

    let ticks = 0, damage = 0, absorbed = 0, resisted = 0;
    for (const next of instances) {
      damage += next.amount;
      absorbed += next.absorbed;
      resisted += next.resisted;

      if (next.hitType !== HitType.RESIST) {
        ticks++;
      }
    }

    this.setHitType();
    this.totalDamage = damage;
    this.totalAbsorbed = absorbed;
    this.totalResisted = resisted;
    this.ticks = ticks;
  }

  get dealtDamage() {
    return ![HitType.RESIST, HitType.NONE].includes(this.hitType);
  }

  get resisted() {
    return this.hitType === HitType.RESIST;
  }

  hasSameTarget(other: CastDetails) {
    return other.targetId === this.targetId && other.targetInstance === this.targetInstance;
  }

  get lastDamageTimestamp() {
    if (this.instances.length === 0) {
      return undefined;
    }

    return this.instances[this.instances.length - 1].timestamp;
  }

  private setHitType() {
    // none of the multi-instance abilities can crit, so if there are multiple instances of damage
    // then we didn't fully resist, so call it a hit.
    // Could interrogate all the instances and mark as partial resist, etc., but not needed now
    if (this.instances.length > 1) {
      this.hitType = HitType.HIT;
    }

    else if (this.instances.length === 1 ) {
      this.hitType = this.instances[0].hitType;
    }

    else {
      // we cast but nothing ever happened (dead before any ticks? clipped?)
      this.hitType = HitType.NONE;
    }
  }
}

interface ICastDetailsParams {
  ability: IAbilityData;
  targetId: number;
  targetInstance: number;
  castStart: number;
  castEnd: number;
  spellPower: number;
}
