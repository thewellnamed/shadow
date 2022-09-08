import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { switchMap, withLatestFrom } from 'rxjs/operators';

import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { ParamsService } from 'src/app/params.service';
import { NavigationType } from 'src/app/navigation-type.enum';

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
  playerId: string;
  form: UntypedFormGroup;
  log: LogSummary;

  constructor(private router: Router,
              private route: ActivatedRoute,
              private logs: LogsService,
              private params: ParamsService) {}

  ngOnInit() {
    this.form = new UntypedFormGroup({
      encounter: new UntypedFormControl(null),
      player: new UntypedFormControl(null),
      target: new UntypedFormControl(0)
    });

    this.route.paramMap.pipe(
      withLatestFrom(this.route.firstChild!.paramMap),
      switchMap(([params, detailsParams]) => {
        this.logId = params.get('logId') as string;
        this.encounterId = parseInt(detailsParams.get('encounterId') as string, 10);
        this.playerId = detailsParams.get('player') as string;

        return this.logs.getSummary(this.logId);
      })
    ).subscribe((log: LogSummary) => {
      this.log = log;

      this.encounter.setValue(this.encounterId);
      this.player.setValue(this.log.getActorByRouteId(this.playerId)!.id);
      this.filterEncounters();
      this.handleFormUpdates();
    });
  }

  private updateDetails(navType: NavigationType) {
    const route = this.encounterId > 0 ? [this.playerId, this.encounterId] : [this.playerId];
    this.router.navigate(route, {
      relativeTo: this.route,
      queryParams: this.params.forNavigation(navType)
    });
  }

  private filterEncounters() {
    const playerId = this.player.value;
    this.encounters = playerId ?
      this.log.getActorEncounters(this.player.value) :
      this.log.encounters as EncounterSummary[];
  }

  private handleFormUpdates() {
    this.encounter.valueChanges.subscribe(() => {
      this.encounterId = this.encounter.value;
      if (this.encounterId > 0) {
        this.updateDetails(NavigationType.ENCOUNTER);
      }
    });

    this.player.valueChanges.subscribe(() => {
      this.playerId = this.log.getActor(this.player.value)!.name;

      this.filterEncounters();

      if (!this.encounters.find((e) => e.id === this.encounterId)) {
        this.encounterId = -1;
        setTimeout(() => {
          this.encounter.setValue(undefined);
          this.encounterSelect.focus();
        }, 10);
      }

      this.updateDetails(NavigationType.PLAYER);
    });
  }

  get encounter() {
    return this.form.get('encounter') as UntypedFormControl;
  }

  get player() {
    return this.form.get('player') as UntypedFormControl;
  }
}
