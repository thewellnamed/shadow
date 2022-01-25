import { ChannelStats } from 'src/app/report/stats/channel.stats';
import { CooldownStats } from 'src/app/report/stats/cooldown.stats';
import { DotStats } from 'src/app/report/stats/dot.stats';
import { EncounterStats } from 'src/app/report/stats/encounter.stats';
import { IStatOptions, BaseTabStats } from 'src/app/report/stats/tabs/base.tab';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryStats } from 'src/app/report/stats/summary.stats';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

/**
 * Display overall stats for all casts
 */
export class TimelineTabStats extends BaseTabStats {
  private summaryStats: SummaryStats;
  private dotStats: DotStats;
  private cooldownStats: CooldownStats;
  private channelStats: ChannelStats;
  private encounterStats: EncounterStats;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryStats(this.analysis, this.highlight);
    this.dotStats = new DotStats(this.analysis, this.highlight);
    this.cooldownStats = new CooldownStats(this.analysis, this.highlight);
    this.channelStats = new ChannelStats(this.analysis, this.highlight);
    this.encounterStats = new EncounterStats(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.summary.stats, options),
      mfStats = this.targetStats(this.analysis.summary.getSpellSummary(SpellId.MIND_FLAY), options);

    return this.summaryStats.fields(stats)
      .concat(this.dotStats.fields(stats))
      .concat(this.cooldownStats.fields(stats))
      .concat([this.break()])
      .concat(this.channelStats.fields(mfStats))
      .concat([this.break()])
      .concat(this.encounterStats.fields(stats));
  }
}
