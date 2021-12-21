import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { switchMap, withLatestFrom } from 'rxjs/operators';

import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { IEncounterEvents, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { ParamsService, ParamType } from 'src/app/params.service';

@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailsComponent implements OnInit {
  @ViewChild('selectEncounter') public encounterSelect: MatSelect;
  @ViewChild('selectPlayer') public playerSelect: MatSelect;

  logId: string;
  encounterId: number;
  playerName: string;
  activeTab = 0;
  form: FormGroup;
  log: LogSummary;
  castSummary: CastsSummary | null;
  targets: { id: number; name: string }[];
  loading = true;
  SpellId = SpellId;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private location: Location,
              private route: ActivatedRoute,
              private logs: LogsService,
              private params: ParamsService) {
  }

  ngOnInit(): void {
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null),
      target: new FormControl(0)
    });

    if (this.params.has(ParamType.TAB)) {
      const tab = parseInt(this.params.get(ParamType.TAB) as string);
      if (tab >= 0 && tab <= 5) {
        this.activeTab = tab;
      }
    }

    this.route.paramMap.pipe(
      withLatestFrom(this.route.parent!.paramMap),
      switchMap(([params, parentParams]) => {
        this.logId = parentParams.get('logId') as string;
        this.encounterId = parseInt(params.get('encounterId') as string, 10);
        this.playerName = params.get('player') as string;

        this.loading = true;
        this.changeDetectorRef.detectChanges();

        return this.logs.getSummary(this.logId);
      }),
      switchMap((log: LogSummary) => {
        this.log = log;
        return this.fetchData();
      })
    ).subscribe((data) => {
      this.analyze(data);
    });
  }

  onTabChange(event: { index: number }) {
    this.activeTab = event.index;
    this.params.set(ParamType.TAB, this.activeTab);
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
      } else {
        this.target.setValue(null);
      }

      this.loading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  get target() {
    return this.form.get('target') as FormControl;
  }
}
