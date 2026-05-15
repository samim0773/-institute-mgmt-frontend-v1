import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatChipsModule }           from '@angular/material/chips';
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

import { NoticesComponent }    from './notices.component';
import {
  NoticeCategoryPipe, NoticePublishedAtPipe,
  NoticeAttachmentPipe, NoticeCountPipe,
} from './notice.pipes';

const routes: Routes = [
  { path: '', component: NoticesComponent, title: 'Notices' },
];

@NgModule({
  declarations: [
    NoticesComponent,
    NoticeCategoryPipe, NoticePublishedAtPipe,
    NoticeAttachmentPipe, NoticeCountPipe,
  ],
  exports: [
    // Export pipes so TeacherModule can use them too
    NoticeCategoryPipe, NoticePublishedAtPipe,
    NoticeAttachmentPipe, NoticeCountPipe,
  ],
  imports: [
    CommonModule, ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatChipsModule, MatSlideToggleModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
})
export class NoticesModule {}
