import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { IPlayerEvents, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
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
  encounters: EncounterSummary[];
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

    this.activatedRoute.paramMap.pipe(
      switchMap((params) => {
        this.logId = params.get('logId') as string;
        this.encounterId = parseInt(params.get('encounterId') as string, 10);
        this.playerName = params.get('player') as string;

        return this.logs.getSummary(this.logId);
      }),
      switchMap((log: LogSummary) => {
        this.log = log;

        this.encounter.setValue(this.encounterId);
        this.player.setValue(this.log.getPlayerByName(this.playerName)!.id);
        this.filterEncounters();

        return this.fetchData();
      })
    ).subscribe((data) => {
      this.analyze(data);

      this.encounter.valueChanges.subscribe(() => {
        this.encounterId = this.encounter.value;
        this.target.setValue(0);

        if (this.encounterId > 0) {
          this.update();
        }
      });

      this.player.valueChanges.subscribe(() => {
        this.playerName = this.log.getPlayer(this.player.value)!.name;
        this.filterEncounters();

        if (this.encounters.find((e) => e.id === this.encounterId)) {
          this.update();
        } else {
          this.castSummary = null;
          this.encounter.setValue(null);
          this.encounterSelect.focus();
        }
      })
    });
  }

  private filterEncounters() {
    const playerId = this.player.value;
    this.encounters = playerId ?
      this.log.getPlayerEncounters(this.player.value) :
      this.log.encounters as EncounterSummary[];
  }

  private fetchData() {
    return this.logs.getEvents(this.log, this.playerName, this.encounterId);
  }

  private analyze(data: IPlayerEvents) {
    if (data) {
      this.castSummary = new CastsAnalyzer(EventAnalyzer.createCasts(data.casts, data.damage)).run();
      this.targets = this.castSummary.allTargets
        .map((id) => ({ id , name: this.log.getUnitName(id) }))
        .filter((t) => (t.name?.length || 0) > 0);

      if (this.targets.length === 1) {
        this.target.setValue(this.targets[0].id);
      }

      this.loading = false;
    }
  }

  private update() {
    this.loading = true;
    this.fetchData().subscribe((data) => {
      this.analyze(data);
    })
  }

  get encounter() {
    return this.form.get('encounter') as FormControl;
  }

  get player() {
    return this.form.get('player') as FormControl;
  }

  get target() {
    return this.form.get('target') as FormControl;
  }
}
