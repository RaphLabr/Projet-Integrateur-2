import { ItemEffects } from '@app/classes/item-effects/item-effects';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMap } from '@app/model/database/game-map';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { areCoordinatesEqual } from '@app/utils//coordinate-utils/coordinate-utils';
import { sleep } from '@app/utils//sleep/sleep';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateData } from '@common/door-update-data';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemLog } from '@common/item-log';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { MovementDataToClient } from '@common/movement-data-client';
import { Player } from '@common/player';
import { TeleportData } from '@common/teleport-data';
import { GENERAL_BUFFER, MOVEMENT_DELAY } from '@common/timer-constants';
import { Inject, Injectable, forwardRef } from '@nestjs/common';

@Injectable()
export class GameMapService {
    private readonly _movementCostValues: Record<MapTileType, number> = {
        [MapTileType.Ice]: 0,
        [MapTileType.Base]: 1,
        [MapTileType.OpenDoor]: 1,
        [MapTileType.Water]: 2,
        [MapTileType.ClosedDoor]: 6,
        [MapTileType.Wall]: Infinity,
    };
    constructor(
        @Inject(forwardRef(() => VirtualPlayerService)) private readonly _virtualPlayer: VirtualPlayerService,
        private readonly _timerService: GameTimerService,
        private readonly _gameEmitterGateway: GameEmitterGateway,
        private readonly _gameStatisticsService: GameStatisticsService,
    ) {}

