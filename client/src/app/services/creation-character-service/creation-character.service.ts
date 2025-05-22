import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CHARACTERS } from '@app/constants/characters';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { GameEvents } from '@common/game-events';
import { PlayerInfo } from '@common/player-info';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class CreationCharacterService {
    playerInfo: PlayerInfo;
    previousSelected: CharacterType;

    mapId: string;
    mode: string;

    gameId: string;
    joining: boolean;
    readonly characters: CharacterType[] = CHARACTERS;
    private _4availableCharactersSubject = new BehaviorSubject<CharacterType[]>(this.characters);

    // We have to declare the private subject before the observable
    // eslint-disable-next-line @typescript-eslint/member-ordering
    availableCharacters$ = this._4availableCharactersSubject.asObservable();

    constructor(
        private _http: HttpClient,
        private _router: Router,
        private _socketService: SocketClientService,
        private _snackBarService: SnackBarService,
    ) {}

    connect() {
        if (!this._socketService.isSocketAlive()) {
            this._socketService.connect(this.gameId);
            this.configureBaseSocketFeatures();
        }
    }

    disconnect() {
        this._socketService.disconnect();
    }

    postPlayer(selectedCharacterId: CharacterType, chosenCharacterName: string, selectedBonus: string, selectedDice: string): Observable<boolean> {
        return this._http.post<boolean>(environment.serverUrl + '/api/player', {
            id: selectedCharacterId,
            name: chosenCharacterName,
            bonus: selectedBonus,
            dice: selectedDice,
        });
    }

    configureBaseSocketFeatures() {
        this._socketService.on<CharacterType[]>(GameEvents.CharacterSelect, (selectedCharacters) => {
            const availableCharacters = this.characters.filter((character) => !selectedCharacters.includes(character));
            this._4availableCharactersSubject.next(availableCharacters);
        });

        this._socketService.on<boolean>(GameEvents.RoomLocked, (locked) => {
            if (!locked) {
                this._router.navigate(['/creation/creation-waiting/' + this.gameId], {
                    state: { playerInfo: this.playerInfo, map: this.mapId, joining: true, mode: this.mode },
                });
            } else {
                this._snackBarService.showNotification('Salle verrouille', true);
            }
        });

        this._socketService.on(GameEvents.RoomDestroyed, () => {
            this._snackBarService.showNotification("La partie a été annulée par l'administrateur", true);
            this._socketService.disconnect();
            this._router.navigate(['/']);
        });
    }

    onCharacterSelect(characterId: CharacterType): void {
        if (this.joining) {
            this._socketService.socket.emit(GameEvents.CharacterSelect, {
                gameId: this.gameId,
                characterId,
                previousSelected: this.previousSelected,
            });
            this.previousSelected = characterId;
        }
    }

    mapAvailableChecker(): void {
        if (this.joining) {
            this._socketService.socket.emit(GameEvents.RoomLocked, { gameId: this.gameId });
            return;
        }

        this._http
            .get(environment.serverUrl + '/api/map/' + this.mapId, {
                responseType: 'text',
            })
            .subscribe({
                next: (response) => {
                    try {
                        const parsedResponse = JSON.parse(response);
                        if (parsedResponse.visibility) {
                            this.getGameId().subscribe((gameId) => {
                                this.gameId = gameId;
                                this._router.navigate(['/creation/creation-waiting/' + this.gameId], {
                                    state: { playerInfo: this.playerInfo, map: this.mapId, joining: false, mode: this.mode },
                                });
                            });
                        } else {
                            this._snackBarService.showNotification('Carte non visible', true);
                            this._router.navigate(['/creation']);
                        }
                    } catch (e) {
                        this._snackBarService.showNotification(`Erreur de traitement de reponse: ${e}`, true);
                    }
                },
                error: (error) => {
                    if (error.status === HttpStatusCode.NotFound) {
                        this._snackBarService.showNotification('Carte non trouvée', true);
                        this._router.navigate(['/creation']);
                    } else {
                        this._snackBarService.showNotification(`Erreur de récupération de la carte:${error}`, true);
                    }
                },
            });
    }

    getGameId(): Observable<string> {
        return this._http.get(environment.serverUrl + '/api/game', { responseType: 'text' });
    }

    joinCreatingRoom(): void {
        this._socketService.socket.emit(GameEvents.JoinCreatingRoom, { gameId: this.gameId });
    }

    onSubmit(selectedCharacterId: CharacterType, chosenCharacterName: string, selectedBonus: string, selectedDice: DiceChoice): void {
        this.playerInfo = {
            userId: '0',
            id: selectedCharacterId,
            name: chosenCharacterName,
            bonus: selectedBonus,
            dice: selectedDice,
            admin: false,
        };

        this.postPlayer(selectedCharacterId, chosenCharacterName, selectedBonus, selectedDice)
            .pipe(
                tap((response) => {
                    if (response) {
                        this.mapAvailableChecker();
                    } else {
                        this._snackBarService.showNotification('Personnage non-valide', true);
                    }
                }),
                catchError(() => {
                    this._snackBarService.showNotification("Erreur de récupération des données de l'API", true);
                    return of(false);
                }),
            )
            .subscribe();
    }
}
