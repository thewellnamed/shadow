
import { format } from 'src/app/report/stats/stat-utils';
import { ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { Status } from 'src/app/report/analysis/stat-evaluator';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

export abstract class BaseStats {
  public analysis: PlayerAnalysis;
  public spellId: SpellId;
  public spellData: ISpellData;
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
    return Object.assign({}, BaseStats.DEFAULTS, details) as IStatDetails;
  }

  protected break() {
    return { break: true };
  }

  // Implementation
  public abstract fields(stats: SpellStats, spellId: SpellId): StatFields;

  // common fields
  protected activeDps(stats: SpellStats) {
    return format((stats.totalDamage * 1000) / stats.activeDuration);
  }

  protected gcdUsage(stats: SpellStats) {
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
