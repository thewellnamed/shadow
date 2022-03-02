import { CastDetails } from 'src/app/report/models/cast-details';
import { Report } from 'src/app/report/models/report';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { HitType } from 'src/app/logs/models/hit-type.enum';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class CastsAnalyzer {
  private static MAX_LATENCY = 1000; // ignore latency for gaps large enough to represent intentional movement
  private static MAX_ACTIVE_DOWNTIME = 10000; // ignore cooldown/dot downtime for gaps over 10s
  private static EARLY_CLIP_THRESHOLD = 0.67; // clipped MF 67% of the way to the next tick

  private analysis: PlayerAnalysis;
  private casts: CastDetails[];

  constructor(analysis: PlayerAnalysis, casts: CastDetails[]) {
    this.analysis = analysis;
    this.casts = casts;
  }

  public run(): Report {
    for (let i = 0; i < this.casts.length; i++) {
      const current = this.casts[i],
        spellData = Spell.get(current.spellId, this.analysis.actorInfo);
      let prevCastData;

      this.setCastLatency(current, spellData, i);

      if (spellData.cooldown > 0) {
        prevCastData = this.findPreviousCast(current, i);
        if (prevCastData.onAll) {
          const delta = current.castStart - prevCastData.onAll.castEnd;
          if ((delta - (spellData.cooldown * 1000)) <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME) {
            current.timeOffCooldown = (delta - (spellData.cooldown * 1000)) / 1000;
          }
        }
      }

      if (spellData.damageType === DamageType.NONE || current.resisted) {
        continue;
      }

      switch (spellData.damageType) {
        case DamageType.DOT:
          prevCastData = this.findPreviousCast(current, i, (c) => {
            // ignore dots that didn't resist, but also didn't tick with enough time to have done so
            // happens because of weird immunities/phase transitions, e.g. on Leotheras
            const minTimeToTick = spellData.maxDuration / spellData.maxDamageInstances;
            return c.hitType !== HitType.NONE || (current.castStart - c.castEnd < minTimeToTick);
          });
          this.setDotDetails(current, spellData, prevCastData);
          break;

        case DamageType.CHANNEL:
          this.setChannelDetails(current, spellData, i);
          break;
      }
    }

    return new Report(this.analysis, this.casts);
  }

  private setCastLatency(current: CastDetails, spellData: ISpellData, index: number) {
    // ignore for off-GCD spells, last cast
    if (index > this.casts.length - 2 || !spellData.gcd) {
      return;
    }

    const next = this.casts[index + 1], gcd = current.gcd * 1000;
    const castTime = current.castTimeMs > gcd ? current.castTimeMs : gcd;

    const latency = Math.max(next.castStart - (current.castStart + castTime), 0);
    if (latency >= 0 && latency <= CastsAnalyzer.MAX_LATENCY) {
      current.nextCastLatency = latency/1000;
    }
  }

  private setDotDetails(current: CastDetails, spellData: ISpellData, prevData: IPreviousCast) {
    if (!prevData?.onTarget) {
      return;
    }

    const prev = prevData.onTarget;

    if (prev.lastDamageTimestamp && (current.castEnd - prev.lastDamageTimestamp <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME)) {
      current.dotDowntime = Math.max((current.castEnd - prev.lastDamageTimestamp) / 1000, 0);
    }

    const expectedDuration = prev.castEnd + (spellData.maxDuration * 1000);
    if (prev.hits < spellData.maxDamageInstances && current.castEnd <= expectedDuration) {
      current.clippedPreviousCast = true;
      current.clippedTicks = spellData.maxDamageInstances - prev.hits;
    }
  }

  private setChannelDetails(current: CastDetails, spellData: ISpellData, index: number) {
    // other clipping casts require the next cast to evaluate
    if (index > this.casts.length - 2 || current.truncated) {
      return;
    }

    // Check for other early clipping cases
    if (current.hits < spellData.maxDamageInstances) {
      let timeToTick: number, castEnd: number;

      // prefer to use actual timestamps to evaluate tick time, over haste
      // just because it avoids some annoying rounding issues and timestamps being off a few ms
      if (current.instances.length > 0) {
        timeToTick = current.instances[0].timestamp - current.castEnd;
        castEnd = current.lastDamageTimestamp!;
      } else {
        timeToTick = (1 / (1 + current.haste)) * 1000;
        castEnd = current.castEnd;
      }

      const delta = this.casts[index + 1].castStart - castEnd;

      // if we clipped very close to the next expected tick, flag the cast.
      if (delta < timeToTick) {
        const progressToTick = delta/timeToTick;
        current.clippedEarly = (progressToTick >= CastsAnalyzer.EARLY_CLIP_THRESHOLD);

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
