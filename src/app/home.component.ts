import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';

import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  @ViewChild('selectEncounter') public encounterSelect: MatSelect;
  @ViewChild('selectPlayer') public playerSelect: MatSelect;
  public summary: LogSummary|undefined;
  public form: FormGroup;
  public searching = false;
  public encounters: EncounterSummary[];

  private logId?: string;

  constructor(private logs: LogsService,
              private router: Router) {
    this.form = new FormGroup({
      log: new FormControl(null, this.validateLogId),
      encounter: new FormControl({ value: null, disabled: true }),
      player: new FormControl({ value: null, disabled: true })
    });
  }

  ngOnInit() {
    this.player.valueChanges.subscribe(() => {
      this.filterEncounters();
    })
  }

  get log() {
    return this.form.get('log');
  }

  get encounter() {
    return this.form.get('encounter') as FormControl;
  }

  get player() {
    return this.form.get('player') as FormControl;
  }

  validateLogId = (control: AbstractControl): ValidationErrors | null => {
    if (control.dirty && this.logs.extractLogId(control.value) === null) {
      return { 'invalid': true };
    }

    return null;
  }

  loadReport() {
    const logId = this.logs.extractLogId(this.log?.value);
    if (!logId) {
      return;
    }

    this.searching = true;
    this.logs.getSummary(logId).subscribe({
      next: (summary) => {
        this.searching = false;
        this.logId = logId;

        this.summary = summary;

        this.log?.markAsPristine();

        this.encounter.enable();
        this.player.enable();

        if (summary.shadowPriests.length === 1) {
          this.player.setValue(summary.shadowPriests[0].id);
          this.encounterSelect.focus();
        } else {
          this.playerSelect.focus();
        }

        this.filterEncounters();
      },
      error: (err: string) => {
        this.searching = false;
        this.logId = undefined;

        this.summary = undefined;
        this.log?.setErrors({ wcl: err });
        this.log?.markAsTouched();
      }
    });
  }

  get formComplete() {
    return this.summary && this.encounter?.value && this.player?.value;
  }

  analyze(event: Event) {
    event.preventDefault();
    const player = this.summary?.getActor(this.player?.value);

    this.router.navigateByUrl(`report/${this.logId}/${player?.routeId}/${this.encounter?.value}`);
  }

  private filterEncounters() {
    const playerId = this.player.value;
    this.encounters = playerId ?
      this.summary!.getActorEncounters(this.player.value) :
      this.summary?.encounters as EncounterSummary[];
  }
}
