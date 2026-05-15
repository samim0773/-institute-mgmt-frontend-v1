import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warn' | 'info';

/**
 * NotificationService
 *
 * Central snackbar service — import this in any component or service
 * instead of injecting MatSnackBar directly.
 *
 * Usage:
 *   this.notify.success('Student saved.');
 *   this.notify.error('Failed to load data.');
 *   this.notify.warn('Marks entry is incomplete.');
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly defaults: MatSnackBarConfig = {
    duration:           4000,
    horizontalPosition: 'end',
    verticalPosition:   'top',
  };

  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 6000): void {
    this.show(message, 'error', duration);
  }

  warn(message: string, duration = 5000): void {
    this.show(message, 'warn', duration);
  }

  info(message: string, duration = 4000): void {
    this.show(message, 'info', duration);
  }

  /** Show a snackbar with an action button. Returns the action observable. */
  withAction(message: string, action: string, type: NotificationType = 'info') {
    return this.snackBar.open(message, action, {
      ...this.defaults,
      panelClass: [`snack-${type}`],
      duration:   0,  // stays until dismissed
    }).onAction();
  }

  private show(message: string, type: NotificationType, duration: number): void {
    this.snackBar.open(message, '✕', {
      ...this.defaults,
      duration,
      panelClass: [`snack-${type}`],
    });
  }
}
