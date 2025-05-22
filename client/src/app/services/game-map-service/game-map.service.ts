import { Injectable } from '@angular/core';
import { DijkstraNode } from '@app/classes/dijsktra-node';
import { MapTile } from '@app/classes/map-tile';
import { INVALID_MAP_COORDINATES } from '@app/constants/map-edition-constants';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { DeepReadonly } from '@app/types/deep-read-only';
import { areCoordinatesEqual, toString } from '@app/utils/coordinate-utils';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateData } from '@common/door-update-data';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { GameEvents } from '@common/game-events';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { MovementDataToClient } from '@common/movement-data-client';

@Injectable({
    providedIn: 'root',
})
export class GameMapService {
    hoveredTileCoordinates: Coordinates = INVALID_MAP_COORDINATES;
    movementLeft: number;
    private _size: MapSize;
    private _clientPosition: Coordinates;
    private _activeTileCoordinates: Coordinates[] = [];
    private _gameMap: MapTile[][] = [];
    private _currentPath: Coordinates[] = [];
    private _reachableTileNodes: Map<string, DijkstraNode>;

    private readonly _movementCostValues: Record<MapTileType, number> = {
        [MapTileType.Ice]: 0.0001,
        [MapTileType.Base]: 1,
        [MapTileType.OpenDoor]: 1,
        [MapTileType.Water]: 2,
        [MapTileType.ClosedDoor]: Infinity,
        [MapTileType.Wall]: Infinity,
    };

    constructor(private _socketService: SocketClientService) {}

    get size(): MapSize {
        return this._size;
    }

    get gameMap(): DeepReadonly<MapTile[][]> {
        return this._gameMap;
    }

    get currentPath(): DeepReadonly<Coordinates[]> {
        return this._currentPath;
    }

    get clientPosition(): DeepReadonly<Coordinates> {
        return this._clientPosition;
    }

    get reachableTileCoordinates(): Coordinates[] {
        return this._activeTileCoordinates;
    }

    configureSocketFeatures() {
        this._socketService.on(GameEvents.MovePlayer, (payload: MovementDataToClient) => {
            const fromTile: MapTile = this.getTileReference(payload.from);
            const toTile: MapTile = this.getTileReference(payload.to);
            toTile.character = fromTile.character;
            fromTile.character = CharacterType.NoCharacter;
            if (areCoordinatesEqual(this._clientPosition, payload.from)) {
                this.movementLeft -= payload.cost;
                this._clientPosition = payload.to;
            }
            if (toTile.item !== ItemType.NoItem && toTile.item !== ItemType.StartPosition) {
                toTile.item = ItemType.NoItem;
            }
        });

        this._socketService.on(GameEvents.ItemDrop, (payload: ItemDropDataToClient) => {
            this.getTileReference(payload.itemCoordinates).item = payload.item;
        });
    }

    isTileTraversable(tileCoordinates: Coordinates) {
        const tile: MapTile = this.getTileReference(tileCoordinates);
        const tileType: MapTileType = tile.type;
        return tile.character === CharacterType.NoCharacter && tileType !== MapTileType.ClosedDoor && tileType !== MapTileType.Wall;
    }

    isTileReachable(tileCoordinates: Coordinates) {
        for (const coordinates of this._activeTileCoordinates) {
            if (areCoordinatesEqual(coordinates, tileCoordinates)) {
                return true;
            }
        }
        return false;
    }

    getTile(tileCoordinates: Coordinates): DeepReadonly<MapTile> {
        return this.gameMap[tileCoordinates.y][tileCoordinates.x];
    }

