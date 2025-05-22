import { MAX_BONUS, MIN_BONUS } from '@app/constants/character-constants';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMap } from '@app/model/database/game-map';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { MapService } from '@app/services/map/map.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { Dice } from '@common/dice';
import { GameMode } from '@common/game-mode';
import { GameStatistics } from '@common/game-statistics';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { PlayerInfo } from '@common/player-info';
import { TEAM_DISTRIBUTION } from '@common/random-generator';
import { Teams } from '@common/teams';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameObjectGeneratorService {
    constructor(
        private _mapService: MapService,
        private _statisticsService: GameStatisticsService,
        private _gameMapService: GameMapService,
    ) {}

    async initializeGame(gameId: string, playerInfos: PlayerInfo[], gameMapId: string, adminId: CharacterType): Promise<GameData> {
        let gameMap: GameMap = await this._mapService.getMapById(gameMapId);
        if (!gameMap) {
            throw new Error(`GameMap with id ${gameMapId} not found.`);
        }
        let startPositions: Coordinates[] = this.getStartPositions(gameMap);
        gameMap = this._gameMapService.intializeMap(gameMap, startPositions, playerInfos.length);
        startPositions = this.getStartPositions(gameMap);
        const players: Player[] = [];
        for (const playerInfo of playerInfos) {
            const randomStartPositionIndex: number = Math.floor(Math.random() * startPositions.length);
            const player = this.generatePlayer(playerInfo, startPositions[randomStartPositionIndex]);
            players.push(player);
            const startPosition: Coordinates = startPositions.splice(randomStartPositionIndex, 1)[0];
            gameMap.terrain[startPosition.y][startPosition.x].character = player.id;
        }
        if (gameMap.mode === GameMode.CaptureTheFlag) {
            this.splitPlayerTeams(players);
        }
        const gameData: GameData = this.generateGame(gameMap, adminId, players);
        gameData.players = this.getPlayerOrder(gameData);
        gameData.currentPlayerIndex = 0;
        return gameData;
    }

    private generateGame(map: GameMap, adminId: CharacterType, players: Player[]): GameData {
        return {
            players,
            map,
            isInDebugMode: false,
            isInRound: false,
            isInCombat: false,
            movementLeft: 0,
            adminId,
            currentPlayerIndex: -1,
            playersInCombat: null,
            isCombatActionUsed: false,
            isPlayerMoving: false,
            isActionUsed: false,
            attackerName: '',
            gameStatistics: this.generateGameStatistics(players),
            currentPlayerPosition: { x: -1, y: -1 },
            isDroppingItem: false,
            combatWinnerName: '',
            isOver: false,
        };
    }

    private generateGameStatistics(players: Player[]): GameStatistics {
        return {
            winner: '',
            playerStatistics: this._statisticsService.initializeGame(players),
            globalStatistics: {
                gameTime: '',
                rounds: 0,
                totalTerrainPercentage: '',
                doorsToggledPercentage: '',
                playersWithFlag: 0,
                totalTilesTraversed: new Set<string>(),
                doorsToggled: new Set<string>(),
                playerNamesWithFlag: new Set<string>(),
            },
            startTime: new Date(),
        };
    }

    private generatePlayer(playerInfo: PlayerInfo, startPosition: Coordinates): Player {
        const player: Player = {
            id: playerInfo.id,
            userId: playerInfo.userId,
            name: playerInfo.name,
            attack: 4,
            defense: 4,
            maxHealth: playerInfo.bonus === 'vie' ? MAX_BONUS : MIN_BONUS,
            speed: playerInfo.bonus === 'vie' ? MIN_BONUS : MAX_BONUS,
            health: playerInfo.bonus === 'vie' ? MAX_BONUS : MIN_BONUS,
            wins: 0,
            startPosition,
            dice: this.getDice(playerInfo),
            items: [],
            evadeAttempts: 0,
            hasAbandoned: false,
            team: Teams.NoTeam,
            isBarrelActive: false,
            isTorchActive: false,
        };
        return player;
    }

    private splitPlayerTeams(players: Player[]) {
        const maxPerTeam: number = players.length / 2;
        let remainingBlue: number = maxPerTeam;
        let remainingRed: number = maxPerTeam;
        for (const player of players) {
            if (remainingBlue === 0) {
                remainingRed--;
                player.team = Teams.RedTeam;
            } else if (remainingRed === 0) {
                remainingBlue--;
                player.team = Teams.BlueTeam;
            } else {
                const assignBlue = Math.random() < TEAM_DISTRIBUTION;
                if (assignBlue) {
                    remainingBlue--;
                    player.team = Teams.BlueTeam;
                } else {
                    remainingRed--;
                    player.team = Teams.RedTeam;
                }
            }
        }
    }

    private getStartPositions(gameMap: GameMap): Coordinates[] {
        const startPositions: Coordinates[] = [];
        for (let y = 0; y < gameMap.size; y++) {
            for (let x = 0; x < gameMap.size; x++) {
                if (gameMap.terrain[y][x].item === ItemType.StartPosition) {
                    startPositions.push({ y, x });
                }
            }
        }
        return startPositions;
    }

    private getDice(playerInfo: PlayerInfo): Dice {
        if (playerInfo.dice.charAt(0) === '6') {
            return { attack: 4, defense: 6 };
        } else {
            return { attack: 6, defense: 4 };
        }
    }

    private getPlayerOrder(game: GameData): Player[] {
        const sortedPlayers = game.players.sort((a, b) => b.speed - a.speed);

        const groups: { [key: number]: Player[] } = {};
        sortedPlayers.forEach((player) => {
            if (!groups[player.speed]) {
                groups[player.speed] = [];
            }
            groups[player.speed].push(player);
        });

        const shuffledPlayers: Player[] = [];
        Object.keys(groups)
            .sort((a, b) => +b - +a)
            .forEach((speed) => {
                const group = groups[+speed];
                this.shuffleArray(group);
                shuffledPlayers.push(...group);
            });

        return shuffledPlayers;
    }

    private shuffleArray(array: Player[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
