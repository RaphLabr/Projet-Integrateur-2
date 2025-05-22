// Need magic numbers
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Max line disable in test file
/* eslint-disable max-lines */
// We use any to access private data
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ItemEffects } from '@app/classes/item-effects/item-effects';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMap } from '@app/model/database/game-map';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { MovementDataToClient } from '@common/movement-data-client';
import { TeleportData } from '@common/teleport-data';
import { Test, TestingModule } from '@nestjs/testing';

describe('GameMapService', () => {
    let service: GameMapService;
    let timerServiceMock: jest.Mocked<GameTimerService>;
    let gameEmitterGatewayMock: jest.Mocked<GameEmitterGateway>;
    let virtualPlayerServiceMock: jest.Mocked<VirtualPlayerService>;
    let gameStatisticsServiceMock: jest.Mocked<GameStatisticsService>;

    beforeEach(async () => {
        timerServiceMock = {
            disableTimerStop: jest.fn(),
            enableTimerStop: jest.fn(),
            forceStopTimer: jest.fn(),
        } as any as jest.Mocked<GameTimerService>;

        gameEmitterGatewayMock = {
            emitMovePlayer: jest.fn(),
            emitEndOfMovement: jest.fn(),
        } as any as jest.Mocked<GameEmitterGateway>;

        virtualPlayerServiceMock = {} as any as jest.Mocked<VirtualPlayerService>;
        gameStatisticsServiceMock = {
            updateTilesTraversed: jest.fn(),
            updatePickedObject: jest.fn(),
            toggleDoor: jest.fn(),
        } as any as jest.Mocked<GameStatisticsService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameMapService,
                { provide: GameTimerService, useValue: timerServiceMock },
                { provide: GameEmitterGateway, useValue: gameEmitterGatewayMock },
                { provide: VirtualPlayerService, useValue: virtualPlayerServiceMock },
                { provide: GameStatisticsService, useValue: gameStatisticsServiceMock },
            ],
        }).compile();

        service = module.get<GameMapService>(GameMapService);
    });

    describe('teleportPlayer', () => {
        let mockGame: GameData;
        let mockMap: MapTile[][];
        const gameId = 'test-game-id';

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockMap[3][3].character = CharacterType.Character1;

            mockGame = {
                map: {
                    terrain: mockMap,
                    size: MapSize.Small,
                },
                isPlayerMoving: true,
            } as GameData;
        });

        it('should set isPlayerMoving to false', () => {
            const teleportData: TeleportData = {
                gameId,
                from: { x: 3, y: 3 },
                to: { x: 1, y: 1 },
            };

            jest.spyOn(service as any, 'getTile').mockReturnValue({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
            jest.spyOn(service as any, 'isTileTraversable').mockReturnValue(true);
            jest.spyOn(service as any, 'isTeleportationAllowedOnTile').mockReturnValue(true);

            const movePlayerToTileSpy = jest.spyOn(service as any, 'movePlayerToTile').mockImplementation(() => undefined);

            service.teleportPlayer(mockGame, teleportData, true);

            expect(mockGame.isPlayerMoving).toBe(false);
            expect(movePlayerToTileSpy).toHaveBeenCalledWith(gameId, mockGame, {
                from: teleportData.from,
                to: teleportData.to,
                cost: 0,
            });
        });

        it('should emit movePlayer event with zero cost', () => {
            const teleportData: TeleportData = {
                gameId,
                from: { x: 3, y: 3 },
                to: { x: 1, y: 1 },
            };

            jest.spyOn(service as any, 'getTile').mockReturnValue({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
            jest.spyOn(service as any, 'isTileTraversable').mockReturnValue(true);
            jest.spyOn(service as any, 'isTeleportationAllowedOnTile').mockReturnValue(true);

            jest.spyOn(service as any, 'movePlayerToTile').mockImplementation((gId: string, g: GameData, data: MovementDataToClient) => {
                gameEmitterGatewayMock.emitMovePlayer(gameId, data);
            });

            service.teleportPlayer(mockGame, teleportData, true);

            expect(gameEmitterGatewayMock.emitMovePlayer).toHaveBeenCalledWith(gameId, {
                from: teleportData.from,
                to: teleportData.to,
                cost: 0,
            });
        });

        it('should emit endOfMovement after teleport', () => {
            const teleportData: TeleportData = {
                gameId,
                from: { x: 3, y: 3 },
                to: { x: 1, y: 1 },
            };

            service.teleportPlayer(mockGame, teleportData, true);
            expect(gameEmitterGatewayMock.emitEndOfMovement).toHaveBeenCalledWith(gameId);
        });
    });

    describe('areCoordinatesAdjacent', () => {
        it('should return true for horizontally adjacent coordinates', () => {
            const first: Coordinates = { x: 3, y: 3 };
            const second: Coordinates = { x: 4, y: 3 };
            const result = service.areCoordinatesAdjacent(first, second);

            expect(result).toBe(true);
        });

        it('should return true for vertically adjacent coordinates', () => {
            const first: Coordinates = { x: 3, y: 3 };
            const second: Coordinates = { x: 3, y: 4 };
            const result = service.areCoordinatesAdjacent(first, second);

            expect(result).toBe(true);
        });

        it('should return false for non-adjacent coordinates', () => {
            const first: Coordinates = { x: 3, y: 3 };
            const second: Coordinates = { x: 5, y: 3 };
            const result = service.areCoordinatesAdjacent(first, second);

            expect(result).toBe(false);
        });
    });

    describe('removeCharacterFromTile', () => {
        let mockMap: MapTile[][];

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: undefined,
                        })),
                );
        });

        it('should remove character from specified tile', () => {
            const tileCoords: Coordinates = { x: 2, y: 3 };
            mockMap[tileCoords.y][tileCoords.x].character = CharacterType.Character1;
            service.removeCharacterFromTile(mockMap, tileCoords);

            expect(mockMap[tileCoords.y][tileCoords.x].character).toBe(CharacterType.NoCharacter);
        });
    });

    describe('isDoorUpdateAllowed', () => {
        let mockGame: GameData;
        let mockMap: MapTile[][];

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockMap[3][3].type = MapTileType.ClosedDoor;
            mockMap[3][3].character = CharacterType.NoCharacter;
            mockMap[3][3].item = ItemType.NoItem;

            mockGame = {
                players: [{ name: 'Player1' }, { name: 'Player2' }],
                currentPlayerIndex: 0,
                isActionUsed: false,
                map: {
                    terrain: mockMap,
                    size: MapSize.Small,
                },
            } as GameData;
        });

        it('should return true when all conditions are met', () => {
            const doorUpdateRequestPayload = {
                playerPosition: { x: 3, y: 2 },
                doorPosition: { x: 3, y: 3 },
            } as DoorUpdateRequestPayload;

            const result = service.isDoorUpdateAllowed(doorUpdateRequestPayload, mockGame);
            expect(result).toBe(true);
        });

        it('should return false when the active player does not exist', () => {
            mockGame.currentPlayerIndex = 99;
            const doorUpdateRequestPayload = {
                playerPosition: { x: 3, y: 2 },
                doorPosition: { x: 3, y: 3 },
            } as DoorUpdateRequestPayload;
            const result = service.isDoorUpdateAllowed(doorUpdateRequestPayload, mockGame);
            expect(result).toBe(false);
        });

        it('should return false when player is not adjacent to door', () => {
            const doorUpdateRequestPayload = {
                playerPosition: { x: 1, y: 1 },
                doorPosition: { x: 3, y: 3 },
            } as DoorUpdateRequestPayload;

            const result = service.isDoorUpdateAllowed(doorUpdateRequestPayload, mockGame);
            expect(result).toBe(false);
        });

        it('should return false when action is already used', () => {
            mockGame.isActionUsed = true;
            const doorUpdateRequestPayload = {
                playerPosition: { x: 3, y: 2 },
                doorPosition: { x: 3, y: 3 },
            } as DoorUpdateRequestPayload;

            const result = service.isDoorUpdateAllowed(doorUpdateRequestPayload, mockGame);
            expect(result).toBe(false);
        });

        it('should return false when door tile is occupied by a character', () => {
            mockMap[3][3].character = CharacterType.Character1;
            const doorUpdateRequestPayload = {
                playerPosition: { x: 3, y: 2 },
                doorPosition: { x: 3, y: 3 },
            } as DoorUpdateRequestPayload;

            const result = service.isDoorUpdateAllowed(doorUpdateRequestPayload, mockGame);
            expect(result).toBe(false);
        });
    });

    describe('movePlayerOnPath', () => {
        let mockGame: GameData;
        let mockMap: MapTile[][];
        const gameId = 'test-game-id';

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockMap[4][4].character = CharacterType.Character1;

            mockGame = {
                map: {
                    terrain: mockMap,
                    size: MapSize.Small,
                },
                movementLeft: 5,
                isPlayerMoving: false,
                isDroppingItem: false,
                currentPlayerPosition: { x: 4, y: 4 },
                players: [
                    {
                        id: CharacterType.Character1,
                        name: 'Player1',
                        items: [],
                        startPosition: { x: 0, y: 0 },
                        team: 'Team1',
                        hasAbandoned: false,
                        userId: 'user1',
                        speed: 5,
                        evadeAttempts: 0,
                        combatPower: 1,
                        wins: 0,
                    },
                ],
                currentPlayerIndex: 0,
                gameStatistics: { winnerName: '' },
                isInDebugMode: false,
                isInRound: true,
                isInCombat: false,
                isActionUsed: false,
                adminId: CharacterType.Character1,
                gameMode: GameMode.Classic,
                attackerName: '',
                playersInCombat: [],
                combatPhase: 0,
            } as unknown as GameData;

            gameEmitterGatewayMock.emitMovePlayer = jest.fn();
            gameEmitterGatewayMock.emitEndOfMovement = jest.fn();
            gameEmitterGatewayMock.emitGameOver = jest.fn();
            gameEmitterGatewayMock.emitItemPickUp = jest.fn();
            gameEmitterGatewayMock.emitItemPickUpLog = jest.fn();

            jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
                callback();
                return {} as any;
            });
        });

        it('should return early if path is invalid', async () => {
            const path: Coordinates[] = [
                { x: 4, y: 4 },
                { x: 3, y: 4 },
                { x: 2, y: 4 },
                { x: 1, y: 4 },
                { x: 0, y: 4 },
                { x: 0, y: 3 },
                { x: 0, y: 2 },
            ];

            jest.spyOn(service as any, 'isPathValid').mockReturnValue(false);

            await service.movePlayerOnPath(mockGame, gameId, path);

            expect(timerServiceMock.disableTimerStop).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitMovePlayer).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitEndOfMovement).not.toHaveBeenCalled();
        });

        it('should move player along a valid path', async () => {
            const path: Coordinates[] = [
                { x: 4, y: 4 },
                { x: 3, y: 4 },
                { x: 2, y: 4 },
            ];

            jest.spyOn(service as any, 'isPathValid').mockReturnValue(true);
            jest.spyOn(service as any, 'shouldMovementStop').mockReturnValue(false);
            jest.spyOn(service as any, 'isGameWonCTF').mockReturnValue(false);

            const movePlayerToTileSpy = jest.spyOn(service as any, 'movePlayerToTile');

            await service.movePlayerOnPath(mockGame, gameId, path);

            expect(timerServiceMock.disableTimerStop).toHaveBeenCalledWith(gameId);
            expect(mockGame.isPlayerMoving).toBe(false);
            expect(movePlayerToTileSpy).toHaveBeenCalledTimes(2);
            expect(timerServiceMock.enableTimerStop).toHaveBeenCalledWith(gameId);
            expect(gameEmitterGatewayMock.emitEndOfMovement).toHaveBeenCalledWith(gameId);
        });

        it('should stop movement when an item is encountered', async () => {
            mockMap[3][4].item = ItemType.Potion1;

            const path: Coordinates[] = [
                { x: 4, y: 4 },
                { x: 3, y: 4 },
                { x: 2, y: 4 },
                { x: 1, y: 4 },
            ];

            jest.spyOn(service as any, 'isPathValid').mockReturnValue(true);
            const shouldMovementStopSpy = jest.spyOn(service as any, 'shouldMovementStop');
            const takeItemSpy = jest.spyOn(service as any, 'takeItem').mockImplementation(() => undefined);

            jest.spyOn(service as any, 'getTile').mockImplementation((map, coords: Coordinates) => {
                const three = 3;
                const four = 4;
                if (coords.x === three && coords.y === four) {
                    return {
                        type: MapTileType.Base,
                        character: CharacterType.NoCharacter,
                        item: ItemType.Potion1,
                    };
                }
                return {
                    type: MapTileType.Base,
                    character: CharacterType.NoCharacter,
                    item: ItemType.NoItem,
                };
            });

            await service.movePlayerOnPath(mockGame, gameId, path);

            expect(shouldMovementStopSpy).toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitMovePlayer).toHaveBeenCalledTimes(2);
            expect(takeItemSpy).toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitEndOfMovement).toHaveBeenCalledWith(gameId);
        });

        it('should not enable timer stop when dropping item', async () => {
            const path: Coordinates[] = [
                { x: 4, y: 4 },
                { x: 3, y: 4 },
            ];

            jest.spyOn(service as any, 'isPathValid').mockReturnValue(true);

            mockGame.isDroppingItem = true;

            await service.movePlayerOnPath(mockGame, gameId, path);

            expect(timerServiceMock.enableTimerStop).not.toHaveBeenCalled();
        });
    });

    describe('placeItem', () => {
        let mockMap: MapTile[][];
        const gameId = 'test-game-id';

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            gameEmitterGatewayMock.emitItemDrop = jest.fn();
        });

        it('should place the item at the specified coordinates', () => {
            const itemCoordinates: Coordinates = { x: 3, y: 2 };
            const itemData = {
                item: ItemType.Sword,
                itemCoordinates,
            };

            service.placeItem(gameId, itemData, mockMap);

            expect(mockMap[itemCoordinates.y][itemCoordinates.x].item).toBe(ItemType.Sword);
        });

        it('should emit itemDrop event with correct parameters', () => {
            const itemCoordinates: Coordinates = { x: 5, y: 5 };
            const itemData = {
                item: ItemType.Barrel,
                itemCoordinates,
            };

            service.placeItem(gameId, itemData, mockMap);

            expect(gameEmitterGatewayMock.emitItemDrop).toHaveBeenCalledWith(gameId, itemData);
        });

        it('should replace an existing item at the specified coordinates', () => {
            const itemCoordinates: Coordinates = { x: 4, y: 4 };
            mockMap[itemCoordinates.y][itemCoordinates.x].item = ItemType.Potion1;

            const itemData = {
                item: ItemType.Torch,
                itemCoordinates,
            };

            service.placeItem(gameId, itemData, mockMap);

            expect(mockMap[itemCoordinates.y][itemCoordinates.x].item).toBe(ItemType.Torch);
        });
    });

    describe('updateDoor', () => {
        let mockGame: GameData;
        let mockMap: MapTile[][];
        const doorCoordinates: Coordinates = { x: 3, y: 3 };

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockGame = {
                players: [
                    { name: 'Player1', id: CharacterType.Character1 },
                    { name: 'Player2', id: CharacterType.Character2 },
                ],
                currentPlayerIndex: 0,
                isActionUsed: false,
                map: {
                    terrain: mockMap,
                    size: MapSize.Small,
                },
            } as GameData;

            gameStatisticsServiceMock.toggleDoor = jest.fn();
        });

        it('should toggle a closed door to open', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.ClosedDoor;

            const result = service.updateDoor(doorCoordinates, mockGame);

            expect(mockMap[doorCoordinates.y][doorCoordinates.x].type).toBe(MapTileType.OpenDoor);
            expect(result.newDoorType).toBe(MapTileType.OpenDoor);
        });

        it('should toggle an open door to closed', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.OpenDoor;

            const result = service.updateDoor(doorCoordinates, mockGame);

            expect(mockMap[doorCoordinates.y][doorCoordinates.x].type).toBe(MapTileType.ClosedDoor);
            expect(result.newDoorType).toBe(MapTileType.ClosedDoor);
        });

        it('should set isActionUsed to true', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.ClosedDoor;
            mockGame.isActionUsed = false;

            service.updateDoor(doorCoordinates, mockGame);

            expect(mockGame.isActionUsed).toBe(true);
        });

        it('should call gameStatisticsService.toggleDoor with correct parameters', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.ClosedDoor;

            service.updateDoor(doorCoordinates, mockGame);

            expect(gameStatisticsServiceMock.toggleDoor).toHaveBeenCalledWith(doorCoordinates, mockGame);
        });

        it('should return doorUpdateData with correct values', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.ClosedDoor;
            const activePlayer = mockGame.players[mockGame.currentPlayerIndex];

            const result = service.updateDoor(doorCoordinates, mockGame);

            expect(result).toEqual({
                newDoorType: MapTileType.OpenDoor,
                doorCoordinates,
                player: activePlayer,
            });
        });

        it('should include the active player in the returned data', () => {
            mockMap[doorCoordinates.y][doorCoordinates.x].type = MapTileType.ClosedDoor;
            mockGame.currentPlayerIndex = 1;

            const result = service.updateDoor(doorCoordinates, mockGame);

            expect(result.player).toBe(mockGame.players[1]);
            expect(result.player.id).toBe(CharacterType.Character2);
        });
    });

    describe('shouldRoundEnd', () => {
        let mockGame: GameData;

        beforeEach(() => {
            mockGame = {
                isInRound: true,
                isDroppingItem: false,
                currentPlayerPosition: { x: 3, y: 3 },
                movementLeft: 0,
                isActionUsed: true,
                map: {
                    terrain: Array(MapSize.Small)
                        .fill(null)
                        .map(() =>
                            Array(MapSize.Small)
                                .fill(null)
                                .map(() => ({
                                    type: MapTileType.Base,
                                    character: CharacterType.NoCharacter,
                                    item: ItemType.NoItem,
                                })),
                        ),
                },
            } as GameData;

            jest.spyOn(service as any, 'isActionPossible').mockReturnValue(false);
            jest.spyOn(service as any, 'isMovementPossible').mockReturnValue(false);
        });

        it('should return true when no actions or movements are possible and game can end', () => {
            mockGame.isInRound = true;
            mockGame.isDroppingItem = false;
            (service as any).isActionPossible.mockReturnValue(false);
            (service as any).isMovementPossible.mockReturnValue(false);

            const result = service.shouldRoundEnd(mockGame);

            expect(result).toBe(true);
        });

        it('should return false when actions are possible', () => {
            mockGame.isInRound = true;
            mockGame.isDroppingItem = false;
            (service as any).isActionPossible.mockReturnValue(true);
            (service as any).isMovementPossible.mockReturnValue(false);

            const result = service.shouldRoundEnd(mockGame);

            expect(result).toBe(false);
        });

        it('should return false when movements are possible', () => {
            mockGame.isInRound = true;
            mockGame.isDroppingItem = false;
            (service as any).isActionPossible.mockReturnValue(false);
            (service as any).isMovementPossible.mockReturnValue(true);

            const result = service.shouldRoundEnd(mockGame);

            expect(result).toBe(false);
        });

        it('should return false when game is not in round', () => {
            mockGame.isInRound = false;
            mockGame.isDroppingItem = false;
            (service as any).isActionPossible.mockReturnValue(false);
            (service as any).isMovementPossible.mockReturnValue(false);

            const result = service.shouldRoundEnd(mockGame);

            expect(result).toBe(false);
        });

        it('should return false when player is dropping an item', () => {
            mockGame.isInRound = true;
            mockGame.isDroppingItem = true;
            (service as any).isActionPossible.mockReturnValue(false);
            (service as any).isMovementPossible.mockReturnValue(false);

            const result = service.shouldRoundEnd(mockGame);

            expect(result).toBe(false);
        });
    });

    describe('getTileFromId', () => {
        let mockMap: MapTile[][];

        beforeEach(() => {
            mockMap = [
                [
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                ],
                [
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.Character1, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                ],
                [
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem },
                    { type: MapTileType.Base, character: CharacterType.Character2, item: ItemType.NoItem },
                ],
            ];
        });

        it('should find and return the tile with the matching character ID', () => {
            const result = service.getTileFromId(mockMap, CharacterType.Character1);

            expect(result).toBeDefined();
            expect(result).toBe(mockMap[1][1]);
            expect(result?.character).toBe(CharacterType.Character1);
        });

        it('should find a character in any position of the map', () => {
            const result = service.getTileFromId(mockMap, CharacterType.Character2);

            expect(result).toBeDefined();
            expect(result).toBe(mockMap[2][2]);
            expect(result?.character).toBe(CharacterType.Character2);
        });

        it('should return undefined when character ID is not found', () => {
            const result = service.getTileFromId(mockMap, CharacterType.Character3);

            expect(result).toBeUndefined();
        });
    });

    describe('isPathValid', () => {
        let mockMap: MapTile[][];

        beforeEach(() => {
            mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockMap[1][1].type = MapTileType.Wall;
            mockMap[2][2].type = MapTileType.Water;
            mockMap[3][3].type = MapTileType.Ice;
            mockMap[2][3].character = CharacterType.Character2;
        });

        it('should return true for valid path within movement range', () => {
            const path: Coordinates[] = [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: 2 },
            ];

            const movementLeft = 3;

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(true);
        });

        it('should handle different terrain costs correctly', () => {
            const path: Coordinates[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 2 },
                { x: 3, y: 3 },
            ];

            const movementLeft = 6;
            const three = 3;

            jest.spyOn(service as any, 'getTile').mockImplementation((map, coords: Coordinates) => {
                if (coords.x === 2 && coords.y === 2) {
                    return { type: MapTileType.Water, character: CharacterType.NoCharacter, item: ItemType.NoItem };
                } else if (coords.x === three && coords.y === three) {
                    return { type: MapTileType.Ice, character: CharacterType.NoCharacter, item: ItemType.NoItem };
                }
                return { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem };
            });

            jest.spyOn(service as any, 'isTileTraversable').mockReturnValue(true);

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(false);
        });

        it('should return false when path contains an obstacle', () => {
            const path: Coordinates[] = [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
            ];

            const movementLeft = 10;

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(false);
        });

        it('should return true when path contains a tile with a character', () => {
            const path: Coordinates[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 1 },
                { x: 2, y: 2 },
                { x: 2, y: 3 },
            ];

            const movementLeft = 10;
            const three = 3;

            jest.spyOn(service as any, 'getTile').mockImplementation((map, coords: Coordinates) => {
                if (coords.x === 2 && coords.y === three) {
                    return { type: MapTileType.Base, character: CharacterType.Character2, item: ItemType.NoItem };
                }
                return { type: MapTileType.Base, character: CharacterType.NoCharacter, item: ItemType.NoItem };
            });

            jest.spyOn(service as any, 'isTileTraversable').mockImplementation((tile: MapTile) => {
                return tile.character === CharacterType.NoCharacter;
            });

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(true);
        });

        it('should return false when not enough movement points are available', () => {
            const path: Coordinates[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 1 },
                { x: 2, y: 2 },
            ];

            const movementLeft = 3;

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(false);
        });

        it('should return true for an empty path', () => {
            const path: Coordinates[] = [{ x: 0, y: 0 }];
            const movementLeft = 0;

            const result = (service as any).isPathValid(mockMap, movementLeft, path);

            expect(result).toBe(true);
        });
    });

    describe('isActionPossible', () => {
        let mockGame: GameData;

        beforeEach(() => {
            const mockMap = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            const playerPosition = { x: 2, y: 2 };

            mockGame = {
                currentPlayerPosition: playerPosition,
                isActionUsed: false,
                map: {
                    terrain: mockMap,
                    size: 5,
                },
            } as GameData;

            jest.spyOn(service as any, 'getTile').mockImplementation((map, coords: Coordinates) => map[coords.y][coords.x]);
            jest.spyOn(service as any, 'getAdjacentCoordinates').mockImplementation((coords: Coordinates, mapLength: any) => {
                const { x, y } = coords;
                return [
                    { x: x + 1, y },
                    { x: x - 1, y },
                    { x, y: y + 1 },
                    { x, y: y - 1 },
                ].filter((c) => c.x >= 0 && c.y >= 0 && c.x < mapLength && c.y < mapLength);
            });
            jest.spyOn(service as any, 'isTileDoor').mockImplementation(
                (tileType) => tileType === MapTileType.OpenDoor || tileType === MapTileType.ClosedDoor,
            );
        });

        it('should return true when a door is adjacent to player', () => {
            mockGame.map.terrain[2][3].type = MapTileType.ClosedDoor;

            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(true);
        });

        it('should return true when another character is adjacent to player', () => {
            mockGame.map.terrain[1][2].character = CharacterType.Character2;

            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(true);
        });

        it('should return false when no actionable objects are adjacent', () => {
            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(false);
        });

        it('should return false when action has already been used', () => {
            mockGame.map.terrain[2][3].type = MapTileType.ClosedDoor;
            mockGame.isActionUsed = true;

            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(false);
        });

        it('should check all adjacent tiles for actionable objects', () => {
            mockGame.map.terrain[2][3].type = MapTileType.OpenDoor;
            mockGame.map.terrain[2][1].character = CharacterType.Character2;

            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(true);
            expect((service as any).getAdjacentCoordinates).toHaveBeenCalledWith(mockGame.currentPlayerPosition, mockGame.map.terrain.length);
        });

        it('should handle player at map edge correctly', () => {
            mockGame.currentPlayerPosition = { x: 0, y: 0 };

            mockGame.map.terrain[0][1].type = MapTileType.ClosedDoor;

            const result = (service as any).isActionPossible(mockGame);

            expect(result).toBe(true);
        });
    });

    describe('intializeMap', () => {
        let mockGameMap: GameMap;

        beforeEach(() => {
            mockGameMap = {
                name: 'Test Map',
                size: MapSize.Small,
                mode: GameMode.Classic,
                terrain: Array(5)
                    .fill(null)
                    .map(() =>
                        Array(5)
                            .fill(null)
                            .map(() => ({
                                type: MapTileType.Base,
                                character: CharacterType.NoCharacter,
                                item: ItemType.NoItem,
                            })),
                    ),
            } as GameMap;

            gameEmitterGatewayMock.emitItemDrop = jest.fn();
        });

        it('should remove extra start positions to match player count', () => {
            const startPositions = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];

            startPositions.forEach((pos) => {
                mockGameMap.terrain[pos.y][pos.x].item = ItemType.StartPosition;
            });

            const playerCount = 2;

            jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

            const result = service.intializeMap(mockGameMap, [...startPositions], playerCount);
            const remainingStartPositions = result.terrain.flat().filter((tile) => tile.item === ItemType.StartPosition);

            expect(remainingStartPositions.length).toBe(playerCount);
        });

        it('should replace random items with regular items', () => {
            const randomItemPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];

            randomItemPositions.forEach((pos) => {
                mockGameMap.terrain[pos.y][pos.x].item = ItemType.Random;
            });

            const startPositions = [{ x: 0, y: 0 }];
            const playerCount = 1;

            jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

            const result = service.intializeMap(mockGameMap, startPositions, playerCount);
            const remainingRandomItems = result.terrain.flat().filter((tile) => tile.item === ItemType.Random);

            expect(remainingRandomItems.length).toBe(0);

            randomItemPositions.forEach((pos) => {
                expect(result.terrain[pos.y][pos.x].item).not.toBe(ItemType.Random);
                expect(result.terrain[pos.y][pos.x].item).not.toBe(ItemType.Flag);
                expect(result.terrain[pos.y][pos.x].item).not.toBe(ItemType.NoItem);
                expect(result.terrain[pos.y][pos.x].item).not.toBe(ItemType.StartPosition);
            });
        });

        it('should preserve special items (Flag, NoItem, StartPosition)', () => {
            mockGameMap.terrain[0][0].item = ItemType.Flag;
            mockGameMap.terrain[0][1].item = ItemType.StartPosition;
            mockGameMap.terrain[0][2].item = ItemType.NoItem;
            mockGameMap.terrain[1][1].item = ItemType.Random;

            const startPositions = [{ x: 0, y: 1 }];
            const playerCount = 1;

            const result = service.intializeMap(mockGameMap, startPositions, playerCount);

            expect(result.terrain[0][0].item).toBe(ItemType.Flag);
            expect(result.terrain[0][1].item).toBe(ItemType.StartPosition);
            expect(result.terrain[0][2].item).toBe(ItemType.NoItem);
            expect(result.terrain[1][1].item).not.toBe(ItemType.Random);
        });

        it('should handle case when no extra start positions need removal', () => {
            const startPositions = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ];

            startPositions.forEach((pos) => {
                mockGameMap.terrain[pos.y][pos.x].item = ItemType.StartPosition;
            });
            const playerCount = 2;
            const result = service.intializeMap(mockGameMap, [...startPositions], playerCount);
            startPositions.forEach((pos) => {
                expect(result.terrain[pos.y][pos.x].item).toBe(ItemType.StartPosition);
            });
        });

        it('should distribute all available regular items if more random positions than items', () => {
            const manyRandomPositions = Array(10)
                .fill(null)
                .map((_, i) => ({ x: i % 5, y: Math.floor(i / 5) }));

            manyRandomPositions.forEach((pos) => {
                mockGameMap.terrain[pos.y][pos.x].item = ItemType.Random;
            });

            const startPositions = [{ x: 0, y: 0 }];
            const playerCount = 1;
            const result = service.intializeMap(mockGameMap, startPositions, playerCount);
            const specialItems = new Set([ItemType.Flag, ItemType.NoItem, ItemType.StartPosition, ItemType.Random]);
            const placedItems = new Set();

            result.terrain.flat().forEach((tile) => {
                if (!specialItems.has(tile.item)) {
                    placedItems.add(tile.item);
                }
            });

            expect(placedItems.size).toBeGreaterThan(0);

            const remainingRandomItems = result.terrain.flat().filter((tile) => tile.item === ItemType.Random);

            expect(remainingRandomItems.length).toBe(0);
        });
    });

    describe('isMovementPossible', () => {
        let mockGame: GameData;
        let mockMap: MapTile[][];

        beforeEach(() => {
            mockMap = Array(5)
                .fill(null)
                .map(() =>
                    Array(5)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            mockGame = {
                map: {
                    terrain: mockMap,
                    size: 5,
                },
                currentPlayerPosition: { x: 2, y: 2 },
                movementLeft: 2,
            } as GameData;

            jest.spyOn(service as any, 'getAdjacentCoordinates').mockReturnValue([
                { x: 1, y: 2 },
                { x: 3, y: 2 },
                { x: 2, y: 1 },
                { x: 2, y: 3 },
            ]);

            jest.spyOn(service as any, 'getTile').mockReturnValue({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
        });

        it('should return true when at least one adjacent tile is traversable within movement range', () => {
            (service as any).getTile.mockReturnValueOnce({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });

            const result = (service as any).isMovementPossible(mockGame);

            expect(result).toBe(true);
        });

        it('should return false when no adjacent tiles are traversable within movement range', () => {
            (service as any).getTile.mockReturnValue({
                type: MapTileType.ClosedDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });

            mockGame.movementLeft = 1;

            const result = (service as any).isMovementPossible(mockGame);

            expect(result).toBe(false);
        });

        it('should check all adjacent tiles for possible movement', () => {
            (service as any).getTile.mockReturnValueOnce({
                type: MapTileType.ClosedDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
            (service as any).getTile.mockReturnValueOnce({
                type: MapTileType.ClosedDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
            (service as any).getTile.mockReturnValueOnce({
                type: MapTileType.ClosedDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
            (service as any).getTile.mockReturnValueOnce({
                type: MapTileType.Ice,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });

            mockGame.movementLeft = 0;

            const result = (service as any).isMovementPossible(mockGame);

            expect(result).toBe(true);
            expect((service as any).getTile).toHaveBeenCalledTimes(4);
        });
    });

    describe('areCoordinatesInMap', () => {
        const mapLength = 5;

        it('should return true for coordinates in the middle of the map', () => {
            const coordinates = { x: 2, y: 2 };

            const result = (service as any).areCoordinatesInMap(mapLength, coordinates);

            expect(result).toBe(true);
        });

        it('should return true for coordinates at the map corners', () => {
            expect((service as any).areCoordinatesInMap(mapLength, { x: 0, y: 0 })).toBe(true);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 4, y: 0 })).toBe(true);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 0, y: 4 })).toBe(true);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 4, y: 4 })).toBe(true);
        });

        it('should return false for coordinates outside the map (negative)', () => {
            expect((service as any).areCoordinatesInMap(mapLength, { x: -1, y: 2 })).toBe(false);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 2, y: -1 })).toBe(false);
            expect((service as any).areCoordinatesInMap(mapLength, { x: -1, y: -1 })).toBe(false);
        });

        it('should return false for coordinates outside the map (too large)', () => {
            expect((service as any).areCoordinatesInMap(mapLength, { x: 5, y: 2 })).toBe(false);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 2, y: 5 })).toBe(false);
            expect((service as any).areCoordinatesInMap(mapLength, { x: 5, y: 5 })).toBe(false);
        });
    });

    describe('getAdjacentCoordinates', () => {
        const mapLength = 5;

        beforeEach(() => {
            jest.spyOn(service as any, 'areCoordinatesInMap').mockImplementation((length: any, coords: Coordinates) => {
                return coords.x >= 0 && coords.y >= 0 && coords.x < length && coords.y < length;
            });
        });

        it('should return all four adjacent coordinates for a center position', () => {
            const coordinates = { x: 2, y: 2 };

            const result = (service as any).getAdjacentCoordinates(coordinates, mapLength);

            expect(result).toHaveLength(4);
            expect(result).toContainEqual({ x: 3, y: 2 });
            expect(result).toContainEqual({ x: 1, y: 2 });
            expect(result).toContainEqual({ x: 2, y: 3 });
            expect(result).toContainEqual({ x: 2, y: 1 });
        });

        it('should return two adjacent coordinates for a corner position', () => {
            const coordinates = { x: 0, y: 0 };

            const result = (service as any).getAdjacentCoordinates(coordinates, mapLength);

            expect(result).toHaveLength(2);
            expect(result).toContainEqual({ x: 1, y: 0 });
            expect(result).toContainEqual({ x: 0, y: 1 });
        });

        it('should return three adjacent coordinates for an edge position', () => {
            const coordinates = { x: 2, y: 0 };

            const result = (service as any).getAdjacentCoordinates(coordinates, mapLength);
            expect(result).toHaveLength(3);
            expect(result).toContainEqual({ x: 3, y: 0 });
            expect(result).toContainEqual({ x: 1, y: 0 });
            expect(result).toContainEqual({ x: 2, y: 1 });
        });

        it('should filter coordinates outside the map', () => {
            jest.spyOn(service as any, 'areCoordinatesInMap').mockClear();

            const coordinates = { x: 2, y: 2 };

            (service as any).getAdjacentCoordinates(coordinates, mapLength);

            expect((service as any).areCoordinatesInMap).toHaveBeenCalledTimes(4);
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith(mapLength, { x: 3, y: 2 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith(mapLength, { x: 1, y: 2 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith(mapLength, { x: 2, y: 3 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith(mapLength, { x: 2, y: 1 });
        });
    });

    describe('isTileDoor', () => {
        it('should return true for an open door', () => {
            const result = (service as any).isTileDoor(MapTileType.OpenDoor);
            expect(result).toBe(true);
        });

        it('should return true for a closed door', () => {
            const result = (service as any).isTileDoor(MapTileType.ClosedDoor);
            expect(result).toBe(true);
        });

        it('should return false for non-door tile types', () => {
            expect((service as any).isTileDoor(MapTileType.Base)).toBe(false);
            expect((service as any).isTileDoor(MapTileType.Wall)).toBe(false);
            expect((service as any).isTileDoor(MapTileType.Water)).toBe(false);
            expect((service as any).isTileDoor(MapTileType.Ice)).toBe(false);
        });
    });

    describe('takeItem', () => {
        let mockGame: GameData;
        let mockTile: MapTile;
        const mockGameId = 'test-game-id';

        beforeEach(() => {
            mockTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.Potion1,
            };

            mockGame = {
                players: [
                    {
                        name: 'TestPlayer',
                        id: CharacterType.Character1,
                        items: [],
                    },
                ],
                currentPlayerIndex: 0,
                isDroppingItem: false,
            } as GameData;

            jest.spyOn(ItemEffects, 'applyItem').mockImplementation(() => undefined);

            gameEmitterGatewayMock.emitItemPickUp = jest.fn();
            gameEmitterGatewayMock.emitItemPickUpLog = jest.fn();
            timerServiceMock.disableTimerStop = jest.fn();
            virtualPlayerServiceMock.checkMaxItem = jest.fn();
        });

        it('should add the item to the player inventory', () => {
            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(mockGame.players[0].items).toContain(ItemType.Potion1);
            expect(mockGame.players[0].items.length).toBe(1);
        });

        it('should apply item effects to the player', () => {
            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(ItemEffects.applyItem).toHaveBeenCalledWith(mockGame.players[0], ItemType.Potion1);
        });

        it('should emit itemPickUp event with correct parameters', () => {
            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(gameEmitterGatewayMock.emitItemPickUp).toHaveBeenCalledWith(mockGameId, ItemType.Potion1, CharacterType.Character1);
        });

        it('should emit itemPickUpLog event with correct parameters', () => {
            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(gameEmitterGatewayMock.emitItemPickUpLog).toHaveBeenCalledWith(mockGameId, {
                playerName: 'TestPlayer',
                id: CharacterType.Character1,
                item: ItemType.Potion1,
            });
        });

        it('should remove the item from the tile', () => {
            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(mockTile.item).toBe(ItemType.NoItem);
        });

        it('should not change isDroppingItem when player has 2 or fewer items', () => {
            mockGame.players[0].items = [ItemType.Sword];

            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(mockGame.players[0].items.length).toBe(2);
            expect(mockGame.isDroppingItem).toBe(false);
            expect(timerServiceMock.disableTimerStop).not.toHaveBeenCalled();
            expect(virtualPlayerServiceMock.checkMaxItem).not.toHaveBeenCalled();
        });

        it('should set isDroppingItem to true when player has more than 2 items', () => {
            mockGame.players[0].items = [ItemType.Sword, ItemType.Barrel];

            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(mockGame.players[0].items.length).toBe(3);
            expect(mockGame.isDroppingItem).toBe(true);
            expect(timerServiceMock.disableTimerStop).toHaveBeenCalledWith(mockGameId);
        });

        it('should call virtualPlayer.checkMaxItem when player has more than 2 items', () => {
            mockGame.players[0].items = [ItemType.Sword, ItemType.Barrel];

            (service as any).takeItem(mockGameId, mockTile, mockGame);

            expect(virtualPlayerServiceMock.checkMaxItem).toHaveBeenCalledWith(mockGameId, mockGame.players[0]);
        });

        it('should work with different item types', () => {
            const itemTypes = [ItemType.Potion1, ItemType.Sword, ItemType.Flag, ItemType.Torch];

            itemTypes.forEach((itemType) => {
                mockGame.players[0].items = [];
                mockTile.item = itemType;
                jest.clearAllMocks();

                (service as any).takeItem(mockGameId, mockTile, mockGame);

                expect(mockGame.players[0].items).toContain(itemType);
                expect(ItemEffects.applyItem).toHaveBeenCalledWith(mockGame.players[0], itemType);
                expect(gameEmitterGatewayMock.emitItemPickUp).toHaveBeenCalledWith(mockGameId, itemType, CharacterType.Character1);
                expect(mockTile.item).toBe(ItemType.NoItem);
            });
        });
    });

    describe('isTeleportationAllowedOnTile', () => {
        it('should only allow teleportation on NoItem tiles when canTeleportOnStartTile is false', () => {
            const noItemTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const startPositionTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.StartPosition,
            };

            const otherItemTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.Potion1,
            };

            const canTeleportOnStartTile = false;

            expect((service as any).isTeleportationAllowedOnTile(noItemTile, canTeleportOnStartTile)).toBe(true);
            expect((service as any).isTeleportationAllowedOnTile(startPositionTile, canTeleportOnStartTile)).toBe(false);
            expect((service as any).isTeleportationAllowedOnTile(otherItemTile, canTeleportOnStartTile)).toBe(false);
        });
    });
});
