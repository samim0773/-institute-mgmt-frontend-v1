import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StudentLayoutComponent }      from './layout/student-layout.component';
import { StudentDashboardComponent }   from './dashboard/student-dashboard.component';
import { StudentResultsComponent }     from './results/student-results.component';
import { StudentNoticesComponent }     from './notices/student-notices.component';
import { StudentFeesComponent }        from './fees/student-fees.component';
import { StudentAdmitCardsComponent }  from './admit-cards/student-admit-cards.component';

const routes: Routes = [
  {
    path:      '',
    component: StudentLayoutComponent,
    children:  [
      { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    component: StudentDashboardComponent },
      { path: 'results',      component: StudentResultsComponent },
      { path: 'notices',      component: StudentNoticesComponent },
      { path: 'fees',         component: StudentFeesComponent },
      { path: 'admit-cards',  component: StudentAdmitCardsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentRoutingModule {}
