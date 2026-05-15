import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule }                 from '@angular/router';
import { MatSnackBarModule }            from '@angular/material/snack-bar';

import { JwtInterceptor }   from './interceptors/jwt.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

/**
 * CoreModule
 *
 * Import ONCE — in AppModule only.
 * Registers:
 *   - HTTP interceptors (JWT attachment, error handling)
 *   - Singleton services (AuthService, NotificationService are providedIn:'root')
 *
 * The guard against double-import in the constructor prevents accidental
 * re-import in a feature module.
 */
@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    MatSnackBarModule,   // needed by NotificationService via ErrorInterceptor
  ],
  providers: [
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi:    true,
    },
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi:    true,
    },
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) {
      throw new Error(
        'CoreModule is already loaded. Import it ONLY in AppModule.'
      );
    }
  }
}
