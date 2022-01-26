import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { DotFields } from 'src/app/report/summary/fields/dot.fields';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { HitFields } from 'src/app/report/summary/fields/hit.fields';

export class VampiricTouchSummary extends BaseSummary {
  private summaryFields: SummaryFields;
  private hitFields: HitFields;
  private dotFields: DotFields;
  private encounterFields: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryFields = new SummaryFields(this.analysis, this.highlight);
    this.hitFields = new HitFields(this.analysis, this.highlight);
    this.dotFields = new DotFields(this.analysis, this.highlight);
    this.encounterFields = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.getSpellStats(SpellId.VAMPIRIC_TOUCH), options);

    return this.summaryFields.fields(stats)
      .concat(this.hitFields.fields(stats))
      .concat(this.dotFields.fields(stats))
      .concat([this.break()])
      .concat(this.encounterFields.fields(stats));
  }
}
