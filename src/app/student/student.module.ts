import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterModule }        from '@angular/router';

// Angular Material
import { MatSidenavModule }    from '@angular/material/sidenav';
import { MatToolbarModule }    from '@angular/material/toolbar';
import { MatListModule }       from '@angular/material/list';
import { MatIconModule }       from '@angular/material/icon';
import { MatButtonModule }     from '@angular/material/button';
import { MatMenuModule }       from '@angular/material/menu';
import { MatDividerModule }    from '@angular/material/divider';
import { MatCardModule }       from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }    from '@angular/material/tooltip';
import { MatChipsModule }      from '@angular/material/chips';

import { StudentRoutingModule }         from './student-routing.module';
import { StudentLayoutComponent }       from './layout/student-layout.component';
import { StudentDashboardComponent }    from './dashboard/student-dashboard.component';
import { StudentResultsComponent }      from './results/student-results.component';
import { StudentNoticesComponent }      from './notices/student-notices.component';
import { StudentFeesComponent }         from './fees/student-fees.component';
import { StudentAdmitCardsComponent }   from './admit-cards/student-admit-cards.component';
import { StudentPortalService }         from './services/student-portal.service';

@NgModule({
  declarations: [
    StudentLayoutComponent,
    StudentDashboardComponent,
    StudentResultsComponent,
    StudentNoticesComponent,
    StudentFeesComponent,
    StudentAdmitCardsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    StudentRoutingModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  providers: [StudentPortalService],
})
export class StudentModule {}
