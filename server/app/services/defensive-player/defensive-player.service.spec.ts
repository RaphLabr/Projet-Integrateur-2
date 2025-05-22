// Use of index for number break naming convertion
/* eslint-disable @typescript-eslint/naming-convention */
// Max line disable in test file
/* eslint-disable max-lines */
// We allow the use of any to access pri
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClosestFreeTileAlgorithm } from '@app/classes/closest-free-tile-algorithm/closest-free-tile-algorithm';
import { AiPlayer } from '@app/constants/ai-player';
import { MapTile } from '@app/constants/map-tile';
import { ObjectInfo } from '@app/constants/object-info';
import { RandomTimeOptions } from '@app/constants/time-options';
import { DefensivePlayerService } from '@app/services/defensive-player/defensive-player.service';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerMovementService } from '@app/services/virtual-player-movement/virtual-player-movement.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Test, TestingModule } from '@nestjs/testing';

describe('DefensivePlayerService', () => {
    let service: DefensivePlayerService;

    const mockGameService = {
        getPlayerPosition: jest.fn(),
        movePlayer: jest.fn(),
    };

    const mockDijkstraService = {
        findShortestPaths: jest.fn(),
        findPathToCharacter: jest.fn(),
    };

    const mockVirtualPlayerService = {
        getClosestObjects: jest.fn(),
        getRouteDoors: jest.fn(),
    };

    const mockVirtualPlayerMovementService = {
        moveTowardPlayer: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DefensivePlayerService,
                { provide: GameService, useValue: mockGameService },
                { provide: DijkstraService, useValue: mockDijkstraService },
                { provide: VirtualPlayerService, useValue: mockVirtualPlayerService },
                { provide: VirtualPlayerMovementService, useValue: mockVirtualPlayerMovementService },
            ],
        }).compile();

        service = module.get<DefensivePlayerService>(DefensivePlayerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('avoidEnemies', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsEnemies: ObjectInfo[];
        let mockCoordsItems: ObjectInfo[];

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockCoordsObjects = [];
            mockCoordsEnemies = [];
            mockCoordsItems = [];

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            mode: GameMode.Classic,
                            terrain: [],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                    speed: 3,
                },
                enemies: [],
            } as unknown as AiPlayer;

            mockGameService.getPlayerPosition.mockReturnValue(mockPosition);

            jest.spyOn(service as any, 'findNearbyObjects').mockResolvedValue({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
                coordsItems: mockCoordsItems,
            });

            jest.spyOn(service as any, 'handleCtfMode').mockResolvedValue(false);
            jest.spyOn(service as any, 'moveToSafestTile').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'moveToDestination').mockResolvedValue(undefined);
        });

        it('should get player position and find nearby objects', async () => {
            await service.avoidEnemies(mockAi);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'ai-player-id');
            expect((service as any).findNearbyObjects).toHaveBeenCalledWith(mockAi, mockPosition);
        });

        it('should move to the first item when items are available', async () => {
            const mockItemCoordinates = { x: 3, y: 3 };
            mockCoordsItems = [{ type: 'item', coordinates: mockItemCoordinates, distance: 2, reachable: true }];

            (service as any).findNearbyObjects.mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
                coordsItems: mockCoordsItems,
            });

            await service.avoidEnemies(mockAi);

            expect((service as any).moveToDestination).toHaveBeenCalledWith(mockAi, mockPosition, mockItemCoordinates);
            expect((service as any).moveToSafestTile).not.toHaveBeenCalled();
        });

        it('should move to the safest tile when no items are available', async () => {
            mockCoordsItems = [];

            (service as any).findNearbyObjects.mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
                coordsItems: mockCoordsItems,
            });

            await service.avoidEnemies(mockAi);

            expect((service as any).moveToSafestTile).toHaveBeenCalledWith(mockAi, mockPosition, mockCoordsEnemies);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
        });

        it('should call handleCtfMode and return early when in CTF mode and it returns true', async () => {
            mockAi.gameInfo.game.map.mode = GameMode.CaptureTheFlag;

            (service as any).handleCtfMode.mockResolvedValueOnce(true);

            await service.avoidEnemies(mockAi);

            expect((service as any).handleCtfMode).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsItems);
            expect((service as any).moveToSafestTile).not.toHaveBeenCalled();
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
        });

        it('should continue processing when in CTF mode but handleCtfMode returns false', async () => {
            mockAi.gameInfo.game.map.mode = GameMode.CaptureTheFlag;

            const mockItemCoordinates = { x: 3, y: 3 };
            mockCoordsItems = [{ type: 'item', coordinates: mockItemCoordinates, distance: 2, reachable: true }];

            (service as any).findNearbyObjects.mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
                coordsItems: mockCoordsItems,
            });

            (service as any).handleCtfMode.mockResolvedValueOnce(false);

            await service.avoidEnemies(mockAi);

            expect((service as any).handleCtfMode).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsItems);
            expect((service as any).moveToDestination).toHaveBeenCalledWith(mockAi, mockPosition, mockItemCoordinates);
            expect((service as any).moveToSafestTile).not.toHaveBeenCalled();
        });

        it('should not call handleCtfMode when not in CTF mode', async () => {
            mockAi.gameInfo.game.map.mode = GameMode.Classic;

            await service.avoidEnemies(mockAi);

            expect((service as any).handleCtfMode).not.toHaveBeenCalled();
        });
    });

    describe('findNearbyObjects', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockObjects: ObjectInfo[];

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            mode: GameMode.Classic,
                            terrain: [],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                    speed: 3,
                },
                enemies: [{ id: 'enemy1' }, { id: 'enemy2' }],
                items: [ItemType.Potion1, ItemType.Potion2],
            } as unknown as AiPlayer;

            mockObjects = [];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValue(mockObjects);
        });

        it('should call virtualPlayerService.getClosestObjects with correct parameters', async () => {
            await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(mockVirtualPlayerService.getClosestObjects).toHaveBeenCalledWith(
                {
                    playerPosition: mockPosition,
                    map: mockAi.gameInfo.game.map,
                    itemTypes: mockAi.items,
                    movementLeft: mockAi.player.speed,
                },
                mockAi.enemies,
            );
        });

        it('should filter objects by type correctly', async () => {
            mockObjects = [
                { type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true },
                { type: 'item', coordinates: { x: 3, y: 3 }, distance: 2, reachable: true },
                { type: 'player', coordinates: { x: 4, y: 4 }, distance: 3, reachable: true },
                { type: 'item', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValueOnce(mockObjects);

            const result = await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(result.coordsObjects).toEqual(mockObjects);

            expect(result.coordsEnemies).toEqual([
                { type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true },
                { type: 'player', coordinates: { x: 4, y: 4 }, distance: 3, reachable: true },
            ]);

            expect(result.coordsItems).toEqual([
                { type: 'item', coordinates: { x: 3, y: 3 }, distance: 2, reachable: true },
                { type: 'item', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ]);
        });

        it('should handle only player objects', async () => {
            mockObjects = [
                { type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true },
                { type: 'player', coordinates: { x: 4, y: 4 }, distance: 3, reachable: true },
            ];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValueOnce(mockObjects);

            const result = await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(result.coordsObjects).toEqual(mockObjects);
            expect(result.coordsEnemies).toEqual(mockObjects);
            expect(result.coordsItems).toEqual([]);
        });

        it('should handle only item objects', async () => {
            mockObjects = [
                { type: 'item', coordinates: { x: 3, y: 3 }, distance: 2, reachable: true },
                { type: 'item', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValueOnce(mockObjects);

            const result = await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(result.coordsObjects).toEqual(mockObjects);
            expect(result.coordsEnemies).toEqual([]);
            expect(result.coordsItems).toEqual(mockObjects);
        });

        it('should handle empty objects array', async () => {
            mockObjects = [];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValueOnce(mockObjects);

            const result = await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(result.coordsObjects).toEqual([]);
            expect(result.coordsEnemies).toEqual([]);
            expect(result.coordsItems).toEqual([]);
        });
    });

    describe('handleCtfMode', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsItems: ObjectInfo[];
        let mockEnemyWithFlag: Player;
        let mockEnemyStartPosition: Coordinates;
        let mockPlayerOccupying: Player;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockEnemyStartPosition = { x: 5, y: 5 };

            mockCoordsObjects = [];
            mockCoordsItems = [{ type: 'item', coordinates: { x: 2, y: 2 }, distance: 3, reachable: true }];

            mockPlayerOccupying = {
                id: CharacterType.Character1,
                name: 'PlayerOccupying',
            } as Player;

            mockEnemyWithFlag = {
                id: CharacterType.Character1,
                name: 'EnemyWithFlag',
                items: [ItemType.Flag],
                startPosition: mockEnemyStartPosition,
            } as Player;

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            mode: GameMode.CaptureTheFlag,
                            terrain: [
                                [{ character: 0 }, { character: 0 }],
                                [{ character: 0 }, { character: 0 }],
                            ],
                        },
                        players: [mockPlayerOccupying],
                    },
                },
                player: {
                    id: 'ai-player-id',
                },
                enemies: [mockEnemyWithFlag],
            } as unknown as AiPlayer;

            mockGameService.getPlayerPosition.mockReturnValue(mockPosition);

            jest.spyOn(service as any, 'areCoordinatesEqual').mockImplementation((a: Coordinates, b: Coordinates) => a.x === b.x && a.y === b.y);
            jest.spyOn(service as any, 'moveToDestination').mockResolvedValue(undefined);
            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(false);
        });

        it('should set flag as first item and return false when flag object is found', async () => {
            const flagObject = {
                type: 'item' as const,
                itemType: ItemType.Flag,
                coordinates: { x: 3, y: 3 },
                distance: 2,
                reachable: true,
            };

            mockCoordsObjects = [
                { type: 'item', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true },
                flagObject,
                { type: 'player', coordinates: { x: 4, y: 4 }, distance: 3, reachable: true },
            ];

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(mockCoordsItems[0]).toBe(flagObject);
            expect(result).toBe(false);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should return true when AI is already at enemy start position', async () => {
            mockGameService.getPlayerPosition.mockReturnValueOnce(mockEnemyStartPosition);

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(true);
            expect((service as any).areCoordinatesEqual).toHaveBeenCalledWith(mockEnemyStartPosition, mockEnemyStartPosition);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should move toward player occupying enemy start position', async () => {
            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValueOnce(true);

            mockAi.gameInfo.game.map.terrain = Array(MapSize.Small)
                .fill(0)
                .map(() => Array(MapSize.Small).fill({ character: 0 }));
            mockAi.gameInfo.game.map.terrain[mockEnemyStartPosition.y][mockEnemyStartPosition.x] = {
                type: MapTileType.Base,
                item: ItemType.NoItem,
                character: CharacterType.Character1,
            };
            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(true);
            expect(ClosestFreeTileAlgorithm.isPositionOccupied).toHaveBeenCalledWith(mockEnemyStartPosition, mockAi.gameInfo.game.map.terrain, true);
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).toHaveBeenCalledWith(mockAi, mockPlayerOccupying);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
        });

        it('should move to enemy start position when not occupied', async () => {
            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValueOnce(false);

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(true);
            expect(ClosestFreeTileAlgorithm.isPositionOccupied).toHaveBeenCalledWith(mockEnemyStartPosition, mockAi.gameInfo.game.map.terrain, true);
            expect((service as any).moveToDestination).toHaveBeenCalledWith(mockAi, mockPosition, mockEnemyStartPosition);
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should return false when no flag object and no enemy has the flag', async () => {
            mockAi.enemies = [{ ...mockEnemyWithFlag, items: [ItemType.Potion1] }] as Player[];

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(false);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should handle empty enemies array', async () => {
            mockAi.enemies = [];

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(false);
            expect((service as any).moveToDestination).not.toHaveBeenCalled();
            expect(mockVirtualPlayerMovementService.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should handle multiple enemies where one has the flag', async () => {
            mockAi.enemies = [
                { id: 'enemy1', items: [ItemType.Potion1] },
                { ...mockEnemyWithFlag },
                { id: 'enemy3', items: [ItemType.Potion2] },
            ] as Player[];

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsItems);

            expect(result).toBe(true);

            expect((service as any).moveToDestination).toHaveBeenCalledWith(mockAi, mockPosition, mockEnemyStartPosition);
        });
    });

    describe('moveToSafestTile', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsEnemies: ObjectInfo[];
        let mockReachableTiles: Map<string, any>;
        let mockSafetyScores: { [key: string]: number };

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true }];

            const mockTerrain = Array(MapSize.Small)
                .fill(0)
                .map(() =>
                    Array(MapSize.Small).fill({
                        type: MapTileType.Base,
                        item: ItemType.NoItem,
                        character: CharacterType.NoCharacter,
                    }),
                );

            mockTerrain[mockPosition.y][mockPosition.x].character = CharacterType.Character2;

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: mockTerrain,
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                    speed: 3,
                },
            } as unknown as AiPlayer;

            mockReachableTiles = new Map();
            mockReachableTiles.set('0,0', { coordinates: { x: 0, y: 0 } });
            mockReachableTiles.set('1,0', { coordinates: { x: 1, y: 0 } });
            mockReachableTiles.set('2,0', { coordinates: { x: 2, y: 0 } });
            mockReachableTiles.set('1,1', { coordinates: { x: 1, y: 1 } });

            mockDijkstraService.findShortestPaths.mockReturnValue(mockReachableTiles);

            mockSafetyScores = {
                '0,0': 5,
                '1,0': 10,
                '2,0': 8,
                '1,1': 3,
            };

            jest.spyOn(service as any, 'calculateSafetyScore').mockImplementation((terrain, coords: Coordinates) => {
                const key = `${coords.x},${coords.y}`;
                return mockSafetyScores[key] || 0;
            });

            jest.spyOn(service as any, 'areCoordinatesEqual').mockImplementation((a: Coordinates, b: Coordinates) => a.x === b.x && a.y === b.y);

            jest.spyOn(service as any, 'moveToDestination').mockResolvedValue(undefined);
        });

        it('should get reachable tiles using dijkstraService', async () => {
            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect(mockDijkstraService.findShortestPaths).toHaveBeenCalledWith(mockAi.gameInfo.game.map.terrain, mockAi.player.speed, mockPosition);
        });

        it('should temporarily modify and restore character at current position', async () => {
            const originalCharacter = mockAi.gameInfo.game.map.terrain[mockPosition.y][mockPosition.x].character;

            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect(mockAi.gameInfo.game.map.terrain[mockPosition.y][mockPosition.x].character).toBe(originalCharacter);
        });

        it('should skip the current position when calculating safety scores', async () => {
            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect((service as any).calculateSafetyScore).not.toHaveBeenCalledWith(mockAi.gameInfo.game.map.terrain, mockPosition, mockCoordsEnemies);
            expect((service as any).calculateSafetyScore).toHaveBeenCalledWith(mockAi.gameInfo.game.map.terrain, { x: 0, y: 0 }, mockCoordsEnemies);
            expect((service as any).calculateSafetyScore).toHaveBeenCalledWith(mockAi.gameInfo.game.map.terrain, { x: 1, y: 0 }, mockCoordsEnemies);
        });

        it('should choose the tile with the highest safety score', async () => {
            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect((service as any).moveToDestination).toHaveBeenCalledWith(mockAi, mockPosition, { x: 1, y: 0 });
        });

        it('should not move if there are no safe tiles other than current position', async () => {
            mockReachableTiles.clear();
            mockReachableTiles.set('1,1', { coordinates: { x: 1, y: 1 } });

            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect((service as any).moveToDestination).not.toHaveBeenCalled();
        });

        it('should handle empty reachable tiles', async () => {
            mockReachableTiles.clear();

            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect((service as any).moveToDestination).not.toHaveBeenCalled();
        });

        it('should handle empty enemies list', async () => {
            const emptyEnemies: ObjectInfo[] = [];

            await (service as any).moveToSafestTile(mockAi, mockPosition, emptyEnemies);

            expect(mockDijkstraService.findShortestPaths).toHaveBeenCalled();
            expect((service as any).calculateSafetyScore).toHaveBeenCalled();
            expect((service as any).moveToDestination).toHaveBeenCalled();
        });

        it('should move to the safest tile even when multiple tiles have the same score', async () => {
            mockSafetyScores['0,0'] = 10;
            mockSafetyScores['1,0'] = 10;

            await (service as any).moveToSafestTile(mockAi, mockPosition, mockCoordsEnemies);

            expect((service as any).moveToDestination).toHaveBeenCalled();
            const calledDestination = (service as any).moveToDestination.mock.calls[0][2];
            const ten = 10;
            expect(mockSafetyScores[`${calledDestination.x},${calledDestination.y}`]).toBe(ten);
        });
    });

    describe('calculateSafetyScore', () => {
        let mockTerrain: MapTile[][];
        let mockTileCoords: Coordinates;
        let mockEnemies: ObjectInfo[];
        let mockPath: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockTileCoords = { x: 1, y: 1 };

            mockTerrain = Array(MapSize.Small)
                .fill(0)
                .map(() =>
                    Array(MapSize.Small).fill({
                        type: MapTileType.Base,
                        item: ItemType.NoItem,
                        character: CharacterType.NoCharacter,
                    }),
                );

            mockEnemies = [];

            mockPath = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 1 },
                    { x: 3, y: 1 },
                ],
                doors: [],
            };

            mockDijkstraService.findPathToCharacter.mockReturnValue(mockPath);
        });

        it('should calculate safety score with a single enemy that has a path', () => {
            mockEnemies = [{ type: 'player', coordinates: { x: 3, y: 1 }, distance: 2, reachable: true }];
            mockPath.path = [
                { x: 3, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 1 },
            ];
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({ ...mockPath, path: [...mockPath.path] });

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);
            const three = 3;
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(mockTerrain, mockEnemies[0].coordinates, mockTileCoords, true);
            expect(result).toBe(three);
        });

        it('should calculate safety score with a single enemy that has no path', () => {
            mockEnemies = [{ type: 'player', coordinates: { x: 3, y: 1 }, distance: 2, reachable: true }];
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce(null);

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(mockTerrain, mockEnemies[0].coordinates, mockTileCoords, true);
            expect(result).toBe(RandomTimeOptions.DefaultTime);
        });

        it('should calculate safety score with multiple enemies with paths', () => {
            mockEnemies = [
                { type: 'player', coordinates: { x: 3, y: 1 }, distance: 2, reachable: true },
                { type: 'player', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ];

            const path1 = [
                { x: 3, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 1 },
            ];
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({ path: path1, doors: [] });

            const path2 = [
                { x: 5, y: 5 },
                { x: 4, y: 4 },
                { x: 3, y: 3 },
                { x: 2, y: 2 },
                { x: 1, y: 1 },
            ];
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({ path: path2, doors: [] });

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);
            const eight = 8;
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledTimes(2);
            expect(result).toBe(eight);
        });

        it('should calculate safety score with multiple enemies without paths', () => {
            mockEnemies = [
                { type: 'player', coordinates: { x: 3, y: 1 }, distance: 2, reachable: true },
                { type: 'player', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ];

            mockDijkstraService.findPathToCharacter.mockReturnValue(null);

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledTimes(2);
            expect(result).toBe(RandomTimeOptions.DefaultTime * 2);
        });

        it('should calculate safety score with mixed cases (some with paths, some without)', () => {
            mockEnemies = [
                { type: 'player', coordinates: { x: 3, y: 1 }, distance: 2, reachable: true },
                { type: 'player', coordinates: { x: 5, y: 5 }, distance: 4, reachable: true },
            ];

            const path1 = [
                { x: 3, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 1 },
            ];
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({ path: path1, doors: [] });

            mockDijkstraService.findPathToCharacter.mockReturnValueOnce(null);

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);
            const three = 3;
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledTimes(2);
            expect(result).toBe(three + RandomTimeOptions.DefaultTime);
        });

        it('should calculate safety score with empty enemies array', () => {
            mockEnemies = [];

            const result = (service as any).calculateSafetyScore(mockTerrain, mockTileCoords, mockEnemies);

            expect(mockDijkstraService.findPathToCharacter).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });
    });

    describe('moveToDestination', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockDestination: Coordinates;
        let mockRoute: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockDestination = { x: 3, y: 3 };

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                },
            } as unknown as AiPlayer;

            mockRoute = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                ],
                doors: [],
            };

            mockVirtualPlayerService.getRouteDoors.mockResolvedValue(mockRoute);
        });

        it('should call virtualPlayerService.getRouteDoors with correct parameters', async () => {
            await (service as any).moveToDestination(mockAi, mockPosition, mockDestination);

            expect(mockVirtualPlayerService.getRouteDoors).toHaveBeenCalledWith(mockAi, mockPosition, mockDestination);
        });

        it('should call gameService.movePlayer with reversed path when route exists', async () => {
            const originalPath = [...mockRoute.path];

            await (service as any).moveToDestination(mockAi, mockPosition, mockDestination);

            const reversedPath = [...originalPath].reverse();
            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', reversedPath);
        });

        it('should not call gameService.movePlayer when no route exists', async () => {
            mockVirtualPlayerService.getRouteDoors.mockResolvedValueOnce(null);

            await (service as any).moveToDestination(mockAi, mockPosition, mockDestination);

            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
        });

        it('should reverse the path before passing it to movePlayer', async () => {
            const originalPath = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];

            mockRoute.path = [...originalPath];

            await (service as any).moveToDestination(mockAi, mockPosition, mockDestination);

            const expectedReversedPath = [
                { x: 3, y: 3 },
                { x: 2, y: 2 },
                { x: 1, y: 1 },
            ];

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', expectedReversedPath);
        });

        it('should handle empty path in route', async () => {
            mockRoute.path = [];

            await (service as any).moveToDestination(mockAi, mockPosition, mockDestination);

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', []);
        });
    });

    describe('areCoordinatesEqual', () => {
        it('should return true for equal coordinates', () => {
            const a = { x: 5, y: 7 };
            const b = { x: 5, y: 7 };

            const result = (service as any).areCoordinatesEqual(a, b);

            expect(result).toBe(true);
        });

        it('should return false for coordinates with different x values', () => {
            const a = { x: 5, y: 7 };
            const b = { x: 6, y: 7 };

            const result = (service as any).areCoordinatesEqual(a, b);

            expect(result).toBe(false);
        });

        it('should return false for coordinates with different y values', () => {
            const a = { x: 5, y: 7 };
            const b = { x: 5, y: 8 };

            const result = (service as any).areCoordinatesEqual(a, b);

            expect(result).toBe(false);
        });

        it('should handle zero coordinates correctly', () => {
            const a = { x: 0, y: 0 };
            const b = { x: 0, y: 0 };

            const result = (service as any).areCoordinatesEqual(a, b);

            expect(result).toBe(true);
        });
    });
});
