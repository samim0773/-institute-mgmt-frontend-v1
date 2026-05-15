import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
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
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatTableModule }           from '@angular/material/table';
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatChipsModule }           from '@angular/material/chips';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

// Components
import { SuperAdminLayoutComponent }      from './layout/super-admin-layout.component';
import { InstitutesListComponent }        from './institutes/institutes-list.component';
import { RegisterInstituteComponent }     from './institutes/register-institute.component';

const routes: Routes = [
  {
    path:      '',
    component: SuperAdminLayoutComponent,
    children:  [
      { path: '',              redirectTo: 'institutes', pathMatch: 'full' },
      { path: 'institutes',    component: InstitutesListComponent,    title: 'All Institutes' },
      { path: 'institutes/new', component: RegisterInstituteComponent, title: 'Register Institute' },
    ],
  },
];

@NgModule({
  declarations: [
    SuperAdminLayoutComponent,
    InstitutesListComponent,
    RegisterInstituteComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LayoutModule,
    RouterModule.forChild(routes),
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatCardModule, MatDividerModule, MatMenuModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTableModule, MatSlideToggleModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatChipsModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
})
export class SuperAdminModule {}
