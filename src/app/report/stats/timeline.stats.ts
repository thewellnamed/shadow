import { ChannelStats } from 'src/app/report/stats/channel.stats';
import { CooldownStats } from 'src/app/report/stats/cooldown.stats';
import { DotStats } from 'src/app/report/stats/dot.stats';
import { EncounterStats } from 'src/app/report/stats/encounter.stats';
import { IStatOptions, TabStats } from 'src/app/report/stats/tab.stats';
import { PlayerAnalysis } from 'src/app/report/analysis/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryStats } from 'src/app/report/stats/summary.stats';

/**
 * Display overall stats for all casts
 */
export class TimelineStats extends TabStats {
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
    const stats = this.targetStats(this.analysis.summary.stats, options);

    return this.summaryStats.fields(stats)
      .concat(this.dotStats.fields(stats))
      .concat(this.cooldownStats.fields(stats))
      .concat([this.break()])
      .concat(this.channelStats.fields(stats))
      .concat([this.break()])
      .concat(this.encounterStats.fields(stats));
  }
}
