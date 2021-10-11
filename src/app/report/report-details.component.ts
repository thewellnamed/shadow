import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';

@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss']
})
export class ReportDetailsComponent implements OnInit {
  logId: string;
  encounterId: number;
  playerName: string;
  form: FormGroup;
  summary: LogSummary;
  casts: CastsSummary;

  constructor(private activatedRoute: ActivatedRoute,
              private logs: LogsService) { }

  ngOnInit(): void {
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null)
    });

    this.activatedRoute.paramMap.pipe(
      switchMap((params) => {
        this.logId = params.get('logId') as string;
        this.encounterId = parseInt(params.get('encounterId') as string, 10);
        this.playerName = params.get('player') as string;

        return this.logs.getSummary(this.logId);
      }),
      switchMap((summary: LogSummary) => {
        this.summary = summary;

        this.encounter!.setValue(this.encounterId);
        this.player!.setValue(this.summary.getPlayerByName(this.playerName)!.id);

        return this.logs.getEvents(summary, this.playerName, this.encounterId);
      })
    ).subscribe((data) => {
      if (data) {
        this.casts = new CastsAnalyzer(EventAnalyzer.createCasts(data.casts, data.damage)).run();

        // eslint-disable-next-line no-console
        console.log(this.casts);
      }
    });
  }

  get encounter() {
    return this.form.get('encounter');
  }

  get player() {
    return this.form.get('player');
  }
}
