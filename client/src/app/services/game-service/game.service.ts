import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ItemEffects } from '@app/classes/item-effects';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameState } from '@app/interfaces/game-state';
import { PlayerDisplayData } from '@app/interfaces/player-display-data';
import { SessionStorageGameData } from '@app/interfaces/session-game-data';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { GameStatisticsService } from '@app/services/game-statistics-page-service/game-statistics-page-service.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateData } from '@common/door-update-data';
import { GameEvents } from '@common/game-events';
import { GameStatistics } from '@common/game-statistics';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemLog } from '@common/item-log';
import { ITEM_THRESHOLD } from '@common/item-threshold';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { QuitDataToClient } from '@common/quit-data-client';
import { Teams } from '@common/teams';
import { NOTIFICATION_DURATION_MS } from '@common/timer-constants';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    isActionUsed: boolean = true;
    gameEnded: boolean = false;
    logs$: Observable<string[]>;
    private _gameId: string;
    private _clientPlayer: Player;
    private _isClientAdmin: boolean = false;
    private _isClientNextPlayer: boolean = false;
    private _gameDisplay: GameDisplayData;
    private _gameState: GameState;
    private _logsSubject: BehaviorSubject<string[]>;

    constructor(
        private _socketService: SocketClientService,
        private _mapService: GameMapService,
        private _snackBar: MatSnackBar,
        private _router: Router,
        private _gameStatisticsService: GameStatisticsService,
    ) {}

    get gameId(): string {
        return this._gameId;
    }

    get clientPlayer(): DeepReadonly<Player> {
        return this._clientPlayer;
    }

    get gameDisplay(): DeepReadonly<GameDisplayData> {
        return this._gameDisplay;
    }

    get isClientAdmin(): boolean {
        return this._isClientAdmin;
    }
    get gameState(): DeepReadonly<GameState> {
        return this._gameState;
    }

    get logs(): string[] {
        return this._logsSubject.getValue();
    }

    set isGameInCombat(isGameInCombat: boolean) {
        this._gameState.isGameInCombat = isGameInCombat;
    }

    set isGameInMovement(isInMovement: boolean) {
        this._gameState.isInMovement = isInMovement;
    }

    private static mapSizeToString(mapSize: MapSize): string {
        switch (mapSize) {
            case MapSize.Small:
                return 'petite';
            case MapSize.Medium:
                return 'moyenne';
            default:
                return 'large';
        }
    }

    private static createEmptyGameDisplayData(): GameDisplayData {
        return {
            gameName: '',
            mapSize: '',
            currentPlayerName: '',
            numberOfPlayers: 0,
            timeLeft: 0,
            playerDisplay: [],
            notification: '',
            adminCharacterId: CharacterType.NoCharacter,
            flagCharacterId: CharacterType.NoCharacter,
        };
    }

    initializeGameDisplay(gameData: SessionStorageGameData, gameId: string): void {
        this._gameState = {
            isInDebugMode: false,
            isClientPlaying: false,
            isActionEnabled: false,
            isGameInCombat: false,
            isDroppingItem: false,
            isInMovement: false,
        };
        this._gameId = gameId;
        this._gameDisplay = GameService.createEmptyGameDisplayData();
        this._gameDisplay.gameName = gameData.gameName;
        this._gameDisplay.mapSize = GameService.mapSizeToString(gameData.mapSize);
        this.initializePlayers(gameData.players, gameData.clientId, gameData.adminId);
        this._mapService.initializeMap(gameData.mapTerrain, gameData.mapSize, this._clientPlayer.id);
        this._logsSubject = new BehaviorSubject<string[]>([]);
        this.logs$ = this._logsSubject.asObservable();
    }

    configureSocketFeatures(): void {
        this._socketService.on(GameEvents.StartRound, () => {
            this.startRound();
        });

        this._socketService.socket.on(GameEvents.ItemPickUp + this.clientPlayer.id, (item: ItemType) => {
            this._clientPlayer.items.push(item);
            ItemEffects.handleItemPickUpEffect(this._clientPlayer, item);
            if (this._clientPlayer.items.length > 2) {
                ItemEffects.handleItemDropEffect(this._clientPlayer, item);
                this._gameState.isDroppingItem = true;
            }
        });

        this._socketService.on(GameEvents.ItemPickUpLog, (itemLog: ItemLog) => {
            const frenchItemName = ItemEffects.handleFrenchItemName(itemLog.item);

            this.addLog(`${frenchItemName} ramassé par ${itemLog.playerName}!`);
            if (itemLog.item === ItemType.Flag) this._gameDisplay.flagCharacterId = itemLog.id;
        });

        this._socketService.on(GameEvents.StartNotification, (nextActivePlayerName: string) => {
            this.startNotificationPeriod(nextActivePlayerName);
            this.addLog(`Début du tour de ${nextActivePlayerName}`);
        });

        this._socketService.on(GameEvents.TimerUpdate, (newTimerValue: number) => {
            this._gameDisplay.timeLeft = newTimerValue;
        });

        this._socketService.on(GameEvents.EndOfMovement, () => {
            this._gameState.isInMovement = false;
            if (this.gameState.isClientPlaying) {
                this._mapService.hideActiveAndPathTiles();
                this._mapService.showReachableAndPathTiles();
            }
        });

        this._socketService.on(GameEvents.ToggleDebug, (newDebugState: boolean) => {
            this._gameState.isInDebugMode = newDebugState;
            this.addLog(newDebugState ? 'Mode de débogage activé' : 'Mode de débogage désactivé');
        });

        this._socketService.on(GameEvents.GameOver, (gameStatistics: GameStatistics) => {
            this.endGame(gameStatistics);

            const playersLeft: PlayerDisplayData[] | undefined = this._gameDisplay.playerDisplay.filter((player) => !player.hasAbandoned);
            const playerNames = playersLeft.map((player) => player.name).join(', ');
            this.addLog(`Fin de partie et il reste ${playerNames}`);
            this.gameEnded = true;
            sessionStorage.setItem('gameId', this.gameId);
            setTimeout(() => {
                this._router.navigate([`/statistics/${this.gameId}`]);
            }, NOTIFICATION_DURATION_MS);
        });

        this._socketService.on(GameEvents.PlayerQuit, (quitData: QuitDataToClient) => {
            this.addLog(`${quitData.playerName} abandonne`);
            this.onPlayerQuit(quitData);
        });

        this._socketService.on(GameEvents.UpdateDoor, (payload: DoorUpdateData) => {
            this._mapService.updateDoor(payload);
            if (this._gameState.isClientPlaying) {
                this._mapService.hideActiveAndPathTiles();
                this._mapService.showReachableAndPathTiles();
            }
            const openedDoorStatus = payload.newDoorType === MapTileType.OpenDoor ? true : false;
            if (openedDoorStatus) this.addLog(`Une porte a été ouverte par ${payload.player.name}`);
            else this.addLog(`Une porte a été fermée par ${payload.player.name}`);
        });

        this._socketService.on(GameEvents.KickUser, () => {
            this.kickLastPlayer();
        });

        this._socketService.on(GameEvents.ItemDrop, (payload: ItemDropDataToClient) => {
            this._mapService.dropItem(payload);
        });

        this._socketService.on(GameEvents.LoserPlayer + this._clientPlayer.id, () => {
            for (const item of this._clientPlayer.items) {
                ItemEffects.handleItemDropEffect(this._clientPlayer, item);
            }
            this._clientPlayer.items = [];
        });
    }

    onPlayerQuit(quitData: QuitDataToClient) {
        const quitPlayerData: PlayerDisplayData | undefined = this._gameDisplay.playerDisplay.find((player) => player.name === quitData.playerName);
        if (quitPlayerData) {
            quitPlayerData.hasAbandoned = true;
            this._mapService.removeCharacterFromTile(quitData.playerPosition);
            this._mapService.removeItemOnTile(quitData.playerStartPosition);
            if (this._gameState.isClientPlaying) this._mapService.showReachableAndPathTiles();
        }
    }

    toggleClientInAction() {
        if (this._gameState.isClientPlaying) {
            this._gameState.isActionEnabled = !this._gameState.isActionEnabled;
            if (this._gameState.isActionEnabled) {
                this._mapService.hideActiveAndPathTiles();
                this._mapService.showActionTiles();
            } else {
                this._mapService.hideActiveTiles();
                this._mapService.showReachableAndPathTiles();
            }
        }
    }

    onTileHover(hoveredTileCoordinates: Coordinates) {
        this._mapService.hoveredTileCoordinates = hoveredTileCoordinates;
        if (this._gameState.isClientPlaying && !this._gameState.isGameInCombat) {
            this._mapService.showShortestPath();
        }
    }

    onEndRoundClick() {
        if (this._gameState.isClientPlaying) {
            this.endRound();
        }
    }

    startNotificationPeriod(nextActivePlayerName: string) {
        if (this._gameState.isClientPlaying) {
            this._mapService.hideActiveAndPathTiles();
            this.isActionUsed = true;
            this._gameState.isActionEnabled = false;
            this._gameState.isClientPlaying = false;
        }
        this._gameDisplay.currentPlayerName = nextActivePlayerName;
        this._isClientNextPlayer = nextActivePlayerName === this._clientPlayer.name;
        if (this._isClientNextPlayer) {
            this._gameDisplay.notification = "C'est à vous de jouer !";
        } else {
            this._gameDisplay.notification = "C'est à " + nextActivePlayerName + ' de jouer !';
        }
    }

    startRound() {
        this._gameDisplay.notification = '';
        if (this._isClientNextPlayer) {
            this.isActionUsed = false;
            this._gameState.isClientPlaying = true;
            this._mapService.movementLeft = this._clientPlayer.speed;
            this._mapService.showReachableAndPathTiles();
        }
    }

    quitGame(): void {
        this._clientPlayer.hasAbandoned = true;
        if (this.gameEnded) {
            sessionStorage.setItem('clientPlayerName', this._clientPlayer.name);
            return;
        }
        this._socketService.emitPlayerQuit({
            gameId: this.gameId,
            playerName: this.clientPlayer.name,
            playerPosition: this._mapService.clientPosition,
        });
        this._socketService.socket.disconnect();
    }

    incrementPlayerWins(playerId: CharacterType): void {
        for (const player of this._gameDisplay.playerDisplay) {
            if (player.id === playerId) {
                player.wins++;
            }
        }
    }

    updateClientHealth(health: number): void {
        this._clientPlayer.health = health;
        if (this._clientPlayer.items.includes(ItemType.Barrel) && health < ITEM_THRESHOLD) this._clientPlayer.defense++;
        if (this._clientPlayer.items.includes(ItemType.Torch) && health < ITEM_THRESHOLD) this._clientPlayer.attack--;
    }

    addLog(log: string) {
        const currentDate = new Date();
        const currentTime = currentDate.toTimeString().split(' ')[0];
        this._logsSubject.next([...this._logsSubject.getValue(), `[${currentTime}]: ${log}`]);
    }

    updateClientEvadeAttempts(evadeAttempts: number): void {
        this._clientPlayer.evadeAttempts = evadeAttempts;
    }

    createCombatRequestPayload(opponentTileCoordinates: Coordinates): CombatRequestPayload {
        return {
            gameId: this.gameId,
            initiatorId: this.clientPlayer.id,
            targetId: this._mapService.getCharacterOnTile(opponentTileCoordinates),
            initiatorPosition: this._mapService.clientPosition,
            targetPosition: opponentTileCoordinates,
        };
    }

    dropItem(itemIndex: number) {
        this._clientPlayer.items.splice(itemIndex, 1);
        this._gameState.isDroppingItem = false;
        this._socketService.emitItemDrop({ gameId: this.gameId, itemIndex, itemPosition: this._mapService.clientPosition });
    }

    getPlayerNameWithId(playerId: CharacterType): string | undefined {
        return this._gameDisplay.playerDisplay.find((player) => player.id === playerId)?.name;
    }

    private endRound(): void {
        this._socketService.socket.emit(GameEvents.EndRound, this._gameId);
    }

    private initializePlayers(players: Player[], clientId: CharacterType, adminId: CharacterType): void {
        this._gameDisplay.numberOfPlayers = 0;
        this._gameDisplay.adminCharacterId = adminId;
        for (const player of players) {
            this._gameDisplay.numberOfPlayers++;
            this._gameDisplay.playerDisplay.push({
                id: player.id,
                name: player.name,
                wins: 0,
                hasAbandoned: false,
                isAI: player.userId.startsWith('AI'),
                team: player.team,
            });
            if (player.id === clientId) {
                this._isClientAdmin = player.id === adminId;
                this._clientPlayer = player;
            }
        }
    }
    private endGame(gameStatistics: GameStatistics): void {
        this._gameState.isClientPlaying = false;
        const winnerName = gameStatistics.winner;
        this._gameStatisticsService.updateStatistics(gameStatistics);
        if (this._clientPlayer.team === winnerName || this._clientPlayer.name === winnerName) {
            this._gameDisplay.notification = 'Vous avez gagné !';
        } else {
            if (this._clientPlayer.team === Teams.NoTeam) this._gameDisplay.notification = `${winnerName} a gagné !`;
            else if (this._clientPlayer.team === Teams.BlueTeam) this._gameDisplay.notification = "L'équipe rouge a gagné !";
            else this._gameDisplay.notification = "L'équipe bleue a gagné !";
        }
    }

    private kickLastPlayer(): void {
        if (!this._clientPlayer.hasAbandoned) {
            this._snackBar.open('Vous avez été déconnecté du jeu car vous êtes le dernier joueur restant.', 'OK', {
                duration: NOTIFICATION_DURATION_MS,
            });
            this.quitGame();
        }
    }
}
