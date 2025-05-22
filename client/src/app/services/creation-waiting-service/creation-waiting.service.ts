import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStorageGameData } from '@app/interfaces/session-game-data';
import { StartGameInfo } from '@app/interfaces/start-game-info';
import { User } from '@app/interfaces/user';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { GameEvents } from '@common/game-events';
import { GameMode } from '@common/game-mode';
import { PlayerInfo } from '@common/player-info';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class CreationWaitingService {
    users: User[] = [];

    statConnected: boolean;
    serverMessage: string = '';
    gameId: string = '';
    mapId: string;
    clientPlayer: PlayerInfo;
    joining: boolean = false;
    mapSize: number;
    isGameFull: boolean = false;
    isStartingGame: boolean = false;
    mode: GameMode;

    isAdmin: boolean = false;
    isLocked: boolean = false;

    constructor(
        public socketService: SocketClientService,
        private _snackBarService: SnackBarService,
        private router: Router,
        private _http: HttpClient,
    ) {}

    get socketId() {
        return this.socketService.socket && this.socketService.socket.id ? this.socketService.socket.id : '';
    }

    connect() {
        this.socketService.connect(this.gameId);
        this.configureBaseSocketFeatures();
    }

    onTogglePublic() {
        if (this.isGameFull) {
            this.isLocked = true;
            return;
        }
        this.socketService.socket.emit(GameEvents.TogglePublic, { gameId: this.gameId });
    }

    onKickUser(user: string) {
        this.socketService.socket.emit(GameEvents.KickUser, { gameId: this.gameId, userId: user });
    }

    disconnect() {
        if (!this.isStartingGame) {
            this.socketService.socket.disconnect();
            this.router.navigate(['/']);
        }
    }

    addAi(typeInput: string) {
        this.socketService.socket.emit(GameEvents.AddAi, { gameId: this.gameId, type: typeInput });
    }

    configureBaseSocketFeatures() {
        this.socketService.on<void>(GameEvents.RoomCreated, () => {
            this.clientPlayer.userId = this.socketId;
        });

        this.socketService.on<PlayerInfo[]>(GameEvents.PlayerList, (players) => {
            this.users = players.map((player) => ({
                name: player.name,
                character: player.id,
                id: player.userId,
            }));

            if (this.checkIfMaxPlayersReached(this.users.length)) {
                if (!this.isLocked) {
                    this.socketService.socket.emit(GameEvents.TogglePublic, { gameId: this.gameId });
                }
                this.isLocked = true;
                this.isGameFull = true;
            } else {
                this.isGameFull = false;
            }

            if (this.users.length === 1) {
                this.isAdmin = true;
            }
        });

        this.socketService.on(GameEvents.KickUser, () => {
            this._snackBarService.showNotification('Vous avez été expulsé de la partie', true);
            this.router.navigate(['/']).then(() => {
                this.socketService.disconnect();
            });
        });

        this.socketService.on(GameEvents.RoomDestroyed, () => {
            this._snackBarService.showNotification("La partie a été annulée par l'administrateur", true);
            this.router.navigate(['/']).then(() => {
                this.socketService.disconnect();
            });
        });

        this.socketService.on('connect', () => {
            this.connectToGame();
        });

        this.socketService.on(GameEvents.StartGame, (gameInfos: StartGameInfo) => {
            this.isStartingGame = true;
            const sessionGameData: SessionStorageGameData = {
                gameName: gameInfos.map.name,
                players: gameInfos.players,
                clientId: this.clientPlayer.id,
                mapTerrain: gameInfos.map.terrain,
                mapSize: gameInfos.map.size,
                adminId: gameInfos.adminId,
                mode: gameInfos.map.mode,
            };
            sessionStorage.setItem('gameData', JSON.stringify(sessionGameData));
            this.router.navigate([`/game/${this.gameId}`]);
        });

        this.socketService.on(GameEvents.ConfirmName, (characterName: string) => {
            this.clientPlayer.name = characterName;
        });
    }

    getSize() {
        return this._http.get<number>(environment.serverUrl + '/api/map/' + this.mapId + '/size');
    }

    connectToGame() {
        if (!this.gameId) {
            return;
        }

        const joinType = this.joining ? GameEvents.JoinRoom : GameEvents.CreateRoom;

        this.socketService.socket.emit(joinType, { gameId: this.gameId, player: this.clientPlayer, map: this.mapId });
    }

    startGame(): void {
        if (this.users.length < 2) {
            this._snackBarService.showNotification('Il faut au moins 2 joueurs pour commencer la partie', true);
            return;
        }
        if (!this.isLocked) {
            this._snackBarService.showNotification('Veuillez verrouiller la partie avant de la commencer', true);
            return;
        }
        if (this.mode === GameMode.CaptureTheFlag && this.users.length % 2 !== 0) {
            this._snackBarService.showNotification('En mode CTF, il faut un nombre paire de joueurs', true);
            return;
        }
        this.socketService.socket.emit(GameEvents.StartGame, { gameId: this.gameId });
    }

    checkIfMaxPlayersReached(count: number): boolean {
        // I disabled here since this is a formula to calculate the max players, creating a constant for it makes no sense
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return count === ((this.mapSize - 10) / 5) * 2 + 2;
    }
}
