import { CastsSummary } from 'src/app/report/models/casts-summary';
import { CastDetails } from 'src/app/report/models/cast-details';
import { ICastData, IDamageData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellData } from 'src/app/logs/models/spell-data';
import { DamageInstance } from 'src/app/report/models/damage-instance';
import { LogSummary } from 'src/app/logs/models/log-summary';

export class EventAnalyzer {
  private static EVENT_LEEWAY = 50 // ms. allow damage to occur just slightly later than "should" be possible given
                                   // strict debuff times. Blah blah server doesn't keep time exactly.

  log: LogSummary;
  castData: ICastData[];
  damageData: IDamageData[];

  constructor(log: LogSummary, castData: ICastData[], damageData: IDamageData[]) {
    this.log = log;
    this.castData = castData;
    this.damageData = damageData;
  }

  /**
   * Generate basic data on casts
   * @param {LogSummary} log
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {CastsSummary}
   */
  public createCasts(): CastDetails[] {
    let currentCast: ICastData, startingCast: ICastData|null = null;
    let nextCast: ICastData|null, nextDamage: IDamageData|null;
    const casts: CastDetails[] = [];

    const damageBySpell: {[spellId: number]: IDamageData[]} = {
      [SpellId.DEATH]: [],
      [SpellId.PAIN]: [],
      [SpellId.MIND_BLAST]: [],
      [SpellId.MIND_FLAY]: [],
      [SpellId.VAMPIRIC_TOUCH]: []
    };

    // partition damage data by spell ID to make it easier
    // to associate instances of damage with casts.
    for (const event of this.damageData) {
      if (damageBySpell.hasOwnProperty(event.ability.guid)) {
        damageBySpell[event.ability.guid].push(event);
      }
    }

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

      const spellId = currentCast.ability.guid;
      const details = new CastDetails({
        ability: currentCast.ability,
        targetId: currentCast.targetID,
        targetInstance: currentCast.targetInstance,
        castStart: startingCast?.timestamp || currentCast.timestamp,
        castEnd: currentCast.timestamp,
        spellPower: currentCast.spellPower
      });
      casts.push(details);

      if (damageBySpell.hasOwnProperty(spellId)) {
        const damageEvents = damageBySpell[spellId];
        const spellData = SpellData[spellId];

        // for dots, we need to associate damage ticks with the appropriate cast
        // we know how far into the future this cast could tick, but we need to
        // look for a future cast on the same target, because the current cast can only
        // be responsible for ticks up until the next cast on a given target
        if (spellData.maxDamageInstances > 1) {
          let i = 0;
          let maxDamageTimestamp = currentCast.timestamp + (spellData.maxDuration * 1000);
          let instances: DamageInstance[] = [];

          do {
            nextCast = this.castData.length > i ? this.castData[i] : null;
            if (nextCast === null || this.castIsReplacement(details, nextCast)) {
              maxDamageTimestamp = nextCast?.timestamp || maxDamageTimestamp;
              break;
            }
            i++;
          } while (nextCast.timestamp <= maxDamageTimestamp + EventAnalyzer.EVENT_LEEWAY);

          // Process damage instances for this spell within the window
          nextDamage = damageEvents[0];
          let count = 0;
          i = 0;
          while (nextDamage && count < spellData.maxDamageInstances) {
            if (this.matchDamage(details, nextDamage, maxDamageTimestamp)) {
              instances.push(new DamageInstance(nextDamage));
              nextDamage.read = true;
              count++;
            }

            nextDamage = damageEvents[++i];
          }
          details.setInstances(instances);
        } else {
          // find the next instance of damage for this spell for this target.
          const damage = damageEvents.find((d) => this.matchDamage(details, d, details.castEnd));

          if (damage) {
            details.setInstances([new DamageInstance((damage))]);
            damage.read = true;
          }
        }

        // prune read events
        // this is probably unnecessary given the small size of these arrays, but whatever.
        nextDamage = damageEvents[0];
        while (nextDamage && nextDamage.read) {
          damageEvents.shift();
          nextDamage = damageEvents[0];
        }
      }
    }

    return casts;
  }

  // next replaces the current cast if ALL of these conditions are true
  // -- the cast completed (type is 'cast', not 'begincast')
  // -- on the same kind of mob (targetID)
  // -- on the same instance of that mob (e.g. in WCL "Spellbinder 3" is a different instance from "Spellbinder 2"
  private castIsReplacement(cast: CastDetails, next: ICastData) {
    return next.type === 'cast' &&
      next.ability.guid === cast.spellId &&
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
    if (next.targetID !== cast.targetId && this.log.getUnitName(cast.targetId) !== undefined) {
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
}
