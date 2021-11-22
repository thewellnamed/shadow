import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { IHitStats, SpellSummary } from 'src/app/report/models/spell-summary';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss']
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
  stats: IHitStats;

  ngOnChanges(changes: SimpleChanges) {
    this.encounter = this.log.getEncounter(this.encounterId) as EncounterSummary;

    let casts;

    if (this.spellId) {
      this.spellSummary = this.summary.getSpellSummary(this.spellId);
      this.spellData = SpellData[this.spellId];
      this.stats = this.targetId > 0 ? this.spellSummary.targetStats(this.targetId) : this.spellSummary;

      casts = this.spellSummary.casts;
    } else {
      casts = this.summary.allCasts;
    }

    this.casts = this.targetId > 0 ?
      casts.filter((c) => c.targetId === this.targetId) :
      casts;
  }

  offsetTime(timestamp: number) {
    return this.duration(this.encounter.start, timestamp);
  }

  castTime(cast: CastDetails) {
    if (this.isChannel(cast) && cast.lastDamageTimestamp) {
      return this.duration(cast.castStart, cast.lastDamageTimestamp, false);
    }

    return this.duration(cast.castStart, cast.castEnd, false);
  }

  duration(start: number, end: number, includeMinutes = true) {
    const offset = (end - start)/1000;

    const minutes = Math.floor(offset / 60),
      secondsFloat = offset - (minutes * 60),
      seconds = Math.floor(secondsFloat),
      decimal = Math.round((secondsFloat - seconds) * 100);

    const mm = (minutes + '').padStart(2, '0'),
      ss = (seconds + '').padStart(2, '0'),
      dd = (decimal + '').padStart(2, '0').padEnd(2, '0');

    if (includeMinutes) {
      return `${mm}:${ss}.${dd}`;
    } else {
      return `${seconds}.${dd}`;
    }
  }

  round(value: number, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
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
    return this.log.getEnemyName(targetId, targetInstance);
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

  downtimeClass(cast: CastDetails) {
    const data = SpellData[cast.spellId];
    if (this.hasCooldown(cast)) {
      if (cast.timeOffCooldown > 5) {
        return 'text-warning';
      }

      if (cast.timeOffCooldown > 1) {
        return 'text-notice';
      }
    }

    if (this.isDot(cast)) {
      if (cast.dotDowntime > 5) {
        return 'text-warning';
      }

      if (cast.dotDowntime > 1) {
        return 'text-notice';
      }
    }

    return 'table-accent';
  }
}
