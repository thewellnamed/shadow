import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { IEncounterEvents, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { MatSelect } from '@angular/material/select';


@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss']
})
export class ReportDetailsComponent implements OnInit {
  @ViewChild('selectEncounter') public encounterSelect: MatSelect;
  @ViewChild('selectPlayer') public playerSelect: MatSelect;

  logId: string;
  encounterId: number;
  playerName: string;
  form: FormGroup;
  log: LogSummary;
  castSummary: CastsSummary | null;
  targets: { id: number; name: string }[];
  loading = true;
  SpellId = SpellId;

  constructor(private activatedRoute: ActivatedRoute,
              private logs: LogsService) { }

  ngOnInit(): void {
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null),
      target: new FormControl(0)
    });
  }

  private fetchData() {
    return this.logs.getEvents(this.log, this.playerName, this.encounterId);
  }

  private analyze(data: IEncounterEvents) {
    if (data) {
      const events = new EventAnalyzer(this.log, this.encounterId, data).createCasts();
      this.castSummary = new CastsAnalyzer(events).run();

      this.targets = this.castSummary.targetIds
        .map((id) => ({ id , name: this.log.getActorName(id) }))
        .filter((t) => (t.name?.length || 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (this.targets.length === 1) {
        this.target.setValue(this.targets[0].id);
      }

      this.loading = false;
    }
  }

  get target() {
    return this.form.get('target') as FormControl;
  }
}
