import { CastsSummary } from 'src/app/report/models/casts-summary';
import { CastDetails } from 'src/app/report/models/cast-details';
import { ICastData, IDamageData, IDeathLookup, IEncounterEvents, LogsService } from 'src/app/logs/logs.service';
import { mapSpellId, SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { DamageInstance } from 'src/app/report/models/damage-instance';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { HitType } from 'src/app/logs/models/hit-type.enum';

export class EventAnalyzer {
  private static EVENT_LEEWAY = 100 // ms. allow damage to occur just slightly later than "should" be possible given
                                    // strict debuff times. Blah blah server doesn't keep time exactly.

  log: LogSummary;
  encounter: EncounterSummary;
  castData: ICastData[];
  damageData: IDamageData[];
  deaths: IDeathLookup;
  damageBySpell: {[spellId: number]: IDamageData[]};

  constructor(log: LogSummary, encounterId: number, data: IEncounterEvents) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.castData = data.casts;
    this.damageData = data.damage;
    this.deaths = data.deaths;
  }

  /**
   * Compile WCL events into Casts suitable for analysis
   * @param {LogSummary} log
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {CastsSummary}
   */
  public createCasts(): CastDetails[] {
    let currentCast: ICastData,
      startingCast: ICastData|null = null,
      nextDamage: IDamageData|null;

    const casts: CastDetails[] = [];

    // sometimes casts that start before combat begins for the logger are omitted,
    // but the damage is recorded. In that case, infer the cast...
    this.inferMissingCasts();

    // partition damage events by spell ID for association with casts
    this.initializeDamageBuckets();

    while (this.castData.length > 0) {
      currentCast = this.castData.shift() as ICastData;

      if (currentCast.type === 'begincast') {
        startingCast = currentCast;
        continue;
      }

      // if the completed cast isn't the one we started, remove starting info
      // note that starting cast events don't have the target info but we shouldn't need to match it
      // because if we switch targets we'll have a new begincast event anyway
      if (startingCast && currentCast.ability.guid !== startingCast.ability.guid) {
        startingCast = null;
      }

      const spellId = mapSpellId(currentCast.ability.guid);
      const damageEvents = this.damageBySpell[spellId];
      const spellData = SpellData[spellId];
      const details = new CastDetails({
        spellId,
        ability: currentCast.ability,
        sourceId: currentCast.sourceID,
        targetId: currentCast.targetID,
        targetInstance: currentCast.targetInstance,
        castStart: startingCast?.timestamp || currentCast.timestamp,
        castEnd: currentCast.timestamp,
        spellPower: currentCast.spellPower
      });
      casts.push(details);

      // special case -- ShadowFiend!
      // there's probably a way to generalize this but I'm not sure it's even worth it
      // unless I were to want to re-use this code for non-shadow-priest analysis
      if (details.spellId === SpellId.SHADOW_FIEND) {
        this.setShadowfiendDamage(details);
      }

      else if (this.damageBySpell.hasOwnProperty(spellId)) {
        // for dots, we need to associate damage ticks with the appropriate cast
        // we know how far into the future this cast could tick, but we need to
        // look for a future cast on the same target, because the current cast can only
        // be responsible for ticks up until the next cast on a given target
        if (spellData.maxDamageInstances > 1) {
          this.setMultiInstanceDamage(details, spellData, damageEvents);

          // check for lost ticks to enemy death
          this.setTruncationByDeath(details, spellData);
        } else {
          // find the next instance of damage for this spell for this target.
          const damage = damageEvents.find((d) => this.matchDamage(details, d, details.castEnd));

          if (damage) {
            details.setInstances([new DamageInstance((damage))]);
            damage.read = true;
          }
        }
      }

      // prune read events
      // this is probably unnecessary given the small size of these arrays, but whatever.
      if (damageEvents) {
        nextDamage = damageEvents[0];
        while (nextDamage && nextDamage.read) {
          damageEvents.shift();
          nextDamage = damageEvents[0];
        }
      }
    }

    return casts;
  }

  private initializeDamageBuckets() {
    this.damageBySpell = LogsService.TRACKED_ABILITIES
      .concat(SpellId.MELEE)
      .reduce((lookup, spellId) => {
        lookup[spellId] = [];
        return lookup;
      }, {} as {[spellId: number]: IDamageData[]});

    for (const event of this.damageData) {
      const spellId = mapSpellId(event.ability.guid);
      if (this.damageBySpell.hasOwnProperty(spellId)) {
        this.damageBySpell[spellId].push(event);
      }
    }
  }

  private setShadowfiendDamage(cast: CastDetails) {
    const damageEvents = this.damageBySpell[SpellId.MELEE];
    const maxDamageTimestamp =
      cast.castEnd + (SpellData[SpellId.SHADOW_FIEND].maxDuration * (1000 + EventAnalyzer.EVENT_LEEWAY));

    let nextDamage = damageEvents[0];
    let i = 0, instances: DamageInstance[] = [];

    while (nextDamage && nextDamage.timestamp <= maxDamageTimestamp) {
      const actor = this.log.getActor(cast.sourceId);
      if (actor && !nextDamage.read && nextDamage.sourceID === actor.shadowFiendId) {
        instances.push(new DamageInstance(nextDamage));
        nextDamage.read = true;
      }

      nextDamage = damageEvents[++i];
    }

    cast.setInstances(instances);
  }

  private setMultiInstanceDamage(cast: CastDetails, spellData: ISpellData, events: IDamageData[]) {
    let i = 0;
    let maxDamageTimestamp = cast.castEnd + (spellData.maxDuration * 1000);
    let instances: DamageInstance[] = [];
    let nextCast: ICastData|null;
    let nextDamage: IDamageData|null;

    do {
      nextCast = this.castData.length > i ? this.castData[i] : null;
      if (nextCast === null || this.castIsReplacement(cast, nextCast, events)) {
        if (nextCast) {
          maxDamageTimestamp = nextCast.timestamp;
        }
        break;
      }
      i++;
    } while (nextCast.timestamp <= maxDamageTimestamp + EventAnalyzer.EVENT_LEEWAY);

    // Process damage instances for this spell within the window
    nextDamage = events[0];
    let count = 0;
    i = 0;

    while (nextDamage && count < spellData.maxDamageInstances) {
      if (this.matchDamage(cast, nextDamage, maxDamageTimestamp)) {
        // If we encounter a full resist it must be that a cast failed
        // It's *this* cast only if it's the first instance. Otherwise we just ignore it
        if (count === 0 || nextDamage.hitType !== HitType.RESIST) {
          instances.push(new DamageInstance(nextDamage));
          nextDamage.read = true;
          count++;
        }

        // if it is this cast being resisted, don't add more damage
        if (count === 0 && nextDamage.hitType === HitType.RESIST) {
          break;
        }
      }
      nextDamage = events[++i];
    }

    cast.setInstances(instances);
  }

  // if a channeled spell or DoT didn't get all ticks,
  // check to see if it was truncated by the target's death
  private setTruncationByDeath(cast: CastDetails, spellData: ISpellData) {
    const key = `${cast.targetId}:${cast.targetInstance}`;
    const targetDeathTimestamp = this.deaths[key] || this.encounter.end;
    const checkTruncation = [DamageType.CHANNEL, DamageType.DOT].includes(spellData.damageType);

    if (checkTruncation && cast.hits < spellData.maxDamageInstances && targetDeathTimestamp) {
      const lastTick = cast.lastDamageTimestamp || cast.castEnd;
      const nextTickBy = lastTick + ((spellData.maxDuration / spellData.maxDamageInstances) * 1000);

      if (targetDeathTimestamp < nextTickBy + EventAnalyzer.EVENT_LEEWAY) {
        cast.truncated = true;
      }
    }
  }

  // next replaces the current cast if ALL of these conditions are true
  // -- the cast completed (type is 'cast', not 'begincast')
  // -- on the same kind of mob (targetID)
  // -- on the same instance of that mob (e.g. in WCL "Spellbinder 3" is a different instance from "Spellbinder 2"
  // -- and the cast was not resisted (requires finding an associated damage instance)
  private castIsReplacement(cast: CastDetails, next: ICastData, events: IDamageData[]) {
    // check for matching target
    if (next.type !== 'cast' || mapSpellId(next.ability.guid) !== cast.spellId ||
      next.targetID !== cast.targetId || next.targetInstance !== cast.targetInstance) {
      return false;
    }

    // check for resist
    const resist = events.find((e) =>
      e.hitType === HitType.RESIST && this.matchTarget(next, e) &&
        e.timestamp > next.timestamp - 50 && e.timestamp < next.timestamp + 50
    );
    if (resist) {
      return false;
    }

    return true;
  }

  private matchDamage(cast: CastDetails, next: IDamageData, maxTimestamp: number) {
    if (next.read || !this.matchTarget(cast, next)) {
      return false;
    }

    // damage must take place in the proper window
    // for dots, allow EVENT_LEEWAY for each tick
    const spellData = SpellData[cast.spellId];
    const leeway = spellData.maxDamageInstances > 1 ?
      (spellData.maxDamageInstances * EventAnalyzer.EVENT_LEEWAY) :
      EventAnalyzer.EVENT_LEEWAY;

    if (next.timestamp < (cast.castEnd - EventAnalyzer.EVENT_LEEWAY) || next.timestamp > (maxTimestamp + leeway)) {
      return false;
    }

    return true;
  }

  private matchTarget(source: CastDetails|ICastData, dest: IDamageData) {
    const sourceId = source instanceof CastDetails ? source.targetId : source.targetID;

    // must match instance if one exists
    if (source.targetInstance && source.targetInstance !== dest.targetInstance) {
      return false;
    }

    // Must match targetId if one exists... usually
    // There's a weird bug in WCL sometimes where the cast on a target has a different target ID
    // than the damage ticks, shows up as "Unknown Actor," and isn't returned as an enemy in the summary
    // since we're already matching against spell ID and timestamp, I think it's OK to relax the check
    // on targetID if and only if the instance matches and the target name doesn't exist
    if (sourceId && sourceId !== dest.targetID && this.log.getActorName(sourceId) !== undefined) {
      return false;
    }

    return true;
  }

  // sometimes casts that start before combat begins for the logger are omitted,
  // but the damage is recorded. Check the first few damage spells and create casts
  // if one is not found.
  private inferMissingCasts() {
    const instancesToCheck = this.damageData.length >= 3 ? 2 : this.damageData.length - 1,
      spellIdsInferred: number[] = [];

    // find first damage cast so we can borrow its spellpower if we find a missing cast
    const firstDamageCast = this.castData.find((c) => {
      const spellId = mapSpellId(c.ability.guid);
      return c.type === 'cast' && SpellData[spellId].damageType !== DamageType.NONE
    });

    for (let i = instancesToCheck; i >= 0; i--) {
      const instance = this.damageData[i];
      let castIndex = 0, match = false, nextCast = this.castData[castIndex];

      do {
        if (nextCast.ability.guid === instance.ability.guid && this.matchTarget(nextCast, instance)) {
          match = true;
          break;
        }
        nextCast = this.castData[++castIndex];
      } while (nextCast && nextCast.timestamp < instance.timestamp +EventAnalyzer.EVENT_LEEWAY);

      if (!match && !spellIdsInferred.includes(instance.ability.guid)) {
        this.castData.unshift({
          type: 'cast',
          ability: instance.ability,
          timestamp: this.inferCastTimestamp(instance),
          sourceID: instance.sourceID,
          targetID: instance.targetID,
          targetInstance: instance.targetInstance,
          read: false,
          spellPower: firstDamageCast?.spellPower || 0 // we really have no idea, but it should be close to this
        });
        spellIdsInferred.push(instance.ability.guid);
      }
    }
  }

  private inferCastTimestamp(damage: IDamageData) {
    const spellData = SpellData[mapSpellId(damage.ability.guid)];

    if ([DamageType.DOT, DamageType.CHANNEL].includes(spellData.damageType)) {
      // First find the earliest tick we want to associate to our inferred cast,
      // then infer the cast time based on how frequently the spell ticks
      const timeToTick = (spellData.maxDuration / spellData.maxDamageInstances) * 1000,
        earliestPossible = damage.timestamp - (spellData.maxDuration * 1000);

      const earliestInstance = this.damageData.find((d) =>
        d.ability.guid === damage.ability.guid &&
          d.timestamp >= earliestPossible - EventAnalyzer.EVENT_LEEWAY &&
          d.targetID === damage.targetID &&
          d.targetInstance === damage.targetInstance
      ) as IDamageData;

      return Math.max(earliestInstance.timestamp - timeToTick, this.encounter.start);
    }

    return damage.timestamp;
  }
}
