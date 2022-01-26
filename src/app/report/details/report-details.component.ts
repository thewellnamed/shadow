import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import { Report } from 'src/app/report/models/report';
import { IEncounterEvents, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { ParamsService, ParamType } from 'src/app/params.service';
import { TabDefinitions } from 'src/app/report/details/tabs';
import { Actor } from 'src/app/logs/models/actor';
import { ICombatantInfo } from 'src/app/logs/interfaces';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { VampiricTouchSummary } from 'src/app/report/summary/vampiric-touch.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { PainSummary } from 'src/app/report/summary/pain.summary';
import { MindBlastSummary } from 'src/app/report/summary/mind-blast.summary';
import { DeathSummary } from 'src/app/report/summary/death.summary';
import { MindFlaySummary } from 'src/app/report/summary/mind-flay.summary';
import { TimelineSummary } from 'src/app/report/summary/timeline.summary';

@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailsComponent implements OnInit {
  logId: string;
  encounterId: number;
  playerName: string;
  actor: Actor;
  activeTab = 0;
  form: FormGroup;
  log: LogSummary;
  castSummary: Report | null;
  targets: { id: number; name: string }[];
  loading = true;
  tabs = TabDefinitions;

  private playerInfo: ICombatantInfo;
  private analysis: PlayerAnalysis;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private location: Location,
              private route: ActivatedRoute,
              private logs: LogsService,
              private params: ParamsService) {
  }

  ngOnInit(): void {
    this.initializeForm();

    this.route.paramMap.pipe(
      withLatestFrom(this.route.parent!.paramMap),
      switchMap(([params, parentParams]) => {
        this.logId = parentParams.get('logId') as string;
        this.playerName = params.get('player') as string;

        if (params.has('encounterId')) {
          this.encounterId = parseInt(params.get('encounterId') as string, 10);
        }

        this.loading = true;
        this.changeDetectorRef.detectChanges();

        return this.logs.getSummary(this.logId);
      }),
      switchMap((log: LogSummary) => {
        this.log = log;
        this.actor = this.log.getActorByName(this.playerName) as Actor;

        if (this.encounterId) {
          return this.logs.getPlayerInfo(log, this.actor, this.encounterId);
        } else {
          return of(null)
        }
      }),
      switchMap((playerInfo: ICombatantInfo|null) => {
        if (playerInfo) {
          this.playerInfo = playerInfo;
        }

        return this.fetchData();
      })
    ).subscribe((data) => {
      if (data) this.analyze(data);

      this.loading = false;
      this.changeDetectorRef.detectChanges();
    });
  }

  onTabChange(event: { index: number }) {
    this.activeTab = event.index;

    if (this.activeTab > 0) {
      this.params.set(ParamType.TAB, this.activeTab);
    } else {
      this.params.clear(ParamType.TAB);
    }
  }

  onTargetChange(event: { value: number }) {
    this.setTarget(event.value);
  }

  private initializeForm() {
    if (this.params.has(ParamType.TAB)) {
      const tab = parseInt(this.params.get(ParamType.TAB));
      if (tab >= 0 && tab <= 5) {
        this.activeTab = tab;
      }
    }

    const target = this.params.has(ParamType.TARGET) ? parseInt(this.params.get(ParamType.TARGET)) : 0;
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null),
      target: new FormControl(target)
    });
  }

  private fetchData() {
    if (this.encounterId > 0) {
      return this.logs.getEvents(this.log, this.playerName, this.encounterId);
    } else {
      return of(null);
    }
  }

  private analyze(events: IEncounterEvents) {
    if (events) {
      this.analysis = new PlayerAnalysis(this.log, this.encounterId, this.playerInfo, events);

      this.targets = this.analysis.targetIds
        .map((id) => ({ id , name: this.log.getActorName(id) }))
        .filter((t) => (t.name?.length || 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (this.targets.length === 1) {
        this.setTarget(this.targets[0].id);
      } else if (this.target.value && !this.analysis.targetIds.includes(this.target.value)) {
        this.setTarget(0);
      }

      const mf = new VampiricTouchSummary(this.analysis, new StatHighlights());
      // eslint-disable-next-line no-console
      console.log(mf.report());

      this.castSummary = this.analysis.report;
    }
  }

  private setTarget(targetId: number) {
    if (targetId > 0) {
      this.params.set(ParamType.TARGET, targetId);
    } else {
      this.params.clear(ParamType.TARGET);
    }

    if (this.target.value !== targetId) {
      this.target.setValue(targetId);
    }
  }

  get target() {
    return this.form.get('target') as FormControl;
  }
}
