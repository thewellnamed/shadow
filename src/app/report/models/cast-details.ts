import { DamageInstance } from 'src/app/report/models/damage-instance';
import { DamageType, Spell } from 'src/app/logs/models/spell-data';
import { HitType } from 'src/app/logs/models/hit-type.enum';
import { IAbilityData } from 'src/app/logs/interfaces';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { HasteUtils } from 'src/app/report/models/haste';

export class CastDetails {
  spellId: SpellId; // the main ID for the spell (i.e. the max rank spell ID)
  castId: SpellId; // the actual spell ID in the log
  name: string;
  castStart: number;
  castEnd: number;
  castTimeMs: number; // in ms, from start/end events
  baseCastTime: number; // in secs, includes haste at time of cast
  sourceId: number;
  targetId: number;
  targetInstance: number;
  allTargets: number[] = [];
  hitType: HitType;
  instances: DamageInstance[] = [];
  totalDamage = 0;
  totalAbsorbed = 0;
  totalResisted = 0;
  hits = 0;
  spellPower = 0;

  // for DoTs/flay (spells with multiple damage ticks), did this cast clip a previous cast
  clippedPreviousCast = false;
  clippedTicks = 0;

  // latency between casts.
  // for channeled spells, delta from the last damage tick (effective end of channel) until next cast (of any spell)
  // for all else, based on cast start/end
  nextCastLatency?: number;

  // for channeled spells, was the channel clipped very close to the next tick?
  clippedEarly = false;

  // for early clips, the ratio between the delta from last tick to the time for next tick
  // e.g. a number from 0-1 where 1 represents the clip was immediately prior to the expected next tick
  earlyClipLostDamageFactor = 0;

  // for DoTs, downtime between last tick and first tick of this cast
  dotDowntime?: number;

  // for spells with a cooldown, delta from the point the spell was off cooldown until this cast started
  timeOffCooldown?: number;

  // damage truncated by death of mob?
  truncated = false;

  gcd = 0;
  haste = 0;

  constructor(params: ICastDetailsParams) {
    this.spellId = params.spellId;
    this.name = params.ability.name;

    this.sourceId = params.sourceId;
    this.targetId = params.targetId;
    this.targetInstance = params.targetInstance;
    this.castStart = params.castStart;
    this.castEnd = params.castEnd;
    this.castTimeMs = params.castEnd - params.castStart;

    this.spellPower = params.spellPower;
    this.haste = params.haste;
    this.gcd = params.gcd;
    this.baseCastTime = HasteUtils.castTime(this.spellId, params.haste);
  }

  setInstances(instances: DamageInstance[]) {
    this.instances = instances;

    let hits = 0, damage = 0, absorbed = 0, resisted = 0, targets = [];
    for (const next of instances) {
      damage += next.amount;
      absorbed += next.absorbed;
      resisted += next.resisted;
      targets.push(next.targetId);

      if (![HitType.RESIST, HitType.IMMUNE].includes(next.hitType)) {
        hits++;
      }
    }

    this.totalDamage = damage + absorbed;
    this.totalAbsorbed = absorbed;
    this.totalResisted = resisted;
    this.hits = hits;
    this.allTargets = [... new Set(targets)];
    this.setHitType();

    // For channeled spells, set cast time to last tick
    if (Spell.data[this.spellId].damageType === DamageType.CHANNEL && instances.length > 0) {
      this.castTimeMs = this.lastDamageTimestamp! - this.castStart;
      this.baseCastTime = this.castTimeMs / 1000;
    }
  }

  get failed() {
    return [HitType.RESIST, HitType.IMMUNE].includes(this.hitType);
  }

  get resisted() {
    return this.hitType === HitType.RESIST;
  }

  get immune() {
    return this.hitType === HitType.IMMUNE;
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
    if (this.instances.length > 0) {
      const types = new Set(this.instances.map((i) => i.hitType));
      if (types.size > 1) {
        if (this.totalDamage > 0) {
          this.hitType = HitType.HIT;
        } else {
          this.hitType = HitType.NONE;
        }
      } else {
        this.hitType = types.values().next().value;
      }
    }

    else {
      // we cast but nothing ever happened (dead before any ticks? clipped?)
      this.hitType = HitType.NONE;
    }
  }
}

interface ICastDetailsParams {
  castId: SpellId;
  spellId: SpellId;
  ability: IAbilityData;
  sourceId: number,
  targetId: number;
  targetInstance: number;
  castStart: number;
  castEnd: number;
  spellPower: number;
  haste: number;
  gcd: number;
}
