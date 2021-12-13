import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { switchMap, withLatestFrom } from 'rxjs/operators';

import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

@Component({
  selector: 'report',
  templateUrl: './report-wrapper.component.html',
  styleUrls: ['./report-wrapper.component.scss']
})
export class ReportWrapperComponent implements OnInit {
  @ViewChild('selectEncounter') public encounterSelect: MatSelect;
  @ViewChild('selectPlayer') public playerSelect: MatSelect;

  logId: string;
  encounterId: number;
  encounters: EncounterSummary[];
  playerName: string;
  form: FormGroup;
  log: LogSummary;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private logs: LogsService) {}

  ngOnInit() {
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null),
      target: new FormControl(0)
    });

    this.encounter.valueChanges.subscribe(() => {
      this.encounterId = this.encounter.value;

      if (this.encounterId > 0) {
        this.updateDetails();
      }
    });

    this.player.valueChanges.subscribe(() => {
      this.playerName = this.log.getActor(this.player.value)!.name;
      this.filterEncounters();

      if (this.encounters.find((e) => e.id === this.encounterId)) {
        this.updateDetails();
      } else {
        this.encounter.setValue(null);
        this.encounterSelect.focus();
      }
    })

    this.route.paramMap.pipe(
      withLatestFrom(this.route.firstChild!.paramMap),
      switchMap(([params, detailsParams]) => {
        this.logId = params.get('logId') as string;
        this.encounterId = parseInt(detailsParams.get('encounterId') as string, 10);
        this.playerName = detailsParams.get('player') as string;

        return this.logs.getSummary(this.logId);
      })
    ).subscribe((log: LogSummary) => {
      this.log = log;

      this.encounter.setValue(this.encounterId);
      this.player.setValue(this.log.getActorByName(this.playerName)!.id);
      this.filterEncounters();
    });
  }

  private updateDetails() {
    this.router.navigate([this.playerName, this.encounterId], { relativeTo: this.route });
  }

  private filterEncounters() {
    const playerId = this.player.value;
    this.encounters = playerId ?
      this.log.getActorEncounters(this.player.value) :
      this.log.encounters as EncounterSummary[];
  }

  get encounter() {
    return this.form.get('encounter') as FormControl;
  }

  get player() {
    return this.form.get('player') as FormControl;
  }
}
