import { MAX_EVASIONS, MAX_WINS } from '@app/constants/combat-constants';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMap } from '@app/model/database/game-map';
import { CombatService } from '@app/services/combat/combat.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameObjectGeneratorService } from '@app/services/game-object-generator/game-object-generator.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { sleep } from '@app/utils/sleep/sleep';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { ItemDropDataToServer } from '@common/item-drop-data-server';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { PlayerInfo } from '@common/player-info';
import { QuitDataToClient } from '@common/quit-data-client';
import { TeleportData } from '@common/teleport-data';
import { GENERAL_BUFFER } from '@common/timer-constants';
import { Inject, Injectable, forwardRef } from '@nestjs/common';

@Injectable()
export class GameService {
    private _games: Map<string, GameData> = new Map();

    // eslint-disable-next-line max-params
    constructor(
        private readonly _gameEmitterGateway: GameEmitterGateway,
        @Inject(forwardRef(() => CombatService)) private readonly _combatService: CombatService,
        private readonly _timerService: GameTimerService,
        private readonly gameMapService: GameMapService,
        private readonly _gameStatisticsService: GameStatisticsService,
        @Inject(forwardRef(() => VirtualPlayerService)) private readonly _virtualPlayer: VirtualPlayerService,
        private readonly _generatorService: GameObjectGeneratorService,
    ) {}

    getPlayersById(gameId: string): Player[] {
        return this.getGame(gameId).players;
    }

    async createGame(gameId: string, playerInfos: PlayerInfo[], gameMapId: string, adminId: CharacterType): Promise<GameData> {
        const game: GameData = await this._generatorService.initializeGame(gameId, playerInfos, gameMapId, adminId);
        this._games.set(gameId, game);
        return game;
    }

    isGameInRound(gameId: string): boolean {
        const gameData: undefined | GameData = this._games.get(gameId);
        return gameData && gameData.isInRound;
    }

    async movePlayer(gameId: string, path: Coordinates[]) {
        const game: GameData = this._games.get(gameId);
        if (game) {
            await this.gameMapService.movePlayerOnPath(game, gameId, path);
        }
    }

    async startGame(gameId: string): Promise<void> {
        const game: GameData | undefined = this._games.get(gameId);
        while (!game.isOver) {
            this.startNotificationPeriod(gameId, game);
            await this._timerService.waitForNotificationTimer(gameId);
            if (!game.isOver) {
                this.startRoundPeriod(gameId, game);
                await this._timerService.waitForRoundTimer(gameId);
            }
        }
        game.isOver = false;
        this._timerService.forceStopTimer(gameId);
        this._timerService.deleteTimer(gameId);
        await sleep(GENERAL_BUFFER);
        this._games.delete(gameId);
    }

    async endRound(gameId: string, socketPlayerName: string): Promise<void> {
        const gameData: GameData | undefined = this.getGame(gameId);
        if (gameData && gameData.isInRound && socketPlayerName === this.getActivePlayerName(gameId)) {
            this.forceEndRound(gameId);
        }
    }

    getActivePlayerName(gameId: string): string {
        const game = this.getGame(gameId);
        return game.players[game.currentPlayerIndex].name;
    }

    quitGame(gameId: string, playerName: string, playerPosition: Coordinates): GameData {
        const game: GameData = this.getGame(gameId);
        if (!game) return;
        const quitPlayerIndex = game.players.findIndex((player) => player.name === playerName);
        if (!game.players[quitPlayerIndex]) return;
        game.players[quitPlayerIndex].hasAbandoned = true;
        if (game.isInCombat && this._combatService.isPlayerInCombat(playerName, game.playersInCombat)) {
            this._combatService.combatOverWithWinner(gameId, game);
            this._timerService.stopTimer(gameId);
        }
        this.gameMapService.removeCharacterFromTile(game.map.terrain, playerPosition);
        this._combatService.loserDropItems(game, gameId, playerPosition, game.players[quitPlayerIndex]);
        this.clearStartPosition(game.map, game.players[quitPlayerIndex].startPosition);
        const quitData: QuitDataToClient = {
            playerName: game.players[quitPlayerIndex].name,
            playerPosition,
            playerStartPosition: game.players[quitPlayerIndex].startPosition,
        };
        this._gameEmitterGateway.emitPlayerQuit(gameId, quitData);
        if (game.players.length <= 0 || game.players.every((player) => player.hasAbandoned || player.userId.startsWith('AI'))) {
            game.isOver = true;
        } else {
            if (game.isInRound && game.currentPlayerIndex === quitPlayerIndex) {
                this._timerService.forceStopTimer(gameId);
            }
            if (this.isLastPlayer(gameId)) {
                this._gameEmitterGateway.emitKickLastPlayer(gameId);
            }
        }
        return game;
    }

    toggleDebug(gameId: string): void {
        const game: GameData = this.getGame(gameId);
        if (!game) return;
        game.isInDebugMode = !game.isInDebugMode;
        this._gameEmitterGateway.emitToggleDebug(gameId, game.isInDebugMode);
    }

