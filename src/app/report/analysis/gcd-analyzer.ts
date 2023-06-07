import { IBuffData } from 'src/app/logs/interfaces';
import { HasteUtils, IHasteStats } from 'src/app/report/models/haste';
import { Buff, IBuffDetails, IBuffEvent } from 'src/app/logs/models/buff-data';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { ActorStats } from 'src/app/logs/models/actor-stats';

export class GcdAnalyzer {
  private gcds: number;
  private events: IBuffData[];
  private buffs: IBuffEvent[] = [];
  private stats: IHasteStats;
  private baseStats: ActorStats;

  constructor(private analysis: PlayerAnalysis) {
    this.events = analysis.events.buffs;
  }

  public get totalGcds(): number {
    if (this.gcds !== undefined) {
      return this.gcds;
    }

    this.gcds = this.analyze();
    return this.gcds;
  }

  private analyze(): number {
    this.baseStats = Object.assign({}, this.analysis.actorInfo.stats);
    this.stats = HasteUtils.calc(this.baseStats);

    if (this.events.length === 0) {
      const duration = (this.analysis.encounter.end - this.analysis.encounter.start)/1000;
      return duration / this.stats.gcd;
    }

    let gcds = 0,
      start = this.analysis.encounter.start,
      buffIndex = 0,
      event: IBuffData;

    while (buffIndex < this.events.length) {
      event = this.events[buffIndex];

      switch (event.type) {
        case 'applybuff':
        case 'applybuffstack':
          this.applyBuff(event, Buff.get(event, this.analysis.settings));
          break;

        case 'removebuff':
        case 'removebuffstack':
          this.removeBuff(event);
          break;

        default:
          buffIndex++;
          continue;
      }

      const newStats = HasteUtils.calc(this.baseStats, this.buffs);
      if (newStats.totalHaste !== this.stats.totalHaste) {
        const increment = Math.ceil((event.timestamp - start)/ 1000 / this.stats.gcd);

        gcds += increment;
        start += (increment * this.stats.gcd * 1000);
        this.stats = newStats;
      }

      buffIndex++;
    }

    if (this.analysis.encounter.end > start) {
      gcds += Math.floor((this.analysis.encounter.end - start) / 1000 / this.stats.gcd);
    }

    return gcds;
  }

  private applyBuff(event: IBuffData, data: IBuffDetails) {
    const buff = { id: event.ability.guid, data, event };
    const index = this.buffs.findIndex((b) => b.id === event.ability.guid);

    if (index >= 0) {
      this.buffs.splice(index, 1, buff);
    } else {
      this.buffs.push({ id: event.ability.guid, data, event });
    }
  }

  private removeBuff(event: IBuffData) {
    const index = this.buffs.findIndex((b) => b.id === event.ability.guid);
    if (index >= 0) {
      switch(event.type) {
        case 'removebuff':
          this.buffs.splice(index, 1);
          break;

        case 'removebuffstack':
          this.buffs[index].event = event;
          this.buffs[index].data = Buff.get(event, this.analysis.settings);
      }
    }
  }
}