    intializeMap(gameMap: GameMap, startPositions: Coordinates[], playerCount: number): GameMap {
        const map = gameMap.terrain;
        while (startPositions.length > playerCount) {
            const randomIndex = Math.floor(Math.random() * startPositions.length);
            const removedPosition = startPositions.splice(randomIndex, 1)[0];
            map[removedPosition.y][removedPosition.x].item = ItemType.NoItem;
        }
        const randomItemPositions: Coordinates[] = [];
        const placedItems: Set<ItemType> = new Set<ItemType>();
        const specialItems: Set<ItemType> = new Set<ItemType>([ItemType.Flag, ItemType.NoItem, ItemType.StartPosition]);
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map.length; x++) {
                const tileItem: ItemType = map[y][x].item;
                if (!specialItems.has(tileItem)) {
                    placedItems.add(tileItem);
                }
                if (tileItem === ItemType.Random) {
                    randomItemPositions.push({ x, y });
                }
            }
        }
        const regularItems: ItemType[] = Object.values(ItemType).filter((item) => !specialItems.has(item));
        const itemsLeft: ItemType[] = regularItems.filter((item) => !placedItems.has(item));
        for (const randomItemPosition of randomItemPositions) {
            const placedItemIndex: number = Math.floor(Math.random() * itemsLeft.length);
            const placedItem: ItemType = itemsLeft.splice(placedItemIndex, 1)[0];
            map[randomItemPosition.y][randomItemPosition.x].item = placedItem;
        }
        return gameMap;
    }

    async movePlayerOnPath(game: GameData, gameId: string, path: Coordinates[]): Promise<void> {
        const map: MapTile[][] = game.map.terrain;
        if (!this.isPathValid(map, game.movementLeft, path)) {
            return;
        }
        this._timerService.disableTimerStop(gameId);
        game.isPlayerMoving = true;
        for (let i = path.length - 1; i > 0 && game.isPlayerMoving; i--) {
            const toTile: MapTile = this.getTile(map, path[i - 1]);
            const movementData: MovementDataToClient = { from: path[i], to: path[i - 1], cost: this._movementCostValues[toTile.type] };
            const shouldMovementStop: boolean = this.shouldMovementStop(game, movementData.to, toTile.item);
            this.movePlayerToTile(gameId, game, movementData);
            if (shouldMovementStop || i === 1) {
                if (this.isGameWonCTF(game, movementData.to)) {
                    game.isOver = true;
                    const winner: string = game.players[game.currentPlayerIndex].team;
                    this._gameEmitterGateway.emitGameOver(gameId, this._gameStatisticsService.getAllStatistics(game, winner));
                }
                break;
            }
            await sleep(MOVEMENT_DELAY);
        }
        if (!game.isDroppingItem) {
            this._timerService.enableTimerStop(gameId);
        }
        await sleep(GENERAL_BUFFER);
        game.isPlayerMoving = false;
        this._gameEmitterGateway.emitEndOfMovement(gameId);
    }

    teleportPlayer(game: GameData, data: TeleportData, canTeleportOnStartTile: boolean): void {
        const { gameId, from, to } = data;
        const tile = this.getTile(game.map.terrain, data.to);
        if (this.isTileTraversable(tile) && this.isTeleportationAllowedOnTile(tile, canTeleportOnStartTile)) {
            game.isPlayerMoving = false;
            this.movePlayerToTile(gameId, game, { from, to, cost: 0 });
        }
        this._gameEmitterGateway.emitEndOfMovement(gameId);
    }

    areCoordinatesAdjacent(first: Coordinates, second: Coordinates): boolean {
        const dx = Math.abs(first.x - second.x);
        const dy = Math.abs(first.y - second.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    placeItem(gameId: string, data: ItemDropDataToClient, map: MapTile[][]) {
        this.getTile(map, data.itemCoordinates).item = data.item;
        this._gameEmitterGateway.emitItemDrop(gameId, data);
    }

    removeCharacterFromTile(map: MapTile[][], tileCoordinates: Coordinates): void {
        map[tileCoordinates.y][tileCoordinates.x].character = CharacterType.NoCharacter;
    }

    isDoorUpdateAllowed(doorUpdateRequestPayload: DoorUpdateRequestPayload, game: GameData): boolean {
        const activePlayer: Player = game.players[game.currentPlayerIndex];
        if (!activePlayer) {
            return false;
        }

        const playerCoordinates: Coordinates = doorUpdateRequestPayload.playerPosition;
        const doorCoordinates: Coordinates = doorUpdateRequestPayload.doorPosition;

        const isNextToPlayer = Math.abs(playerCoordinates.x - doorCoordinates.x) <= 1 && Math.abs(playerCoordinates.y - doorCoordinates.y) <= 1;

        const isTileOccupied =
            game.map.terrain[doorCoordinates.y][doorCoordinates.x].character !== CharacterType.NoCharacter ||
            game.map.terrain[doorCoordinates.y][doorCoordinates.x].item !== ItemType.NoItem;

        return isNextToPlayer && !game.isActionUsed && !isTileOccupied;
    }

    updateDoor(doorCoordinates: Coordinates, game: GameData): DoorUpdateData {
        game.isActionUsed = true;

        const doorTile = game.map.terrain[doorCoordinates.y][doorCoordinates.x];
        if (doorTile.type === MapTileType.ClosedDoor) {
            doorTile.type = MapTileType.OpenDoor;
        } else {
            doorTile.type = MapTileType.ClosedDoor;
        }
        const activePlayer: Player = game.players[game.currentPlayerIndex];
        this._gameStatisticsService.toggleDoor(doorCoordinates, game);

        const doorUpdateData: DoorUpdateData = {
            newDoorType: doorTile.type,
            doorCoordinates,
            player: activePlayer,
        };

        return doorUpdateData;
    }

    shouldRoundEnd(game: GameData): boolean {
        const canGameEnd: boolean = game.isInRound && !game.isDroppingItem;
        return !this.isActionPossible(game) && !this.isMovementPossible(game) && canGameEnd;
    }

    getTileFromId(map: MapTile[][], id: CharacterType): MapTile | undefined {
        for (const row of map) {
            for (const tile of row) {
                if (tile.character === id) {
                    return tile;
                }
            }
        }
        return undefined;
    }

    private isGameWonCTF(game: GameData, to: Coordinates): boolean {
        const currentPlayer: Player = game.players[game.currentPlayerIndex];
        return areCoordinatesEqual(to, currentPlayer.startPosition) && currentPlayer.items.includes(ItemType.Flag);
    }

    private movePlayerToTile(gameId: string, game: GameData, movementData: MovementDataToClient): void {
        const map: MapTile[][] = game.map.terrain;
        const toTile = this.getTile(map, movementData.to);
        const fromTile = this.getTile(map, movementData.from);
        toTile.character = fromTile.character;
        fromTile.character = CharacterType.NoCharacter;
        game.movementLeft -= movementData.cost;
        game.currentPlayerPosition = movementData.to;
        this._gameEmitterGateway.emitMovePlayer(gameId, movementData);
        if (toTile.item !== ItemType.NoItem && toTile.item !== ItemType.StartPosition) {
            this._gameStatisticsService.updatePickedObject(gameId, toTile.item);
            this.takeItem(gameId, toTile, game);
        }
        this._gameStatisticsService.updateTilesTraversed(game, movementData.to);
    }

    private shouldMovementStop(game: GameData, to: Coordinates, toTileItem: ItemType): boolean {
        const canItemBePickedUp: boolean = toTileItem !== ItemType.NoItem && toTileItem !== ItemType.StartPosition;

        return canItemBePickedUp || this.isGameWonCTF(game, to);
    }

    private isPathValid(map: MapTile[][], movementLeft: number, path: Coordinates[]): boolean {
        for (const coordinates of path.slice(0, -1)) {
            const tile: MapTile = this.getTile(map, coordinates);
            movementLeft -= this._movementCostValues[tile.type];
            if (!this.isTileTraversable(tile) || movementLeft < 0) {
                return false;
            }
        }
        return true;
    }

    private isActionPossible(game: GameData): boolean {
        const map: MapTile[][] = game.map.terrain;
        for (const coordinates of this.getAdjacentCoordinates(game.currentPlayerPosition, map.length)) {
            const tile: MapTile = this.getTile(map, coordinates);
            if (!game.isActionUsed && (this.isTileDoor(tile.type) || tile.character !== CharacterType.NoCharacter)) {
                return true;
            }
        }
        return false;
    }

    private isTileTraversable(tile: MapTile): boolean {
        return this._movementCostValues[tile.type] < Infinity && tile.character === CharacterType.NoCharacter;
    }

    private isMovementPossible(game: GameData): boolean {
        const map: MapTile[][] = game.map.terrain;
        for (const coordinates of this.getAdjacentCoordinates(game.currentPlayerPosition, map.length)) {
            if (this._movementCostValues[this.getTile(map, coordinates).type] <= game.movementLeft) {
                return true;
            }
        }
        return false;
    }

    private areCoordinatesInMap(mapLength: number, coordinates: Coordinates): boolean {
        const areCoordinatesAtLeast0: boolean = coordinates.x >= 0 && coordinates.y >= 0;
        const areCoordinatesUnderMapLength: boolean = coordinates.x < mapLength && coordinates.y < mapLength;
        return areCoordinatesAtLeast0 && areCoordinatesUnderMapLength;
    }

    private getAdjacentCoordinates(coordinates: Coordinates, mapLength: number): Coordinates[] {
        const { x, y } = coordinates;
        return [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
        ].filter((adjacentCoordinates) => this.areCoordinatesInMap(mapLength, adjacentCoordinates));
    }

    private isTileDoor(tileType: MapTileType) {
        return tileType === MapTileType.OpenDoor || tileType === MapTileType.ClosedDoor;
    }

    private takeItem(gameId: string, tile: MapTile, game: GameData) {
        const currentPlayer: Player = game.players[game.currentPlayerIndex];
        currentPlayer.items.push(tile.item);
        ItemEffects.applyItem(currentPlayer, tile.item);
        this._gameEmitterGateway.emitItemPickUp(gameId, tile.item, currentPlayer.id);
        const itemLog: ItemLog = {
            playerName: currentPlayer.name,
            id: currentPlayer.id,
            item: tile.item,
        };
        this._gameEmitterGateway.emitItemPickUpLog(gameId, itemLog);

        tile.item = ItemType.NoItem;
        if (currentPlayer.items.length > 2) {
            game.isDroppingItem = true;
            this._timerService.disableTimerStop(gameId);
            this._virtualPlayer.checkMaxItem(gameId, currentPlayer);
        }
    }

    private getTile(map: MapTile[][], coordinates: Coordinates): MapTile {
        return map[coordinates.y][coordinates.x];
    }

    private isTeleportationAllowedOnTile(tile: MapTile, canTeleportOnStartTile: boolean): boolean {
        if (canTeleportOnStartTile) {
            return tile.item === ItemType.NoItem || tile.item === ItemType.StartPosition;
        } else {
            return tile.item === ItemType.NoItem;
        }
    }
}
