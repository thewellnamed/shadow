import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellStats } from 'src/app/report/models/spell-stats';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CastsComponent implements OnChanges  {
  @Input() log: LogSummary;
  @Input() summary: CastsSummary;
  @Input() encounterId: number;
  @Input() targetId: number;
  @Input() spellId: SpellId;

  casts: CastDetails[];
  spellData: ISpellData;
  spellSummary: SpellSummary;
  encounter: EncounterSummary;
  stats?: SpellStats;

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (!this.spellId) {
      this.spellId = SpellId.NONE;
    }

    this.encounter = this.log.getEncounter(this.encounterId) as EncounterSummary;
    let stats: SpellStats;

    if (this.spellId > SpellId.NONE) {
      this.spellData = SpellData[this.spellId];
      this.spellSummary = this.summary.getSpellSummary(this.spellId);
      stats = this.spellSummary;
    } else {
      stats = this.summary.stats;
    }

    this.stats = this.targetId ? stats.targetStats(this.targetId) : stats;
    this.casts = this.stats?.casts || [];
    this.changeDetectorRef.detectChanges();
  }

  get summaryStats() {
    return this.spellId === SpellId.NONE;
  }

  offsetTime(timestamp: number) {
    return this.duration(timestamp - this.encounter.start);
  }

  castTime(cast: CastDetails) {
    if (this.isChannel(cast) && cast.lastDamageTimestamp) {
      return this.duration(cast.lastDamageTimestamp - cast.castStart, 'S.dd');
    }

    return this.duration(cast.castEnd - cast.castStart, 'S.dd');
  }

  duration(lengthMs: number, format = 'mm:ss.dd') {
    const offset = lengthMs/1000;

    const minutes = Math.floor(offset / 60),
      secondsFloat = offset - (minutes * 60),
      seconds = Math.floor(secondsFloat),
      decimal = Math.round((secondsFloat - seconds) * 100);

    const values: any = {
      M: minutes,
      mm: (minutes + '').padStart(2, '0'),
      S: seconds,
      ss: (seconds + '').padStart(2, '0'),
      dd: (decimal + '').padStart(2, '0').padEnd(2, '0')
    };

    let out = format;
    for (const key in values) {
      out = out.replace(key, values[key]);
    }

    return out;
  }

  activeDps(stats: SpellStats) {
    return this.round((stats.totalDamage * 1000) / stats.activeDuration);
  }

  powerMetric(stats: SpellStats) {
    const duration = stats.activeDuration,
      dps = (stats.totalDamage * 1000) / duration;

    return this.round(dps / stats.avgSpellpower, 3);
  }

  round(value: number, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  isDamage(cast: CastDetails) {
    return SpellData[cast.spellId].damageType !== DamageType.NONE;
  }

  isDot(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT;
  }

  isChannel(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL;
  }

  hasCooldown(cast: CastDetails) {
    return SpellData[cast.spellId].cooldown > 0;
  }

  expectedTicks(cast: CastDetails) {
    return SpellData[cast.spellId].maxDamageInstances;
  }

  iconClass(cast: CastDetails) {
    return {
      [`spell-${cast.spellId}`]: true
    };
  }

  targetName(targetId: number, targetInstance: number) {
    return this.log.getUnitName(targetId, targetInstance);
  }

  statusClass(cast: CastDetails) {
    const data = SpellData[cast.spellId];

    if (this.isDot(cast) && cast.clippedPreviousCast) {
      return 'warning';
    }

    if (cast.spellId === SpellId.MIND_FLAY && cast.ticks < 2) {
      return 'warning';
    }

    if (cast.timeOffCooldown > 5 || cast.dotDowntime > 5) {
      return 'warning';
    }

    if (this.isDot(cast) && cast.ticks < data.maxDamageInstances) {
      return 'notice';
    }

    if (this.isChannel(cast) && cast.nextCastLatency > 1) {
      return 'notice';
    }

    if (cast.timeOffCooldown > 1 || cast.dotDowntime > 1) {
      return 'notice';
    }

    return 'normal';
  }

  tickClass(cast: CastDetails) {
    const data = SpellData[cast.spellId];

    if (cast.spellId === SpellId.MIND_FLAY && cast.ticks < 2) {
      return 'text-warning';
    }

    if (cast.spellId !== SpellId.MIND_FLAY && cast.ticks < data.maxDamageInstances) {
      return 'text-notice';
    }

    return 'table-accent';
  }

  latencyClass(latency: number) {
    if (latency >= 1) {
      return 'text-warning';
    }

    if (latency >= 0.3) {
      return 'text-notice';
    }

    return 'table-accent';
  }

  clipClass(missedPercent: number) {
    if (missedPercent >= 0.02) {
      return 'text-warning';
    }

    if (missedPercent > 0) {
      return 'text-notice';
    }

    return 'table-accent';
  }

  downtimeClass(downtime: number) {
    if (downtime > 5) {
      return 'text-warning';
    }

    if (downtime >= 2) {
      return 'text-notice';
    }

    return 'table-accent';
  }
}
