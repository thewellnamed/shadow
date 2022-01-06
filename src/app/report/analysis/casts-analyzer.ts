import { CastDetails } from 'src/app/report/models/cast-details';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';
import { HitType } from 'src/app/logs/models/hit-type.enum';

export class CastsAnalyzer {
  private static MAX_ACTIVE_LATENCY = 3000; // ignore "next cast latency" for gaps over 5s (not trying to chain-cast)
  private static MAX_ACTIVE_DOWNTIME = 10000; // ignore cooldown/dot downtime for gaps over 10s (movement?)
  private static EARLY_CLIP_THRESHOLD = 0.67; // clipped MF 67% of the way to the next tick
  private static MAX_GCD = 1.5;
  private static MIN_GCD = 1.0;

  private casts: CastDetails[];

  constructor(casts: CastDetails[]) {
    this.casts = casts;
  }

  public run(): CastsSummary {
    for (let i = 0; i < this.casts.length; i++) {
      const current = this.casts[i],
        spellData = SpellData[current.spellId];

      this.setImpliedGcd(current, i);

      if (spellData.damageType === DamageType.NONE || current.totalDamage === 0) {
        continue;
      }

      let prevCastData;
      switch (spellData.damageType) {
        case DamageType.DOT:
          prevCastData = this.findPreviousCast(current, i, (c) => {
            // ignore dots that didn't resist, but also didn't tick with enough time to have done so
            // happens because of weird immunities/phase transitions, e.g. on Leotheras
            const minTimeToTick = spellData.maxDuration / spellData.maxDamageInstances;
            return c.hitType !== HitType.NONE || (current.castStart - c.castEnd < minTimeToTick);
          });
          this.setDotDetails(current, prevCastData);
          break;

        case DamageType.CHANNEL:
          this.setChannelDetails(current, i);
          break;
      }

      if (spellData.cooldown > 0) {
        prevCastData = this.findPreviousCast(current, i);
        if (prevCastData.onAll) {
          const delta = current.castStart - prevCastData.onAll.castEnd;
          if ((delta - (spellData.cooldown * 1000)) <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME) {
            current.timeOffCooldown = (delta - (spellData.cooldown * 1000)) / 1000;
          }
        }
      }
    }

    return new CastsSummary(this.casts);
  }

  private setImpliedGcd(current: CastDetails, index: number) {
    if (index < this.casts.length - 1) {
      const next = this.casts[index + 1],
        delta = (next.castStart - current.castStart)/1000;

      current.impliedGcd = Math.max(Math.min(CastsAnalyzer.MAX_GCD, delta), CastsAnalyzer.MIN_GCD);
    } else if (index > 0) {
      // For the last cast use the implied GCD of the previous cast
      current.impliedGcd = this.casts[index - 1].impliedGcd;
    } else {
      current.impliedGcd = CastsAnalyzer.MAX_GCD;
    }
  }

  private setDotDetails(current: CastDetails, prevData: IPreviousCast) {
    if (!prevData?.onTarget) {
      return;
    }

    const prev = prevData.onTarget;
    const spellData = SpellData[current.spellId];

    if (prev.lastDamageTimestamp && (current.castEnd - prev.lastDamageTimestamp <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME)) {
      current.dotDowntime = (current.castEnd - prev.lastDamageTimestamp) / 1000;
    }

    const expectedDuration = prev.castEnd + (spellData.maxDuration * 1000);
    if (prev.hits < spellData.maxDamageInstances && current.castEnd <= expectedDuration) {
      current.clippedPreviousCast = true;
      current.clippedTicks = spellData.maxDamageInstances - prev.hits;
    }
  }

  private setChannelDetails(current: CastDetails, index: number) {
    if (index >= this.casts.length - 1 || current.hitType !== HitType.HIT) {
      return;
    }

    const endOfCast = current.lastDamageTimestamp || current.castEnd,
      nextCast = this.casts[index + 1],
      delta = nextCast.castStart - endOfCast;

    if (delta >= 0 && delta <= CastsAnalyzer.MAX_ACTIVE_LATENCY) {
      current.nextCastLatency = delta/1000;

      if (current.hits > 0 && current.hits < SpellData[current.spellId].maxDamageInstances && !current.truncated) {
        // find the tick period using the cast and first damage tick, which will incorporate haste
        let timeToTick = current.instances[0].timestamp - current.castEnd;

        // if we clipped very close to the next expected tick, flag the cast.
        const progressToTick = delta/timeToTick;
        current.clippedEarly = (delta < timeToTick && (progressToTick >= CastsAnalyzer.EARLY_CLIP_THRESHOLD));

        if (current.clippedEarly) {
          current.earlyClipLostDamageFactor = progressToTick;
        }
      }
    }
  }

  // find the last time this spell was cast on the same target
  private findPreviousCast(cast: CastDetails, currentIndex: number, condition?: CastPredicate): IPreviousCast {
    const prev: IPreviousCast = {};
    if (currentIndex === 0) {
      return prev;
    }

    for (let i = currentIndex - 1; i >= 0; i--) {
      const test = this.casts[i];
      if (test.spellId === cast.spellId && !this.failed(test) && (!condition || condition(test))) {
        if (!prev.onTarget && test.hasSameTarget(cast)) {
          prev.onTarget = test;
        }

        if (!prev.onAll) {
          prev.onAll = test;
        }

        if (prev.onTarget && prev.onAll) {
          return prev;
        }
      }
    }

    return prev;
  }

  private failed(cast: CastDetails) {
    return cast.hitType === HitType.RESIST || cast.hitType === HitType.IMMUNE;
  }
}

interface IPreviousCast {
  onTarget?: CastDetails;
  onAll?: CastDetails;
}

type CastPredicate = (cast: CastDetails) => boolean;
