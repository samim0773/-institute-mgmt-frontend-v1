import { Injectable }                   from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError }       from 'rxjs';
import { catchError }                   from 'rxjs/operators';
import { Router }                       from '@angular/router';
import { AuthService }                  from '../services/auth.service';
import { NotificationService }          from '../services/notification.service';

/**
 * ErrorInterceptor
 *
 * Catches all HTTP errors and maps them to user-friendly actions:
 *
 *   0   → cannot reach server (offline / CORS)
 *   401 → session expired → logout + redirect to login
 *   403 → forbidden       → redirect to /unauthorized
 *   404 → not found       → show snackbar
 *   422 → validation      → show the server's validation message
 *   500 → server error    → generic message
 *
 * Re-throws the error so individual component error handlers can
 * also react (e.g. show an inline form error).
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private router:  Router,
    private auth:    AuthService,
    private notify:  NotificationService,
  ) {}

  intercept(
    req:  HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        // Extract the most useful message from the error body
        const message = this.extractMessage(err);

        switch (err.status) {

          case 0:
            // Network error or CORS — server unreachable
            this.notify.error(
              'Cannot connect to server. Check your internet connection.'
            );
            break;

          case 401:
            // Session expired or invalid token
            this.notify.warn('Session expired. Please log in again.');
            this.auth.logout();   // clears storage + redirects to /auth/login
            break;

          case 403:
            // Authenticated but wrong role / deactivated account
            this.notify.error(message || 'You do not have permission for this action.');
            // Only redirect away if NOT on the unauthorized page already
            if (!this.router.url.includes('/unauthorized')) {
              this.router.navigate(['/unauthorized']);
            }
            break;

          case 404:
            // Not found — show message but don't redirect
            this.notify.warn(message || 'The requested resource was not found.');
            break;

          case 409:
            // Conflict — duplicate entry
            this.notify.warn(message || 'This record already exists.');
            break;

          case 422:
            // Validation error from express-validator
            // Message already contains field: error info — show it verbatim
            this.notify.error(message || 'Please check the form fields and try again.');
            break;

          case 500:
          case 502:
          case 503:
            // Server-side error
            this.notify.error(
              'Something went wrong on the server. Please try again later.'
            );
            break;

          default:
            // Anything else (400, etc.) — show the server message if available
            if (message) this.notify.error(message);
            break;
        }

        // Always re-throw so component error handlers (subscribe's error callback)
        // can handle loading state, inline errors, etc.
        return throwError(() => err);
      }),
    );
  }

  // ── Helper: extract the most useful string from the error body ───────────
  private extractMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string') return err.error;
    if (err.error?.message)           return err.error.message;
    if (err.error?.error)             return err.error.error;
    if (err.message)                  return err.message;
    return '';
  }
}
