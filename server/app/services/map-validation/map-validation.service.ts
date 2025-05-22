import * as constants from '@app/constants/map-constants';
import { GameMap } from '@app/model/database/game-map';
import { MapService } from '@app/services/map/map.service';
import { areCoordinatesEqual } from '@app/utils/coordinate-utils/coordinate-utils';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/map-specifications';
import { MapTileType } from '@common/map-tile-type';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapValidationService {
    private _messages: string[];
    constructor(private readonly _mapService: MapService) {}

    async generateInvalidMapMessages(map: GameMap): Promise<string[]> {
        this._messages = [];

        await this.validateMapInputs(map);

        this.validateTerrain(map);

        this.validateItems(map);

        return this._messages;
    }

    private async validateMapInputs(map: GameMap) {
        if (!this.isStringLengthValid(map.name, MAX_TITLE_LENGTH)) {
            this._messages.push('Le nom de la carte doit être entre 1 et 50 caractères');
        }
        if (!(await this.isNameUnique(map))) {
            this._messages.push("Le nom de la carte n'est pas unique");
        }
        if (!this.isStringLengthValid(map.description, MAX_DESCRIPTION_LENGTH)) {
            this._messages.push('La description de la carte doit être entre 1 et 500 caractères');
        }
        if (!Object.values(GameMode).includes(map.mode as GameMode)) {
            this._messages.push("Le mode de jeu doit être 'capture du drapeau' ou 'classique'");
        }
        if (!this.isMapSizeAllowed(map)) {
            this._messages.push('La taille de la carte doit être 10, 15 ou 20');
        }
    }

    private validateTerrain(map: GameMap) {
        if (!this.isOverHalfTerrain(map)) {
            this._messages.push('Plus de 50% de la carte doit être des tuiles de terrain');
        }

        if (!this.areDoorsBetweenWalls(map)) {
            this._messages.push('Les portes doivent être entre des murs et ne doivent pas être bloquées par un mur ou un coté de la carte');
        }

        if (!this.isTerrainAccessible(map)) {
            this._messages.push('Les tuiles de terrain doivent être accessibles');
        }
    }

    private validateItems(map: GameMap) {
        const itemCounts: Map<ItemType, number> = this.countAllItems(map);
        const validItemCount = this.getValidItemCount(map.size);

        if (itemCounts.get(ItemType.StartPosition) !== validItemCount) {
            this._messages.push('Le nombre de positions de départ est incorrect. Il en faut ' + validItemCount);
        }
        if (this.countNormalItems(itemCounts) !== validItemCount) {
            this._messages.push("Le nombre d'items réguliers est incorrect. Il en faut " + validItemCount);
        }
        if (!this.areItemsUnique(itemCounts)) {
            this._messages.push('Les items ne sont pas uniques');
        }
        const flagCount: number = itemCounts.get(ItemType.Flag);
        if (map.mode === GameMode.CaptureTheFlag && flagCount !== 1) {
            this._messages.push('Il doit y avoir un drapeau en mode de jeu capture du drapeau');
        }
        if (map.mode === GameMode.Classic && flagCount !== 0) {
            this._messages.push('Il ne doit pas y avoir de drapeau en mode classique');
        }
    }

    private isOverHalfTerrain(map: GameMap): boolean {
        const LIMIT = Math.floor(map.size ** 2 / 2);
        let terrainCount = 0;
        for (const row of map.terrain) {
            for (const tile of row) {
                if (constants.TERRAIN_TILES.includes(tile.type)) {
                    terrainCount++;
                    if (terrainCount > LIMIT) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private areDoorsBetweenWalls(map: GameMap): boolean {
        for (let y = 0; y < map.size; y++) {
            for (let x = 0; x < map.size; x++) {
                const tile = map.terrain[y][x];
                if (constants.DOORS.includes(tile.type) && !this.isDoorBetweenWalls(map, { y, x })) {
                    return false;
                }
            }
        }
        return true;
    }

    private isDoorBetweenWalls(map: GameMap, coordinates: Coordinates): boolean {
        const leftWall = this.isWall(map, { y: coordinates.y - 1, x: coordinates.x });
        const rightWall = this.isWall(map, { y: coordinates.y + 1, x: coordinates.x });
        const topWall = this.isWall(map, { y: coordinates.y, x: coordinates.x - 1 });
        const bottomWall = this.isWall(map, { y: coordinates.y, x: coordinates.x + 1 });

        const horizontalWalls = leftWall && rightWall;
        const verticalWalls = topWall && bottomWall;

        if (horizontalWalls) {
            return this.areAdjacentTilesTerrain(map, { y: coordinates.y, x: coordinates.x - 1 }, { y: coordinates.y, x: coordinates.x + 1 });
        }

        if (verticalWalls) {
            return this.areAdjacentTilesTerrain(map, { y: coordinates.y - 1, x: coordinates.x }, { y: coordinates.y + 1, x: coordinates.x });
        }

        return false;
    }

    private areCoordinatesInBounds(mapSize: number, coordinates: Coordinates) {
        const { y, x } = coordinates;
        return x >= 0 && x < mapSize && y >= 0 && y < mapSize;
    }

    private isWall(map: GameMap, coordinates: Coordinates): boolean {
        const { y, x } = coordinates;
        return this.areCoordinatesInBounds(map.size, coordinates) && map.terrain[y][x].type === MapTileType.Wall;
    }

    private areAdjacentTilesTerrain(map: GameMap, coordinates1: Coordinates, coordinates2: Coordinates): boolean {
        const tile1 = this.isTerrainTile(map, coordinates1);
        const tile2 = this.isTerrainTile(map, coordinates2);
        return tile1 && tile2;
    }

    private isTerrainTile(map: GameMap, coordinates: Coordinates): boolean {
        const { y, x } = coordinates;
        return this.areCoordinatesInBounds(map.size, coordinates) && constants.TERRAIN_TILES.includes(map.terrain[y][x].type);
    }

    private isTerrainAccessible(map: GameMap): boolean {
        const visited = new Set<Coordinates>();

        const startCoordinates: Coordinates = this.findStartCoordinates(map);
        if (areCoordinatesEqual(startCoordinates, { x: -1, y: -1 })) {
            return false;
        }

        const queue = [startCoordinates];
        visited.add(startCoordinates);
        this.checkAccessibility(queue, map, visited);

        return this.terrainAccessVerification(map, visited);
    }

    private checkAccessibility(queue: Coordinates[], map: GameMap, visited: Set<Coordinates>): void {
        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];
        while (queue.length > 0) {
            const currentCoordinates = queue.shift();

            for (const { dx, dy } of directions) {
                const newCoordinates: Coordinates = { x: currentCoordinates.x + dx, y: currentCoordinates.y + dy };
                if (
                    this.areCoordinatesInBounds(map.size, newCoordinates) &&
                    !this.areCoordinatesInSet(newCoordinates, visited) &&
                    map.terrain[newCoordinates.y][newCoordinates.x].type !== MapTileType.Wall
                ) {
                    visited.add(newCoordinates);
                    queue.push(newCoordinates);
                }
            }
        }
    }

    private findStartCoordinates(map: GameMap): Coordinates {
        for (let y = 0; y < map.size; y++) {
            for (let x = 0; x < map.size; x++) {
                if (constants.TERRAIN_TILES.includes(map.terrain[y][x].type)) {
                    return { x, y };
                }
            }
        }
        return { x: -1, y: -1 };
    }

    private areCoordinatesInSet(coordinates: Coordinates, set: Set<Coordinates>) {
        for (const setCoordinates of set) {
            if (areCoordinatesEqual(setCoordinates, coordinates)) {
                return true;
            }
        }
        return false;
    }

    private terrainAccessVerification(map: GameMap, visited: Set<Coordinates>): boolean {
        for (let y = 0; y < map.size; y++) {
            for (let x = 0; x < map.size; x++) {
                if (constants.TERRAIN_TILES.includes(map.terrain[y][x].type) && !this.areCoordinatesInSet({ x, y }, visited)) {
                    return false;
                }
            }
        }
        return true;
    }

    private async isNameUnique(map: GameMap): Promise<boolean> {
        const allMaps: GameMap[] = await this._mapService.getAllMaps();
        return allMaps.every((existingMap) => existingMap.id === map.id || existingMap.name !== map.name);
    }

    private isMapSizeAllowed(map: GameMap): boolean {
        if (map.size === MapSize.Small || map.size === MapSize.Medium || map.size === MapSize.Large) {
            return map.terrain.length * map.terrain[0].length === map.size * map.size;
        }
        return false;
    }

    private countAllItems(map: GameMap): Map<ItemType, number> {
        const itemCounts: Map<ItemType, number> = new Map<ItemType, number>();
        Object.values(ItemType).forEach((itemType) => {
            if (itemType !== ItemType.NoItem) {
                itemCounts.set(itemType, 0);
            }
        });
        for (const row of map.terrain) {
            for (const tile of row) {
                const item: ItemType = tile.item;
                if (item !== ItemType.NoItem) {
                    itemCounts.set(item, itemCounts.get(item) + 1);
                }
            }
        }
        return itemCounts;
    }

    private countNormalItems(itemCounts: Map<ItemType, number>) {
        let count = 0;
        Object.values(ItemType).forEach((item) => {
            if (item !== ItemType.NoItem && item !== ItemType.Flag && item !== ItemType.StartPosition) {
                count += itemCounts.get(item);
            }
        });
        return count;
    }

    private areItemsUnique(itemCounts: Map<ItemType, number>) {
        Object.values(ItemType).forEach((item) => {
            if (item !== ItemType.NoItem && item !== ItemType.StartPosition && itemCounts.get(item) > 1) {
                return false;
            }
        });
        return true;
    }

    private getValidItemCount(mapSize: MapSize): number {
        switch (mapSize) {
            case MapSize.Small:
                return constants.MAX_PLAYERS_SMALL;
            case MapSize.Medium:
                return constants.MAX_PLAYERS_MEDIUM;
            default:
                return constants.MAX_PLAYERS_LARGE;
        }
    }

    private isStringLengthValid(value: string, maxLength: number): boolean {
        return value.length <= maxLength && value.trim().length > 0;
    }
}
