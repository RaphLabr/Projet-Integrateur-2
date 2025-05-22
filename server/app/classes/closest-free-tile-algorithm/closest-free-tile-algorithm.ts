import { MapTile } from '@app/constants/map-tile';
import { DfsData } from '@app/interfaces/dfs/dfs.interface';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';

export class ClosestFreeTileAlgorithm {
    static findClosestFreeTile(gameId: string, game: GameData, coordinate: Coordinates, isStartPositionAllowed: boolean): Coordinates {
        if (!this.isPositionOccupied(coordinate, game.map.terrain, isStartPositionAllowed)) {
            return coordinate;
        }

        return this.findValidPosition(coordinate, gameId, game, isStartPositionAllowed);
    }

    static isPositionOccupied(position: Coordinates, map: MapTile[][], isStartPositionAllowed: boolean): boolean {
        const tile = map[position.y][position.x];
        const hasCharacter = tile.character !== CharacterType.NoCharacter;
        const hasItem = tile.item !== ItemType.NoItem;
        const isStartPositionItem = tile.item === ItemType.StartPosition;

        return hasCharacter || (hasItem && !(isStartPositionAllowed && isStartPositionItem));
    }

    private static findValidPosition(startCoordinate: Coordinates, gameId: string, game: GameData, isStartPositionAllowed: boolean): Coordinates {
        const dfsData: DfsData = {
            queue: [],
            visited: new Set<string>(),
        };

        this.addAdjacentPositionsToQueue(dfsData, startCoordinate, game.map.size);

        return this.processPositionQueue(game, dfsData, isStartPositionAllowed);
    }

    private static addAdjacentPositionsToQueue(dfsData: DfsData, position: Coordinates, mapSize: number): void {
        const directions = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
        ];

        for (const dir of directions) {
            const pos = { x: position.x + dir.x, y: position.y + dir.y };
            const key = `${pos.x},${pos.y}`;

            if (this.isInMapBounds(pos, mapSize) && !dfsData.visited.has(key)) {
                dfsData.queue.push(pos);
                dfsData.visited.add(key);
            }
        }
    }

    private static isInMapBounds(pos: Coordinates, mapSize: number): boolean {
        return pos.x >= 0 && pos.x < mapSize && pos.y >= 0 && pos.y < mapSize;
    }

    private static processPositionQueue(game: GameData, dfsData: DfsData, isStartPositionAllowed: boolean): Coordinates {
        const validTileTypes = [MapTileType.Base, MapTileType.Water, MapTileType.Ice, MapTileType.OpenDoor];
        while (dfsData.queue.length > 0) {
            const position = dfsData.queue.shift();
            if (!position) {
                return undefined;
            }

            if (!this.isPositionOccupied(position, game.map.terrain, isStartPositionAllowed)) {
                const tileType = game.map.terrain[position.y][position.x].type;

                if (validTileTypes.includes(tileType)) {
                    return position;
                }
            }

            this.addAdjacentPositionsToQueue(dfsData, position, game.map.size);
        }
        return undefined;
    }
}
