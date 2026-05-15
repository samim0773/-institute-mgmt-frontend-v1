import { Injectable }  from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent, HttpInterceptor,
} from '@angular/common/http';
import { Observable }  from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * JwtInterceptor
 *
 * Automatically attaches `Authorization: Bearer <token>` to every HTTP
 * request that targets our API (environment.apiUrl).
 *
 * Why scope to apiUrl only?
 *   If the app ever calls a CDN or third-party API, we must NOT leak the
 *   JWT to those domains. The startsWith check prevents token leakage.
 *
 * Registered in CoreModule as:
 *   { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {

    const token      = this.authService.token;
    const isApiCall  = request.url.startsWith(environment.apiUrl);
    const hasToken   = !!token && !this.authService.isTokenExpired();

    if (isApiCall && hasToken) {
      // Clone the request — HttpRequest is immutable
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request);
  }
}
