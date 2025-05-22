// Max line disable for test files
/* eslint-disable max-lines */
// We use any to access private methods for testing purposes
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AiPlayer } from '@app/constants/ai-player';
import { RouteInfo } from '@app/constants/route';
import { RandomTimeOptions } from '@app/constants/time-options';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerMovementService } from '@app/services/virtual-player-movement/virtual-player-movement.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import * as sleepModule from '@app/utils/sleep/sleep';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Test, TestingModule } from '@nestjs/testing';

describe('VirtualPlayerMovementService', () => {
    let service: VirtualPlayerMovementService;

    const mockGameService = {
        getGame: jest.fn(),
        getPlayerPosition: jest.fn(),
        movePlayer: jest.fn(),
    };

    const mockGameMapService = {
        isDoorUpdateAllowed: jest.fn(),
    };

    const mockGameReceiverGateway = {
        updateDoor: jest.fn(),
    };

    const mockVirtualPlayerService = {
        initiateCombat: jest.fn(),
        randomTime: jest.fn(),
    };

    const mockDijkstraService = {
        findCompletePath: jest.fn(),
        findPathToCharacter: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerMovementService,
                { provide: GameService, useValue: mockGameService },
                { provide: GameMapService, useValue: mockGameMapService },
                { provide: GameReceiverGateway, useValue: mockGameReceiverGateway },
                { provide: VirtualPlayerService, useValue: mockVirtualPlayerService },
                { provide: DijkstraService, useValue: mockDijkstraService },
            ],
        }).compile();

        service = module.get<VirtualPlayerMovementService>(VirtualPlayerMovementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('moveThroughDoors', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockTargetPosition: Coordinates;
        let mockRouteInfo: RouteInfo;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockTargetPosition = { x: 5, y: 5 };
            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                            ],
                        },
                    },
                },
                player: {
                    id: 'player1',
                    speed: 3,
                },
            } as unknown as AiPlayer;

            mockRouteInfo = {
                path: [
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                    { x: 4, y: 4 },
                ],
                doors: [],
            };

            jest.spyOn(service as any, 'findInitialPath').mockReturnValue(mockRouteInfo);
            jest.spyOn(service as any, 'moveWithinSpeedLimit').mockResolvedValue({ x: 4, y: 4 });
            jest.spyOn(service as any, 'handleDoorInPath').mockResolvedValue({ x: 4, y: 4 });

            mockDijkstraService.findPathToCharacter.mockReturnValue(mockRouteInfo);
        });

        it('should return null if initial path is not found', async () => {
            (service as any).findInitialPath.mockReturnValueOnce(null);

            const result = await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect(result).toBeNull();
            expect((service as any).findInitialPath).toHaveBeenCalledWith(mockAi, mockPosition, mockTargetPosition);
            expect((service as any).moveWithinSpeedLimit).not.toHaveBeenCalled();
        });

        it('should move within speed limit when a path is found', async () => {
            await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect((service as any).moveWithinSpeedLimit).toHaveBeenCalledWith(mockAi, mockPosition, mockRouteInfo);
        });

        it('should handle doors in the path if present', async () => {
            const routeWithDoor = {
                ...mockRouteInfo,
                doors: [{ x: 3, y: 3 }],
            };
            (service as any).findInitialPath.mockReturnValueOnce(routeWithDoor);

            await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect((service as any).handleDoorInPath).toHaveBeenCalledWith(mockAi, { x: 4, y: 4 }, { x: 3, y: 3 });
        });

        it('should not handle doors if none are in the path', async () => {
            const routeWithoutDoor = {
                ...mockRouteInfo,
                doors: [],
            };
            (service as any).findInitialPath.mockReturnValueOnce(routeWithoutDoor);

            await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect((service as any).handleDoorInPath).not.toHaveBeenCalled();
        });

        it('should return final path after movement', async () => {
            const finalPosition = { x: 4, y: 4 };
            const finalRoute = {
                path: [
                    { x: 4, y: 4 },
                    { x: 5, y: 5 },
                ],
                doors: [],
                combatPositions: [],
            };

            mockDijkstraService.findPathToCharacter.mockReturnValueOnce(finalRoute);

            const result = await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect(result).toBe(finalRoute);
            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                finalPosition,
                mockTargetPosition,
                false,
            );
        });

        it('should call findInitialPath with correct parameters', async () => {
            await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect((service as any).findInitialPath).toHaveBeenCalledWith(mockAi, mockPosition, mockTargetPosition);
        });

        it('should pass correct parameters to dijkstraService.findPathToCharacter', async () => {
            const newPosition = { x: 4, y: 4 };
            (service as any).moveWithinSpeedLimit.mockResolvedValueOnce(newPosition);

            await service.moveThroughDoors(mockAi, mockPosition, mockTargetPosition);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                newPosition,
                mockTargetPosition,
                false,
            );
        });
    });

    describe('forceMoveStart', () => {
        let mockAi: AiPlayer;

        beforeEach(() => {
            jest.clearAllMocks();

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                            ],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                    startPosition: { x: 3, y: 4 },
                },
                enemies: [
                    { id: 'enemy1-id', name: 'Enemy1' },
                    { id: 'enemy2-id', name: 'Enemy2' },
                ],
            } as unknown as AiPlayer;

            jest.spyOn(service, 'moveTowardPlayer').mockResolvedValue(undefined);
        });

        it('should return false when no enemy is on the start position', async () => {
            mockGameService.getPlayerPosition.mockReturnValueOnce({ x: 1, y: 1 }).mockReturnValueOnce({ x: 2, y: 2 });

            const result = await service.forceMoveStart(mockAi);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy1-id');
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'enemy2-id');
            expect(service.moveTowardPlayer).not.toHaveBeenCalled();
            expect(mockVirtualPlayerService.initiateCombat).not.toHaveBeenCalled();
        });

        it('should move toward enemy and initiate combat when enemy is on start position', async () => {
            mockGameService.getPlayerPosition.mockReturnValueOnce({ x: 3, y: 4 }).mockReturnValueOnce({ x: 2, y: 2 });

            const result = await service.forceMoveStart(mockAi);

            expect(result).toBe(true);
            expect(service.moveTowardPlayer).toHaveBeenCalledWith(mockAi, mockAi.enemies[0]);
            expect(mockVirtualPlayerService.initiateCombat).toHaveBeenCalledWith(mockAi, mockAi.enemies[0]);
        });

        it('should find the correct enemy when multiple enemies exist', async () => {
            mockGameService.getPlayerPosition.mockImplementation((gameId, characterId) => {
                if (characterId === 'enemy1-id') {
                    return { x: 1, y: 1 };
                } else if (characterId === 'enemy2-id') {
                    return { x: 3, y: 4 };
                }
                return null;
            });

            const result = await service.forceMoveStart(mockAi);

            expect(result).toBe(true);
            expect(service.moveTowardPlayer).toHaveBeenCalledWith(mockAi, mockAi.enemies[1]);
            expect(mockVirtualPlayerService.initiateCombat).toHaveBeenCalledWith(mockAi, mockAi.enemies[1]);
        });

        it('should properly handle the case with no enemies', async () => {
            mockAi.enemies = [];

            const result = await service.forceMoveStart(mockAi);

            expect(result).toBe(false);
            expect(mockGameService.getPlayerPosition).not.toHaveBeenCalled();
            expect(service.moveTowardPlayer).not.toHaveBeenCalled();
        });

        it('should call moveTowardPlayer before initiating combat', async () => {
            mockGameService.getPlayerPosition.mockReturnValueOnce({ x: 3, y: 4 });
            const callOrder: string[] = [];
            jest.spyOn(service, 'moveTowardPlayer').mockImplementation(async () => {
                callOrder.push('moveTowardPlayer');
            });
            mockVirtualPlayerService.initiateCombat.mockImplementation(async () => {
                callOrder.push('initiateCombat');
            });

            await service.forceMoveStart(mockAi);

            expect(callOrder).toEqual(['moveTowardPlayer', 'initiateCombat']);
        });
    });

    describe('findInitialPath', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockTargetPosition: Coordinates;
        let mockRouteInfo: RouteInfo;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockTargetPosition = { x: 5, y: 5 };
            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                            ],
                        },
                    },
                },
                player: { id: 'player1' },
            } as unknown as AiPlayer;

            mockRouteInfo = {
                path: [
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                    { x: 4, y: 4 },
                ],
                doors: [],
            };

            mockDijkstraService.findPathToCharacter.mockReturnValue(mockRouteInfo);
        });

        it('should call dijkstraService.findPathToCharacter with correct parameters', () => {
            (service as any).findInitialPath(mockAi, mockPosition, mockTargetPosition);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                mockPosition,
                mockTargetPosition,
                false,
            );
        });

        it('should return the RouteInfo object from dijkstraService', () => {
            const result = (service as any).findInitialPath(mockAi, mockPosition, mockTargetPosition);

            expect(result).toBe(mockRouteInfo);
        });
    });

    describe('moveWithinSpeedLimit', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockRoute: RouteInfo;
        let mockTerrain: any[][];

        beforeEach(() => {
            jest.clearAllMocks();

            mockTerrain = [
                [
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Water, character: 0, item: 0 },
                    { type: MapTileType.Ice, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                ],
                [
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                    { type: MapTileType.Base, character: 0, item: 0 },
                ],
            ];

            mockPosition = { x: 0, y: 0 };
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
                    id: 'player1',
                    speed: 3,
                },
            } as unknown as AiPlayer;

            mockRoute = {
                path: [
                    { x: 1, y: 0 },
                    { x: 2, y: 0 },
                    { x: 3, y: 0 },
                    { x: 4, y: 0 },
                ],
                doors: [],
            };

            mockGameService.movePlayer.mockResolvedValue(undefined);

            jest.spyOn(service as any, 'calculateMovementCost').mockImplementation((tileType) => {
                return tileType === MapTileType.Ice ? 0 : tileType === MapTileType.Water ? 2 : 1;
            });
        });

        it('should move along the path within speed limit', async () => {
            const result = await (service as any).moveWithinSpeedLimit(mockAi, mockPosition, mockRoute);

            const expectedPath = [
                { x: 3, y: 0 },
                { x: 2, y: 0 },
                { x: 1, y: 0 },
            ];

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', expectedPath);
            expect(result).toEqual({ x: 1, y: 0 });
        });

        it('should include free movement on ice tiles', async () => {
            mockAi.player.speed = 2;

            mockRoute.path = [
                { x: 1, y: 0 },
                { x: 3, y: 0 },
                { x: 4, y: 0 },
            ];

            const result = await (service as any).moveWithinSpeedLimit(mockAi, mockPosition, mockRoute);

            const expectedPath = [
                { x: 4, y: 0 },
                { x: 3, y: 0 },
                { x: 1, y: 0 },
            ];

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', expectedPath);
            expect(result).toEqual({ x: 1, y: 0 });
        });

        it('should return original position when movement is not possible', async () => {
            mockAi.player.speed = 0;

            const result = await (service as any).moveWithinSpeedLimit(mockAi, mockPosition, mockRoute);

            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
            expect(result).toEqual(mockPosition);
        });

        it('should correctly calculate costs for different terrain types', async () => {
            mockRoute.path = [
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 3, y: 0 },
            ];

            mockAi.player.speed = 4;

            await (service as any).moveWithinSpeedLimit(mockAi, mockPosition, mockRoute);

            expect((service as any).calculateMovementCost).toHaveBeenCalledWith(MapTileType.Base);
            expect((service as any).calculateMovementCost).toHaveBeenCalledWith(MapTileType.Water);
            expect((service as any).calculateMovementCost).toHaveBeenCalledWith(MapTileType.Ice);
        });

        it('should reverse the path before sending to movePlayer', async () => {
            await (service as any).moveWithinSpeedLimit(mockAi, mockPosition, mockRoute);

            const path = mockGameService.movePlayer.mock.calls[0][1];
            expect(path[0]).toEqual({ x: 3, y: 0 });
            expect(path[path.length - 1]).toEqual({ x: 1, y: 0 });
        });
    });

    describe('moveTowardPlayer', () => {
        let mockAi: AiPlayer;
        let mockTargetPlayer: Player;
        let mockPlayerPosition: Coordinates;
        let mockTargetPosition: Coordinates;
        let mockPathToPlayer: Coordinates[];
        let mockRoute: RouteInfo;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPlayerPosition = { x: 1, y: 1 };
            mockTargetPosition = { x: 5, y: 5 };
            mockTargetPlayer = {
                id: CharacterType.Character1,
                name: 'TargetPlayer',
            } as Player;

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                            ],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                    name: 'AiPlayer',
                },
            } as unknown as AiPlayer;

            mockPathToPlayer = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
            ];

            mockRoute = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                ],
                doors: [],
            };

            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === 'ai-player-id') return mockPlayerPosition;
                if (playerId === CharacterType.Character1) return mockTargetPosition;
                return null;
            });

            mockDijkstraService.findPathToCharacter.mockReturnValue({ path: [...mockPathToPlayer] });

            jest.spyOn(service, 'moveThroughDoors').mockResolvedValue(mockRoute);
        });

        it('should get positions for both players', async () => {
            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', CharacterType.Character1);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'ai-player-id');
        });

        it('should find path to target player using dijkstra', async () => {
            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                mockPlayerPosition,
                mockTargetPosition,
                false,
            );
        });

        it('should remove the last two positions from the path to player', async () => {
            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(service.moveThroughDoors).toHaveBeenCalledWith(mockAi, mockPlayerPosition, { x: 4, y: 4 });
        });

        it('should move the player along the route when valid route is returned', async () => {
            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', [
                { x: 3, y: 3 },
                { x: 2, y: 2 },
                { x: 1, y: 1 },
            ]);
        });

        it('should not call movePlayer when no route is returned from moveThroughDoors', async () => {
            service.moveThroughDoors = jest.fn().mockResolvedValue(null);

            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
        });

        it('should not attempt movement when path to player is too short', async () => {
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({
                path: [{ x: 1, y: 1 }],
            });

            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(service.moveThroughDoors).not.toHaveBeenCalled();
            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
        });

        it('should handle empty path returned from dijkstra', async () => {
            mockDijkstraService.findPathToCharacter.mockReturnValue({ path: [] });

            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            expect(service.moveThroughDoors).not.toHaveBeenCalled();
            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
        });

        it('should reverse the path before sending to movePlayer', async () => {
            await service.moveTowardPlayer(mockAi, mockTargetPlayer);

            const path = mockGameService.movePlayer.mock.calls[0][1];
            expect(path[0]).toEqual({ x: 3, y: 3 });
            expect(path[path.length - 1]).toEqual({ x: 1, y: 1 });
        });
    });

    describe('calculateMovementCost', () => {
        it('should return 0 for Ice tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.Ice);
            expect(result).toBe(0);
        });

        it('should return 2 for Water tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.Water);
            expect(result).toBe(2);
        });

        it('should return 1 for Base tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.Base);
            expect(result).toBe(1);
        });

        it('should return 1 for Wall tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.Wall);
            expect(result).toBe(1);
        });

        it('should return 1 for OpenDoor tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.OpenDoor);
            expect(result).toBe(1);
        });

        it('should return 1 for ClosedDoor tiles', () => {
            const result = (service as any).calculateMovementCost(MapTileType.ClosedDoor);
            expect(result).toBe(1);
        });

        it('should handle all possible MapTileType values', () => {
            Object.values(MapTileType).forEach((tileType) => {
                const cost = (service as any).calculateMovementCost(tileType);
                if (tileType === MapTileType.Ice) {
                    expect(cost).toBe(0);
                } else if (tileType === MapTileType.Water) {
                    expect(cost).toBe(2);
                } else {
                    expect(cost).toBe(1);
                }
            });
        });
    });

    describe('handleDoorInPath', () => {
        let mockAi: AiPlayer;
        let mockPosition: Coordinates;
        let mockDoorPosition: Coordinates;
        let mockDoorPath: RouteInfo;
        let mockDoorPos: Coordinates;
        let mockPlayerPositionAfterMove: Coordinates;

        beforeEach(() => {
            jest.clearAllMocks();

            mockPosition = { x: 1, y: 1 };
            mockDoorPosition = { x: 3, y: 3 };
            mockDoorPos = { x: 3, y: 3 };
            mockPlayerPositionAfterMove = { x: 3, y: 3 };

            mockAi = {
                gameInfo: {
                    gameId: 'test-game-id',
                    game: {
                        map: {
                            terrain: [
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                                [{ type: MapTileType.Base }, { type: MapTileType.Base }],
                            ],
                        },
                    },
                },
                player: {
                    id: 'ai-player-id',
                },
            } as unknown as AiPlayer;

            mockDoorPath = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                ],
                doors: [],
            };

            mockDijkstraService.findPathToCharacter.mockReturnValue({ ...mockDoorPath, path: [...mockDoorPath.path] });
            mockGameService.getPlayerPosition.mockReturnValue(mockPlayerPositionAfterMove);

            jest.spyOn(service as any, 'doorUpdate').mockResolvedValue(undefined);
        });

        it('should find a path to the door using Dijkstra', async () => {
            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockAi.gameInfo.game.map.terrain,
                mockPosition,
                mockDoorPosition,
                false,
            );
        });

        it('should move the player along the path to the door', async () => {
            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            const expectedPath = [
                { x: 2, y: 2 },
                { x: 1, y: 1 },
            ];

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', expectedPath);
        });

        it('should call doorUpdate with the correct parameters', async () => {
            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect((service as any).doorUpdate).toHaveBeenCalledWith('test-game-id', mockDoorPosition, mockPlayerPositionAfterMove);
        });

        it('should move the player to the door position', async () => {
            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', [mockDoorPos, mockPlayerPositionAfterMove]);
        });

        it('should return the final player position', async () => {
            const result = await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect(result).toEqual(mockPlayerPositionAfterMove);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith('test-game-id', 'ai-player-id');
        });

        it('should not move the player if path is empty', async () => {
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({
                path: [mockDoorPos],
                doors: [],
            });

            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect(mockGameService.movePlayer).not.toHaveBeenCalledWith('test-game-id', []);
            expect((service as any).doorUpdate).toHaveBeenCalled();
            expect(mockGameService.movePlayer).toHaveBeenCalledWith('test-game-id', [mockDoorPos, mockPlayerPositionAfterMove]);
        });

        it('should not attempt to move to door position if doorPos is null', async () => {
            mockDijkstraService.findPathToCharacter.mockReturnValueOnce({
                path: [],
                doors: [],
            });

            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect((service as any).doorUpdate).toHaveBeenCalled();
            expect(mockGameService.movePlayer).not.toHaveBeenCalledWith('test-game-id', [null, mockPlayerPositionAfterMove]);
        });

        it('should call methods in the correct order', async () => {
            const callOrder: string[] = [];

            mockGameService.movePlayer.mockImplementation(async () => {
                callOrder.push('movePlayer');
                return undefined;
            });

            (service as any).doorUpdate.mockImplementation(async () => {
                callOrder.push('doorUpdate');
                return undefined;
            });

            await (service as any).handleDoorInPath(mockAi, mockPosition, mockDoorPosition);

            expect(callOrder).toEqual(['movePlayer', 'doorUpdate', 'movePlayer']);
        });
    });

    describe('doorUpdate', () => {
        let mockGameId: string;
        let mockDoor: Coordinates;
        let mockPosition: Coordinates;
        let mockGame: any;

        beforeEach(() => {
            jest.clearAllMocks();

            mockGameId = 'test-game-id';
            mockDoor = { x: 3, y: 3 };
            mockPosition = { x: 2, y: 2 };
            mockGame = { id: mockGameId };
            const oneHundred = 100;

            mockGameService.getGame.mockReturnValue(mockGame);
            mockGameMapService.isDoorUpdateAllowed.mockResolvedValue(true);
            mockVirtualPlayerService.randomTime.mockResolvedValue(oneHundred);

            jest.spyOn(sleepModule, 'sleep').mockResolvedValue(undefined);
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        it('should wait for a random time when door update is allowed', async () => {
            await (service as any).doorUpdate(mockGameId, mockDoor, mockPosition);
            const oneHundred = 100;
            expect(mockVirtualPlayerService.randomTime).toHaveBeenCalledWith(RandomTimeOptions.LongRandomTime, RandomTimeOptions.MediumRandomTime);
            expect(sleepModule.sleep).toHaveBeenNthCalledWith(1, oneHundred);
        });

        it('should wait for the default time after updating the door', async () => {
            await (service as any).doorUpdate(mockGameId, mockDoor, mockPosition);
            expect(sleepModule.sleep).toHaveBeenNthCalledWith(2, RandomTimeOptions.DefaultTime);
        });

        it('should call methods in the correct order', async () => {
            const callOrder: string[] = [];

            mockGameService.getGame.mockImplementation(() => {
                callOrder.push('getGame');
                return mockGame;
            });

            mockGameMapService.isDoorUpdateAllowed.mockImplementation(async () => {
                callOrder.push('isDoorUpdateAllowed');
                return true;
            });

            const oneHundred = 100;
            mockVirtualPlayerService.randomTime.mockImplementation(async () => {
                callOrder.push('randomTime');
                return oneHundred;
            });

            jest.spyOn(sleepModule, 'sleep').mockImplementation(async () => {
                callOrder.push('sleep');
            });

            mockGameReceiverGateway.updateDoor.mockImplementation(() => {
                callOrder.push('updateDoor');
            });

            await (service as any).doorUpdate(mockGameId, mockDoor, mockPosition);

            expect(callOrder).toEqual(['getGame', 'isDoorUpdateAllowed', 'randomTime', 'sleep', 'updateDoor', 'sleep']);
        });
    });
});
