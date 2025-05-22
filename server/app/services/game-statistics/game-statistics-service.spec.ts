// Need magic number
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Max line disable for test file
/* eslint-disable max-lines */
// Need any for private component
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MapTile } from '@app/constants/map-tile';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameService } from '@app/services/game/game.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Test, TestingModule } from '@nestjs/testing';
import { GameStatisticsService } from './game-statistics-service';

describe('GameStatisticsService', () => {
    let service: GameStatisticsService;
    let gameServiceMock: Partial<GameService>;
    let mockPlayer1: Player;
    let mockPlayer2: Player;
    let mockGameData: GameData;

    beforeEach(async () => {
        mockPlayer1 = { name: 'Player1' } as Player;
        mockPlayer2 = { name: 'Player2' } as Player;

        const mockMapId = 'map123';

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

        mockGameData = {
            gameStatistics: {
                playerStatistics: new Map(),
                globalStatistics: {
                    totalTilesTraversed: new Set<string>(),
                    doorsToggled: new Set<string>(),
                    doorsToggledPercentage: '0',
                    totalTerrainPercentage: '0',
                    gameTime: '',
                    rounds: 0,
                    playersWithFlag: 0,
                    playerNamesWithFlag: new Set<string>(),
                },
                startTime: new Date(),
                winnerName: '',
            },
            players: [mockPlayer1, mockPlayer2],
            currentPlayerIndex: 0,
            map: mockGameMap,
        } as unknown as GameData;

        mockGameData.gameStatistics.playerStatistics.set(mockPlayer1.name, {
            name: mockPlayer1.name,
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
        });
        mockGameData.gameStatistics.playerStatistics.set(mockPlayer2.name, {
            name: mockPlayer2.name,
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
        });

        gameServiceMock = {
            getGame: jest.fn().mockReturnValue(mockGameData),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameStatisticsService, { provide: GameService, useValue: gameServiceMock }],
        }).compile();

        service = module.get<GameStatisticsService>(GameStatisticsService);
        service.playerStatistics = new Map();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initializeGame', () => {
        it('should initialize player statistics for all players', () => {
            const players = [mockPlayer1, mockPlayer2];
            const result = service.initializeGame(players);

            expect(result.size).toBe(2);
            expect(result.get(mockPlayer1.name)).toBeDefined();
            expect(result.get(mockPlayer2.name)).toBeDefined();
            expect(result.get(mockPlayer1.name).name).toBe(mockPlayer1.name);
            expect(result.get(mockPlayer1.name).wins).toBe(0);
            expect(result.get(mockPlayer1.name).tilesTraversed).toBeInstanceOf(Set);
        });
    });

    describe('updateAStatisticForPlayer', () => {
        it('should update a specific statistic for a player', () => {
            const gameId = 'game1';
            const statistic = 'wins';

            service.updateAStatisticForPlayer(gameId, mockPlayer1, statistic);

            expect(gameServiceMock.getGame).toHaveBeenCalledWith(gameId);
            expect(mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name).wins).toBe(1);
        });

        it('should update a statistic with a specific value if provided', () => {
            const gameId = 'game1';
            const statistic = 'livesTaken';
            const value = 3;

            service.updateAStatisticForPlayer(gameId, mockPlayer1, statistic, value);

            expect(mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name).livesTaken).toBe(value);
        });

        it('should throw error if player statistics are not found', () => {
            const gameId = 'game1';
            const statistic = 'wins';
            const unknownPlayer = { name: 'Unknown' } as Player;

            expect(() => {
                service.updateAStatisticForPlayer(gameId, unknownPlayer, statistic);
            }).toThrow('No statistics found for this player');
        });
    });

    describe('updateAStatisticWithGame', () => {
        it('should update a statistic for a player using game object directly', () => {
            const statistic = 'combats';

            service.updateAStatisticWithGame(mockGameData, mockPlayer1, statistic);

            expect(mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name).combats).toBe(1);
        });
    });

    describe('updateTilesTraversed', () => {
        it('should add a tile to the player and global tiles traversed sets', () => {
            const tile: Coordinates = { x: 5, y: 5 };

            service.updateTilesTraversed(mockGameData, tile);

            const currentPlayerName = mockGameData.players[mockGameData.currentPlayerIndex].name;
            const playerStats = mockGameData.gameStatistics.playerStatistics.get(currentPlayerName);

            expect(playerStats.tilesTraversed.has('5,5')).toBe(true);
            expect(mockGameData.gameStatistics.globalStatistics.totalTilesTraversed.has('5,5')).toBe(true);
        });
    });

    describe('calculateGameTime', () => {
        it('should calculate game time correctly', () => {
            const startTime = new Date();
            mockGameData.gameStatistics.startTime = startTime;
            const timeDelay = 150000;
            const endTime = new Date(startTime.getTime() + timeDelay);

            (service as any).calculateGameTime(mockGameData, endTime);

            expect(mockGameData.gameStatistics.globalStatistics.gameTime).toBe('02:30');
        });
    });

    describe('calculateAllTilesPercentage', () => {
        it('should calculate tiles percentage for all players and globally', () => {
            const player1Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name);
            player1Stats.tilesTraversed.add('0,0');
            player1Stats.tilesTraversed.add('0,1');
            player1Stats.tilesTraversed.add('1,0');
            player1Stats.tilesTraversed.add('1,1');
            player1Stats.tilesTraversed.add('2,2');

            const player2Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer2.name);
            player2Stats.tilesTraversed.add('5,5');
            player2Stats.tilesTraversed.add('5,6');
            player2Stats.tilesTraversed.add('6,5');

            mockGameData.gameStatistics.globalStatistics.totalTilesTraversed = new Set(['0,0', '0,1', '1,0', '1,1', '2,2', '5,5', '5,6', '6,5']);

            (service as any).calculateAllTilesPercentage(mockGameData);

            expect(player1Stats.terrainPercentage).toBe('55.56');
            expect(player2Stats.terrainPercentage).toBe('33.33');
            expect(mockGameData.gameStatistics.globalStatistics.totalTerrainPercentage).toBe('88.89');
        });
    });

    describe('toggleDoor', () => {
        it('should add door coordinates to the doors toggled set', () => {
            const doorCoordinates: Coordinates = { x: 3, y: 4 };

            service.toggleDoor(doorCoordinates, mockGameData);

            expect(mockGameData.gameStatistics.globalStatistics.doorsToggled.has('3,4')).toBe(true);
        });
    });

    describe('calculateDoorsPercentage', () => {
        it('should calculate the percentage of toggled doors', () => {
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

            const mockDoor: MapTile = {
                type: MapTileType.OpenDoor,
                item: ItemType.StartPosition,
                character: CharacterType.NoCharacter,
            };

            const mockDoorClosed: MapTile = {
                type: MapTileType.ClosedDoor,
                item: ItemType.StartPosition,
                character: CharacterType.NoCharacter,
            };

            mockGameData.map.terrain = [
                [mockStartPositionTile, mockMapTile, mockMapTile],
                [mockStartPositionTile, mockDoorClosed, mockMapTile],
                [mockMapTile, mockDoor, mockStartPositionTile],
            ];
            mockGameData.gameStatistics.globalStatistics.doorsToggled = new Set(['1,1', '2,1']);

            (service as any).calculateDoorsPercentage(mockGameData);

            expect(mockGameData.gameStatistics.globalStatistics.doorsToggledPercentage).toBe('100.00');
        });

        it('should handle case with no doors on the map', () => {
            const arraySize = 10;
            mockGameData.map.terrain = Array(arraySize).fill(Array(arraySize).fill({ type: MapTileType.Base }));

            (service as any).calculateDoorsPercentage(mockGameData);

            expect(mockGameData.gameStatistics.globalStatistics.doorsToggledPercentage).toBe('0.00');
        });
    });

    describe('newRound', () => {
        it('should increment the rounds counter', () => {
            const gameId = 'game1';
            const initialRounds = mockGameData.gameStatistics.globalStatistics.rounds;

            service.newRound(gameId);

            expect(mockGameData.gameStatistics.globalStatistics.rounds).toBe(initialRounds + 1);
        });
    });

    describe('updatePickedObject', () => {
        it('should update itemsPicked when a non-flag item is picked', () => {
            const gameId = 'game1';
            const itemType = ItemType.Torch;

            service.updatePickedObject(gameId, itemType);

            const currentPlayerName = mockGameData.players[mockGameData.currentPlayerIndex].name;
            const playerStats = mockGameData.gameStatistics.playerStatistics.get(currentPlayerName);

            expect(playerStats.itemsPicked).toBe(1);
            expect(playerStats.flagsPicked).toBe(0);
            expect(mockGameData.gameStatistics.globalStatistics.playersWithFlag).toBe(0);
        });

        it('should update flagsPicked and playersWithFlag when a flag is picked', () => {
            const gameId = 'game1';
            const itemType = ItemType.Flag;

            service.updatePickedObject(gameId, itemType);

            const currentPlayerName = mockGameData.players[mockGameData.currentPlayerIndex].name;
            const playerStats = mockGameData.gameStatistics.playerStatistics.get(currentPlayerName);

            expect(playerStats.itemsPicked).toBe(0);
            expect(playerStats.flagsPicked).toBe(1);
            expect(mockGameData.gameStatistics.globalStatistics.playersWithFlag).toBe(1);
            expect(mockGameData.gameStatistics.globalStatistics.playerNamesWithFlag.has(currentPlayerName)).toBe(true);
        });

        it('should not increment playersWithFlag if player already had a flag', () => {
            const gameId = 'game1';
            const itemType = ItemType.Flag;
            const currentPlayerName = mockGameData.players[mockGameData.currentPlayerIndex].name;

            mockGameData.gameStatistics.globalStatistics.playerNamesWithFlag.add(currentPlayerName);
            mockGameData.gameStatistics.globalStatistics.playersWithFlag = 1;

            service.updatePickedObject(gameId, itemType);

            const playerStats = mockGameData.gameStatistics.playerStatistics.get(currentPlayerName);

            expect(playerStats.flagsPicked).toBe(1);

            expect(mockGameData.gameStatistics.globalStatistics.playersWithFlag).toBe(1);
        });
    });

    describe('getAllStatistics', () => {
        beforeEach(() => {
            const player1Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name);
            player1Stats.wins = 5;
            player1Stats.tilesTraversed.add('0,0');

            const player2Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer2.name);
            player2Stats.losses = 3;
            player2Stats.tilesTraversed.add('1,1');

            mockGameData.gameStatistics.globalStatistics.totalTilesTraversed.add('0,0');
            mockGameData.gameStatistics.globalStatistics.totalTilesTraversed.add('1,1');
            mockGameData.gameStatistics.globalStatistics.doorsToggled.add('2,2');
        });

        it('should calculate all statistics and return client data', () => {
            const winner = 'Player1';

            jest.spyOn(service as any, 'calculateDoorsPercentage').mockImplementation(() => {
                mockGameData.gameStatistics.globalStatistics.doorsToggledPercentage = '50.00';
            });

            jest.spyOn(service as any, 'calculateAllTilesPercentage').mockImplementation(() => {
                const player1Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name);
                const player2Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer2.name);
                player1Stats.terrainPercentage = '11.11';
                player2Stats.terrainPercentage = '11.11';
                mockGameData.gameStatistics.globalStatistics.totalTerrainPercentage = '22.22';
            });

            jest.spyOn(service as any, 'calculateGameTime').mockImplementation(() => {
                mockGameData.gameStatistics.globalStatistics.gameTime = '01:30';
            });

            const result = service.getAllStatistics(mockGameData, winner);

            expect(mockGameData.gameStatistics.winner).toBe(winner);
            expect((service as any).calculateDoorsPercentage).toHaveBeenCalledWith(mockGameData);
            expect((service as any).calculateAllTilesPercentage).toHaveBeenCalledWith(mockGameData);
            expect((service as any).calculateGameTime).toHaveBeenCalledWith(mockGameData, expect.any(Date));
            expect(result).toHaveProperty('playerStatistics');
            expect(result).toHaveProperty('globalStatistics');
            expect(result).toHaveProperty('winner');
            expect(result.winner).toBe(winner);
            expect(result.playerStatistics).toBeInstanceOf(Array);
            expect(result.playerStatistics.length).toBe(2);

            const resultPlayer1 = result.playerStatistics.find((p) => p.name === mockPlayer1.name);
            const resultPlayer2 = result.playerStatistics.find((p) => p.name === mockPlayer2.name);

            expect(resultPlayer1).toBeDefined();
            expect(resultPlayer2).toBeDefined();
            expect(resultPlayer1.wins).toBe(5);
            expect(resultPlayer1.terrainPercentage).toBe('11.11');
            expect(resultPlayer2.losses).toBe(3);
            expect(resultPlayer2.terrainPercentage).toBe('11.11');

            expect(result.globalStatistics).toBe(mockGameData.gameStatistics.globalStatistics);
            expect(result.globalStatistics.doorsToggledPercentage).toBe('50.00');
            expect(result.globalStatistics.totalTerrainPercentage).toBe('22.22');
            expect(result.globalStatistics.gameTime).toBe('01:30');
        });

        it('should handle empty player statistics', () => {
            const emptyGame = { ...mockGameData, gameStatistics: { ...mockGameData.gameStatistics } };
            emptyGame.gameStatistics.playerStatistics = new Map();

            jest.spyOn(service as any, 'calculateDoorsPercentage').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'calculateAllTilesPercentage').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'calculateGameTime').mockImplementation(() => undefined);

            const result = service.getAllStatistics(emptyGame, 'NoWinner');

            expect(result.playerStatistics).toEqual([]);
            expect(result.winner).toBe('NoWinner');
        });

        it('should convert player statistics from Map to Array correctly', () => {
            const player1Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer1.name);
            player1Stats.combats = 10;
            player1Stats.evasions = 2;

            const player2Stats = mockGameData.gameStatistics.playerStatistics.get(mockPlayer2.name);
            player2Stats.livesTaken = 4;
            player2Stats.itemsPicked = 7;

            jest.spyOn(service as any, 'calculateDoorsPercentage').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'calculateAllTilesPercentage').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'calculateGameTime').mockImplementation(() => undefined);

            const result = service.getAllStatistics(mockGameData, 'TestWinner');

            const resultArray = result.playerStatistics;
            expect(resultArray.length).toBe(2);

            const resultPlayer1 = resultArray.find((p) => p.name === mockPlayer1.name);
            const resultPlayer2 = resultArray.find((p) => p.name === mockPlayer2.name);

            expect(resultPlayer1.wins).toBe(player1Stats.wins);
            expect(resultPlayer1.combats).toBe(10);
            expect(resultPlayer1.evasions).toBe(2);
            expect(resultPlayer1.tilesTraversed).toEqual(player1Stats.tilesTraversed);

            expect(resultPlayer2.losses).toBe(player2Stats.losses);
            expect(resultPlayer2.livesTaken).toBe(4);
            expect(resultPlayer2.itemsPicked).toBe(7);
            expect(resultPlayer2.tilesTraversed).toEqual(player2Stats.tilesTraversed);
        });
    });
});