    startCombat(payload: CombatRequestPayload): boolean {
        const game: GameData = this.getGame(payload.gameId);

        if (game.isActionUsed) return false;

        const attackerTile: MapTile = this.getTile(payload.initiatorPosition, game.map);
        const defenderTile: MapTile = this.getTile(payload.targetPosition, game.map);

        return this._combatService.startCombat(game, payload, attackerTile, defenderTile);
    }

    getRemainingEvadeAttempts(gameId: string): number {
        const game: GameData = this.getGame(gameId);

        const evader: Player = this._combatService.getAttacker(game.playersInCombat, game.attackerName);

        return MAX_EVASIONS - evader.evadeAttempts;
    }

    getGameWinnerName(gameId: string): string {
        const game: GameData = this.getGame(gameId);

        const winnerWith3Wins = game.players.find((player) => player.wins >= MAX_WINS);
        if (winnerWith3Wins) {
            return winnerWith3Wins.name;
        }
    }

    dropItem(data: ItemDropDataToServer) {
        const game: GameData | undefined = this._games.get(data.gameId);
        if (game) {
            const droppedItem: ItemType = game.players[game.currentPlayerIndex].items.splice(data.itemIndex, 1)[0];
            game.isDroppingItem = false;
            this.gameMapService.placeItem(data.gameId, { item: droppedItem, itemCoordinates: data.itemPosition }, game.map.terrain);
            this._timerService.enableTimerStop(data.gameId);
        }
    }

    getGame(gameId: string): GameData | undefined {
        return this._games.get(gameId);
    }

    teleportPlayer(teleportData: TeleportData) {
        const game: GameData = this._games.get(teleportData.gameId);
        if (game && game.isInDebugMode) {
            this.gameMapService.teleportPlayer(game, teleportData, false);
        }
    }

    setAttackerName(gameId: string, playerName: string): void {
        const game: GameData = this.getGame(gameId);
        game.attackerName = playerName;
    }

    getPlayerPosition(gameId: string, characterId: string): Coordinates {
        const game: GameData = this.getGame(gameId);
        const currentPlayer: Player | undefined = game.players.find((player) => player.id === characterId);
        if (!currentPlayer) {
            return { y: -1, x: -1 };
        }
        for (let y = 0; y < game.map.terrain.length; y++) {
            for (let x = 0; x < game.map.terrain[y].length; x++) {
                if (game.map.terrain[y][x].character === currentPlayer.id) {
                    return { y, x };
                }
            }
        }

        return { y: -1, x: -1 };
    }

    checkForRoundEnd(gameId: string): void {
        const game: GameData | undefined = this._games.get(gameId);
        if (game && this.gameMapService.shouldRoundEnd(game)) {
            this.forceEndRound(gameId);
        }
    }

    private forceEndRound(gameId: string) {
        this._timerService.stopTimer(gameId);
    }

    private startNotificationPeriod(gameId: string, game: GameData): void {
        this._gameStatisticsService.newRound(gameId);
        game.isActionUsed = false;
        game.isInRound = false;
        let nextPlayerIndex = game.currentPlayerIndex;
        do {
            nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
        } while (game.players[nextPlayerIndex].hasAbandoned && nextPlayerIndex !== game.currentPlayerIndex);
        game.currentPlayerIndex = nextPlayerIndex;
        if (!game.gameStatistics.winner) this._gameEmitterGateway.emitStartNotification(gameId, game.players[game.currentPlayerIndex].name);
    }

    private startRoundPeriod(gameId: string, game: GameData) {
        this._gameEmitterGateway.emitStartRound(gameId);
        game.isInRound = true;
        game.movementLeft = game.players[game.currentPlayerIndex].speed;
        if (game.players[game.currentPlayerIndex].userId.startsWith('AI')) {
            this._virtualPlayer.handleAiTurn(gameId, game.players[game.currentPlayerIndex].id, game.players[game.currentPlayerIndex].userId);
        }
    }

    private getTile(coordinates: Coordinates, gameMap: GameMap): MapTile {
        return gameMap.terrain[coordinates.y][coordinates.x];
    }

    private clearStartPosition(gameMap: GameMap, startPosition: Coordinates): void {
        gameMap.terrain[startPosition.y][startPosition.x].item = ItemType.NoItem;
    }

    private isLastPlayer(gameId: string): boolean {
        const game: GameData = this.getGame(gameId);
        const activeHumanPlayers = game.players.filter((player) => !player.hasAbandoned && !player.userId.startsWith('AI')).length;

        const activeAIPlayers = game.players.filter((player) => !player.hasAbandoned && player.userId.startsWith('AI')).length;

        if (activeHumanPlayers === 0) {
            return true;
        }

        if (activeHumanPlayers === 1 && activeAIPlayers === 0) {
            return true;
        }

        return false;
    }
}