    initializeMap(newMap: MapTile[][], size: MapSize, clientId: CharacterType): void {
        this._size = size;
        this._gameMap = Array.from({ length: size }, () => Array.from({ length: size }, () => new MapTile(MapTileType.Base, ItemType.NoItem)));
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const currentTile = newMap[y][x];
                this._gameMap[y][x] = new MapTile(currentTile.type, currentTile.item, currentTile.character);
                if (currentTile.character === clientId) {
                    this._clientPosition = { x, y };
                }
            }
        }
    }

    dropItem(data: ItemDropDataToClient) {
        this.getTileReference(data.itemCoordinates).item = data.item;
    }

    removeCharacterFromTile(tileCoordinates: Coordinates) {
        this._gameMap[tileCoordinates.y][tileCoordinates.x].character = CharacterType.NoCharacter;
    }

    showActionTiles() {
        this._activeTileCoordinates = this.getAdjacentCoordinates(this._clientPosition).filter((coordinates) =>
            this.isActionPossibleOnTile(coordinates),
        );
        for (const tileCoordinates of this._activeTileCoordinates) {
            this.setTileActive(tileCoordinates, true);
        }
    }

    showReachableAndPathTiles() {
        this.showReachableTiles();
        this.showShortestPath();
    }

    hideActiveAndPathTiles() {
        this.hideActiveTiles();
        this.hideShortestPath();
    }

    showReachableTiles(): void {
        this._reachableTileNodes = this.findShortestPaths(this._clientPosition);
        this._reachableTileNodes.delete(toString(this._clientPosition));
        this._activeTileCoordinates = Array.from(this._reachableTileNodes.values());
        for (const coordinates of this._activeTileCoordinates) {
            this.setTileActive(coordinates, true);
        }
    }

    hideActiveTiles(): void {
        for (const coordinates of this._activeTileCoordinates) {
            this.setTileActive(coordinates, false);
        }
        this._activeTileCoordinates = [];
        this._reachableTileNodes = new Map<string, DijkstraNode>();
    }

    showShortestPath(): void {
        let currentNode: DijkstraNode | undefined = this._reachableTileNodes.get(toString(this.hoveredTileCoordinates));
        if (currentNode) {
            while (currentNode) {
                this._currentPath.push(currentNode.coordinates);
                this.setTileOnPath(currentNode.coordinates, true);
                currentNode = currentNode.previousNode;
            }
            this.setTileOnPath(this._clientPosition, false);
        }
    }

    hideShortestPath(): void {
        for (const tile of this._currentPath) {
            this.setTileOnPath(tile, false);
        }
        this._currentPath = [];
    }

    isDoor(tileCoordinates: Coordinates): boolean {
        const tileType: MapTileType = this.getTile(tileCoordinates).type;
        return tileType === MapTileType.ClosedDoor || tileType === MapTileType.OpenDoor;
    }

    getCharacterOnTile(tileCoordinates: Coordinates): CharacterType {
        return this.getTile(tileCoordinates).character;
    }

    isTileAdjacentToClient(tileCoordinates: Coordinates): boolean {
        const dx = Math.abs(tileCoordinates.x - this._clientPosition.x);
        const dy = Math.abs(tileCoordinates.y - this._clientPosition.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    isActionPossibleOnTile(tileCoordinates: Coordinates): boolean {
        const tile: MapTile = this.getTileReference(tileCoordinates);
        return tile.isDoor() || tile.character !== CharacterType.NoCharacter;
    }

    requestDoorUpdate(gameId: string, doorCoordinates: Coordinates): void {
        const doorUpdateRequestPayload: DoorUpdateRequestPayload = {
            gameId,
            playerPosition: this._clientPosition,
            doorPosition: doorCoordinates,
        };

        this._socketService.emitDoorUpdate(doorUpdateRequestPayload);
    }

    updateDoor(payload: DoorUpdateData): void {
        this.getTileReference(payload.doorCoordinates).type = payload.newDoorType;
    }

    removeItemOnTile(tileCoordinates: Coordinates): void {
        this.getTileReference(tileCoordinates).item = ItemType.NoItem;
    }

    private areCoordinatesInMap(coordinates: Coordinates): boolean {
        const mapLength: number = this._size;

        const areCoordinatesAtLeast0: boolean = coordinates.x >= 0 && coordinates.y >= 0;
        const areCoordinatesUnderMapLength: boolean = coordinates.x < mapLength && coordinates.y < mapLength;
        return areCoordinatesAtLeast0 && areCoordinatesUnderMapLength;
    }

    private getAdjacentCoordinates(coordinates: Coordinates): Coordinates[] {
        const { x, y } = coordinates;
        return [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
        ].filter((adjacentCoordinates) => this.areCoordinatesInMap(adjacentCoordinates));
    }

    private getTileReference(tileCoordinates: Coordinates): MapTile {
        return this._gameMap[tileCoordinates.y][tileCoordinates.x];
    }

    private setTileActive(tileCoordinates: Coordinates, isReachable: boolean) {
        this.getTileReference(tileCoordinates).isActive = isReachable;
    }

    private setTileOnPath(tileCoordinates: Coordinates, isOnPath: boolean) {
        this.getTileReference(tileCoordinates).isOnPath = isOnPath;
    }

    private findShortestPaths(startPosition: Coordinates): Map<string, DijkstraNode> {
        const nodes: Map<string, DijkstraNode> = this.generateGraphFromMap(startPosition);
        const visitedNodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();
        let visitedNode: DijkstraNode | undefined;
        while ((visitedNode = this.findNextNode(nodes, this.movementLeft))) {
            nodes.delete(visitedNode.key);
            visitedNodes.set(visitedNode.key, visitedNode);
            for (const neighbor of visitedNode.neighbors) {
                const newDistance: number = visitedNode.movementPointsFromStart + neighbor.movementCostToEnter;
                if (newDistance < neighbor.movementPointsFromStart) {
                    neighbor.movementPointsFromStart = newDistance;
                    neighbor.previousNode = visitedNode;
                }
            }
        }
        return visitedNodes;
    }

    private generateGraphFromMap(startPosition: Coordinates): Map<string, DijkstraNode> {
        const nodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();
        const startNode: DijkstraNode = new DijkstraNode(startPosition, this._movementCostValues[this.getTileReference(startPosition).type]);
        startNode.movementPointsFromStart = 0;
        nodes.set(startNode.key, startNode);
        for (let row = 0; row < this.gameMap.length; row++) {
            for (let col = 0; col < this.gameMap.length; col++) {
                const tile = this._gameMap[row][col];
                if (tile.isTraversable()) {
                    const newNode: DijkstraNode = new DijkstraNode({ x: col, y: row }, this._movementCostValues[tile.type]);
                    nodes.set(newNode.key, newNode);
                }
            }
        }
        for (const node of Array.from(nodes.values())) {
            const nodeToRight: DijkstraNode | undefined = nodes.get(node.keyOfNodeToRight);
            if (nodeToRight) {
                node.neighbors.push(nodeToRight);
                nodeToRight.neighbors.push(node);
            }
            const nodeUnder: DijkstraNode | undefined = nodes.get(node.keyOfNodeUnder);
            if (nodeUnder) {
                node.neighbors.push(nodeUnder);
                nodeUnder.neighbors.push(node);
            }
        }
        return nodes;
    }

    private findNextNode(nodes: Map<string, DijkstraNode>, maxDistance: number): DijkstraNode | undefined {
        let nextNode: DijkstraNode | undefined;
        let currentMinDistance = Infinity;
        for (const node of Array.from(nodes.values())) {
            if (node.movementPointsFromStart < currentMinDistance && Math.floor(node.movementPointsFromStart) <= maxDistance) {
                nextNode = node;
                currentMinDistance = node.movementPointsFromStart;
            }
        }
        return nextNode;
    }
}
