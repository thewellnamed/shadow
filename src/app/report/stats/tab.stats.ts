import { StatFields } from 'src/app/report/stats/base.stats';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SpellStats } from 'src/app/report/models/spell-stats';

export abstract class TabStats {
  public analysis: PlayerAnalysis;
  public highlight: StatHighlights;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    this.analysis = analysis;
    this.highlight = highlight;
  }

  // generate stats fields for a given report tab
  public abstract report(options: IStatOptions): StatFields;

  protected break() {
    return { break: true };
  }

  protected targetStats(baseStats: SpellStats, options: IStatOptions) {
    // if no target, view overall summary stats
    if (options.targetId === undefined) {
      return baseStats;
    }

    return baseStats.targetStats(options.targetId);
  }
}

export interface IStatOptions {
  targetId?: number;
  hitCount?: number;
}
