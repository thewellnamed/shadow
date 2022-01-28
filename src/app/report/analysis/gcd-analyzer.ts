import { IBuffData } from 'src/app/logs/interfaces';
import { HasteUtils, IHasteStats } from 'src/app/report/models/haste';
import { BuffData, IBuffDetails, IBuffEvent } from 'src/app/logs/models/buff-data';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class GcdAnalyzer {
  private gcds: number;
  private events: IBuffData[];
  private buffs: IBuffEvent[] = [];
  private stats: IHasteStats;

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
    this.stats = HasteUtils.calc(this.analysis.actorInfo.stats);

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
        case 'refreshbuff':
          this.applyBuff(event, BuffData[event.ability.guid]);
          break;

        case 'removebuff':
          this.removeBuff(event);
          break;
      }

      const newStats = HasteUtils.calc(this.analysis.actorInfo.stats, this.buffs);
      if (newStats.totalHaste !== this.stats.totalHaste) {
        const increment = Math.ceil((event.timestamp - start)/ 1000 / this.stats.gcd);
        gcds += increment;
        start += (increment * this.stats.gcd * 1000);
        this.stats = newStats;
      }

      buffIndex++;
    }

    if (this.analysis.encounter.end > event!.timestamp) {
      gcds += Math.floor((this.analysis.encounter.end - event!.timestamp) / 1000 / this.stats.gcd);
    }

    return gcds;
  }

  private applyBuff(event: IBuffData, data: IBuffDetails) {
    const existing = this.buffs.find((b) => b.id === event.ability.guid);
    if (existing) {
      existing.event = event;
    } else {
      this.buffs.push({ id: event.ability.guid, data, event });
    }
  }

  private removeBuff(event: IBuffData) {
    this.buffs = this.buffs.filter((b) => b.id !== event.ability.guid);
  }
}
