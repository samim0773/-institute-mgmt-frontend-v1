import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatTableModule }           from '@angular/material/table';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatChipsModule }           from '@angular/material/chips';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatDialogModule }          from '@angular/material/dialog';

import { TeachersListComponent }        from './teachers-list.component';
import { TeacherCountPipe }             from './teacher.pipe';
import { AddTeacherComponent }          from '../../teacher/add-teacher/add-teacher.component';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';


const routes: Routes = [
  { path: '',    component: TeachersListComponent, title: 'Teachers'    },
  { path: 'new', component: AddTeacherComponent,   title: 'Add Teacher' },
];

@NgModule({
  declarations: [ TeachersListComponent, TeacherCountPipe, AddTeacherComponent, ResetPasswordDialogComponent ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule,
  ],
})
export class TeachersModule {}
