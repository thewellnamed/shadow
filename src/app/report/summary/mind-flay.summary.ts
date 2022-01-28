import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { ChannelFields } from 'src/app/report/summary/fields/channel.fields';
import { HitFields } from 'src/app/report/summary/fields/hit.fields';
import { CastStats } from 'src/app/report/models/cast-stats';

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

  report(stats: CastStats) {
    return this.summaryFields.fields(stats)
      .concat(this.hitFields.fields(stats))
      .concat(this.channelFields.fields(stats))
      .concat(this.encounterFields.fields(stats));
  }
}
