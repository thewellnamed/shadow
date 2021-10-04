import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from "src/app/home.component";
import { ReportDetailsComponent } from 'src/app/report/report-details.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'report/:logId/:player/:encounterId', component: ReportDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
