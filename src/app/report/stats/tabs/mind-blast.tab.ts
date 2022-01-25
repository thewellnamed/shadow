import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryStats } from 'src/app/report/stats/summary.stats';
import { IStatOptions, BaseTabStats } from 'src/app/report/stats/tabs/base.tab';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterStats } from 'src/app/report/stats/encounter.stats';
import { CooldownStats } from 'src/app/report/stats/cooldown.stats';

export class MindBlastTabStats extends BaseTabStats {
  private summaryStats: SummaryStats;
  private cooldownStats: CooldownStats;
  private encounterStats: EncounterStats;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryStats(this.analysis, this.highlight);
    this.cooldownStats = new CooldownStats(this.analysis, this.highlight);
    this.encounterStats = new EncounterStats(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.summary.stats, options);

    return this.summaryStats.fields(stats, SpellId.MIND_BLAST)
      .concat(this.cooldownStats.fields(stats, SpellId.MIND_BLAST))
      .concat(this.encounterStats.fields(stats, SpellId.MIND_BLAST));
  }
}
