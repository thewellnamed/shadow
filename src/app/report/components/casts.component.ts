import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input, OnChanges,
  OnInit, SimpleChanges,
  ViewChild
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatButtonToggleChange, MatButtonToggleGroup } from '@angular/material/button-toggle';

import { CastDetails } from 'src/app/report/models/cast-details';
import { EventService } from 'src/app/event.service';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { ParamsService, ParamType } from 'src/app/params.service';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import * as StatUtils from 'src/app/report/models/stat-utils';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CastsComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() analysis: PlayerAnalysis;
  @Input() spellId: SpellId;
  @Input() highlight: StatHighlights;
  @Input() hitCounts: number[];
  @Input() casts: CastDetails[];

  @ViewChild(MatButtonToggleGroup) hasteToggle: MatButtonToggleGroup;

  visibleCasts: CastDetails[];
  spellData: ISpellData|undefined;
  spellFilter = new UntypedFormControl();
  hitCount = new UntypedFormControl(-1);
  spells: { id: string; name: string }[] = [];
  spellNames: { [id: string]: string };
  showHaste = false;

  format = StatUtils.format;
  duration = StatUtils.duration;
  latency = StatUtils.latency;

  private initialized = false;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private eventSvc: EventService,
              private params: ParamsService) {}

  ngOnInit() {
    this.initializeParams();
    this.initializeFormHandlers();
    this.filterCasts();

    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.spellId) {
      this.spellData = changes.spellId.currentValue === SpellId.NONE ?
        undefined :
        Spell.baseData(changes.spellId.currentValue);
    }

    if (changes.casts) {
      if (this.spellId === SpellId.NONE) {
        this.spellNames = this.casts.reduce((lookup, cast) => {
          if (!lookup.hasOwnProperty(cast.spellId)) {
            lookup[cast.spellId] = cast.name;
          }
          return lookup;
        }, {} as {[id: string]: string});

        this.spells = Object.keys(this.spellNames)
          .map((spellId) => ({ id: spellId, name: this.spellNames[spellId] }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }

      this.filterCasts();
    }
  }

  ngAfterViewInit() {
    this.showHaste = JSON.parse(localStorage.getItem('showCastHaste') || 'false');
    this.updateHasteToggle();

    this.eventSvc.subscribe<boolean>('showCastHaste', (e) => {
      this.showHaste = e.data;
      this.updateHasteToggle();
    });
  }

  onToggleHaste(toggle: MatButtonToggleChange) {
    const value = toggle.value === 'haste';

    if (this.showHaste !== value) {
      this.showHaste = value;
      localStorage.setItem('showCastHaste', JSON.stringify(this.showHaste));
      this.eventSvc.broadcast<boolean>('showCastHaste', this.showHaste);
    }
  }

  get filterSpells() {
    return this.spellId === SpellId.NONE;
  }

  get showStatsByHitCount() {
    return this.spellData?.statsByTick === true;
  }

  getSpellNames(spellIds: SpellId[]) {
    return spellIds.map((id) => this.spellNames[id]).join(', ');
  }

  targetName(targetId: number, targetInstance: number) {
    return this.analysis.getActorName(targetId, targetInstance);
  }

  offsetTime(timestamp: number) {
    return this.duration(timestamp - this.analysis.encounter.start);
  }

  castTime(cast: CastDetails) {
    return this.duration(cast.castTimeMs, 'S.dd');
  }

  isDamage(cast: CastDetails) {
    return Spell.baseData(cast.spellId).damageType !== DamageType.NONE;
  }

  isDot(cast: CastDetails) {
    return Spell.baseData(cast.spellId).damageType === DamageType.DOT;
  }

  isChannel(cast: CastDetails) {
    return Spell.baseData(cast.spellId).damageType === DamageType.CHANNEL;
  }

  hasCooldown(cast: CastDetails) {
    return Spell.baseData(cast.spellId).cooldown > 0;
  }

  expectHits(cast: CastDetails) {
    return ([DamageType.DOT, DamageType.CHANNEL, DamageType.AOE].includes(Spell.baseData(cast.spellId).damageType));
  }

  maxHits(cast: CastDetails) {
    const spell = Spell.baseData(cast.spellId);
    return [DamageType.DOT, DamageType.CHANNEL].includes(spell.damageType) && spell.maxDamageInstances > 0;
  }

  hits(cast: CastDetails) {
    const spellData = Spell.baseData(cast.spellId);
    let hits = cast.hits.toString();

    if (this.maxHits(cast)) {
      return `${hits}/${spellData.maxDamageInstances}`;
    }

    return hits;
  }

  haste(cast: CastDetails) {
    return cast.haste > 0 ?
      this.format(cast.haste * 100, cast.haste > 0.1 ? 0 : 1, '%') :
      '---';
  }

  iconClass(cast: CastDetails) {
    return {
      [`spell-${cast.spellId}`]: true
    };
  }

  private initializeParams() {
    if (this.params.has(ParamType.TICKS)) {
      const ticks = parseInt(this.params.get(ParamType.TICKS));
      if (ticks >= 0 && ticks <= 3) {
        this.hitCount.setValue(ticks);
      }
    }
  }

  private initializeFormHandlers() {
    this.spellFilter.valueChanges.subscribe(() => {
      this.filterCasts();
    });

    this.hitCount.valueChanges.subscribe(() => {
      if (!this.spellData?.statsByTick) {
        return;
      }

      this.eventSvc.broadcast<number>('hitCount', this.hitCount.value);
      this.filterCasts();
    });
  }

  private updateHasteToggle() {
    const value = this.showHaste ? 'haste' : 'power';
    if (this.hasteToggle.value !== value) {
      this.hasteToggle.writeValue(value);
    }
  }

  private filterCasts() {
    const filterValues = this.spellFilter.value;

    if (Array.isArray(filterValues) && filterValues.length > 0 && filterValues.length !== this.spells.length) {
      const spellIds = filterValues.map((v) => parseInt(v));
      this.visibleCasts = this.casts.filter((c) => spellIds.includes(c.spellId));
    } else {
      this.visibleCasts = this.casts;
    }

    this.changeDetectorRef.detectChanges();
  }
}
