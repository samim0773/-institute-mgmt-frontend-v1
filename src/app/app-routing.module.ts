import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard }          from './core/guards/auth.guard';
import { RoleGuard }          from './core/guards/role.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';

const routes: Routes = [
  // ─── Default redirect ──────────────────────────────────────────────────────
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
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
    redirectTo: 'auth/login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'top',
  })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
