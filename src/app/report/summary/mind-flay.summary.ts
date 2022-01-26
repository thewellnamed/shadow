import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { ChannelFields } from 'src/app/report/summary/fields/channel.fields';
import { HitFields } from 'src/app/report/summary/fields/hit.fields';

export class MindFlaySummary extends BaseSummary {
  private summaryFields: SummaryFields;
  private hitFields: HitFields;
  private channelFields: ChannelFields;
  private encounterFields: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryFields = new SummaryFields(this.analysis, this.highlight);
    this.hitFields = new HitFields(this.analysis, this.highlight);
    this.channelFields = new ChannelFields(this.analysis, this.highlight);
    this.encounterFields = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.getSpellStats(SpellId.MIND_FLAY), options);

    return this.summaryFields.fields(stats)
      .concat(this.hitFields.fields(stats))
      .concat(this.channelFields.fields(stats))
      .concat(this.encounterFields.fields(stats));
  }
}
