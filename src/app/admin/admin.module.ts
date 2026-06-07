import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular CDK
import { LayoutModule }         from '@angular/cdk/layout';

// Angular Material
import { MatSidenavModule }         from '@angular/material/sidenav';
import { MatToolbarModule }         from '@angular/material/toolbar';
import { MatListModule }            from '@angular/material/list';
import { MatIconModule }            from '@angular/material/icon';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDividerModule }         from '@angular/material/divider';
import { MatMenuModule }            from '@angular/material/menu';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatChipsModule }           from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatSortModule }            from '@angular/material/sort';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatBadgeModule }           from '@angular/material/badge';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatTabsModule }            from '@angular/material/tabs';


// Components
import { AdminLayoutComponent }  from './layout/admin-layout.component';
import { DashboardComponent }    from './dashboard/dashboard.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

const routes: Routes = [
  {
    path:      '',
    component: AdminLayoutComponent,
    children:  [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Dashboard
      { path: 'dashboard', component: DashboardComponent, title: 'Dashboard' },

      // Students route (already wired above)
      { path: 'students', loadChildren: () => import('./students/students.module').then(m => m.StudentsModule), title: 'Students' },

      { path: 'classes', loadChildren: () => import('./classes/classes.module').then(m => m.ClassesModule), title: 'Classes' },

      { path: 'subjects', loadChildren: () => import('./subjects/subjects.module').then(m => m.SubjectsModule), title: 'Subjects' },

      { path: 'exams', loadChildren: () => import('./exams/exams.module').then(m => m.ExamsModule), title: 'Exams' },

      { path: 'results', loadChildren: () => import('./results/results.module').then(m => m.ResultsModule), title: 'Results' },

      { path: 'fees', loadChildren: () => import('./fees/fees.module').then(m => m.FeesModule), title: 'Fees' },

      { path: 'notices', loadChildren: () => import('./notices/notices.module').then(m => m.NoticesModule), title: 'Notices' },

      { path: 'teachers', loadChildren: () => import('./teachers/teachers.module').then(m => m.TeachersModule), title: 'Teachers' },

      { path: 'inventory', loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule), title: 'Inventory & Expenses' },

      { path: 'change-password', component: ChangePasswordComponent, title: 'Change Password' },
    ],
  },
];

// ── Material modules used across all admin sub-modules ────────────────────────
// Export them so child modules can import AdminModule and get all Material.
const MATERIAL = [
  LayoutModule,
  MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
  MatButtonModule, MatCardModule, MatDividerModule, MatMenuModule,
  MatTooltipModule, MatChipsModule, MatProgressSpinnerModule, MatProgressBarModule,
  MatTableModule, MatPaginatorModule, MatSortModule,
  MatFormFieldModule, MatInputModule, MatSelectModule,
  MatDatepickerModule, MatNativeDateModule,
  MatDialogModule, MatBadgeModule, MatExpansionModule, MatTabsModule,
];

@NgModule({
  declarations: [
    AdminLayoutComponent,
    DashboardComponent,
    ChangePasswordComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ...MATERIAL,
  ],
  exports: [
    // Re-export Material so child feature modules can use them
    ...MATERIAL,
  ],
})
export class AdminModule {}
