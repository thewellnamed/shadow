import { BaseSummary } from 'src/app/report/summary/base.summary';
import { ChannelFields } from 'src/app/report/summary/fields/channel.fields';
import { CooldownFields } from 'src/app/report/summary/fields/cooldown.fields';
import { DotFields } from 'src/app/report/summary/fields/dot.fields';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastStats } from 'src/app/report/models/cast-stats';

/**
 * Display overall stats for all casts
 */
export class TimelineSummary extends BaseSummary {
  private summaryFields: SummaryFields;
  private dotFields: DotFields;
  private cooldownFields: CooldownFields;
  private channelFields: ChannelFields;
  private encounterFields: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryFields = new SummaryFields(this.analysis, this.highlight);
    this.dotFields = new DotFields(this.analysis, this.highlight);
    this.cooldownFields = new CooldownFields(this.analysis, this.highlight);
    this.channelFields = new ChannelFields(this.analysis, this.highlight);
    this.encounterFields = new EncounterFields(this.analysis, this.highlight);
  }

  report(stats: CastStats) {
    let mindFlayStats: CastStats = this.analysis.report.getSpellStats(SpellId.MIND_FLAY);

    if (stats.targetId) {
      mindFlayStats = mindFlayStats.targetStats(stats.targetId);
    }

    return this.summaryFields.fields(stats)
      .concat(this.dotFields.fields(stats))
      .concat(this.cooldownFields.fields(stats))
      .concat([this.break()])
      .concat(this.channelFields.fields(mindFlayStats))
      .concat(this.encounterFields.fields(stats));
  }
}
