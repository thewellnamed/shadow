import { CastsSummary } from 'src/app/report/models/casts-summary';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { format } from 'src/app/report/stats/stat-utils';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { DotStats } from 'src/app/report/stats/dot.stats';
import { SummaryStats } from 'src/app/report/stats/summary.stats';
import { IStatOptions, TabStats } from 'src/app/report/stats/tab.stats';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';

export class VampiricTouchStats extends TabStats {
  private summaryStats: SummaryStats;
  private dotStats: DotStats;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryStats(this.analysis, this.highlight);
    this.dotStats = new DotStats(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    return this.summaryStats.report()
      .concat(this.dotStats.report())
      .concat([
        this.field({ label: 'Avg Spellpower', value: format(this.stats.avgSpellpower) }),
        this.field({ label: 'Avg Haste', value: format(this.stats.avgHaste * 100, 1, '%') }),
      ]);
  }

}
