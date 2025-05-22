import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameService } from '@app/services/game/game.service';
import { toString } from '@app/utils/coordinate-utils/coordinate-utils';
import { ClientStatistics } from '@common/client-game-statistics';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { PlayerStatistics } from '@common/player-statistics';
import { MINUTE, NUMBER_OF_MS_IN_S, PERCENTAGE } from '@common/timer-constants';
import { forwardRef, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class GameStatisticsService {
    playerStatistics: Map<string, PlayerStatistics>;

    constructor(
        @Inject(forwardRef(() => GameService))
        private _gameService: GameService,
    ) {
        this.playerStatistics = new Map();
    }

    initializeGame(players: Player[]): Map<string, PlayerStatistics> {
        this.playerStatistics = new Map(
            players.map((player) => [
                player.name,
                {
                    name: player.name,
                    wins: 0,
                    losses: 0,
                    combats: 0,
                    evasions: 0,
                    livesLost: 0,
                    livesTaken: 0,
                    itemsPicked: 0,
                    terrainPercentage: '',
                    tilesTraversed: new Set<string>(),
                    flagsPicked: 0,
                },
            ]),
        );
        return this.playerStatistics;
    }

    updateAStatisticForPlayer(
        gameId: string,
        player: Player,
        statistic: keyof Omit<PlayerStatistics, 'name' | 'tilesTraversed' | 'terrainPercentage'>,
        value?: number,
    ): void {
        const statisticValue = value ?? 1;
        const game = this._gameService.getGame(gameId);
        const playerStatistics = game.gameStatistics.playerStatistics.get(player.name);

        if (!playerStatistics) {
            throw new Error('No statistics found for this player');
        }

        playerStatistics[statistic] += statisticValue;
    }

    updateAStatisticWithGame(
        game: GameData,
        player: Player,
        statistic: keyof Omit<PlayerStatistics, 'name' | 'tilesTraversed' | 'terrainPercentage'>,
    ): void {
        const playerStatistics = game.gameStatistics.playerStatistics.get(player.name);

        playerStatistics[statistic] += 1;
    }

    updateTilesTraversed(game: GameData, tile: Coordinates) {
        const currentPlayer = game.players[game.currentPlayerIndex];
        const currentPlayerName = currentPlayer.name;
        const tileTraversed = toString(tile);
        const playerStatistics = game.gameStatistics.playerStatistics.get(currentPlayerName);
        playerStatistics.tilesTraversed.add(tileTraversed);

        const globalStatistics = game.gameStatistics.globalStatistics;
        globalStatistics.totalTilesTraversed.add(tileTraversed);
    }

    getAllStatistics(game: GameData, winner: string): ClientStatistics {
        const endTime = new Date();
        game.gameStatistics.winner = winner;
        this.calculateDoorsPercentage(game);
        this.calculateAllTilesPercentage(game);
        this.calculateGameTime(game, endTime);
        const playerStatistics = game.gameStatistics.playerStatistics;
        const playerStatisticsValues = Array.from(playerStatistics.values());
        const clientData = {
            playerStatistics: playerStatisticsValues,
            globalStatistics: game.gameStatistics.globalStatistics,
            winner: game.gameStatistics.winner,
        };
        return clientData;
    }

    toggleDoor(doorCoordinates: Coordinates, game: GameData): void {
        const doorToggled = toString(doorCoordinates);
        game.gameStatistics.globalStatistics.doorsToggled.add(doorToggled);
    }

    newRound(gameId: string) {
        const game = this._gameService.getGame(gameId);
        const globalStatistics = game.gameStatistics.globalStatistics;
        globalStatistics.rounds += 1;
    }

    updatePickedObject(gameId: string, itemType: ItemType) {
        const game = this._gameService.getGame(gameId);
        const currentPlayer = game.players[game.currentPlayerIndex];
        const currentPlayerName = currentPlayer.name;
        const globalStatistics = game.gameStatistics.globalStatistics;
        const playerStatistics = game.gameStatistics.playerStatistics;
        const livePlayerStatistics = playerStatistics.get(currentPlayerName);
        if (itemType === ItemType.Flag) {
            if (!globalStatistics.playerNamesWithFlag.has(currentPlayerName)) {
                globalStatistics.playerNamesWithFlag.add(currentPlayerName);
                globalStatistics.playersWithFlag += 1;
            }
            livePlayerStatistics.flagsPicked += 1;
        } else {
            livePlayerStatistics.itemsPicked += 1;
        }
    }

    private calculateGameTime(game: GameData, endTime: Date): void {
        const duration = endTime.getTime() - game.gameStatistics.startTime.getTime();
        const durationInSeconds = Math.floor(duration / NUMBER_OF_MS_IN_S);
        const minutes = Math.floor(durationInSeconds / MINUTE);
        const seconds = durationInSeconds % MINUTE;

        const gameTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        game.gameStatistics.globalStatistics.gameTime = gameTime;
    }

    private calculateAllTilesPercentage(game: GameData): void {
        const gameMapSize = game.map.size;
        const numberMapTiles = gameMapSize * gameMapSize;
        const players = game.players;

        for (const player of players) {
            const currentPlayerStatistics = game.gameStatistics.playerStatistics.get(player.name);
            const numberOfTilesTraversed = currentPlayerStatistics.tilesTraversed.size;
            const tilesPercentage = (numberOfTilesTraversed / numberMapTiles) * PERCENTAGE;
            currentPlayerStatistics.terrainPercentage = tilesPercentage.toFixed(2);
        }

        const numberGlobalTilesTraversed = game.gameStatistics.globalStatistics.totalTilesTraversed.size;
        const globalTilesPercentage = (numberGlobalTilesTraversed / numberMapTiles) * PERCENTAGE;
        game.gameStatistics.globalStatistics.totalTerrainPercentage = globalTilesPercentage.toFixed(2);
    }

    private calculateDoorsPercentage(game: GameData): void {
        const numberDoorsToggled = game.gameStatistics.globalStatistics.doorsToggled.size;
        const gameMap = game.map.terrain;
        let totalDoors = 0;
        for (const row of gameMap) {
            for (const tile of row) {
                if (tile.type === MapTileType.OpenDoor || tile.type === MapTileType.ClosedDoor) {
                    totalDoors += 1;
                }
            }
        }
        let doorsToggledPercentage = (numberDoorsToggled / totalDoors) * PERCENTAGE;
        if (!doorsToggledPercentage) doorsToggledPercentage = 0;
        game.gameStatistics.globalStatistics.doorsToggledPercentage = doorsToggledPercentage.toFixed(2);
    }
}
