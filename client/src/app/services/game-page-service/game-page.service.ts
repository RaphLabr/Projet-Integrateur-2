import { Injectable } from '@angular/core';
import { MapTile } from '@app/classes/map-tile';
import { ITEM_DESCRIPTIONS, TILE_DESCRIPTIONS_GAME } from '@app/constants/map-edition-constants';
import { GameDisplayData } from '@app/interfaces/game-display-data';
import { GameState } from '@app/interfaces/game-state';
import { SessionStorageGameData } from '@app/interfaces/session-game-data';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { CombatService } from '@app/services/combat-service/combat.service';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { GameService } from '@app/services/game-service/game.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { Player } from '@common/player';
import { Teams } from '@common/teams';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GamePageService {
    private _showTileContext: boolean = false;
    private _currentTile: DeepReadonly<MapTile> = new MapTile();
    private readonly _itemDescriptions: Map<ItemType, string> = ITEM_DESCRIPTIONS;

    constructor(
        private _gameService: GameService,
        private _mapService: GameMapService,
        private _combatService: CombatService,
        private _socketService: SocketClientService,
        public chatRoomService: ChatRoomService,
    ) {}

    get isClientTurnToAttack(): boolean {
        return this._combatService.isClientTurnToAttack;
    }

    get gameDisplay(): DeepReadonly<GameDisplayData> {
        return this._gameService.gameDisplay;
    }

    get gameState(): DeepReadonly<GameState> {
        return this._gameService.gameState;
    }

    get mapSize(): MapSize {
        return this._mapService.size;
    }

    get map(): DeepReadonly<MapTile[][]> {
        return this._mapService.gameMap;
    }

    get movementLeft(): number {
        return this._mapService.movementLeft;
    }

    get clientPlayer(): DeepReadonly<Player> {
        return this._gameService.clientPlayer;
    }

    get isActionUsed(): boolean {
        return this._gameService.isActionUsed;
    }

    get gameId(): string {
        return this._gameService.gameId;
    }

    get isClientInCombat(): boolean {
        return this._combatService.isClientInCombat;
    }

    get enemyPlayer(): Player | undefined {
        return this._combatService.enemyPlayer;
    }

    get combatMessages(): ChatMessage[] {
        return this._combatService.combatMessages;
    }

    get combatMessages$(): Observable<ChatMessage[]> {
        return this._combatService.combatMessages$;
    }

    get logs(): string[] {
        return this._gameService.logs;
    }

    get logs$(): Observable<string[]> {
        return this._gameService.logs$;
    }

    get showTileContext(): boolean {
        return this._showTileContext;
    }

    get currentTile(): DeepReadonly<MapTile> {
        return this._currentTile;
    }

    get itemDescription(): string | undefined {
        return this._itemDescriptions.get(this._currentTile.item);
    }

    get contextPlayerName(): string | undefined {
        return this.currentTile.character !== CharacterType.NoCharacter
            ? this._gameService.getPlayerNameWithId(this.currentTile.character)
            : undefined;
    }

    set hoveredTileCoordinates(newCoordinates: Coordinates) {
        this._mapService.hoveredTileCoordinates = newCoordinates;
    }

    set gameEnded(value: boolean) {
        this._gameService.gameEnded = value;
    }

    initializePage(gameId: string, gameDataJSON: string) {
        const gameData: SessionStorageGameData = JSON.parse(gameDataJSON);
        this._gameService.initializeGameDisplay(gameData, gameId);
        this._gameService.configureSocketFeatures();
        this._mapService.configureSocketFeatures();
        this._combatService.configureSocketFeatures();
    }

    loadGameDataJSON(): string | null {
        return sessionStorage.getItem('gameData');
    }

    sendMessage(message: string) {
        this.chatRoomService.sendMessage(message, this.gameId);
    }

    quitGame() {
        this._gameService.quitGame();
    }

    dropItem(itemIndex: number) {
        this._gameService.dropItem(itemIndex);
    }

    toggleClientInAction(): void {
        if (this.gameState.isGameInCombat || this.isActionUsed) {
            return;
        }
        this._gameService.toggleClientInAction();
    }

    onEndRoundClick() {
        if (this.gameState.isGameInCombat) {
            return;
        }
        this._gameService.onEndRoundClick();
    }

    onQuitGameClick(): void {
        this._gameService.quitGame();
    }

    onTileClick(tileCoordinates: Coordinates): void {
        if (!this.gameState.isClientPlaying || this.isClientInCombat) {
            return;
        }
        if (this.gameState.isActionEnabled) {
            this.performAction(tileCoordinates);
        } else if (this._mapService.isTileReachable(tileCoordinates)) {
            this._gameService.isGameInMovement = true;
            this._socketService.emitMovement({ gameId: this._gameService.gameId, path: this._mapService.currentPath as Coordinates[] });
            this._mapService.hideActiveAndPathTiles();
        }
    }

    onTileRightClick(tileCoordinates: Coordinates) {
        const isTeleportAllowed: boolean = this.gameState.isInDebugMode && this.gameState.isClientPlaying && !this.gameState.isDroppingItem;
        if (isTeleportAllowed && this._mapService.isTileTraversable(tileCoordinates)) {
            this._mapService.hideActiveAndPathTiles();
            this._socketService.emitPlayerTeleport({ from: this._mapService.clientPosition, to: tileCoordinates, gameId: this._gameService.gameId });
        } else {
            this._showTileContext = true;
            this._currentTile = this._mapService.getTile(tileCoordinates);
        }
    }

    onTileHover(tileCoordinates: Coordinates) {
        this._gameService.onTileHover(tileCoordinates);
    }

    onTileLeave() {
        this._mapService.hideShortestPath();
    }

    performAction(tileCoordinates: Coordinates): void {
        if (this._mapService.isActionPossibleOnTile(tileCoordinates) && this._mapService.isTileAdjacentToClient(tileCoordinates)) {
            this.toggleClientInAction();
            const ennemyId = this._mapService.getCharacterOnTile(tileCoordinates);
            if (ennemyId !== CharacterType.NoCharacter) {
                const combatRequestPayload: CombatRequestPayload = this._gameService.createCombatRequestPayload(tileCoordinates);
                const gameData = this.loadGameDataJSON();
                if (gameData) {
                    const game = JSON.parse(gameData);
                    const ennemyPlayerTeam: Teams = game.players.find((player: Player) => player.id === ennemyId).team;
                    if (game.mode === GameMode.CaptureTheFlag && this.clientPlayer.team === ennemyPlayerTeam) return;
                }
                this._combatService.requestCombat(combatRequestPayload);
            } else {
                if (this._mapService.getTile(tileCoordinates).item !== ItemType.NoItem) return;
                this._mapService.requestDoorUpdate(this.gameId, tileCoordinates);
            }
            this._gameService.isActionUsed = true;
        }
    }

    combatAttack(): void {
        if (this._combatService.isClientTurnToAttack) {
            this._combatService.combatAttack(this.gameId);
        }
    }

    combatEvade(): void {
        if (this._combatService.isClientTurnToAttack) {
            this._combatService.combatEvade(this.gameId);
        }
    }

    getTeamColor(team: Teams): string {
        switch (team) {
            case Teams.NoTeam:
                return 'cornsilk';
            case Teams.BlueTeam:
                return '#73C2FB';
            case Teams.RedTeam:
                return '#D2122E';
            default:
                return 'white';
        }
    }

    closeTileInfo() {
        this._showTileContext = false;
    }

    getTileDescription(): string | undefined {
        return TILE_DESCRIPTIONS_GAME.find((tile) => tile.type === this._currentTile.type)?.description;
    }
}
