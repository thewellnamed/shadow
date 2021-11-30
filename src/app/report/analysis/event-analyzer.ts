import { CastsSummary } from 'src/app/report/models/casts-summary';
import { CastDetails } from 'src/app/report/models/cast-details';
import { ICastData, IDamageData } from 'src/app/logs/logs.service';
import { mapSpellId, SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { DamageInstance } from 'src/app/report/models/damage-instance';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

export class EventAnalyzer {
  private static EVENT_LEEWAY = 50 // ms. allow damage to occur just slightly later than "should" be possible given
                                   // strict debuff times. Blah blah server doesn't keep time exactly.

  log: LogSummary;
  encounter: EncounterSummary;
  castData: ICastData[];
  damageData: IDamageData[];
  damageBySpell: {[spellId: number]: IDamageData[]};

  constructor(log: LogSummary, encounterId: number, castData: ICastData[], damageData: IDamageData[]) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.castData = castData;
    this.damageData = damageData;
  }

  /**
   * Compile WCL events into Casts suitable for analysis
   * @param {LogSummary} log
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {CastsSummary}
   */
  public createCasts(): CastDetails[] {
    let currentCast: ICastData, startingCast: ICastData|null = null;
    let nextCast: ICastData|null, nextDamage: IDamageData|null;
    const casts: CastDetails[] = [];

    // sometimes casts that start before combat begins for the logger are omitted,
    // but the damage is recorded. In that case, infer the cast...
    this.finesseMissingFirstCast();

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
    this.damageBySpell = {
      [SpellId.DEATH]: [],
      [SpellId.PAIN]: [],
      [SpellId.MIND_BLAST]: [],
      [SpellId.MIND_FLAY]: [],
      [SpellId.VAMPIRIC_TOUCH]: [],
      [SpellId.MELEE]: []
    };

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
      if (actor && nextDamage.sourceID === actor.shadowFiendId) {
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
      if (nextCast === null || this.castIsReplacement(cast, nextCast)) {
        maxDamageTimestamp = nextCast?.timestamp || maxDamageTimestamp;
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
        instances.push(new DamageInstance(nextDamage));
        nextDamage.read = true;
        count++;
      }

      nextDamage = events[++i];
    }
    cast.setInstances(instances);
  }

  // next replaces the current cast if ALL of these conditions are true
  // -- the cast completed (type is 'cast', not 'begincast')
  // -- on the same kind of mob (targetID)
  // -- on the same instance of that mob (e.g. in WCL "Spellbinder 3" is a different instance from "Spellbinder 2"
  private castIsReplacement(cast: CastDetails, next: ICastData) {
    return next.type === 'cast' &&
      mapSpellId(next.ability.guid) === cast.spellId &&
      next.targetID === cast.targetId &&
      next.targetInstance === cast.targetInstance;
  }

  private matchDamage(cast: CastDetails, next: IDamageData, maxTimestamp: number) {
    if (next.read || next.targetInstance !== cast.targetInstance) {
      return false;
    }

    // There's a weird bug in WCL sometimes where the cast on a target has a different target ID
    // than the damage ticks, shows up as "Unknown Actor," and isn't returned as an enemy in the summary
    // since we're already matching against spell ID and timestamp, I think it's OK to relax the check
    // on targetID if and only if the instance matches and the target name doesn't exist
    if (next.targetID !== cast.targetId && this.log.getActorName(cast.targetId) !== undefined) {
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

  // sometimes casts that start before combat begins for the logger are omitted,
  // but the damage is recorded. In that case, infer the cast...
  private finesseMissingFirstCast() {
    const firstCast = this.castData.find((c) => {
      const spellId = mapSpellId(c.ability.guid);
      return c.type === 'cast' && SpellData[spellId].damageType !== DamageType.NONE
    });

    if (this.damageData.length > 0 && firstCast) {
      const firstDamage = this.damageData[0];

      if (firstDamage.timestamp < firstCast.timestamp) {
        this.castData.unshift({
          type: 'cast',
          ability: firstDamage.ability,
          timestamp: this.inferCastTimestamp(firstDamage),
          sourceID: firstDamage.sourceID,
          targetID: firstDamage.targetID,
          targetInstance: firstDamage.targetInstance,
          read: false,
          spellPower: firstCast.spellPower // we really have no idea, but it should be close to this almost always
        })
      }
    }
  }

  private inferCastTimestamp(damage: IDamageData) {
    const spellData = SpellData[mapSpellId(damage.ability.guid)];

    if (spellData.maxDamageInstances > 1) {
      return Math.max(
        damage.timestamp - ((spellData.maxDuration / spellData.maxDamageInstances) * 1000),
        this.encounter.start
      );
    }

    return damage.timestamp;
  }
}
