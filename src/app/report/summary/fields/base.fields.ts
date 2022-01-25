import { format } from 'src/app/report/models/stat-utils';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { CastStats } from 'src/app/report/models/cast-stats';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { Status } from 'src/app/report/analysis/stat-evaluator';
import { SpellStats } from 'src/app/report/models/spell-stats';

export abstract class BaseFields {
  public analysis: PlayerAnalysis;
  public highlight: StatHighlights;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    this.analysis = analysis;
    this.highlight = highlight;
  }

  public static DEFAULTS: Partial<IStatDetails> = {
    break: false,
    highlight: StatHighlights.textHighlights[Status.NORMAL]
  };

  protected field(details: Partial<IStatDetails>): IStatDetails {
    return Object.assign({}, BaseFields.DEFAULTS, details) as IStatDetails;
  }

  protected break() {
    return { break: true };
  }

  protected spellData(stats: CastStats) {
    if (stats instanceof SpellStats) {
      return stats.spellData;
    }

    return undefined;
  }

  // Implementation
  public abstract fields(stats: CastStats): StatFields;

  // common fields
  protected activeDps(stats: CastStats) {
    return format((stats.totalDamage * 1000) / stats.activeDuration);
  }

  protected gcdUsage(stats: CastStats) {
    return format(stats.gcds / this.analysis.totalGcds * 100, 0, '%');
  }
}

export type StatFields = (IStatDetails|IStatBreak)[];

export interface IStatDetails {
  break: boolean;
  label: string;
  highlight: string;
  value: string|number;
}

export interface IStatBreak {
  break: boolean
}
