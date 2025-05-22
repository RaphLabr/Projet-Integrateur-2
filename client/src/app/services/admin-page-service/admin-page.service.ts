import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { GameMode } from '@common/game-mode';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
@Injectable({
    providedIn: 'root',
})
export class AdminPageService {
    readonly url = environment.serverUrl;
    constructor(
        private _http: HttpClient,
        private _router: Router,
        private _snackBarService: SnackBarService,
    ) {}

    generateUuid(): string {
        return uuidv4();
    }

    fetchData(gameList: MapModel[]): void {
        this._http.get<MapModel[]>(this.url + '/api/map').subscribe(
            (response) => {
                gameList.length = 0;
                gameList.push(...response);
            },
            () => {
                this._snackBarService.showNotification("Erreur : Fetch des cartes de l'API échoués", false);
            },
        );
    }

    onSubmit(form: NgForm, size: string): void {
        if (form.valid) {
            const id = this.generateUuid();
            const modeValue: string = form.value.toggle ? GameMode.CaptureTheFlag : GameMode.Classic;
            const gameMode: GameMode =
                GameMode[Object.keys(GameMode).find((key) => GameMode[key as keyof typeof GameMode] === modeValue) as keyof typeof GameMode];

            this._router.navigate(['/edition'], {
                queryParams: {
                    mapId: id,
                    mapSize: size,
                    mode: gameMode,
                },
            });
        }
    }

    changeVisibility(index: number, gameList: MapModel[]): void {
        this._http.patch<void>(`${this.url}/api/map/${gameList[index].id}`, null).subscribe(
            () => {
                gameList[index].visibility = !gameList[index].visibility;
            },
            () => {
                this._snackBarService.showNotification('Erreur : Impossible de changer la visibilité', false);
            },
        );
    }

    deleteGame(index: number, gameList: MapModel[]): void {
        this._http.delete<void>(`${this.url}/api/map/${gameList[index].id}`).subscribe(
            () => {
                this.fetchData(gameList);
            },
            () => {
                this._snackBarService.showNotification("Erreur : La carte n'existe plus.", false);
            },
        );
    }
}
