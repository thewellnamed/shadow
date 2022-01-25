import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { DotStats } from 'src/app/report/stats/dot.stats';
import { SummaryStats } from 'src/app/report/stats/summary.stats';
import { IStatOptions, BaseTabStats } from 'src/app/report/stats/tabs/base.tab';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterStats } from 'src/app/report/stats/encounter.stats';

export class VampiricTouchTabStats extends BaseTabStats {
  private summaryStats: SummaryStats;
  private dotStats: DotStats;
  private encounterStats: EncounterStats;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryStats(this.analysis, this.highlight);
    this.dotStats = new DotStats(this.analysis, this.highlight);
    this.encounterStats = new EncounterStats(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.summary.getSpellSummary(SpellId.VAMPIRIC_TOUCH), options);

    return this.summaryStats.fields(stats)
      .concat(this.dotStats.fields(stats))
      .concat(this.encounterStats.fields(stats));
  }
}
