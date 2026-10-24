import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Environment, ENVIRONMENT_TOKEN } from '../environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly environment: Environment = inject(ENVIRONMENT_TOKEN);

  public createSuccessNotification(title: string): void {
    this.snackBar.open(title, undefined, {
      duration: this.environment.notificationSuccessTime,
    });
  }

  public createErrorNotification(title: string): void {
    this.snackBar.open(title, undefined, {
      duration: this.environment.notificationErrorTime,
      panelClass: 'notification_error',
    });
  }
}
