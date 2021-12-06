import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { MatSelect } from '@angular/material/select';
import { of } from 'rxjs';

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

  constructor(private route: ActivatedRoute,
              private logs: LogsService) { }

  ngOnInit() {
    this.form = new FormGroup({
      encounter: new FormControl(null),
      player: new FormControl(null),
      target: new FormControl(0)
    });

    this.encounter.valueChanges.subscribe(() => {
      this.encounterId = this.encounter.value;
      this.target.setValue(0);

      if (this.encounterId > 0) {
        // this.update();
      }
    });

    this.player.valueChanges.subscribe(() => {
      this.playerName = this.log.getActor(this.player.value)!.name;
      this.filterEncounters();

      if (this.encounters.find((e) => e.id === this.encounterId)) {
        // this.update();
      } else {
        // this.castSummary = null;
        this.encounter.setValue(null);
        this.encounterSelect.focus();
      }
    })

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.logId = params.get('logId') as string;
          this.encounterId = parseInt(params.get('encounterId') as string, 10);
          this.playerName = params.get('player') as string;

          // eslint-disable-next-line no-console
          console.log(`logId: ${this.logId}`);

          return of(null); //this.logs.getSummary(this.logId);
        })
      ).subscribe((log: LogSummary|null) => {
        //this.log = log;

        //this.encounter.setValue(this.encounterId);
        //this.player.setValue(this.log.getActorByName(this.playerName)!.id);
        //this.filterEncounters();
      });
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

  get target() {
    return this.form.get('target') as FormControl;
  }
}
