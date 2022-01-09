import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { FormControl } from '@angular/forms';

import { CastDetails } from 'src/app/report/models/cast-details';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { ParamsService, ParamType } from 'src/app/params.service';

@Component({
  selector: 'casts',
  templateUrl: './casts.component.html',
  styleUrls: ['./casts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CastsComponent implements OnInit, OnChanges  {
  @Input() log: LogSummary;
  @Input() summary: CastsSummary;
  @Input() encounterId: number;
  @Input() targetId: number;
  @Input() spellId: SpellId;

  casts: CastDetails[];
  spellData: ISpellData;
  spellSummary: SpellSummary;
  encounter: EncounterSummary;
  highlight = new StatHighlights();
  spellFilter = new FormControl();
  hitCount = new FormControl(-1);
  spells: { id: string; name: string }[] = [];
  spellNames: { [id: string]: string };
  hitCounts: number[] = [];
  stats?: SpellStats;

  private allCasts: CastDetails[];
  private initialized = false;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private params: ParamsService) {}

  ngOnInit() {
    if (!this.spellId) {
      this.spellId = SpellId.NONE;
    }

    this.initializeParams();
    this.initializeFormHandlers();
    this.updateStats(this.getBaseStats());

    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.encounterId && changes.encounterId.currentValue !== changes.encounterId.previousValue) {
      this.encounter = this.log.getEncounter(this.encounterId) as EncounterSummary;
    }

    if (this.initialized) {
      this.updateStats(this.getBaseStats());
    }
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
      if (!this.spellSummary?.hasStatsByHitCount()) {
        return;
      }

      let stats: SpellStats;
      if (this.hitCount.value < 0) {
        stats = this.spellSummary;
        this.params.clear(ParamType.TICKS);
      } else {
        stats = this.spellSummary.statsByHitCount(this.hitCount.value);
        this.params.set(ParamType.TICKS, this.hitCount.value);
      }

      this.updateStats(stats);
    });
  }

  private updateStats(stats: SpellStats) {
    this.stats = this.targetId ? stats.targetStats(this.targetId) : stats;
    this.allCasts = this.stats?.casts || [];

    if (this.spellId === SpellId.NONE) {
      this.spellNames = this.allCasts.reduce((lookup, cast) => {
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
    this.changeDetectorRef.detectChanges();
  }

  private getBaseStats() {
    let stats: SpellStats;
    if (this.spellId > SpellId.NONE) {
      this.spellData = SpellData[this.spellId];
      this.spellSummary = this.summary.getSpellSummary(this.spellId);

      const hitStats = this.targetId ? this.spellSummary.targetStats(this.targetId) : this.spellSummary;
      this.hitCounts = hitStats?.hitCounts || [];

      if (this.spellSummary.hasStatsByHitCount() && this.hitCount.value > -1) {
        if (this.hitCounts.includes(parseInt(this.hitCount.value))) {
          stats = this.spellSummary.statsByHitCount(this.hitCount.value);
        } else {
          stats = this.spellSummary;
          this.hitCount.setValue('-1');
        }
      } else {
        stats = this.spellSummary;
      }
    } else {
      stats = this.summary.stats;
    }

    return stats;
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

  duration(lengthMs: number, format = 'mm:ss.dd') {
    const offset = lengthMs/1000;

    let minutes = Math.floor(offset / 60),
      secondsFloat = offset - (minutes * 60),
      seconds = Math.floor(secondsFloat),
      decimal = Math.round((secondsFloat - seconds) * 100);

    if (decimal === 100) {
      decimal = 0;
      seconds++;
    }

    const values: any = {
      M: minutes,
      mm: (minutes + '').padStart(2, '0'),
      S: seconds,
      ss: (seconds + '').padStart(2, '0'),
      dd: (decimal + '').padStart(2, '0').padEnd(2, '0')
    };

    let out = format;
    for (const key in values) {
      out = out.replace(key, values[key]);
    }

    return out;
  }

  format(value: number|undefined, decimals = 1, suffix = '') {
    if (value === undefined) {
      return '---';
    }

    const factor = 10 ** decimals;
    return (Math.round(value * factor) / factor) + suffix;
  }

  targetName(targetId: number, targetInstance: number) {
    return this.log.getActorName(targetId, targetInstance);
  }

  offsetTime(timestamp: number) {
    return this.duration(timestamp - this.encounter.start);
  }

  castTime(cast: CastDetails) {
    return this.duration(cast.castTime, 'S.dd');
  }

  isDamage(cast: CastDetails) {
    return SpellData[cast.spellId].damageType !== DamageType.NONE;
  }

  isDot(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT;
  }

  isChannel(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL;
  }

  hasCooldown(cast: CastDetails) {
    return SpellData[cast.spellId].cooldown > 0;
  }

  expectHits(cast: CastDetails) {
    return ([DamageType.DOT, DamageType.CHANNEL, DamageType.AOE].includes(SpellData[cast.spellId].damageType));
  }

  maxHits(cast: CastDetails) {
    return ([DamageType.DOT, DamageType.CHANNEL].includes(SpellData[cast.spellId].damageType));
  }

  hits(cast: CastDetails) {
    const spellData = SpellData[cast.spellId];
    let hits = cast.hits.toString();

    if (this.maxHits(cast)) {
      return `${hits}/${spellData.maxDamageInstances}`;
    }

    return hits;
  }

  activeDps(stats: SpellStats) {
    return this.format((stats.totalDamage * 1000) / stats.activeDuration);
  }

  powerMetric(stats: SpellStats) {
    const duration = stats.activeDuration,
      dps = (stats.totalDamage * 1000) / duration;

    return this.format(dps / stats.avgSpellpower, 3);
  }

  iconClass(cast: CastDetails) {
    return {
      [`spell-${cast.spellId}`]: true
    };
  }

  lostChannelDps(stats: SpellStats, format = true): string|number {
    if (stats.channelStats.totalClippedDamage > 0) {
      const lostDpsEstimate = stats.channelStats.totalClippedDamage / this.encounter.durationSeconds
      return format ? ('~' + this.format(lostDpsEstimate, 1)) : lostDpsEstimate;
    }

    return 0;
  }

  filterCasts() {
    const filterValues = this.spellFilter.value;

    if (Array.isArray(filterValues) && filterValues.length > 0 && filterValues.length !== this.spells.length) {
      const spellIds = filterValues.map((v) => parseInt(v));
      this.casts = this.allCasts.filter((c) => spellIds.includes(c.spellId));
    } else {
      this.casts = this.allCasts;
    }
  }
}
