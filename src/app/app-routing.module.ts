import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard }          from './core/guards/auth.guard';
import { RoleGuard }          from './core/guards/role.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { LandingComponent }   from './public/landing/landing.component';
import { RegisterComponent }  from './public/register/register.component';

const routes: Routes = [
  // ─── Public: Landing page ─────────────────────────────────────────────────
  {
    path:      '',
    component: LandingComponent,
    pathMatch: 'full',
  },

  // ─── Public: Institute self-registration (trial) ──────────────────────────
  {
    path:        'register',
    component:   RegisterComponent,
    canActivate: [LoginRedirectGuard],
  },

  // ─── Auth (login page) ─────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [LoginRedirectGuard],   // already logged-in? → redirect away
    loadChildren: () =>
      import('./auth/auth.module').then(m => m.AuthModule),
  },

  // ─── Super Admin ───────────────────────────────────────────────────────────
  {
    path: 'super-admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin'] },
    loadChildren: () =>
      import('./super-admin/super-admin.module').then(m => m.SuperAdminModule),
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./admin/admin.module').then(m => m.AdminModule),
  },

  // ─── Teacher ───────────────────────────────────────────────────────────────
  {
    path: 'teacher',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['teacher'] },
    loadChildren: () =>
      import('./teacher/teacher.module').then(m => m.TeacherModule),
  },

  // ─── Unauthorized ──────────────────────────────────────────────────────────
  {
    path: 'unauthorized',
    loadChildren: () =>
      import('./auth/auth.module').then(m => m.AuthModule),
  },

  // ─── Wildcard 404 ──────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
  })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
