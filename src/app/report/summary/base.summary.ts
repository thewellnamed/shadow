import { StatFields } from 'src/app/report/summary/fields/base.fields';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { CastStats } from 'src/app/report/models/cast-stats';

export abstract class BaseSummary {
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

  protected targetStats(baseStats: CastStats, options: IStatOptions) {
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
