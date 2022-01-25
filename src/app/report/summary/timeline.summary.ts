import { ChannelFields } from 'src/app/report/summary/fields/channel.fields';
import { CooldownFields } from 'src/app/report/summary/fields/cooldown.fields';
import { DotFields } from 'src/app/report/summary/fields/dot.fields';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

/**
 * Display overall stats for all casts
 */
export class TimelineSummary extends BaseSummary {
  private summaryStats: SummaryFields;
  private dotStats: DotFields;
  private cooldownStats: CooldownFields;
  private channelStats: ChannelFields;
  private encounterStats: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryFields(this.analysis, this.highlight);
    this.dotStats = new DotFields(this.analysis, this.highlight);
    this.cooldownStats = new CooldownFields(this.analysis, this.highlight);
    this.channelStats = new ChannelFields(this.analysis, this.highlight);
    this.encounterStats = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.stats, options),
      mfStats = this.targetStats(this.analysis.report.getSpellStats(SpellId.MIND_FLAY), options);

    return this.summaryStats.fields(stats)
      .concat(this.dotStats.fields(stats))
      .concat(this.cooldownStats.fields(stats))
      .concat([this.break()])
      .concat(this.channelStats.fields(mfStats))
      .concat([this.break()])
      .concat(this.encounterStats.fields(stats));
  }
}
