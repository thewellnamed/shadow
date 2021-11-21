import { Component, Input, OnInit } from '@angular/core';
import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss']
})
export class CastsComponent implements OnInit  {
  @Input() summary: LogSummary;
  @Input() encounterId: number;
  @Input() list: CastDetails[];

  encounter: EncounterSummary;

  ngOnInit() {
    this.encounter = this.summary.getEncounter(this.encounterId) as EncounterSummary;
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

  target(targetId: number, targetInstance: number) {
    return this.summary.getEnemyName(targetId, targetInstance);
  }

  statusClass(cast: CastDetails) {
    const data = SpellData[cast.spellId];

    if (this.isDot(cast) && cast.clippedPreviousCast) {
      return 'warning';
    }

    if (cast.spellId === SpellId.MIND_FLAY && cast.ticks < 2) {
      return 'warning';
    }

    if (data.maxDamageInstances > 1 && cast.ticks < data.maxDamageInstances && cast.spellId !== SpellId.MIND_FLAY) {
      return 'notice';
    }

    if (this.isChannel(cast) && cast.nextCastLatency > 1) {
      return 'notice';
    }

    if (cast.timeOffCooldown > 5 || cast.dotDowntime > 5) {
      return 'notice';
    }

    return 'normal';
  }

  tickClass(cast: CastDetails) {
    const data = SpellData[cast.spellId];

    if (cast.ticks < data.maxDamageInstances) {
      return 'text-notice';
    }

    return 'table-accent';
  }
}
