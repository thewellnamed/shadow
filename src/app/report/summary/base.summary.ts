import { IStatField } from 'src/app/report/summary/fields/base.fields';
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

  /**
   * Generate report fields for the given stats
   * Input is expected to already be filtered by appropriate target/etc.
   * @param {CastStats} stats
   */
  public abstract report(stats?: CastStats): IStatField[];

  protected break() {
    return { break: true };
  }
}
