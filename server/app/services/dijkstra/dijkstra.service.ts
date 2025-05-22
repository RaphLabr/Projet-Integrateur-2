import { DijkstraNode } from '@app/classes/dijsktra-node/dijsktra-node';
import { MapTile } from '@app/constants/map-tile';
import { RouteInfo } from '@app/constants/route';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { MapTileType } from '@common/map-tile-type';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DijkstraService {
    private readonly _movementCostValues: Record<MapTileType, number> = {
        [MapTileType.Ice]: 0.0001,
        [MapTileType.Base]: 1,
        [MapTileType.OpenDoor]: 1,
        [MapTileType.Water]: 2,
        [MapTileType.ClosedDoor]: 6,
        [MapTileType.Wall]: Infinity,
    };

    findShortestPaths(map: MapTile[][], movementLeft: number, startPosition: Coordinates): Map<string, DijkstraNode> {
        const nodes: Map<string, DijkstraNode> = this.generateGraphFromMap(map, startPosition, false);
        const visitedNodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();
        let visitedNode: DijkstraNode | undefined;
        while ((visitedNode = this.findNextNode(nodes, movementLeft))) {
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

    findCompletePath(map: MapTile[][], startPosition: Coordinates, targetPosition: Coordinates, ignoreDoors: boolean): RouteInfo | null {
        const nodes: Map<string, DijkstraNode> = this.generateGraphFromMap(map, startPosition, ignoreDoors);

        const unvisitedNodes = new Map(nodes);
        const visitedNodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();

        const targetKey = `${targetPosition.x},${targetPosition.y}`;

        const doors: Coordinates[] = [];

        let currentNode: DijkstraNode | undefined;
        while ((currentNode = this.findNextNodeUnlimited(unvisitedNodes))) {
            unvisitedNodes.delete(currentNode.key);
            visitedNodes.set(currentNode.key, currentNode);

            if (map[currentNode.coordinates.y][currentNode.coordinates.x].type === MapTileType.ClosedDoor) {
                doors.push(currentNode.coordinates);
            }

            if (currentNode.key === targetKey) {
                break;
            }

            for (const neighbor of currentNode.neighbors) {
                const newDistance = currentNode.movementPointsFromStart + neighbor.movementCostToEnter;
                if (newDistance < neighbor.movementPointsFromStart) {
                    neighbor.movementPointsFromStart = newDistance;
                    neighbor.previousNode = currentNode;
                }
            }
        }

        const targetNode = visitedNodes.get(targetKey);
        if (!targetNode) {
            return null;
        }

        const path: RouteInfo = {
            doors,
            path: this.reconstructPath(targetNode),
        };

        path.doors = path.doors.filter((door) => path.path.some((coords) => coords.x === door.x && coords.y === door.y));

        return path;
    }

    findPathToCharacter(map: MapTile[][], startPosition: Coordinates, targetPosition: Coordinates, ignoreDoors: boolean): RouteInfo | null {
        const targetTile = map[targetPosition.y][targetPosition.x];
        const originalCharacter = targetTile.character;

        targetTile.character = CharacterType.NoCharacter;
        const path = this.findCompletePath(map, startPosition, targetPosition, ignoreDoors);
        targetTile.character = originalCharacter;

        return path;
    }

    calculateCost(path: RouteInfo, map: MapTile[][]): number {
        let totalCost = 0;

        for (const tileCoords of path.path) {
            const tile = map[tileCoords.y][tileCoords.x];
            switch (tile.type) {
                case MapTileType.Base:
                case MapTileType.OpenDoor:
                case MapTileType.ClosedDoor:
                    totalCost += 1;
                    break;
                case MapTileType.Water:
                    totalCost += 2;
                    break;
                case MapTileType.Ice:
                    totalCost += 0;
                    break;
                default:
                    break;
            }
        }

        return totalCost;
    }

    private findNextNodeUnlimited(nodes: Map<string, DijkstraNode>): DijkstraNode | undefined {
        let nextNode: DijkstraNode | undefined;
        let currentMinDistance = Infinity;

        for (const node of Array.from(nodes.values())) {
            if (node.movementPointsFromStart < currentMinDistance) {
                nextNode = node;
                currentMinDistance = node.movementPointsFromStart;
            }
        }

        return nextNode;
    }

    private isTileTraversable(tile: MapTile) {
        return tile.type !== MapTileType.Wall && tile.character === CharacterType.NoCharacter;
    }

    private generateGraphFromMap(map: MapTile[][], startPosition: Coordinates, ignoreDoors: boolean): Map<string, DijkstraNode> {
        const movementCost = this._movementCostValues;
        if (ignoreDoors) {
            movementCost[MapTileType.ClosedDoor] = 1;
        }
        const nodes: Map<string, DijkstraNode> = new Map<string, DijkstraNode>();
        const startNode: DijkstraNode = new DijkstraNode(startPosition, this._movementCostValues[map[startPosition.y][startPosition.x].type]);
        startNode.movementPointsFromStart = 0;
        nodes.set(startNode.key, startNode);
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map.length; col++) {
                const tile = map[row][col];
                if (this.isTileTraversable(tile)) {
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

    private reconstructPath(endNode: DijkstraNode): Coordinates[] {
        const path: Coordinates[] = [];
        let currentNode: DijkstraNode | undefined = endNode;

        while (currentNode) {
            path.unshift(currentNode.coordinates);
            currentNode = currentNode.previousNode;
        }

        return path;
    }
}
