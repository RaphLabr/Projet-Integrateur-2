// Max line disable in test file
/* eslint-disable max-lines */
// Need any for private component
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MapTile } from '@app/constants/map-tile';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameObjectGeneratorService } from '@app/services/game-object-generator/game-object-generator.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { MapService } from '@app/services/map/map.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { PlayerInfo } from '@common/player-info';
import { Teams } from '@common/teams';

describe('GameObjectGeneratorService', () => {
    let service: GameObjectGeneratorService;
    let mapServiceMock: jest.Mocked<MapService>;
    let statisticsServiceMock: jest.Mocked<GameStatisticsService>;
    let gameMapServiceMock: jest.Mocked<GameMapService>;

    const mockMapId = 'map123';
    const mockGameId = 'game123';
    const mockAdminId = CharacterType.Character1;

    const mockMapTile: MapTile = {
        type: MapTileType.Base,
        item: ItemType.NoItem,
        character: CharacterType.NoCharacter,
    };

    const mockStartPositionTile: MapTile = {
        type: MapTileType.Base,
        item: ItemType.StartPosition,
        character: CharacterType.NoCharacter,
    };

    const mockGameMap = {
        id: mockMapId,
        name: 'Test Map',
        creator: 'admin',
        description: 'Test map description',
        size: 3,
        visibility: true,
        mode: GameMode.Classic,
        lastModified: new Date().toLocaleString(),
        terrain: [
            [mockStartPositionTile, mockMapTile, mockMapTile],
            [mockMapTile, mockStartPositionTile, mockMapTile],
            [mockMapTile, mockMapTile, mockStartPositionTile],
        ],
    };

    const mockPlayerInfos: PlayerInfo[] = [
        {
            id: CharacterType.Character1,
            name: 'Knight',
            userId: 'user1',
            bonus: 'vie',
            dice: DiceChoice.FourDefence,
            admin: true,
        },
        {
            id: CharacterType.Character2,
            name: 'Mage',
            userId: 'user2',
            bonus: 'speed',
            dice: DiceChoice.FourDefence,
            admin: false,
        },
    ];

    beforeEach(async () => {
        mapServiceMock = {
            getMapById: jest.fn().mockResolvedValue(mockGameMap),
        } as any as jest.Mocked<MapService>;

        statisticsServiceMock = {
            initializeGame: jest.fn().mockReturnValue(new Map()),
        } as any as jest.Mocked<GameStatisticsService>;

        gameMapServiceMock = {
            intializeMap: jest.fn().mockImplementation((map) => map),
        } as any as jest.Mocked<GameMapService>;

        jest.spyOn<any, any>(GameObjectGeneratorService.prototype, 'getStartPositions').mockReturnValue([
            { y: 0, x: 0 },
            { y: 1, x: 1 },
            { y: 2, x: 2 },
        ]);

        service = new GameObjectGeneratorService(mapServiceMock, statisticsServiceMock, gameMapServiceMock);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initializeGame', () => {
        it('should initialize a game with the correct number of players', async () => {
            const result = await service.initializeGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);

            expect(result).toBeDefined();
            expect(mapServiceMock.getMapById).toHaveBeenCalledWith(mockMapId);
            expect(result.players.length).toBe(mockPlayerInfos.length);
            expect(result.adminId).toBe(mockAdminId);
            expect(result.isInRound).toBe(false);
            expect(result.isInCombat).toBe(false);
            expect(result.currentPlayerIndex).toBe(0);
        });

        it('should throw an error if map is not found', async () => {
            mapServiceMock.getMapById.mockResolvedValueOnce(null);

            await expect(service.initializeGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId)).rejects.toThrow(
                `GameMap with id ${mockMapId} not found.`,
            );
        });

        it('should assign players to teams in CTF mode', async () => {
            const ctfMap = { ...mockGameMap, mode: GameMode.CaptureTheFlag };
            mapServiceMock.getMapById.mockResolvedValueOnce(ctfMap);

            const result = await service.initializeGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);

            expect(result.players.every((player) => player.team !== Teams.NoTeam)).toBe(true);
            const blueTeamCount = result.players.filter((p) => p.team === Teams.BlueTeam).length;
            const redTeamCount = result.players.filter((p) => p.team === Teams.RedTeam).length;
            expect(blueTeamCount + redTeamCount).toBe(mockPlayerInfos.length);
        });

        it('should remove extra start positions if there are more than players', async () => {
            const extraPositionsMap = { ...mockGameMap };
            mapServiceMock.getMapById.mockResolvedValueOnce(extraPositionsMap);

            const result = await service.initializeGame(mockGameId, [mockPlayerInfos[0]], mockMapId, mockAdminId);

            expect(result.players.length).toBe(1);
        });

        it('should order players by speed', async () => {
            const result = await service.initializeGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);

            for (let i = 0; i < result.players.length - 1; i++) {
                expect(result.players[i].speed).toBeGreaterThanOrEqual(result.players[i + 1].speed);
            }
        });
    });

    describe('generatePlayer', () => {
        it('should create a player with correct bonus attributes', () => {
            const healthBonusPlayerInfo = { ...mockPlayerInfos[0], bonus: 'vie' };
            const speedBonusPlayerInfo = { ...mockPlayerInfos[1], bonus: 'speed' };
            const generatePlayer = (service as any).generatePlayer.bind(service);
            const healthPlayer = generatePlayer(healthBonusPlayerInfo, { x: 0, y: 0 });
            const speedPlayer = generatePlayer(speedBonusPlayerInfo, { x: 1, y: 1 });

            expect(healthPlayer.maxHealth).toBeGreaterThan(speedPlayer.maxHealth);
            expect(speedPlayer.speed).toBeGreaterThan(healthPlayer.speed);
        });
    });

    describe('getDice', () => {
        it('should return correct dice values based on player info', () => {
            const getDice = (service as any).getDice.bind(service);

            const attackDicePlayer: PlayerInfo = {
                userId: 'mockUser1',
                id: CharacterType.Character1,
                name: 'Attack Player',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            };

            const defenseDicePlayer: PlayerInfo = {
                userId: 'mockUser2',
                id: CharacterType.Character2,
                name: 'Defense Player',
                bonus: 'speed',
                dice: DiceChoice.SixDefence,
                admin: false,
            };

            const attackDice = getDice(attackDicePlayer);
            const defenseDice = getDice(defenseDicePlayer);

            expect(attackDice).toEqual({ attack: 6, defense: 4 });
            expect(defenseDice).toEqual({ attack: 4, defense: 6 });
        });
    });

    describe('generateGame', () => {
        it('should create a new game data object with the correct properties', () => {
            const generateGame = (service as any).generateGame.bind(service);
            const mockPlayer = {
                id: CharacterType.Character1,
                userId: 'user1',
                name: 'TestPlayer',
                attack: 4,
                defense: 4,
                maxHealth: 10,
                health: 10,
                speed: 5,
                wins: 0,
                startPosition: { x: 0, y: 0 },
                dice: { attack: 6, defense: 4 },
                items: [],
                evadeAttempts: 0,
                hasAbandoned: false,
                team: Teams.NoTeam,
            };
            const playerStatsMap = new Map();
            playerStatsMap.set(mockPlayer.id.toString(), {
                tilesTraversed: 0,
                damageDealt: 0,
                healingDone: 0,
                combatsWon: 0,
                itemsCollected: 0,
                totalTurnTime: 0,
                averageTurnTime: 0,
                flagsCaptured: 0,
                flagsReturned: 0,
            });

            statisticsServiceMock.initializeGame.mockReturnValue(playerStatsMap);
            const gameData = generateGame(mockGameMap, mockAdminId, [mockPlayer]);

            expect(gameData).toBeDefined();
            expect(gameData.players).toEqual([mockPlayer]);
            expect(gameData.map).toEqual(mockGameMap);
            expect(gameData.adminId).toEqual(mockAdminId);
            expect(gameData.isInRound).toBe(false);
            expect(gameData.isInCombat).toBe(false);
            expect(gameData.isInDebugMode).toBe(false);
            expect(gameData.movementLeft).toBe(0);
            expect(gameData.currentPlayerIndex).toBe(-1);
            expect(gameData.playersInCombat).toBeNull();
            expect(gameData.isCombatActionUsed).toBe(false);
            expect(gameData.isPlayerMoving).toBe(false);
            expect(gameData.isActionUsed).toBe(false);
            expect(gameData.attackerName).toBe('');
            expect(gameData.combatWinnerName).toBe('');
            expect(gameData.isDroppingItem).toBe(false);
            expect(gameData.currentPlayerPosition).toEqual({ x: -1, y: -1 });
            expect(statisticsServiceMock.initializeGame).toHaveBeenCalledWith([mockPlayer]);
            expect(gameData.gameStatistics.winnerName).toBe(undefined);
            expect(gameData.gameStatistics.playerStatistics).toEqual(playerStatsMap);
            expect(gameData.gameStatistics.globalStatistics.rounds).toBe(0);
            expect(gameData.gameStatistics.globalStatistics.gameTime).toBe('');
            expect(gameData.gameStatistics.startTime).toBeInstanceOf(Date);
        });
    });

    describe('splitPlayerTeams', () => {
        it('should assign all players to a team', () => {
            const splitPlayerTeams = (service as any).splitPlayerTeams.bind(service);
            const mockPlayers = [
                { id: CharacterType.Character1, team: Teams.NoTeam },
                { id: CharacterType.Character2, team: Teams.NoTeam },
                { id: CharacterType.Character3, team: Teams.NoTeam },
                { id: CharacterType.Character4, team: Teams.NoTeam },
            ];

            splitPlayerTeams(mockPlayers);

            expect(mockPlayers.every((player) => player.team !== Teams.NoTeam)).toBe(true);
            expect(mockPlayers.every((player) => player.team === Teams.BlueTeam || player.team === Teams.RedTeam)).toBe(true);
        });

        it('should distribute players evenly between teams', () => {
            const splitPlayerTeams = (service as any).splitPlayerTeams.bind(service);
            const evenNumberOfPlayers = 6;
            const mockPlayers = Array(evenNumberOfPlayers)
                .fill(null)
                .map((_, i) => ({
                    id: `player${i}` as unknown as CharacterType,
                    team: Teams.NoTeam,
                }));

            splitPlayerTeams(mockPlayers);

            const blueTeamCount = mockPlayers.filter((p) => p.team === Teams.BlueTeam).length;
            const redTeamCount = mockPlayers.filter((p) => p.team === Teams.RedTeam).length;

            expect(blueTeamCount).toBe(redTeamCount);
            expect(blueTeamCount + redTeamCount).toBe(mockPlayers.length);
        });

        it('should handle odd number of players', () => {
            const splitPlayerTeams = (service as any).splitPlayerTeams.bind(service);
            const fivePlayers = 5;
            const mockPlayers = Array(fivePlayers)
                .fill(null)
                .map((_, i) => ({
                    id: `player${i}` as unknown as CharacterType,
                    team: Teams.NoTeam,
                }));

            let callCount = 0;
            const pointFour = 0.4;
            const pointSix = 0.6;
            jest.spyOn(global.Math, 'random').mockImplementation(() => {
                callCount++;
                return callCount % 2 === 0 ? pointFour : pointSix;
            });

            splitPlayerTeams(mockPlayers);

            const blueTeamCount = mockPlayers.filter((p) => p.team === Teams.BlueTeam).length;
            const redTeamCount = mockPlayers.filter((p) => p.team === Teams.RedTeam).length;

            expect(Math.abs(blueTeamCount - redTeamCount)).toBeLessThanOrEqual(1);
            expect(blueTeamCount + redTeamCount).toBe(mockPlayers.length);

            jest.spyOn(global.Math, 'random').mockRestore();
        });

        it('should respect already assigned teams', () => {
            const splitPlayerTeams = (service as any).splitPlayerTeams.bind(service);
            const mockPlayers = [
                { id: CharacterType.Character1, team: Teams.BlueTeam },
                { id: CharacterType.Character2, team: Teams.BlueTeam },
                { id: CharacterType.Character3, team: Teams.NoTeam },
                { id: CharacterType.Character4, team: Teams.NoTeam },
            ];

            const forcedRandom = 0.9;
            jest.spyOn(global.Math, 'random').mockReturnValue(forcedRandom);
            splitPlayerTeams(mockPlayers);

            expect(mockPlayers.every((player) => player.team !== Teams.NoTeam)).toBe(true);
            const blueTeamCount = mockPlayers.filter((p) => p.team === Teams.BlueTeam).length;
            const redTeamCount = mockPlayers.filter((p) => p.team === Teams.RedTeam).length;
            expect(Math.abs(blueTeamCount - redTeamCount)).toBeLessThanOrEqual(1);

            jest.spyOn(global.Math, 'random').mockRestore();
        });
    });

    describe('getStartPositions', () => {
        beforeEach(() => {
            jest.spyOn((GameObjectGeneratorService as any).prototype, 'getStartPositions').mockRestore();
        });

        it('should return coordinates of all start position tiles in the map', () => {
            const getStartPositions = (service as any).getStartPositions.bind(service);

            const testMap = {
                size: 3,
                terrain: [
                    [{ item: ItemType.StartPosition }, { item: ItemType.NoItem }, { item: ItemType.NoItem }],
                    [{ item: ItemType.NoItem }, { item: ItemType.StartPosition }, { item: ItemType.NoItem }],
                    [{ item: ItemType.NoItem }, { item: ItemType.NoItem }, { item: ItemType.StartPosition }],
                ],
            };

            const startPositions = getStartPositions(testMap);
            const expectedLength = 3;

            expect(startPositions).toHaveLength(expectedLength);
            expect(startPositions).toContainEqual({ y: 0, x: 0 });
            expect(startPositions).toContainEqual({ y: 1, x: 1 });
            expect(startPositions).toContainEqual({ y: 2, x: 2 });
        });

        it('should return empty array when map has no start positions', () => {
            const getStartPositions = (service as any).getStartPositions.bind(service);
            const testMap = {
                size: 2,
                terrain: [
                    [{ item: ItemType.NoItem }, { item: ItemType.NoItem }],
                    [{ item: ItemType.NoItem }, { item: ItemType.NoItem }],
                ],
            };

            const startPositions = getStartPositions(testMap);

            expect(startPositions).toHaveLength(0);
            expect(startPositions).toEqual([]);
        });

        it('should find start positions placed among other item types', () => {
            const getStartPositions = (service as any).getStartPositions.bind(service);

            const mixedMap = {
                size: 3,
                terrain: [
                    [{ item: ItemType.StartPosition }, { item: ItemType.NoItem }, { item: ItemType.Barrel }],
                    [{ item: ItemType.Potion1 }, { item: ItemType.StartPosition }, { item: ItemType.Flag }],
                    [{ item: ItemType.Potion2 }, { item: ItemType.NoItem }, { item: ItemType.StartPosition }],
                ],
            };

            const startPositions = getStartPositions(mixedMap);

            const expectedLength = 3;
            expect(startPositions).toHaveLength(expectedLength);
            expect(startPositions).toContainEqual({ y: 0, x: 0 });
            expect(startPositions).toContainEqual({ y: 1, x: 1 });
            expect(startPositions).toContainEqual({ y: 2, x: 2 });
        });
    });

    describe('getPlayerOrder', () => {
        it('should sort players by speed in descending order', () => {
            const getPlayerOrder = (service as any).getPlayerOrder.bind(service);

            const mockPlayers = [
                { id: CharacterType.Character1, speed: 3 },
                { id: CharacterType.Character2, speed: 5 },
                { id: CharacterType.Character3, speed: 1 },
                { id: CharacterType.Character4, speed: 4 },
            ];

            jest.spyOn(service as any, 'shuffleArray').mockImplementation((array) => array);

            const orderedPlayers = getPlayerOrder({ players: mockPlayers } as GameData);

            for (let i = 0; i < orderedPlayers.length - 1; i++) {
                expect(orderedPlayers[i].speed).toBeGreaterThanOrEqual(orderedPlayers[i + 1].speed);
            }

            const expectedSpeed = 5;
            expect(orderedPlayers[0].speed).toBe(expectedSpeed);
            expect(orderedPlayers[orderedPlayers.length - 1].speed).toBe(1);
        });

        it('should keep players with same speed in same group', () => {
            const getPlayerOrder = (service as any).getPlayerOrder.bind(service);
            const three = 3;
            const four = 4;
            const five = 5;

            const mockPlayers = [
                { id: CharacterType.Character1, speed: 3 },
                { id: CharacterType.Character2, speed: 5 },
                { id: CharacterType.Character3, speed: 3 },
                { id: CharacterType.Character4, speed: 4 },
            ];

            let shuffleCalls = 0;
            jest.spyOn(service as any, 'shuffleArray').mockImplementation((array: any) => {
                shuffleCalls++;
                if (array.length > 1 && array[0].speed === three) {
                    return [mockPlayers.find((p) => p.id === CharacterType.Character3), mockPlayers.find((p) => p.id === CharacterType.Character1)];
                }
                return array;
            });

            const orderedPlayers = getPlayerOrder({ players: mockPlayers } as GameData);

            expect(orderedPlayers[0].speed).toBe(five);
            expect(orderedPlayers[1].speed).toBe(four);
            expect(orderedPlayers[2].speed).toBe(three);
            expect(orderedPlayers[3].speed).toBe(three);
            expect(shuffleCalls).toBeGreaterThan(0);
        });

        it('should preserve all players in the result', () => {
            const getPlayerOrder = (service as any).getPlayerOrder.bind(service);

            const mockPlayers = [
                { id: CharacterType.Character1, speed: 3 },
                { id: CharacterType.Character2, speed: 5 },
                { id: CharacterType.Character3, speed: 1 },
                { id: CharacterType.Character4, speed: 4 },
            ];

            jest.spyOn(service as any, 'shuffleArray').mockImplementation((array) => array);

            const orderedPlayers = getPlayerOrder({ players: mockPlayers } as GameData);

            expect(orderedPlayers.length).toBe(mockPlayers.length);

            const resultIds = orderedPlayers.map((p) => p.id).sort();
            const originalIds = mockPlayers.map((p) => p.id).sort();
            expect(resultIds).toEqual(originalIds);
        });
    });

    describe('shuffleArray', () => {
        it('should shuffle the array based on random values', () => {
            const shuffleArray = (service as any).shuffleArray.bind(service);
            const mockPlayers = [
                { id: CharacterType.Character1, name: 'Player 1' },
                { id: CharacterType.Character2, name: 'Player 2' },
                { id: CharacterType.Character3, name: 'Player 3' },
                { id: CharacterType.Character4, name: 'Player 4' },
            ];

            const originalOrder = [...mockPlayers];

            let callCount = 0;
            const pointFive = 0.5;
            const pointOne = 0.1;
            jest.spyOn(global.Math, 'random').mockImplementation(() => {
                callCount++;
                if (callCount === 1) return 0;
                if (callCount === 2) return pointFive;
                return pointOne;
            });

            shuffleArray(mockPlayers);

            expect(mockPlayers).not.toEqual(originalOrder);
            expect(mockPlayers[3]).toEqual(originalOrder[0]);
            expect(mockPlayers[0]).toEqual(originalOrder[2]);

            jest.spyOn(global.Math, 'random').mockRestore();
        });
    });
});
