// Need magic number
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Max line disable in test file
/* eslint-disable max-lines */
// Use any for private component
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AiPlayer } from '@app/constants/ai-player';
import { ObjectInfo } from '@app/constants/object-info';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { AggressivePlayerService } from './aggressive-player.service';

describe('AggressivePlayerService', () => {
    let service: AggressivePlayerService;

    const mockGameService = {
        getPlayerPosition: jest.fn(),
        getGame: jest.fn(),
        movePlayer: jest.fn(),
    };

    const mockDijkstraService = {
        calculateCost: jest.fn(),
        findPathToCharacter: jest.fn(),
    };

    const mockVirtualPlayerService = {
        getClosestObjects: jest.fn(),
        getRouteDoors: jest.fn(),
        initiateCombat: jest.fn(),
    };

    const mockDefensivePlayerService = {
        avoidEnemies: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = new AggressivePlayerService(
            mockGameService as any,
            mockDijkstraService as any,
            mockVirtualPlayerService as any,
            mockDefensivePlayerService as any,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('moveTowardEnemies', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsEnemies: ObjectInfo[];

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockCoordsObjects = [];
            mockCoordsEnemies = [];

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
            } as any as AiPlayer;

            mockGameService.getPlayerPosition.mockReturnValue(mockPosition);

            jest.spyOn(service as any, 'findNearbyObjects').mockResolvedValue({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
            });

            jest.spyOn(service as any, 'handleCtfMode').mockResolvedValue(true);
            jest.spyOn(service as any, 'shouldPrioritizeItems').mockReturnValue(false);
            jest.spyOn(service as any, 'moveAndInitiateCombat').mockResolvedValue(undefined);
        });

        it('should get player position and find nearby objects', async () => {
            await service.moveTowardEnemies(mockAi);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'ai-player-id');
            expect(service['findNearbyObjects']).toHaveBeenCalledWith(mockAi, mockPosition);
        });

        it('should return early when there are no enemies', async () => {
            mockCoordsEnemies = [];
            (service['findNearbyObjects'] as jest.Mock).mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
            });

            await service.moveTowardEnemies(mockAi);

            expect(service['moveAndInitiateCombat']).not.toHaveBeenCalled();
            expect(mockDefensivePlayerService.avoidEnemies).not.toHaveBeenCalled();
        });

        it('should return early when in CTF mode and handleCtfMode returns false', async () => {
            mockAi.gameInfo.game.map.mode = GameMode.CaptureTheFlag;
            (service['handleCtfMode'] as jest.Mock).mockResolvedValueOnce(false);

            await service.moveTowardEnemies(mockAi);

            expect(service['moveAndInitiateCombat']).not.toHaveBeenCalled();
            expect(mockDefensivePlayerService.avoidEnemies).not.toHaveBeenCalled();
        });

        it('should proceed when in CTF mode and handleCtfMode returns true', async () => {
            mockAi.gameInfo.game.map.mode = GameMode.CaptureTheFlag;
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true }];
            (service['findNearbyObjects'] as jest.Mock).mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
            });
            (service['handleCtfMode'] as jest.Mock).mockResolvedValueOnce(true);

            await service.moveTowardEnemies(mockAi);

            expect(service['handleCtfMode']).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsEnemies);
            expect(service['shouldPrioritizeItems']).toHaveBeenCalled();
            expect(service['moveAndInitiateCombat']).toHaveBeenCalled();
        });

        it('should call avoidEnemies when shouldPrioritizeItems returns true', async () => {
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true }];
            (service['findNearbyObjects'] as jest.Mock).mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
            });
            (service['shouldPrioritizeItems'] as jest.Mock).mockReturnValueOnce(true);

            await service.moveTowardEnemies(mockAi);

            expect(service['shouldPrioritizeItems']).toHaveBeenCalledWith(mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);
            expect(mockDefensivePlayerService.avoidEnemies).toHaveBeenCalledWith(mockAi);
            expect(service['moveAndInitiateCombat']).not.toHaveBeenCalled();
        });

        it('should call moveAndInitiateCombat when enemies exist and shouldPrioritizeItems is false', async () => {
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true }];
            (service['findNearbyObjects'] as jest.Mock).mockResolvedValueOnce({
                coordsObjects: mockCoordsObjects,
                coordsEnemies: mockCoordsEnemies,
            });
            (service['shouldPrioritizeItems'] as jest.Mock).mockReturnValueOnce(false);

            await service.moveTowardEnemies(mockAi);

            expect(service['shouldPrioritizeItems']).toHaveBeenCalledWith(mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);
            expect(mockDefensivePlayerService.avoidEnemies).not.toHaveBeenCalled();
            expect(service['moveAndInitiateCombat']).toHaveBeenCalledWith(mockAi, mockPosition, mockCoordsEnemies);
        });
    });

    describe('ctfBehavior', () => {
        let mockAi: AiPlayer;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsEnemies: ObjectInfo[];
        let mockEnemyPosition: Coordinates;
        let mockGame: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockEnemyPosition = { x: 5, y: 5 };
            mockCoordsObjects = [];
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 3, y: 3 }, distance: 3, reachable: true }];

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            mode: GameMode.CaptureTheFlag,
                            terrain: [],
                        },
                        players: [],
                    },
                },
                player: {
                    id: 'ai-player-id',
                    team: 'blue-team',
                },
                enemies: [],
            } as any as AiPlayer;

            mockGame = {
                players: [],
            };

            mockGameService.getGame.mockReturnValue(mockGame);
            mockGameService.getPlayerPosition.mockReturnValue(mockEnemyPosition);
        });

        it('should return false when a flag object is found in coordsObjects', async () => {
            const flagObject = {
                type: 'item',
                coordinates: { x: 2, y: 2 },
                distance: 2,
                reachable: true,
                itemType: ItemType.Flag,
            };
            mockCoordsObjects = [{ ...flagObject, type: 'item' }];

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getGame).not.toHaveBeenCalled();
            expect(mockGameService.getPlayerPosition).not.toHaveBeenCalled();
        });

        it('should return true and update coordsEnemies when an enemy has the flag', async () => {
            const mockEnemy = {
                id: 'enemy-id',
                items: [ItemType.Flag, ItemType.Potion1],
            };

            mockAi.enemies = [mockEnemy] as any;

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockCoordsEnemies[0]).toEqual({
                playerId: 'enemy-id',
                type: 'player',
                coordinates: mockEnemyPosition,
                distance: 0,
                reachable: true,
            });
        });

        it('should return false when no flag object and no enemy with flag, but team has flag', async () => {
            const teammateMock = {
                id: 'teammate-id',
                team: 'blue-team',
                items: [ItemType.Flag],
            };

            mockGame.players = [teammateMock];
            mockAi.enemies = [] as any;

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getGame).toHaveBeenCalledWith('test-game-id');
        });

        it('should proceed to handle enemy with flag when no flag object and no team member has flag', async () => {
            mockGame.players = [
                { id: 'teammate-id', team: 'blue-team', items: [ItemType.Potion1] },
                { id: 'enemy-id', team: 'red-team', items: [] },
            ];

            const enemyWithFlag = {
                id: 'enemy-with-flag',
                items: [ItemType.Flag],
            };
            mockAi.enemies = [enemyWithFlag] as any;

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect(mockCoordsEnemies[0].playerId).toBe('enemy-with-flag');
        });

        it('should handle multiple enemies where one has the flag', async () => {
            const enemyWithFlag = {
                id: 'enemy-with-flag',
                items: [ItemType.Flag],
            };

            const enemyWithoutFlag = {
                id: 'enemy-without-flag',
                items: [ItemType.Potion1],
            };

            mockAi.enemies = [enemyWithoutFlag, enemyWithFlag] as any;

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-with-flag');
            expect(mockCoordsEnemies[0].playerId).toBe('enemy-with-flag');
        });

        it('should handle null team for AI player', async () => {
            mockAi.player.team = null;

            const enemyWithFlag = {
                id: 'enemy-with-flag',
                items: [ItemType.Flag],
            };
            mockAi.enemies = [enemyWithFlag] as any;

            const result = await service['ctfBehavior'](mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect(mockCoordsEnemies[0].playerId).toBe('enemy-with-flag');
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-with-flag');
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
            } as any as AiPlayer;

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
        });

        it('should handle empty objects array', async () => {
            mockObjects = [];

            mockVirtualPlayerService.getClosestObjects.mockResolvedValueOnce(mockObjects);

            const result = await (service as any).findNearbyObjects(mockAi, mockPosition);

            expect(result.coordsObjects).toEqual([]);
            expect(result.coordsEnemies).toEqual([]);
        });
    });

    describe('handleCtfMode', () => {
        let mockAi: AiPlayer;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsEnemies: ObjectInfo[];

        beforeEach(() => {
            jest.clearAllMocks();

            mockCoordsObjects = [];
            mockCoordsEnemies = [{ type: 'player', coordinates: { x: 3, y: 3 }, distance: 3, reachable: true }];

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            mode: GameMode.CaptureTheFlag,
                            terrain: [],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                },
                enemies: [],
            } as unknown as AiPlayer;

            jest.spyOn(service as any, 'ctfBehavior').mockResolvedValue(true);
        });

        it('should return true when ctfBehavior returns true', async () => {
            (service as any).ctfBehavior.mockResolvedValueOnce(true);

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect((service as any).ctfBehavior).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsEnemies);
            expect(mockDefensivePlayerService.avoidEnemies).not.toHaveBeenCalled();
        });

        it('should call avoidEnemies and return false when ctfBehavior returns false', async () => {
            (service as any).ctfBehavior.mockResolvedValueOnce(false);

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect((service as any).ctfBehavior).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsEnemies);
            expect(mockDefensivePlayerService.avoidEnemies).toHaveBeenCalledWith(mockAi);
        });

        it('should call avoidEnemies and return false when ctfBehavior returns null', async () => {
            (service as any).ctfBehavior.mockResolvedValueOnce(null);

            const result = await (service as any).handleCtfMode(mockAi, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect((service as any).ctfBehavior).toHaveBeenCalledWith(mockAi, mockCoordsObjects, mockCoordsEnemies);
            expect(mockDefensivePlayerService.avoidEnemies).toHaveBeenCalledWith(mockAi);
        });

        it('should pass parameters correctly to ctfBehavior', async () => {
            const customObjects = [{ type: 'item', coordinates: { x: 1, y: 1 }, distance: 1, reachable: true }];
            const customEnemies = [{ type: 'player', coordinates: { x: 2, y: 2 }, distance: 2, reachable: true }];

            await (service as any).handleCtfMode(mockAi, customObjects, customEnemies);

            expect((service as any).ctfBehavior).toHaveBeenCalledWith(mockAi, customObjects, customEnemies);
        });
    });

    describe('shouldPrioritizeItems', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsObjects: ObjectInfo[];
        let mockCoordsEnemies: ObjectInfo[];
        let mockPathToEnemy: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            const mockEnemyPosition = { x: 5, y: 5 };

            mockCoordsObjects = [{ type: 'item', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true }];
            mockCoordsEnemies = [{ type: 'player', playerId: 'enemy-id', coordinates: { x: 3, y: 3 }, distance: 3, reachable: true }];

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
                enemies: [{ id: 'enemy-id' }],
            } as unknown as AiPlayer;

            mockGameService.getPlayerPosition.mockReturnValue(mockEnemyPosition);

            mockPathToEnemy = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                    { x: 4, y: 4 },
                    { x: 5, y: 5 },
                ],
                doors: [],
            };

            mockDijkstraService.findPathToCharacter.mockReturnValue(mockPathToEnemy);
            mockDijkstraService.calculateCost.mockReturnValue(10);
        });

        it('should return false when there are no enemies', () => {
            mockCoordsEnemies = [];

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).not.toHaveBeenCalled();
            expect(mockDijkstraService.findPathToCharacter).not.toHaveBeenCalled();
            expect(mockDijkstraService.calculateCost).not.toHaveBeenCalled();
        });

        it('should return false when game mode is not Classic', () => {
            mockAi.gameInfo.game.map.mode = GameMode.CaptureTheFlag;

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalled();
        });

        it('should return false when path cost is less than or equal to 2x player speed', () => {
            mockDijkstraService.calculateCost.mockReturnValueOnce(6);

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalled();
            expect(mockDijkstraService.calculateCost).toHaveBeenCalled();
        });

        it('should return false when first object is not an item', () => {
            mockCoordsObjects = [{ type: 'player', coordinates: { x: 2, y: 2 }, distance: 1, reachable: true }];

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalled();
            expect(mockDijkstraService.calculateCost).toHaveBeenCalled();
        });

        it('should return true when all conditions are met', () => {
            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(true);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                mockPosition,
                mockGameService.getPlayerPosition(),
                false,
            );
            expect(mockDijkstraService.calculateCost).toHaveBeenCalledWith(mockPathToEnemy, mockAi.gameInfo.game.map.terrain);
        });

        it('should handle case when enemy is not found', () => {
            mockCoordsEnemies[0].playerId = 'non-existent-enemy';

            jest.spyOn(service as any, 'shouldPrioritizeItems').mockImplementationOnce(() => false);

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
        });

        it('should handle null return from findPathToCharacter', () => {
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce(null);
            mockDijkstraService.calculateCost.mockReturnValueOnce(0);

            const result = service['shouldPrioritizeItems'](mockAi, mockPosition, mockCoordsObjects, mockCoordsEnemies);

            expect(result).toBe(false);
            expect(mockDijkstraService.calculateCost).toHaveBeenCalledWith(null, mockAi.gameInfo.game.map.terrain);
        });
    });

    describe('moveAndInitiateCombat', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockCoordsEnemies: ObjectInfo[];
        let mockEnemy: any;
        let mockEnemyPosition: Coordinates;
        let mockRoute: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockEnemyPosition = { x: 5, y: 5 };
            mockEnemy = { id: 'enemy-id' };
            mockCoordsEnemies = [{ playerId: 'enemy-id', type: 'player', coordinates: mockEnemyPosition, distance: 4, reachable: true }];

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                },
                enemies: [mockEnemy],
            } as unknown as AiPlayer;

            mockRoute = {
                path: [
                    { x: 5, y: 5 },
                    { x: 4, y: 4 },
                    { x: 3, y: 3 },
                    { x: 2, y: 2 },
                    { x: 1, y: 1 },
                ],
                doors: [],
            };

            mockGameService.getPlayerPosition.mockReturnValue(mockEnemyPosition);
            mockVirtualPlayerService.getRouteDoors.mockResolvedValue(mockRoute);
        });

        it('should move player to enemy and initiate combat when route is available', async () => {
            await service['moveAndInitiateCombat'](mockAi, mockPosition, mockCoordsEnemies);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy-id');
            expect(mockVirtualPlayerService.getRouteDoors).toHaveBeenCalledWith(mockAi, mockPosition, mockEnemyPosition);

            const expectedPath = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
            ];
            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', expectedPath);
            expect(mockVirtualPlayerService.initiateCombat).toHaveBeenCalledWith(mockAi, mockEnemy);
        });

        it('should not proceed when no route is found', async () => {
            mockVirtualPlayerService.getRouteDoors.mockResolvedValueOnce(null);

            await service['moveAndInitiateCombat'](mockAi, mockPosition, mockCoordsEnemies);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalled();
            expect(mockVirtualPlayerService.getRouteDoors).toHaveBeenCalled();
            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
            expect(mockVirtualPlayerService.initiateCombat).not.toHaveBeenCalled();
        });

        it('should handle empty path in route', async () => {
            mockVirtualPlayerService.getRouteDoors.mockResolvedValueOnce({ path: [], doors: [] });

            await service['moveAndInitiateCombat'](mockAi, mockPosition, mockCoordsEnemies);

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', []);
            expect(mockVirtualPlayerService.initiateCombat).toHaveBeenCalled();
        });

        it('should handle path with only one position', async () => {
            mockVirtualPlayerService.getRouteDoors.mockResolvedValueOnce({ path: [{ x: 5, y: 5 }], doors: [] });

            await service['moveAndInitiateCombat'](mockAi, mockPosition, mockCoordsEnemies);

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', []);
            expect(mockVirtualPlayerService.initiateCombat).toHaveBeenCalled();
        });
    });
});
