import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { FIVE_SECONDS } from '@app/constants/map-edition-constants';

@Injectable({
    providedIn: 'root',
})
export class SnackBarService {
    constructor(private _snackBar: MatSnackBar) {}

    showNotification(message: string, hasDelay: boolean): void {
        let snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
        if (hasDelay) {
            snackBarRef = this._snackBar.open(message, 'OK', {
                duration: FIVE_SECONDS,
                panelClass: 'snackbar',
            });
        } else {
            snackBarRef = this._snackBar.open(message, 'OK', {
                panelClass: 'snackbar',
            });
        }
        snackBarRef.onAction().subscribe(() => {
            snackBarRef.dismiss();
        });
    }
}
