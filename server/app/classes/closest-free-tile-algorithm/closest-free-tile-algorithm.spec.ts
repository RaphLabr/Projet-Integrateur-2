// we use any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClosestFreeTileAlgorithm } from '@app/classes/closest-free-tile-algorithm/closest-free-tile-algorithm';
import { MapTile } from '@app/constants/map-tile';
import { DfsData } from '@app/interfaces/dfs/dfs.interface';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';

describe('ClosestFreeTileAlgorithm', () => {
    const gameId = 'test-game-id';
    let game: GameData;

    beforeEach(() => {
        const terrain: MapTile[][] = Array(MapSize.Small)
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

        game = {
            map: {
                terrain,
                size: 5,
            },
        } as GameData;

        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('findClosestFreeTile', () => {
        it('should return the position itself when it is not occupied', () => {
            const targetPosition = { x: 2, y: 2 };

            const isOccupiedSpy = jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied');
            isOccupiedSpy.mockReturnValue(false);

            const result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);

            expect(result).toEqual(targetPosition);
            expect(isOccupiedSpy).toHaveBeenCalledWith(targetPosition, game.map.terrain, true);
        });

        it('should return undefined when position is occupied and invalid', () => {
            const targetPosition = { x: 2, y: 2 };

            game.map.terrain[targetPosition.y][targetPosition.x].character = CharacterType.Character1;
            game.map.terrain[targetPosition.y - 1][targetPosition.x].character = CharacterType.Character2;
            game.map.terrain[targetPosition.y][targetPosition.x + 1].character = CharacterType.Character3;
            game.map.terrain[targetPosition.y + 1][targetPosition.x].character = CharacterType.Character4;
            game.map.terrain[targetPosition.y][targetPosition.x - 1].type = MapTileType.Wall;

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(true);
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'findValidPosition').mockReturnValue(undefined);

            const result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);

            expect(result).toBeUndefined();
        });

        it('should find first valid position when start position is occupied', () => {
            const targetPosition = { x: 2, y: 2 };
            const validPosition = { x: 1, y: 2 };

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(true);
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'findValidPosition').mockReturnValue(validPosition);

            const result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);

            expect(result).toEqual(validPosition);
        });

        it('should consider different tile types as valid', () => {
            const targetPosition = { x: 2, y: 2 };

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(true);
            const findValidPositionSpy = jest.spyOn(ClosestFreeTileAlgorithm as any, 'findValidPosition');

            findValidPositionSpy.mockReturnValueOnce({ x: 2, y: 1 });
            let result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);
            expect(result).toEqual({ x: 2, y: 1 });

            findValidPositionSpy.mockReturnValueOnce({ x: 3, y: 2 });
            result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);
            expect(result).toEqual({ x: 3, y: 2 });

            findValidPositionSpy.mockReturnValueOnce({ x: 2, y: 3 });
            result = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, targetPosition, true);
            expect(result).toEqual({ x: 2, y: 3 });
        });
    });

    describe('processPositionQueue', () => {
        it('should return undefined when queue shift returns null despite queue length', () => {
            const dfsData: DfsData = {
                queue: {
                    length: 1,
                    shift: jest.fn().mockReturnValue(null),
                    push: jest.fn(),
                } as unknown as Coordinates[],
                visited: new Set<string>(),
            };

            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isPositionOccupied').mockReturnValue(false);

            const processPositionQueue = (ClosestFreeTileAlgorithm as any).processPositionQueue;
            const result = processPositionQueue.call(ClosestFreeTileAlgorithm, game, dfsData, true);

            expect(result).toBeUndefined();
            expect(dfsData.queue.shift).toHaveBeenCalled();
        });

        it('should find the first valid position in the queue', () => {
            const pos1 = { x: 1, y: 1 };
            const pos2 = { x: 2, y: 2 };

            const dfsData: DfsData = {
                queue: [pos1, pos2],
                visited: new Set<string>(),
            };

            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isPositionOccupied').mockImplementation((position: Coordinates) => {
                return position.x === pos1.x && position.y === pos1.y;
            });

            const addSpy = jest.spyOn(ClosestFreeTileAlgorithm as any, 'addAdjacentPositionsToQueue').mockImplementation(() => undefined);
            const processPositionQueue = (ClosestFreeTileAlgorithm as any).processPositionQueue;
            const result = processPositionQueue.call(ClosestFreeTileAlgorithm, game, dfsData, true);

            expect(result).toEqual(pos2);
            expect(addSpy).toHaveBeenCalledWith(dfsData, pos1, game.map.size);
        });

        it('should skip positions with invalid tile types', () => {
            const position = { x: 1, y: 1 };

            const dfsData: DfsData = {
                queue: [position],
                visited: new Set<string>(),
            };

            game.map.terrain[position.y][position.x].type = MapTileType.Wall;
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isPositionOccupied').mockReturnValue(false);
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'addAdjacentPositionsToQueue').mockImplementation(() => undefined);

            const processPositionQueue = (ClosestFreeTileAlgorithm as any).processPositionQueue;
            const result = processPositionQueue.call(ClosestFreeTileAlgorithm, game, dfsData, true);

            expect(result).toBeUndefined();
        });
    });

    describe('isPositionOccupied', () => {
        it('should return false when tile has no character or item', () => {
            const position = { x: 2, y: 2 };

            game.map.terrain[position.y][position.x].character = CharacterType.NoCharacter;
            game.map.terrain[position.y][position.x].item = ItemType.NoItem;

            const result = ClosestFreeTileAlgorithm.isPositionOccupied(position, game.map.terrain, true);

            expect(result).toBe(false);
        });

        it('should return true when tile has a character', () => {
            const position = { x: 2, y: 2 };

            game.map.terrain[position.y][position.x].character = CharacterType.Character1;
            game.map.terrain[position.y][position.x].item = ItemType.NoItem;

            const result = ClosestFreeTileAlgorithm.isPositionOccupied(position, game.map.terrain, true);

            expect(result).toBe(true);
        });

        it('should return true when tile has a non-StartPosition item', () => {
            const position = { x: 2, y: 2 };

            game.map.terrain[position.y][position.x].character = CharacterType.NoCharacter;
            game.map.terrain[position.y][position.x].item = ItemType.Potion1;

            const result = ClosestFreeTileAlgorithm.isPositionOccupied(position, game.map.terrain, true);

            expect(result).toBe(true);
        });

        it('should return false when tile has a StartPosition item and isStartPositionAllowed is true', () => {
            const position = { x: 2, y: 2 };

            game.map.terrain[position.y][position.x].character = CharacterType.NoCharacter;
            game.map.terrain[position.y][position.x].item = ItemType.StartPosition;

            const result = ClosestFreeTileAlgorithm.isPositionOccupied(position, game.map.terrain, true);

            expect(result).toBe(false);
        });

        it('should return true when tile has a StartPosition item and isStartPositionAllowed is false', () => {
            const position = { x: 2, y: 2 };

            game.map.terrain[position.y][position.x].character = CharacterType.NoCharacter;
            game.map.terrain[position.y][position.x].item = ItemType.StartPosition;

            const result = ClosestFreeTileAlgorithm.isPositionOccupied(position, game.map.terrain, false);

            expect(result).toBe(true);
        });
    });

    describe('findValidPosition', () => {
        it('should call processPositionQueue with correct parameters', () => {
            const startCoordinate = { x: 2, y: 2 };
            const addSpy = jest
                .spyOn(ClosestFreeTileAlgorithm as any, 'addAdjacentPositionsToQueue')
                .mockImplementation((dfsData: any, position: any) => {
                    const directions = [
                        { x: 0, y: -1 },
                        { x: 1, y: 0 },
                        { x: 0, y: 1 },
                        { x: -1, y: 0 },
                    ];

                    for (const dir of directions) {
                        dfsData.queue.push({ x: position.x + dir.x, y: position.y + dir.y });
                    }
                });

            const processQueueSpy = jest.spyOn(ClosestFreeTileAlgorithm as any, 'processPositionQueue').mockReturnValue({ x: 3, y: 2 });
            const findValidPosition = (ClosestFreeTileAlgorithm as any).findValidPosition;
            const result = findValidPosition.call(ClosestFreeTileAlgorithm, startCoordinate, gameId, game, true);

            expect(addSpy).toHaveBeenCalledWith(expect.any(Object), startCoordinate, game.map.size);
            expect(processQueueSpy).toHaveBeenCalledWith(game, expect.any(Object), true);
            expect(result).toEqual({ x: 3, y: 2 });
        });

        it('should return undefined when no valid position is found', () => {
            const startCoordinate = { x: 2, y: 2 };

            jest.clearAllMocks();
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'processPositionQueue').mockReturnValue(undefined);
            jest.spyOn(ClosestFreeTileAlgorithm as any, 'addAdjacentPositionsToQueue').mockImplementation(() => undefined);

            const findValidPosition = (ClosestFreeTileAlgorithm as any).findValidPosition;
            const result = findValidPosition.call(ClosestFreeTileAlgorithm, startCoordinate, gameId, game, true);

            expect(result).toBeUndefined();
        });
    });

    describe('addAdjacentPositionsToQueue', () => {
        it('should add all four adjacent positions when all are valid and not visited', () => {
            const position = { x: 2, y: 2 };
            const dfsData: DfsData = {
                queue: [],
                visited: new Set<string>(),
            };

            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isInMapBounds').mockImplementation(() => true);

            const four = 4;
            const five = 5;
            const addAdjacentPositionsToQueue = (ClosestFreeTileAlgorithm as any).addAdjacentPositionsToQueue;
            addAdjacentPositionsToQueue.call(ClosestFreeTileAlgorithm, dfsData, position, five);

            expect(dfsData.queue.length).toBe(four);
            expect(dfsData.queue).toContainEqual({ x: 2, y: 1 });
            expect(dfsData.queue).toContainEqual({ x: 3, y: 2 });
            expect(dfsData.queue).toContainEqual({ x: 2, y: 3 });
            expect(dfsData.queue).toContainEqual({ x: 1, y: 2 });
            expect(dfsData.visited.size).toBe(four);
        });

        it('should not add positions that are out of bounds', () => {
            const position = { x: 0, y: 0 };
            const dfsData: DfsData = {
                queue: [],
                visited: new Set<string>(),
            };

            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isInMapBounds').mockRestore();

            const five = 5;
            const addAdjacentPositionsToQueue = (ClosestFreeTileAlgorithm as any).addAdjacentPositionsToQueue;
            addAdjacentPositionsToQueue.call(ClosestFreeTileAlgorithm, dfsData, position, five);

            expect(dfsData.queue.length).toBe(2);
            expect(dfsData.queue).toContainEqual({ x: 1, y: 0 });
            expect(dfsData.queue).toContainEqual({ x: 0, y: 1 });
            expect(dfsData.queue).not.toContainEqual({ x: 0, y: -1 });
            expect(dfsData.queue).not.toContainEqual({ x: -1, y: 0 });

            expect(dfsData.visited.size).toBe(2);
        });

        it('should not add positions that have already been visited', () => {
            const position = { x: 2, y: 2 };
            const dfsData: DfsData = {
                queue: [],
                visited: new Set<string>(['2,1', '3,2']),
            };

            jest.spyOn(ClosestFreeTileAlgorithm as any, 'isInMapBounds').mockReturnValue(true);

            const addAdjacentPositionsToQueue = (ClosestFreeTileAlgorithm as any).addAdjacentPositionsToQueue;
            const five = 5;
            addAdjacentPositionsToQueue.call(ClosestFreeTileAlgorithm, dfsData, position, five);

            expect(dfsData.queue.length).toBe(2);
            expect(dfsData.queue).not.toContainEqual({ x: 2, y: 1 });
            expect(dfsData.queue).not.toContainEqual({ x: 3, y: 2 });
            expect(dfsData.queue).toContainEqual({ x: 2, y: 3 });
            expect(dfsData.queue).toContainEqual({ x: 1, y: 2 });
            const expectedSize = 4;
            expect(dfsData.visited.size).toBe(expectedSize);
        });
    });

    describe('isInMapBounds', () => {
        it('should return true for position inside map bounds', () => {
            const position = { x: 2, y: 2 };
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;
            const result = isInMapBounds.call(ClosestFreeTileAlgorithm, position, mapSize);

            expect(result).toBe(true);
        });

        it('should return true for position at map edge', () => {
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;

            expect(isInMapBounds.call(ClosestFreeTileAlgorithm, { x: 0, y: 0 }, mapSize)).toBe(true);
            expect(isInMapBounds.call(ClosestFreeTileAlgorithm, { x: 4, y: 0 }, mapSize)).toBe(true);
            expect(isInMapBounds.call(ClosestFreeTileAlgorithm, { x: 0, y: 4 }, mapSize)).toBe(true);
            expect(isInMapBounds.call(ClosestFreeTileAlgorithm, { x: 4, y: 4 }, mapSize)).toBe(true);
        });

        it('should return false for position with negative x', () => {
            const position = { x: -1, y: 2 };
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;
            const result = isInMapBounds.call(ClosestFreeTileAlgorithm, position, mapSize);

            expect(result).toBe(false);
        });

        it('should return false for position with negative y', () => {
            const position = { x: 2, y: -1 };
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;
            const result = isInMapBounds.call(ClosestFreeTileAlgorithm, position, mapSize);

            expect(result).toBe(false);
        });

        it('should return false for position with x >= mapSize', () => {
            const position = { x: 5, y: 2 };
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;
            const result = isInMapBounds.call(ClosestFreeTileAlgorithm, position, mapSize);

            expect(result).toBe(false);
        });

        it('should return false for position with y >= mapSize', () => {
            const position = { x: 2, y: 5 };
            const mapSize = 5;

            const isInMapBounds = (ClosestFreeTileAlgorithm as any).isInMapBounds;
            const result = isInMapBounds.call(ClosestFreeTileAlgorithm, position, mapSize);

            expect(result).toBe(false);
        });
    });
});
