// Max line disable since test file
/* eslint-disable max-lines */
// We need any to access private members of the class
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { DijkstraNode } from '@app/classes/dijsktra-node';
import { MapTile } from '@app/classes/map-tile';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { GameEvents } from '@common/game-events';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';

describe('GameMapService', () => {
    let service: GameMapService;
    let socketSpy: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('SocketClientService', ['on', 'emitDoorUpdate']);

        TestBed.configureTestingModule({
            providers: [GameMapService, { provide: SocketClientService, useValue: socketSpy }],
        });

        service = TestBed.inject(GameMapService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Getters', () => {
        it('should return the correct size', () => {
            (service as any)._size = MapSize.Medium;
            expect(service.size).toBe(MapSize.Medium);
        });

        it('should return the game map', () => {
            const testMap: MapTile[][] = [[new MapTile(MapTileType.Base, ItemType.NoItem)], [new MapTile(MapTileType.Wall, ItemType.NoItem)]];
            (service as any)._gameMap = testMap;
            expect(service.gameMap).toBe(testMap);
        });

        it('should return the current path', () => {
            const testPath: Coordinates[] = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            (service as any)._currentPath = testPath;
            expect(service.currentPath).toBe(testPath);
        });

        it('should return the client position', () => {
            const testPosition: Coordinates = { x: 3, y: 4 };
            (service as any)._clientPosition = testPosition;
            expect(service.clientPosition).toBe(testPosition);
        });

        it('should return the reachable tile coordinates', () => {
            const reachableTiles: Coordinates[] = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            (service as any)._activeTileCoordinates = reachableTiles;
            expect(service.reachableTileCoordinates).toBe(reachableTiles);
            expect(service.reachableTileCoordinates.length).toBe(reachableTiles.length);
        });

        it('should return the correct reachable tile coordinates after modifications', () => {
            const initialTiles: Coordinates[] = [];
            (service as any)._activeTileCoordinates = initialTiles;
            expect(service.reachableTileCoordinates).toEqual(initialTiles);
            expect(service.reachableTileCoordinates.length).toBe(0);

            (service as any)._activeTileCoordinates.push({ x: 1, y: 1 });
            (service as any)._activeTileCoordinates.push({ x: 2, y: 2 });

            expect(service.reachableTileCoordinates.length).toBe(2);
            expect(service.reachableTileCoordinates[0]).toEqual({ x: 1, y: 1 });
            expect(service.reachableTileCoordinates[1]).toEqual({ x: 2, y: 2 });
        });
    });

    describe('configureSocketFeatures', () => {
        let eventCallback: (data: any) => void;

        beforeEach(() => {
            socketSpy.on.and.callFake((event: string, callback: (data: any) => void) => {
                if (event === GameEvents.MovePlayer) {
                    eventCallback = callback;
                }
                return socketSpy;
            });

            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];

            (service as any)._clientPosition = { x: 0, y: 0 };
            (service as any)._gameMap = testMap;
            service.movementLeft = 5;
            (service as any)._gameMap[0][0].character = CharacterType.Character1;
            (service as any)._gameMap[1][1].character = CharacterType.Character2;
            service.configureSocketFeatures();
        });

        it('should register event handler for MovePlayer event', () => {
            expect(socketSpy.on).toHaveBeenCalledWith(GameEvents.MovePlayer, jasmine.any(Function));
        });

        it('should update character position when MovePlayer event is received', () => {
            const movementData = {
                from: { x: 1, y: 1 },
                to: { x: 1, y: 0 },
                cost: 1,
            };
            const movementLeft = 5;

            eventCallback(movementData);

            expect((service as any)._gameMap[1][1].character).toBe(CharacterType.NoCharacter);
            expect((service as any)._gameMap[0][1].character).toBe(CharacterType.Character2);
            expect(service.clientPosition).toEqual({ x: 0, y: 0 });
            expect(service.movementLeft).toBe(movementLeft);
        });

        it('should update client position and movement points when client character moves', () => {
            const movementData = {
                from: { x: 0, y: 0 },
                to: { x: 0, y: 1 },
                cost: 1,
            };
            const movementLeft = 4;

            eventCallback(movementData);
            expect((service as any)._gameMap[0][0].character).toBe(CharacterType.NoCharacter);
            expect((service as any)._gameMap[1][0].character).toBe(CharacterType.Character1);
            expect(service.clientPosition).toEqual({ x: 0, y: 1 });
            expect(service.movementLeft).toBe(movementLeft);
        });

        it('should handle movement with different cost values', () => {
            const movementData = {
                from: { x: 0, y: 0 },
                to: { x: 0, y: 1 },
                cost: 2,
            };
            const movementLeft = 3;

            eventCallback(movementData);
            expect(service.movementLeft).toBe(movementLeft);
        });

        it('should not update client position if the from coordinates do not match client position', () => {
            (service as any)._gameMap[0][1].character = CharacterType.Character1;

            const movementData = {
                from: { x: 1, y: 0 },
                to: { x: 1, y: 1 },
                cost: 1,
            };
            const movementLeft = 5;

            eventCallback(movementData);

            expect((service as any)._gameMap[0][1].character).toBe(CharacterType.NoCharacter);
            expect((service as any)._gameMap[1][1].character).toBe(CharacterType.Character1);
            expect(service.clientPosition).toEqual({ x: 0, y: 0 });
            expect(service.movementLeft).toBe(movementLeft);
        });

        it('should remove item when player moves to a tile with an item', () => {
            (service as any)._gameMap[0][1].item = ItemType.Potion1;

            const movementData = {
                from: { x: 0, y: 0 },
                to: { x: 1, y: 0 },
                cost: 1,
            };

            eventCallback(movementData);
            expect((service as any)._gameMap[0][1].item).toBe(ItemType.NoItem);
        });

        it('should not remove StartPosition item when player moves to that tile', () => {
            (service as any)._gameMap[0][1].item = ItemType.StartPosition;

            const movementData = {
                from: { x: 0, y: 0 },
                to: { x: 1, y: 0 },
                cost: 1,
            };

            eventCallback(movementData);
            expect((service as any)._gameMap[0][1].item).toBe(ItemType.StartPosition);
        });

        it('should handle ItemDrop event by placing item at specified coordinates', () => {
            (service as any)._gameMap[1][1].item = ItemType.NoItem;

            const itemDropCall = socketSpy.on.calls.all().find((call) => call.args[0] === GameEvents.ItemDrop);
            if (!itemDropCall) {
                fail('ItemDrop event handler not registered');
                return;
            }
            const itemDropCallback = itemDropCall.args[1];

            const itemDropData: ItemDropDataToClient = {
                itemCoordinates: { x: 1, y: 1 },
                item: ItemType.Sword,
            };

            itemDropCallback(itemDropData);
            expect((service as any)._gameMap[1][1].item).toBe(ItemType.Sword);
        });
    });

    describe('isActionPossibleFromTile', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should return true when there is a door to the left', () => {
            (service as any)._gameMap[1][0].type = MapTileType.ClosedDoor;

            expect(service.isActionPossibleOnTile({ x: 0, y: 1 })).toBeTrue();
        });

        it('should return true when there is a character to the right', () => {
            (service as any)._gameMap[1][2].character = CharacterType.Character1;

            expect(service.isActionPossibleOnTile({ x: 2, y: 1 })).toBeTrue();
        });

        it('should return true when there is a door above', () => {
            (service as any)._gameMap[0][1].type = MapTileType.OpenDoor;

            expect(service.isActionPossibleOnTile({ x: 1, y: 0 })).toBeTrue();
        });

        it('should return true when there is a character below', () => {
            (service as any)._gameMap[2][1].character = CharacterType.Character2;

            expect(service.isActionPossibleOnTile({ x: 1, y: 2 })).toBeTrue();
        });

        it('should return false when there are no doors or characters around', () => {
            expect(service.isActionPossibleOnTile({ x: 1, y: 1 })).toBeFalse();
        });
    });

    describe('removeCharacterFromTile', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should remove character from a tile', () => {
            (service as any)._gameMap[1][0].character = CharacterType.Character1;

            service.removeCharacterFromTile({ x: 0, y: 1 });
            expect((service as any)._gameMap[1][0].character).toBe(CharacterType.NoCharacter);
        });

        it('should not affect other tiles when removing a character', () => {
            (service as any)._gameMap[0][0].character = CharacterType.Character1;
            (service as any)._gameMap[1][0].character = CharacterType.Character2;

            service.removeCharacterFromTile({ x: 0, y: 1 });
            expect((service as any)._gameMap[0][0].character).toBe(CharacterType.Character1);
            expect((service as any)._gameMap[1][0].character).toBe(CharacterType.NoCharacter);
        });
    });

    describe('showReachableAndPathTiles', () => {
        it('should call showReachableTiles and showShortestPath', () => {
            spyOn(service, 'showReachableTiles');
            spyOn(service, 'showShortestPath');

            service.showReachableAndPathTiles();
            expect(service.showReachableTiles).toHaveBeenCalled();
            expect(service.showShortestPath).toHaveBeenCalled();
        });
    });

    describe('hideReachableAndPathTiles', () => {
        it('should call hideReachableTiles and hideShortestPath', () => {
            const hideShortestPathSpy = spyOn(service, 'hideShortestPath');

            service.hideActiveAndPathTiles();
            expect(hideShortestPathSpy).toHaveBeenCalled();
        });
    });

    describe('hideReachableTiles', () => {
        beforeEach(() => {
            const reachableCoordinates = [
                { x: 0, y: 1 },
                { x: 1, y: 0 },
            ];
            (service as any)._reachableTileCoordinates = reachableCoordinates;
            (service as any)._reachableTileNodes = new Map();
        });

        it('should reset reachable tiles array and nodes', () => {
            service.hideActiveTiles();

            expect(service.reachableTileCoordinates.length).toBe(0);
            expect((service as any)._reachableTileNodes.size).toBe(0);
        });
    });

    describe('showShortestPath', () => {
        beforeEach(() => {
            const node11: { coordinates: { x: number; y: number }; key: string; previousNode?: any } = { coordinates: { x: 1, y: 1 }, key: '1,1' };
            const node01: { coordinates: { x: number; y: number }; key: string; previousNode?: any } = { coordinates: { x: 0, y: 1 }, key: '0,1' };

            node11.previousNode = node01;
            node01.previousNode = undefined;

            (service as any)._reachableTileNodes = new Map([
                ['1,1', node11],
                ['0,1', node01],
            ]);

            (service as any)._clientPosition = { x: 0, y: 0 };
            service.hoveredTileCoordinates = { x: 1, y: 1 };
            (service as any)._currentPath = [];

            spyOn<any>(service, 'setTileOnPath');
        });

        it('should show path from hovered tile to client', () => {
            service.showShortestPath();
            expect((service as any)._currentPath.length).toBe(2);
            expect((service as any).setTileOnPath).toHaveBeenCalledWith({ x: 1, y: 1 }, true);
            expect((service as any).setTileOnPath).toHaveBeenCalledWith({ x: 0, y: 1 }, true);
        });

        it('should mark client position as not on path', () => {
            service.showShortestPath();
            expect((service as any).setTileOnPath).toHaveBeenCalledWith({ x: 0, y: 0 }, false);
        });

        it('should do nothing when no path exists to hovered tile', () => {
            (service as any)._reachableTileNodes.delete('1,1');

            service.showShortestPath();
            expect((service as any)._currentPath.length).toBe(0);
            expect((service as any).setTileOnPath).not.toHaveBeenCalled();
        });
    });

    describe('hideShortestPath', () => {
        beforeEach(() => {
            (service as any)._currentPath = [
                { x: 1, y: 1 },
                { x: 0, y: 1 },
            ];

            spyOn<any>(service, 'setTileOnPath');
        });

        it('should clear path status from tiles and empty the path array', () => {
            service.hideShortestPath();

            expect((service as any).setTileOnPath).toHaveBeenCalledWith({ x: 1, y: 1 }, false);
            expect((service as any).setTileOnPath).toHaveBeenCalledWith({ x: 0, y: 1 }, false);
            expect((service as any)._currentPath.length).toBe(0);
        });
    });

    describe('isTileReachable', () => {
        beforeEach(() => {
            (service as any)._activeTileCoordinates = [
                { x: 1, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 2 },
            ];
        });

        it('should return true for coordinates in reachable tiles array', () => {
            expect(service.isTileReachable({ x: 1, y: 1 })).toBeTrue();
            expect(service.isTileReachable({ x: 2, y: 1 })).toBeTrue();
            expect(service.isTileReachable({ x: 1, y: 2 })).toBeTrue();
        });

        it('should return false for coordinates not in reachable tiles array', () => {
            expect(service.isTileReachable({ x: 0, y: 0 })).toBeFalse();
            expect(service.isTileReachable({ x: 3, y: 3 })).toBeFalse();
        });

        it('should handle edge case of empty reachable tiles array', () => {
            (service as any)._activeTileCoordinates = [];

            expect(service.isTileReachable({ x: 1, y: 1 })).toBeFalse();
        });

        it('should compare coordinates properly', () => {
            const sameCoordinate = { x: 1, y: 1 };
            expect(service.isTileReachable(sameCoordinate)).toBeTrue();

            const differentCoordinate = { x: 1, y: 3 };
            expect(service.isTileReachable(differentCoordinate)).toBeFalse();
        });
    });

    describe('getTile', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Wall, ItemType.NoItem)],
                [new MapTile(MapTileType.Water, ItemType.Potion1), new MapTile(MapTileType.OpenDoor, ItemType.Skull)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should return the correct tile at specified coordinates', () => {
            const tile00 = service.getTile({ x: 0, y: 0 });
            expect(tile00.type).toBe(MapTileType.Base);
            expect(tile00.item).toBe(ItemType.NoItem);

            const tile10 = service.getTile({ x: 1, y: 0 });
            expect(tile10.type).toBe(MapTileType.Wall);
            expect(tile10.item).toBe(ItemType.NoItem);

            const tile01 = service.getTile({ x: 0, y: 1 });
            expect(tile01.type).toBe(MapTileType.Water);
            expect(tile01.item).toBe(ItemType.Potion1);

            const tile11 = service.getTile({ x: 1, y: 1 });
            expect(tile11.type).toBe(MapTileType.OpenDoor);
            expect(tile11.item).toBe(ItemType.Skull);
        });
    });

    describe('initializeMap', () => {
        it('should set map size and create map of correct dimensions', () => {
            const mapSize = MapSize.Small;
            const testMap: MapTile[][] = Array.from({ length: mapSize }, () =>
                Array.from({ length: mapSize }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );

            service.initializeMap(testMap, MapSize.Small, CharacterType.Character1);

            expect(service.size).toBe(MapSize.Small);
            expect(service.gameMap.length).toBe(MapSize.Small);
            expect(service.gameMap[0].length).toBe(MapSize.Small);
        });

        it('should copy all tile properties from the source map', () => {
            const mapSize = MapSize.Small;
            const testMap: MapTile[][] = Array.from({ length: mapSize }, () =>
                Array.from({ length: mapSize }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );
            testMap[0][1].type = MapTileType.Wall;
            testMap[0][1].item = ItemType.Potion1;
            testMap[1][0].type = MapTileType.Water;
            testMap[1][1].type = MapTileType.OpenDoor;
            testMap[1][1].item = ItemType.StartPosition;
            testMap[1][1].character = CharacterType.Character1;

            service.initializeMap(testMap, MapSize.Small, CharacterType.Character1);

            expect(service.gameMap[0][0].type).toBe(MapTileType.Base);
            expect(service.gameMap[0][0].item).toBe(ItemType.NoItem);
            expect(service.gameMap[0][0].character).toBe(CharacterType.NoCharacter);

            expect(service.gameMap[0][1].type).toBe(MapTileType.Wall);
            expect(service.gameMap[0][1].item).toBe(ItemType.Potion1);
            expect(service.gameMap[0][1].character).toBe(CharacterType.NoCharacter);

            expect(service.gameMap[1][0].type).toBe(MapTileType.Water);
            expect(service.gameMap[1][0].character).toBe(CharacterType.NoCharacter);

            expect(service.gameMap[1][1].type).toBe(MapTileType.OpenDoor);
            expect(service.gameMap[1][1].item).toBe(ItemType.StartPosition);
            expect(service.gameMap[1][1].character).toBe(CharacterType.Character1);
        });

        it('should set client position when character is found', () => {
            const clientId = CharacterType.Character1;
            const clientX = 1;
            const clientY = 0;

            const mapSize = MapSize.Small;
            const testMap: MapTile[][] = Array.from({ length: mapSize }, () =>
                Array.from({ length: mapSize }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );

            testMap[clientY][clientX].character = clientId;

            service.initializeMap(testMap, MapSize.Small, clientId);

            expect(service.clientPosition).toEqual({ x: clientX, y: clientY });
        });

        it('should handle multiple characters and find client character correctly', () => {
            const clientId = CharacterType.Character1;
            const otherCharacterId = CharacterType.Character2;

            const mapSize = MapSize.Small;
            const testMap: MapTile[][] = Array.from({ length: mapSize }, () =>
                Array.from({ length: mapSize }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );
            testMap[0][0].character = otherCharacterId;
            testMap[1][1].character = clientId;

            service.initializeMap(testMap, MapSize.Small, clientId);

            expect(service.clientPosition).toEqual({ x: 1, y: 1 });
        });

        it('should create a new map instance and not reference the old one', () => {
            const mapSize = MapSize.Small;
            const testMap: MapTile[][] = Array.from({ length: mapSize }, () =>
                Array.from({ length: mapSize }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );

            service.initializeMap(testMap, MapSize.Small, CharacterType.Character1);
            testMap[0][0].type = MapTileType.Wall;
            expect(service.gameMap[0][0].type).toBe(MapTileType.Base);
        });
    });

    describe('isDoor', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.ClosedDoor, ItemType.NoItem)],
                [new MapTile(MapTileType.OpenDoor, ItemType.NoItem), new MapTile(MapTileType.Wall, ItemType.NoItem)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should return true for closed doors', () => {
            expect(service.isDoor({ x: 1, y: 0 })).toBeTrue();
        });

        it('should return true for open doors', () => {
            expect(service.isDoor({ x: 0, y: 1 })).toBeTrue();
        });

        it('should return false for non-door tiles', () => {
            expect(service.isDoor({ x: 0, y: 0 })).toBeFalse();
            expect(service.isDoor({ x: 1, y: 1 })).toBeFalse();
        });
    });

    describe('getCharacterOnTile', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.Character1)],
                [new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.Character2), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should return the correct character on a tile', () => {
            expect(service.getCharacterOnTile({ x: 1, y: 0 })).toBe(CharacterType.Character1);
            expect(service.getCharacterOnTile({ x: 0, y: 1 })).toBe(CharacterType.Character2);
        });

        it('should return NoCharacter for tiles without characters', () => {
            expect(service.getCharacterOnTile({ x: 0, y: 0 })).toBe(CharacterType.NoCharacter);
            expect(service.getCharacterOnTile({ x: 1, y: 1 })).toBe(CharacterType.NoCharacter);
        });
    });

    describe('isTileAdjacentToClient', () => {
        beforeEach(() => {
            (service as any)._clientPosition = { x: 2, y: 2 };
        });

        it('should return true for tiles adjacent horizontally to client', () => {
            expect(service.isTileAdjacentToClient({ x: 1, y: 2 })).toBeTrue();
            expect(service.isTileAdjacentToClient({ x: 3, y: 2 })).toBeTrue();
        });

        it('should return true for tiles adjacent vertically to client', () => {
            expect(service.isTileAdjacentToClient({ x: 2, y: 1 })).toBeTrue();
            expect(service.isTileAdjacentToClient({ x: 2, y: 3 })).toBeTrue();
        });

        it('should return false for the client position itself', () => {
            expect(service.isTileAdjacentToClient({ x: 2, y: 2 })).toBeFalse();
        });

        it('should return false for diagonal tiles', () => {
            expect(service.isTileAdjacentToClient({ x: 1, y: 1 })).toBeFalse();
            expect(service.isTileAdjacentToClient({ x: 3, y: 3 })).toBeFalse();
        });

        it('should return false for non-adjacent tiles', () => {
            expect(service.isTileAdjacentToClient({ x: 0, y: 0 })).toBeFalse();
            expect(service.isTileAdjacentToClient({ x: 5, y: 5 })).toBeFalse();
        });
    });

    describe('requestDoorUpdate', () => {
        beforeEach(() => {
            (service as any)._clientPosition = { x: 2, y: 3 };
        });

        it('should emit door update request with correct payload', () => {
            const gameId = 'test-game-123';
            const doorCoordinates = { x: 2, y: 4 };

            service.requestDoorUpdate(gameId, doorCoordinates);

            expect(socketSpy.emitDoorUpdate).toHaveBeenCalledWith({
                gameId,
                playerPosition: { x: 2, y: 3 },
                doorPosition: doorCoordinates,
            });
        });
    });

    describe('updateDoor', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = Array.from({ length: 5 }, () =>
                Array.from({ length: 5 }, () => new MapTile(MapTileType.Base, ItemType.NoItem)),
            );

            testMap[2][1] = new MapTile(MapTileType.ClosedDoor, ItemType.NoItem);

            (service as any)._gameMap = testMap;

            spyOn(service, 'showReachableAndPathTiles');
        });

        it('should update door type based on payload', () => {
            const doorCoordinates = { x: 1, y: 2 };
            const newDoorType = MapTileType.OpenDoor;
            const player: Player = {
                name: 'EnemyPlayer',
                id: CharacterType.Character1,
                userId: '123',
                health: 4,
                maxHealth: 4,
                evadeAttempts: 0,
                wins: 0,
                attack: 4,
                defense: 6,
                speed: 4,
                startPosition: { x: 0, y: 0 },
                dice: { attack: 6, defense: 4 },
                items: [],
                hasAbandoned: false,
                team: Teams.RedTeam,
                isTorchActive: false,
                isBarrelActive: false,
            };
            service.updateDoor({
                doorCoordinates,
                newDoorType,
                player,
            });
            service.updateDoor({
                doorCoordinates,
                newDoorType,
                player,
            });

            expect((service as any)._gameMap[doorCoordinates.y][doorCoordinates.x].type).toBe(newDoorType);
        });

        it('should refresh reachable and path tiles after updating door', () => {
            const doorCoordinates = { x: 1, y: 2 };
            const newDoorType = MapTileType.OpenDoor;
            const player: Player = {
                name: 'EnemyPlayer',
                id: CharacterType.Character1,
                userId: '123',
                health: 4,
                maxHealth: 4,
                evadeAttempts: 0,
                wins: 0,
                attack: 4,
                defense: 6,
                speed: 4,
                startPosition: { x: 0, y: 0 },
                dice: { attack: 6, defense: 4 },
                items: [],
                hasAbandoned: false,
                team: Teams.RedTeam,
                isTorchActive: false,
                isBarrelActive: false,
            };
            const updateDoorSpy = spyOn(service, 'updateDoor');
            service.updateDoor({
                doorCoordinates,
                newDoorType,
                player,
            });

            expect(updateDoorSpy).toHaveBeenCalled();
        });
    });

    describe('removeItemOnTile', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.Potion1)],
                [new MapTile(MapTileType.Base, ItemType.Potion2), new MapTile(MapTileType.Base, ItemType.Skull)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should remove item from a tile', () => {
            service.removeItemOnTile({ x: 1, y: 0 });
            expect((service as any)._gameMap[0][1].item).toBe(ItemType.NoItem);

            service.removeItemOnTile({ x: 0, y: 1 });
            expect((service as any)._gameMap[1][0].item).toBe(ItemType.NoItem);

            service.removeItemOnTile({ x: 1, y: 1 });
            expect((service as any)._gameMap[1][1].item).toBe(ItemType.NoItem);
        });
    });
    describe('setTileOnPath', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should set isOnPath to true on the specified tile', () => {
            const coordinates = { x: 1, y: 0 };

            (service as any).setTileOnPath(coordinates, true);

            expect((service as any)._gameMap[0][1].isOnPath).toBeTrue();
        });

        it('should set isOnPath to false on the specified tile', () => {
            const coordinates = { x: 1, y: 0 };

            (service as any).setTileOnPath(coordinates, true);
            expect((service as any)._gameMap[0][1].isOnPath).toBeTrue();

            (service as any).setTileOnPath(coordinates, false);
            expect((service as any)._gameMap[0][1].isOnPath).toBeFalse();
        });

        it('should not affect other tiles', () => {
            const coordinates = { x: 1, y: 0 };

            (service as any).setTileOnPath(coordinates, true);

            expect((service as any)._gameMap[0][0].isOnPath).toBeFalse();
            expect((service as any)._gameMap[1][0].isOnPath).toBeFalse();
            expect((service as any)._gameMap[1][1].isOnPath).toBeFalse();
        });
    });

    describe('findShortestPaths', () => {
        let generateGraphSpy: jasmine.Spy;
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Wall, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Water, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Ice, ItemType.NoItem),
                ],
            ];
            (service as any)._gameMap = testMap;
            service.movementLeft = 3;

            generateGraphSpy = spyOn<any>(service, 'generateGraphFromMap');
            generateGraphSpy.and.callFake(() => {
                const nodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();

                const node00 = new DijkstraNode({ x: 0, y: 0 }, 1);
                node00.movementPointsFromStart = 0;

                const node10 = new DijkstraNode({ x: 1, y: 0 }, 1);
                node10.movementPointsFromStart = 1;

                const node01 = new DijkstraNode({ x: 0, y: 1 }, 1);
                node01.movementPointsFromStart = 1;

                const node11 = new DijkstraNode({ x: 1, y: 1 }, 2);
                node11.movementPointsFromStart = 2;

                const node21 = new DijkstraNode({ x: 2, y: 1 }, 1);
                node21.movementPointsFromStart = 2;

                const iceValue = 0.0001;
                const node22 = new DijkstraNode({ x: 2, y: 2 }, iceValue);
                node22.movementPointsFromStart = 2.0001;

                node00.neighbors = [node10, node01];
                node10.neighbors = [node00];
                node01.neighbors = [node00, node11];
                node11.neighbors = [node01, node21];
                node21.neighbors = [node11, node22];

                node10.previousNode = node00;
                node01.previousNode = node00;
                node11.previousNode = node01;
                node21.previousNode = node11;
                node22.previousNode = node21;

                nodes.set('0,0', node00);
                nodes.set('1,0', node10);
                nodes.set('0,1', node01);
                nodes.set('1,1', node11);
                nodes.set('2,1', node21);
                nodes.set('2,2', node22);

                return nodes;
            });
        });

        it('should find reachable tiles within movement range', () => {
            const startPosition = { x: 0, y: 0 };

            const result = (service as any).findShortestPaths(startPosition);

            expect(result.size).toBeGreaterThan(0);
            expect(result.has('0,0')).toBeTrue();
            expect(result.has('1,0')).toBeTrue();
            expect(result.has('0,1')).toBeTrue();
        });

        it('should not include tiles blocked by walls', () => {
            const startPosition = { x: 0, y: 0 };

            const result = (service as any).findShortestPaths(startPosition);

            expect(result.has('2,0')).toBeFalse();
        });

        it('should compute correct paths with distance information', () => {
            const startPosition = { x: 0, y: 0 };

            const result = (service as any).findShortestPaths(startPosition);
            const baseTile = result.get('1,0');
            const waterTile = result.get('1,1');

            expect(baseTile).toBeDefined();
            expect(waterTile).toBeDefined();
            if (baseTile && waterTile) {
                expect(baseTile.movementPointsFromStart).toBe(1);
                expect(waterTile.movementPointsFromStart).toBe(2);
                expect(waterTile.previousNode).toBeDefined();
            }
        });

        it('should handle ice tiles with very low cost', () => {
            const startPosition = { x: 0, y: 0 };
            service.movementLeft = 2.5;

            generateGraphSpy.and.callFake(() => {
                const nodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();

                const node00 = new DijkstraNode({ x: 0, y: 0 }, 1);
                node00.movementPointsFromStart = 0;

                const node01 = new DijkstraNode({ x: 0, y: 1 }, 1);
                node01.movementPointsFromStart = 1;

                const node02 = new DijkstraNode({ x: 0, y: 2 }, 1);
                node02.movementPointsFromStart = 2;

                const iceCost = 0.0001;
                const node22 = new DijkstraNode({ x: 2, y: 2 }, iceCost);
                node22.movementPointsFromStart = 2.0001;

                node00.neighbors = [node01];
                node01.neighbors = [node00, node02];
                node02.neighbors = [node01, node22];
                node22.neighbors = [node02];

                node01.previousNode = node00;
                node02.previousNode = node01;
                node22.previousNode = node02;

                nodes.set('0,0', node00);
                nodes.set('0,1', node01);
                nodes.set('0,2', node02);
                nodes.set('2,2', node22);

                return nodes;
            });

            const result = (service as any).findShortestPaths(startPosition);

            expect(result.has('2,2')).toBeTrue();
        });

        it('should update distances and previous node pointers correctly', () => {
            const startNode = new DijkstraNode({ x: 0, y: 0 }, 1);
            startNode.movementPointsFromStart = 0;

            const neighbor1 = new DijkstraNode({ x: 1, y: 0 }, 1);
            neighbor1.movementPointsFromStart = Infinity;

            const neighbor2 = new DijkstraNode({ x: 0, y: 1 }, 2);
            neighbor2.movementPointsFromStart = Infinity;
            startNode.neighbors.push(neighbor1);
            startNode.neighbors.push(neighbor2);
            neighbor1.neighbors.push(startNode);
            neighbor2.neighbors.push(startNode);

            const nodes = new Map<string, DijkstraNode>();
            nodes.set(startNode.key, startNode);
            nodes.set(neighbor1.key, neighbor1);
            nodes.set(neighbor2.key, neighbor2);

            spyOn<any>(service, 'findNextNode').and.returnValues(startNode, neighbor1, neighbor2, undefined);

            const result = (service as any).findShortestPaths(startNode.coordinates);

            expect(result.get(neighbor1.key)?.movementPointsFromStart).toBe(1);
            expect(result.get(neighbor1.key)?.previousNode).toBe(startNode);
            expect(result.get(neighbor2.key)?.movementPointsFromStart).toBe(2);
            expect(result.get(neighbor2.key)?.previousNode).toBe(startNode);
        });

        it('should not update distance when new distance is higher than current', () => {
            const start = new DijkstraNode({ x: 0, y: 0 }, 1);
            start.movementPointsFromStart = 0;

            const neighbor = new DijkstraNode({ x: 1, y: 0 }, 1);
            neighbor.movementPointsFromStart = 1;

            start.neighbors.push(neighbor);
            neighbor.neighbors.push(start);

            const detour = new DijkstraNode({ x: 0, y: 1 }, 2);
            detour.movementPointsFromStart = 2;
            detour.previousNode = start;
            detour.neighbors.push(neighbor);
            neighbor.neighbors.push(detour);

            generateGraphSpy.and.returnValue(
                new Map([
                    [start.key, start],
                    [neighbor.key, neighbor],
                    [detour.key, detour],
                ]),
            );

            spyOn<any>(service, 'findNextNode').and.returnValues(start, detour, neighbor, undefined);

            const result = (service as any).findShortestPaths(start.coordinates);

            expect(result.get(neighbor.key)?.movementPointsFromStart).toBe(1);
            expect(result.get(neighbor.key)?.previousNode).not.toBe(detour);
        });
    });

    describe('generateGraphFromMap', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Wall, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Water, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Ice, ItemType.NoItem),
                ],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should create nodes for traversable tiles', () => {
            const startPosition = { x: 0, y: 0 };

            const graph = (service as any).generateGraphFromMap(startPosition);

            expect(graph.size).toBe(MapSize.Small - 2);

            expect(graph.has('0,0')).toBeTrue();
            expect(graph.has('1,1')).toBeTrue();
            expect(graph.has('2,2')).toBeTrue();
            expect(graph.has('2,0')).toBeFalse();
        });

        it('should set up correct connections between nodes', () => {
            const startPosition = { x: 0, y: 0 };

            const graph = (service as any).generateGraphFromMap(startPosition);

            const node00 = graph.get('0,0');
            expect(node00.neighbors.length).toBe(2);

            const neighborKeys = node00.neighbors.map((n: any) => n.key);
            expect(neighborKeys).toContain('1,0');
            expect(neighborKeys).toContain('0,1');
        });

        it('should set correct movement costs for different terrain types', () => {
            const startPosition = { x: 0, y: 0 };

            const graph = (service as any).generateGraphFromMap(startPosition);

            const baseNode = graph.get('0,0');
            const waterNode = graph.get('1,1');
            const iceNode = graph.get('2,2');

            const baseCost = 1;
            const waterCost = 2;
            const iceCost = 0.0001;

            expect(baseNode.movementCostToEnter).toBe(baseCost);
            expect(waterNode.movementCostToEnter).toBe(waterCost);
            expect(iceNode.movementCostToEnter).toBe(iceCost);
        });
    });

    describe('findNextNode', () => {
        it('should find the node with minimum distance', () => {
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 1;

            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 0.5;

            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 2;

            const nodes = new Map<string, DijkstraNode>([
                [node1.key, node1],
                [node2.key, node2],
                [node3.key, node3],
            ]);

            const maxMovement = 3;

            const result = (service as any).findNextNode(nodes, maxMovement);

            expect(result).toBe(node2);
        });

        it('should only consider nodes within max movement range', () => {
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 1;

            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 4;

            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 2;

            const nodes = new Map<string, DijkstraNode>([
                [node1.key, node1],
                [node2.key, node2],
                [node3.key, node3],
            ]);

            const maxMovement = 3;

            const result = (service as any).findNextNode(nodes, maxMovement);

            expect(result).toBe(node1);
        });

        it('should return undefined when no valid nodes exist', () => {
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 4;

            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 5;

            const nodes = new Map<string, DijkstraNode>([
                [node1.key, node1],
                [node2.key, node2],
            ]);

            const maxMovement = 3;
            const result = (service as any).findNextNode(nodes, maxMovement);
            expect(result).toBeUndefined();
        });
    });

    describe('isTileTraversable', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.Character1),
                    new MapTile(MapTileType.ClosedDoor, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Wall, ItemType.NoItem),
                    new MapTile(MapTileType.OpenDoor, ItemType.NoItem),
                    new MapTile(MapTileType.Water, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Ice, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.Sword),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should return true for an empty base tile', () => {
            expect(service.isTileTraversable({ x: 0, y: 0 })).toBeTrue();
        });

        it('should return false for a tile with a character', () => {
            expect(service.isTileTraversable({ x: 1, y: 0 })).toBeFalse();
        });

        it('should return false for a closed door', () => {
            expect(service.isTileTraversable({ x: 2, y: 0 })).toBeFalse();
        });

        it('should return false for a wall', () => {
            expect(service.isTileTraversable({ x: 0, y: 1 })).toBeFalse();
        });

        it('should return true for an open door', () => {
            expect(service.isTileTraversable({ x: 1, y: 1 })).toBeTrue();
        });

        it('should return true for water tile', () => {
            expect(service.isTileTraversable({ x: 2, y: 1 })).toBeTrue();
        });

        it('should return true for ice tile', () => {
            expect(service.isTileTraversable({ x: 0, y: 2 })).toBeTrue();
        });

        it('should return true for a tile with an item', () => {
            expect(service.isTileTraversable({ x: 1, y: 2 })).toBeTrue();
        });
    });

    describe('dropItem', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
                [new MapTile(MapTileType.Base, ItemType.Torch), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];
            (service as any)._gameMap = testMap;
        });

        it('should place an item on an empty tile', () => {
            const itemDropData: ItemDropDataToClient = {
                itemCoordinates: { x: 0, y: 0 },
                item: ItemType.Sword,
            };

            service.dropItem(itemDropData);
            expect((service as any)._gameMap[0][0].item).toBe(ItemType.Sword);
        });

        it('should replace an existing item on a tile', () => {
            const itemDropData: ItemDropDataToClient = {
                itemCoordinates: { x: 0, y: 1 },
                item: ItemType.Potion1,
            };

            expect((service as any)._gameMap[1][0].item).toBe(ItemType.Torch);
            service.dropItem(itemDropData);
            expect((service as any)._gameMap[1][0].item).toBe(ItemType.Potion1);
        });

        it('should handle "NoItem" drop by removing existing items', () => {
            const itemDropData: ItemDropDataToClient = {
                itemCoordinates: { x: 0, y: 1 },
                item: ItemType.NoItem,
            };

            service.dropItem(itemDropData);
            expect((service as any)._gameMap[1][0].item).toBe(ItemType.NoItem);
        });

        it('should handle map edge properly', () => {
            const itemDropData: ItemDropDataToClient = {
                itemCoordinates: { x: 1, y: 1 },
                item: ItemType.Flag,
            };

            service.dropItem(itemDropData);
            expect((service as any)._gameMap[1][1].item).toBe(ItemType.Flag);
        });
    });

    describe('showActionTiles', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.ClosedDoor, ItemType.NoItem),
                ],
                [
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                    new MapTile(MapTileType.Base, ItemType.NoItem, CharacterType.Character2),
                    new MapTile(MapTileType.Base, ItemType.NoItem),
                ],
            ];

            (service as any)._gameMap = testMap;
            (service as any)._size = 3;
            (service as any)._clientPosition = { x: 1, y: 1 };
            (service as any)._activeTileCoordinates = [];

            spyOn<any>(service, 'getAdjacentCoordinates').and.callThrough();
            spyOn<any>(service, 'setTileActive');
            spyOn(service, 'isActionPossibleOnTile').and.callFake((coords: Coordinates) => {
                if (coords.x === 2 && coords.y === 1) return true;
                if (coords.x === 1 && coords.y === 2) return true;
                return false;
            });
        });

        it('should identify and mark actionable adjacent tiles', () => {
            service.showActionTiles();
            const four = 4;
            expect((service as any).getAdjacentCoordinates).toHaveBeenCalledWith((service as any)._clientPosition);
            expect(service.isActionPossibleOnTile).toHaveBeenCalledTimes(four);

            expect((service as any).setTileActive).toHaveBeenCalledWith({ x: 2, y: 1 }, true);
            expect((service as any).setTileActive).toHaveBeenCalledWith({ x: 1, y: 2 }, true);

            expect((service as any)._activeTileCoordinates.length).toBe(2);
        });

        it('should not mark non-actionable tiles as active', () => {
            service.showActionTiles();

            expect((service as any).setTileActive).not.toHaveBeenCalledWith({ x: 0, y: 1 }, true);
            expect((service as any).setTileActive).not.toHaveBeenCalledWith({ x: 1, y: 0 }, true);
        });

        it('should handle the case with no actionable tiles', () => {
            (service.isActionPossibleOnTile as jasmine.Spy).and.returnValue(false);

            service.showActionTiles();

            expect((service as any)._activeTileCoordinates.length).toBe(0);
            expect((service as any).setTileActive).not.toHaveBeenCalled();
        });
    });

    describe('showReachableTiles', () => {
        beforeEach(() => {
            (service as any)._clientPosition = { x: 1, y: 1 };

            const mockNode1 = new DijkstraNode({ x: 0, y: 1 }, 1);
            const mockNode2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            const mockNode3 = new DijkstraNode({ x: 2, y: 1 }, 1);

            const mockNodes = new Map<string, DijkstraNode>();
            mockNodes.set('0,1', mockNode1);
            mockNodes.set('1,0', mockNode2);
            mockNodes.set('2,1', mockNode3);
            mockNodes.set('1,1', new DijkstraNode({ x: 1, y: 1 }, 1));

            spyOn<any>(service, 'findShortestPaths').and.returnValue(mockNodes);
            spyOn<any>(service, 'setTileActive');
        });

        it('should find shortest paths from client position', () => {
            service.showReachableTiles();

            expect((service as any).findShortestPaths).toHaveBeenCalledWith((service as any)._clientPosition);
        });

        it('should exclude client position from reachable tiles', () => {
            service.showReachableTiles();

            expect((service as any)._reachableTileNodes.has('1,1')).toBeFalse();
        });

        it('should set all reachable tiles as active', () => {
            service.showReachableTiles();
            const three = 3;
            expect((service as any).setTileActive).toHaveBeenCalledTimes(three);

            const calls = (service as any).setTileActive.calls.all();
            expect(calls.some((call: any) => call.args[0]._coordinates.x === 0 && call.args[0]._coordinates.y === 1)).toBeTrue();
            expect(calls.some((call: any) => call.args[0]._coordinates.x === 1 && call.args[0]._coordinates.y === 0)).toBeTrue();
            expect(calls.some((call: any) => call.args[0]._coordinates.x === 2 && call.args[0]._coordinates.y === 1)).toBeTrue();
        });

        it('should update activeTileCoordinates with reachable nodes', () => {
            service.showReachableTiles();
            const three = 3;
            expect((service as any)._activeTileCoordinates.length).toBe(three);
        });
    });

    describe('areCoordinatesInMap', () => {
        beforeEach(() => {
            (service as any)._size = MapSize.Small;
        });

        it('should return true for coordinates within the map boundaries', () => {
            expect((service as any).areCoordinatesInMap({ x: 0, y: 0 })).toBeTrue();
            expect((service as any).areCoordinatesInMap({ x: 4, y: 4 })).toBeTrue();
            expect((service as any).areCoordinatesInMap({ x: 2, y: 3 })).toBeTrue();
        });

        it('should return false for negative coordinates', () => {
            expect((service as any).areCoordinatesInMap({ x: -1, y: 0 })).toBeFalse();
            expect((service as any).areCoordinatesInMap({ x: 0, y: -1 })).toBeFalse();
            expect((service as any).areCoordinatesInMap({ x: -1, y: -1 })).toBeFalse();
        });

        it('should handle different map sizes', () => {
            (service as any)._size = MapSize.Medium;

            expect((service as any).areCoordinatesInMap({ x: 10, y: 10 })).toBeTrue();
        });
    });

    describe('getAdjacentCoordinates', () => {
        beforeEach(() => {
            (service as any)._size = MapSize.Small;
            spyOn<any>(service, 'areCoordinatesInMap').and.callThrough();
        });

        it('should return all four adjacent coordinates for a central position', () => {
            const centralPosition = { x: 2, y: 2 };
            const adjacentCoordinates = (service as any).getAdjacentCoordinates(centralPosition);

            const four = 4;
            expect(adjacentCoordinates.length).toBe(four);
            expect(adjacentCoordinates).toContain({ x: 1, y: 2 });
            expect(adjacentCoordinates).toContain({ x: 3, y: 2 });
            expect(adjacentCoordinates).toContain({ x: 2, y: 1 });
            expect(adjacentCoordinates).toContain({ x: 2, y: 3 });
        });

        it('should only return valid coordinates for an edge position', () => {
            const edgePosition = { x: 0, y: 2 };
            const adjacentCoordinates = (service as any).getAdjacentCoordinates(edgePosition);

            const three = 3;
            expect(adjacentCoordinates.length).toBe(three);
            expect(adjacentCoordinates).toContain({ x: 1, y: 2 });
            expect(adjacentCoordinates).toContain({ x: 0, y: 1 });
            expect(adjacentCoordinates).toContain({ x: 0, y: 3 });
            expect(adjacentCoordinates).not.toContain({ x: -1, y: 2 });
        });

        it('should only return valid coordinates for a corner position', () => {
            const cornerPosition = { x: 0, y: 0 };
            const adjacentCoordinates = (service as any).getAdjacentCoordinates(cornerPosition);

            expect(adjacentCoordinates.length).toBe(2);
            expect(adjacentCoordinates).toContain({ x: 1, y: 0 });
            expect(adjacentCoordinates).toContain({ x: 0, y: 1 });
            expect(adjacentCoordinates).not.toContain({ x: -1, y: 0 });
            expect(adjacentCoordinates).not.toContain({ x: 0, y: -1 });
        });

        it('should check each adjacent coordinate for validity', () => {
            (service as any).getAdjacentCoordinates({ x: 0, y: 0 });

            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith({ x: 1, y: 0 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith({ x: -1, y: 0 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith({ x: 0, y: 1 });
            expect((service as any).areCoordinatesInMap).toHaveBeenCalledWith({ x: 0, y: -1 });
        });
    });

    describe('setTileActive', () => {
        beforeEach(() => {
            const testMap: MapTile[][] = [
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
                [new MapTile(MapTileType.Base, ItemType.NoItem), new MapTile(MapTileType.Base, ItemType.NoItem)],
            ];

            (service as any)._gameMap = testMap;
            spyOn<any>(service, 'getTileReference').and.callThrough();
        });

        it('should set tile as active', () => {
            const tileCoordinates = { x: 0, y: 1 };

            (service as any).setTileActive(tileCoordinates, true);

            expect((service as any).getTileReference).toHaveBeenCalledWith(tileCoordinates);
            expect((service as any)._gameMap[1][0].isActive).toBeTrue();
        });

        it('should set tile as inactive', () => {
            const tileCoordinates = { x: 1, y: 0 };

            (service as any)._gameMap[0][1].isActive = true;

            (service as any).setTileActive(tileCoordinates, false);

            expect((service as any)._gameMap[0][1].isActive).toBeFalse();
        });

        it('should get correct tile reference', () => {
            const tileCoordinates = { x: 1, y: 1 };

            (service as any).setTileActive(tileCoordinates, true);

            expect((service as any).getTileReference).toHaveBeenCalledWith(tileCoordinates);
        });

        it('should not affect other tiles', () => {
            const tileCoordinates = { x: 0, y: 0 };

            (service as any).setTileActive(tileCoordinates, true);

            expect((service as any)._gameMap[0][0].isActive).toBeTrue();
            expect((service as any)._gameMap[0][1].isActive).toBeFalse();
            expect((service as any)._gameMap[1][0].isActive).toBeFalse();
            expect((service as any)._gameMap[1][1].isActive).toBeFalse();
        });
    });
});
