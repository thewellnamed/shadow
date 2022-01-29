import { berserkingFromCast, BuffData, BuffTrigger, IBuffDetails, IBuffEvent } from 'src/app/logs/models/buff-data';
import { Report } from 'src/app/report/models/report';
import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { DamageInstance } from 'src/app/report/models/damage-instance';
import { HasteUtils, IHasteStats } from 'src/app/report/models/haste';
import { HitType } from 'src/app/logs/models/hit-type.enum';
import { IActorStats, IBuffData, ICastData, IDamageData, IEventData } from 'src/app/logs/interfaces';
import { IDeathLookup, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { mapSpellId, SpellId } from 'src/app/logs/models/spell-id.enum';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class EventAnalyzer {
  private static EVENT_LEEWAY = 100; // ms. allow damage to occur just slightly later than "should" be possible given
                                     // strict debuff times. Blah blah server doesn't keep time exactly.

  private static MIN_INFER_HASTE_EVENTS = 8; // require a minimum of MB/VT casts to infer missing haste value

  private analysis: PlayerAnalysis;

  private baseStats: IActorStats;
  private buffData: IBuffData[];
  private castData: ICastData[];
  private damageData: IDamageData[];
  private deaths: IDeathLookup;
  private damageBySpell: {[spellId: number]: IDamageData[]};
  private events: IEventData[];

  // tracks currently active buffs
  private buffs: IBuffEvent[] = [];

  constructor(analysis: PlayerAnalysis) {
    this.analysis = analysis;
    this.baseStats = Object.assign({}, analysis.actorInfo.stats) as IActorStats;

    // initialize event data
    this.buffData = analysis.events.buffs;
    this.castData = analysis.events.casts;
    this.damageData = analysis.events.damage;
    this.deaths = analysis.events.deaths;

    // sometimes casts that start before combat begins for the logger are omitted,
    // but the damage is recorded. In that case, infer the cast...
    this.inferMissingCasts();

    // partition damage events by spell ID for association with casts
    this.initializeDamageBuckets();

    // Merge buff and cast data into a single array to process
    this.events = this.mergeEvents();

    // if haste info is missing from combatant info, try to infer it...
    if (typeof this.baseStats.Haste === 'undefined') {
      this.inferBaseHaste();
    }
  }

  /**
   * Compile WCL events into Casts suitable for analysis
   * @param {LogSummary} log
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {Report}
   */
  public createCasts(): CastDetails[] {
    let event: IEventData,
      currentCast: ICastData,
      activeStats: IHasteStats|null = null,
      startingCast: ICastData|null = null,
      nextDamage: IDamageData|null;

    const casts: CastDetails[] = [];

    while (this.events.length > 0) {
      event = this.events.shift() as IEventData;

      switch (event.type) {
        case 'applybuff':
        case 'refreshbuff':
          this.applyBuff(event as IBuffData, BuffData[event.ability.guid]);
          continue;

        case 'removebuff':
          this.removeBuff(event as IBuffData);
          continue;

        case 'begincast':
          startingCast = event as ICastData;
          activeStats = HasteUtils.calc(this.baseStats, this.buffs);
          continue;
      }

      // after fall-through we are processing only a cast and no other event type
      currentCast = event as ICastData;

      // if the completed cast isn't the one we started, remove starting info
      // note that starting cast events don't have the target info but we shouldn't need to match it
      // because if we switch targets we'll have a new begincast event anyway
      if (startingCast && currentCast.ability.guid !== startingCast.ability.guid) {
        startingCast = null;
        activeStats = null;
      }

      // if we didn't get stats at begincast, get them now
      if (!activeStats) {
        activeStats = HasteUtils.calc(this.baseStats, this.buffs);
      }

      const spellId = mapSpellId(currentCast.ability.guid);
      const damageEvents = this.damageBySpell[spellId];
      const spellData = Spell.get(spellId, this.analysis.actorInfo);
      const details = new CastDetails({
        spellId,
        ability: currentCast.ability,
        sourceId: currentCast.sourceID,
        targetId: currentCast.targetID,
        targetInstance: currentCast.targetInstance,
        castStart: startingCast?.timestamp || currentCast.timestamp,
        castEnd: currentCast.timestamp,
        spellPower: currentCast.spellPower,
        haste: activeStats!.totalHaste - 1,
        gcd: spellData.gcd ? activeStats!.gcd : 0
      });
      casts.push(details);

      // special case -- ShadowFiend!
      // there's probably a way to generalize this but I'm not sure it's even worth it
      // unless I were to want to re-use this code for non-shadow-priest analysis
      if (details.spellId === SpellId.SHADOW_FIEND) {
        this.setShadowfiendDamage(details);
      }

      // special case -- Berserking!
      // we need to track the buff from the cast in order to know how much haste the player got, based on health
      else if (details.spellId === SpellId.BERSERKING) {
        const { event, buff } = berserkingFromCast(currentCast);
        this.applyBuff(event, buff);
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
        } else if (spellData.damageType !== DamageType.NONE) {
          // find the next instance of damage for this spell for this target.
          const damage = damageEvents.find((d) =>
            this.matchDamage(details, spellData, d, details.castEnd, true));

          if (damage) {
            details.targetId = damage.targetID;
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

      startingCast = activeStats = null;
    }

    return casts;
  }

  // strategy -- infer a gear haste rating by evaluating all MB/VT casts with buffs accounted for
  // Need to average across casts to smooth out the effects of variance in server processing time
  // This isn't perfectly accurate, but it should be very close
  // (and this strategy is a fallback for when logs are missing data)
  private inferBaseHaste() {
    let startingCast: ICastData|undefined,
      cast: ICastData,
      spellData: ISpellData,
      event: IEventData,
      stats = HasteUtils.calc(this.baseStats, this.buffs);

    let count = 0, total = 0;

    this.buffs = [];
    for (let i = 0; i < this.events.length; i++) {
      event = this.events[i];

      switch (event.type) {
        case 'applybuff':
        case 'refreshbuff':
          this.applyBuff(event as IBuffData, BuffData[event.ability.guid]);
          continue;

        case 'removebuff':
          this.removeBuff(event as IBuffData);
          continue;

        case 'begincast':
          startingCast = event as ICastData;
          stats = HasteUtils.calc(this.baseStats, this.buffs);
          continue;

        case 'cast':
          cast = event as ICastData;
          spellData = Spell.get(mapSpellId(event.ability.guid), this.analysis.actorInfo);
          if ((cast.ability.guid === SpellId.VAMPIRIC_TOUCH || cast.ability.guid === SpellId.MIND_BLAST) &&
            cast.ability.guid === startingCast?.ability?.guid) {

            const castTime = (cast.timestamp - startingCast.timestamp)/1000,
              baseCastTime = spellData.baseCastTime / stats.totalHaste;

            if (castTime <= baseCastTime) {
              const inferredRating = HasteUtils.inferRating(stats.totalHaste, spellData.baseCastTime, castTime);

              total += inferredRating;
              count++;
            }
          }
      }
    }

    // require a minimum of events to infer haste from
    if (count > EventAnalyzer.MIN_INFER_HASTE_EVENTS) {
      const hasteRating = total/count;
      this.baseStats.Haste = { min: hasteRating,  max: hasteRating };
    }
    this.buffs = [];
  }

  // merge buff events into cast data in order, so we can just loop over the combined set to process
  private mergeEvents(): IEventData[] {
    if (!this.buffData || this.buffData.length === 0) {
      return [... this.castData];
    }

    const events: IEventData[] = [];
    let buffIndex = 0, nextBuff = this.buffData[buffIndex],
      castIndex = 0, lastCast: ICastData|undefined = undefined, nextCast = this.castData[castIndex];

    do {
      if (nextBuff && (!nextCast || this.buffHasPriority(nextBuff, nextCast, lastCast))) {
        events.push(nextBuff);
        nextBuff = this.buffData[++buffIndex];
      } else if (nextCast) {
        events.push(nextCast);
        lastCast = nextCast;
        nextCast = this.castData[++castIndex];
      }
    } while (nextBuff || nextCast);

    return events;
  }

  // should buff be applied before this cast?
  private buffHasPriority(buff: IBuffData, nextCast: ICastData, lastCast?: ICastData) {
    const data = BuffData[buff.ability.guid];
    switch (data?.trigger) {
      case BuffTrigger.CAST_END:
        // if this buff was triggered by the end of the previous cast
        // and is happening at the same time as nextCast,
        // then the buff applies to this cast only if the last cast shares the same timestamp
        // because of spell queueing
        return (buff.timestamp < nextCast.timestamp) ||
          (buff.timestamp === nextCast.timestamp && lastCast?.timestamp === buff.timestamp);

      case BuffTrigger.ON_USE:
        // On use abilities are generally off-CD and can be started at the same timestamp as the cast
        return buff.timestamp <= nextCast.timestamp;

      default:
        // External buffs need to occur before the cast starts.
        return buff.timestamp < nextCast.timestamp;
    }
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

  private applyBuff(event: IBuffData, data: IBuffDetails) {
    const existing = this.buffs.find((b) => b.id === event.ability.guid);
    if (existing) {
      existing.event = event;
    } else {
      this.buffs.push({ id: event.ability.guid, data, event });
    }
  }

  private removeBuff(event: IBuffData) {
    const index = this.buffs.findIndex((b) => b.id === event.ability.guid);
    if (index === -1) {
      // if we're removing a buff and we never saw the event which added it, then it was probably
      // applied before combat. For haste rating buffs (e.g. drums of battle), this will show up
      // in the Haste rating stats, so we can remove it there. If it was a percentage buff,
      // we're just missing it.
      //
      // todo: process buffs before evaluating events to "infer missing buffs".
      const buffRating = BuffData[event.ability.guid].hasteRating || 0,
        baseHaste = this.baseStats.Haste?.min || 0;

      if (buffRating > 0 && buffRating >= baseHaste) {
        this.baseStats.Haste = { min: baseHaste - buffRating, max: baseHaste - buffRating};
      }
    } else {
      this.buffs.splice(index, 1);
    }
  }

  private setShadowfiendDamage(cast: CastDetails) {
    const damageEvents = this.damageBySpell[SpellId.MELEE];
    const maxDamageTimestamp =
      cast.castEnd + (Spell.data[SpellId.SHADOW_FIEND].maxDuration * (1000 + EventAnalyzer.EVENT_LEEWAY));

    let nextDamage = damageEvents[0];
    let i = 0, instances: DamageInstance[] = [];

    while (nextDamage && nextDamage.timestamp <= maxDamageTimestamp) {
      const actor = this.analysis.getActor(cast.sourceId);
      if (actor && !nextDamage.read && nextDamage.sourceID === actor.shadowFiendId) {
        instances.push(new DamageInstance(nextDamage));
        nextDamage.read = true;
      }

      nextDamage = damageEvents[++i];
    }

    cast.setInstances(instances);
  }

  private setMultiInstanceDamage(cast: CastDetails, spellData: ISpellData, damageEvents: IDamageData[]) {
    let i = 0;
    let maxDamageTimestamp = cast.castEnd + (spellData.maxDuration * 1000);
    let instances: DamageInstance[] = [];
    let nextCast: ICastData|null;
    let nextDamage: IDamageData|null;

    if (cast.targetId && this.analysis.getActorName(cast.targetId) === undefined) {
      // cast on "Unknown Actor" in WCL. Try to infer the target first
      // look for a damage event around the time we should expect a hit for the spell
      // and infer the actual target from that instance, if found.
      const delta = spellData.maxDuration > 0 ? (spellData.maxDuration / spellData.maxDamageInstances) * 1000 : 0;
      const firstDamageTimestamp = cast.castEnd + delta + EventAnalyzer.EVENT_LEEWAY;
      const firstInstance = damageEvents.find((e) =>
        this.matchDamage(cast, spellData, e, firstDamageTimestamp, true));

      if (firstInstance) {
        cast.targetId = firstInstance.targetID;
      }
    }

    do {
      nextCast = this.events.length > i ? (this.events[i] as ICastData) : null;
      if (nextCast === null || this.castIsReplacement(cast, nextCast, damageEvents)) {
        if (nextCast) {
          maxDamageTimestamp = nextCast.timestamp;
        }
        break;
      }
      i++;
    } while (nextCast.timestamp <= maxDamageTimestamp + EventAnalyzer.EVENT_LEEWAY);

    // Process damage instances for this spell within the window
    nextDamage = damageEvents[0];
    let count = 0;
    i = 0;

    while (nextDamage && count < spellData.maxDamageInstances) {
      if (this.matchDamage(cast, spellData, nextDamage, maxDamageTimestamp)) {
        // This is a little complicated because of differences between channeled, dot, and AoE damage
        // Each individual damage instance for AoE can resist individually, so we just count them all without condition
        //
        // But for a channel or dot, a full resist can only happen on the first instance, and means the cast resisted
        // We want to keep the damage instance for the full resist in that case, but only if it's the first instance.
        // Otherwise we can encounter a full resist in a string of dot damage instances and it just means some
        // *future* cast resisted, and we should ignore it for the cast currently processing.
        if (spellData.damageType === DamageType.AOE || count === 0 || !this.failed(nextDamage.hitType)) {
          instances.push(new DamageInstance(nextDamage));
          nextDamage.read = true;
          count++;
        }

        // if the whole cast is failing, don't add more damage
        if (spellData.damageType !== DamageType.AOE && count === 1 && this.failed(nextDamage.hitType)) {
          break;
        }
      }
      nextDamage = damageEvents[++i];
    }

    cast.setInstances(instances);
  }

  // if a channeled spell or DoT didn't get all ticks,
  // check to see if it was truncated by the target's death
  private setTruncationByDeath(cast: CastDetails, spellData: ISpellData) {
    const key = `${cast.targetId}:${cast.targetInstance}`;
    const targetDeathTimestamp = this.deaths[key] || this.analysis.encounter.end;
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

    // check for resist/immune
    const failed = events.find((e) =>
      this.failed(e.hitType) && this.matchTarget(next, e) &&
        e.timestamp > next.timestamp - 50 && e.timestamp < next.timestamp + 50
    );
    if (failed) {
      return false;
    }

    return true;
  }

  private failed(hitType: HitType) {
    return hitType === HitType.RESIST || hitType === HitType.IMMUNE;
  }

  private matchDamage(cast: CastDetails,
                      spellData: ISpellData,
                      next: IDamageData,
                      maxTimestamp: number,
                      allowUnknown = false) {
    if (next.read || !this.matchTarget(cast, next, allowUnknown)) {
      return false;
    }

    // damage must take place in the proper window
    // for dots, allow EVENT_LEEWAY for each tick
    const leeway = spellData.maxDamageInstances > 1 ?
      (spellData.maxDamageInstances * EventAnalyzer.EVENT_LEEWAY) :
      EventAnalyzer.EVENT_LEEWAY;

    if (next.timestamp < (cast.castEnd - EventAnalyzer.EVENT_LEEWAY) || next.timestamp > (maxTimestamp + leeway)) {
      return false;
    }

    return true;
  }

  private matchTarget(source: CastDetails|ICastData, dest: IDamageData, allowUnknown = false) {
    const sourceId = source instanceof CastDetails ? source.targetId : source.targetID;

    // must match instance if one exists
    if (source.targetInstance && source.targetInstance !== dest.targetInstance) {
      return false;
    }

    // Must match targetId if one exists... usually
    // There's a weird bug in WCL sometimes where the cast on a target has a different target ID
    // than the damage ticks, shows up as "Unknown Actor," and isn't returned as an enemy in the summary
    // If allowUnknown === true, relax the target ID match to handle this case specifically
    // We can tell the ID is "unknown actor" if no actor name exists for it.
    if (sourceId && sourceId !== dest.targetID &&
      (!allowUnknown || this.analysis.getActorName(sourceId) !== undefined)) {
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
      return c.type === 'cast' && Spell.data[spellId].damageType !== DamageType.NONE
    });

    for (let i = instancesToCheck; i >= 0; i--) {
      const instance = this.damageData[i];
      let castIndex = 0, match = false, nextCast = this.castData[castIndex];

      do {
        if (nextCast.ability.guid === instance.ability.guid && this.matchTarget(nextCast, instance, true)) {
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
          hitPoints: 100,
          maxHitPoints: 100,
          read: false,
          spellPower: firstDamageCast?.spellPower || 0 // we really have no idea, but it should be close to this
        });
        spellIdsInferred.push(instance.ability.guid);
      }
    }
  }

  private inferCastTimestamp(damage: IDamageData) {
    const spellData = Spell.get(mapSpellId(damage.ability.guid), this.analysis.actorInfo);

    if ([DamageType.DOT, DamageType.CHANNEL].includes(spellData?.damageType)) {
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

      return Math.max(earliestInstance.timestamp - timeToTick, this.analysis.encounter.start);
    }

    return damage.timestamp;
  }
}
