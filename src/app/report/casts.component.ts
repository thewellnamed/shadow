import { Component, Input, OnInit } from '@angular/core';
import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

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
    const offset = (timestamp - this.encounter.start)/1000;

    const minutes = Math.floor(offset / 60),
      secondsFloat = offset - (minutes * 60),
      seconds = Math.floor(secondsFloat),
      decimal = Math.round((secondsFloat - seconds) * 100);

    const mm = (minutes + '').padStart(2, '0'),
      ss = (seconds + '').padStart(2, '0'),
      dd = (decimal + '').padStart(2, '0').padEnd(2, '0');

    return `${mm}:${ss}.${dd}`;
  }

  iconClass(cast: CastDetails) {
    return {
      [`spell-${cast.spellId}`]: true
    };
  }

  target(targetId: number, targetInstance: number) {
    return this.summary.getEnemyName(targetId, targetInstance);
  }
}
