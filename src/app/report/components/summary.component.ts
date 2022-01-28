import { Component, Input } from '@angular/core';
import { IStatField } from 'src/app/report/summary/fields/base.fields';

@Component({
  selector: 'summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent {
  @Input() public fields: IStatField[];
}
