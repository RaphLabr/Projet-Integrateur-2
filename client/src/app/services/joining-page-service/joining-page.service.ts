import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class JoiningPageService {
    lobbyId: string;

    constructor(
        private _http: HttpClient,
        private _router: Router,
        private _snackBarService: SnackBarService,
    ) {}
    postLobbyId(): Observable<string> {
        return this._http.post<string>(environment.serverUrl + '/api/game', { room: this.lobbyId }, { responseType: 'text' as 'json' });
    }

    onSubmit(): void {
        this.postLobbyId().subscribe({
            next: (response) => {
                if (response === 'Room exists') {
                    this._router.navigate(['/creation/creation-character/' + this.lobbyId], {
                        state: { joining: true },
                    });
                } else if (response === 'Room does not exist') {
                    this._snackBarService.showNotification('Code de partie invalide', true);
                } else if (response === 'Room is locked') {
                    this._snackBarService.showNotification('La partie est vérouillée', true);
                }
            },
            error: (error) => {
                this._snackBarService.showNotification('Erreur de récupération des données API' + error, true);
            },
        });
        return;
    }
}
