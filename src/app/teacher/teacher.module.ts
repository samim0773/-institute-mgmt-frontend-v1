import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular CDK
import { LayoutModule } from '@angular/cdk/layout';

// Angular Material
import { MatSidenavModule }         from '@angular/material/sidenav';
import { MatToolbarModule }         from '@angular/material/toolbar';
import { MatListModule }            from '@angular/material/list';
import { MatIconModule }            from '@angular/material/icon';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDividerModule }         from '@angular/material/divider';
import { MatMenuModule }            from '@angular/material/menu';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatSelectModule }          from '@angular/material/select';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule }        from '@angular/material/checkbox';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatChipsModule }           from '@angular/material/chips';
import { MatTableModule }           from '@angular/material/table';
import { MatInputModule }           from '@angular/material/input';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

// Components
import { TeacherLayoutComponent }     from './layout/teacher-layout.component';
import { TeacherDashboardComponent }  from './dashboard/teacher-dashboard.component';
import { TeacherResultsComponent }    from './results/teacher-results.component';
import { MarksEntryComponent }        from './marks/marks-entry.component';
import { NoticeBoardComponent }       from './notices/notice-board.component';


// Shared pipes from NoticesModule
// import {
//   NoticeCategoryPipe, NoticePublishedAtPipe,
//   NoticeAttachmentPipe,
// } from '../admin/notices/notice.pipes';

import { NoticesModule } from '../admin/notices/notices.module';



const routes: Routes = [
  {
    path:      '',
    component: TeacherLayoutComponent,
    children:  [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: TeacherDashboardComponent, title: 'My Profile' },
      { path: 'marks',     component: MarksEntryComponent,       title: 'Mark Entry' },
      { path: 'notices',   component: NoticeBoardComponent,      title: 'Notice Board' },
      { path: 'results',   component: TeacherResultsComponent,   title: 'Results' },
    ],
  },
];

@NgModule({
  declarations: [
    TeacherLayoutComponent,
    TeacherDashboardComponent,
    MarksEntryComponent,
    NoticeBoardComponent,
    TeacherResultsComponent,
  ],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    LayoutModule,
    RouterModule.forChild(routes),
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatCardModule, MatDividerModule, MatMenuModule,
    MatFormFieldModule, MatSelectModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatCheckboxModule, MatTooltipModule, MatChipsModule, MatTableModule, MatInputModule, MatNativeDateModule, MatDatepickerModule,  NoticesModule
  ],
})
export class TeacherModule {}
