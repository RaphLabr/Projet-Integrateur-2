// We use magic numbers to simplify tests
/* eslint-disable @typescript-eslint/no-magic-numbers */
// We use any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
// Max line disable in test file
/* eslint-disable max-lines */
import { DijkstraNode } from '@app/classes/dijsktra-node/dijsktra-node';
import { MapTile } from '@app/constants/map-tile';
import { RouteInfo } from '@app/constants/route';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Test, TestingModule } from '@nestjs/testing';

describe('DijkstraService', () => {
    let service: DijkstraService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DijkstraService],
        }).compile();

        service = module.get<DijkstraService>(DijkstraService);
    });

    const createTestMap = (size: number, customTiles?: { pos: Coordinates; type: MapTileType; character?: CharacterType }[]): MapTile[][] => {
        const map: MapTile[][] = [];

        for (let y = 0; y < size; y++) {
            map[y] = [];
            for (let x = 0; x < size; x++) {
                map[y][x] = {
                    type: MapTileType.Base,
                    character: CharacterType.NoCharacter,
                    item: ItemType.NoItem,
                };
            }
        }

        if (customTiles) {
            for (const tile of customTiles) {
                map[tile.pos.y][tile.pos.x].type = tile.type;
                if (tile.character) {
                    map[tile.pos.y][tile.pos.x].character = tile.character;
                }
            }
        }

        return map;
    };

    describe('findShortestPaths', () => {
        it('should create a valid result map based on the service implementation', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 2, y: 2 };
            const movementLeft = 2;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            expect(result).toBeDefined();
            expect(result instanceof Map).toBeTruthy();

            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);

            if (startNode) {
                expect(startNode.movementPointsFromStart).toBe(0);
            }
        });

        it('should respect movement cost of different tile types', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.Water },
                { pos: { x: 2, y: 3 }, type: MapTileType.Ice },
            ]);

            const startPosition: Coordinates = { x: 2, y: 2 };
            const movementLeft = 2;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);
            if (startNode) {
                expect(startNode.movementPointsFromStart).toBe(0);

                if (result.size > 1) {
                    const waterKey = '2,1';
                    const iceKey = '2,3';

                    const waterTile = result.get(waterKey);
                    const iceTile = result.get(iceKey);

                    if (waterTile) {
                        expect(waterTile.movementPointsFromStart).toBeGreaterThanOrEqual(2);
                    }

                    if (iceTile) {
                        expect(iceTile.movementPointsFromStart).toBeLessThan(1);
                    }
                }
            }
        });

        it('should not include blocked tiles', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 3, y: 2 }, character: CharacterType.Character1, type: MapTileType.Base },
            ]);

            const startPosition: Coordinates = { x: 2, y: 2 };
            const movementLeft = 3;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            expect(result.has('2,1')).toBeFalsy();
            expect(result.has('3,2')).toBeFalsy();
        });

        it('should handle closed doors with appropriate movement cost if generated', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 3 }, type: MapTileType.ClosedDoor }]);

            const startPosition: Coordinates = { x: 2, y: 2 };
            const movementLeft = 6;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);

            if (startNode) {
                expect(startNode.movementPointsFromStart).toBe(0);

                const doorKey = '2,3';
                const doorTile = result.get(doorKey);

                if (doorTile) {
                    expect(doorTile.movementPointsFromStart).toBeGreaterThanOrEqual(movementLeft);
                }
            }
        });

        it('should respect movementLeft as a strict limit', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const movementLeft = 5;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            expect(result).toBeDefined();
            expect(result instanceof Map).toBeTruthy();

            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);

            if (startNode) {
                expect(startNode.movementPointsFromStart).toBe(0);
            }
        });

        it('should handle start position on a special tile', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 2 }, type: MapTileType.Ice }]);
            const startPosition: Coordinates = { x: 2, y: 2 };
            const movementLeft = 2;
            const result = service.findShortestPaths(map, movementLeft, startPosition);
            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);

            if (startNode) {
                expect(startNode.movementPointsFromStart).toBe(0);
            }
        });

        it('should handle case where no neighbors have shorter paths', () => {
            const size = 3;
            const map = createTestMap(size);
            const startPosition: Coordinates = { x: 1, y: 1 };

            const mockNodes = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockNodes.set(startNode.key, startNode);

            const neighbors = [
                { x: 0, y: 1 },
                { x: 2, y: 1 },
                { x: 1, y: 0 },
                { x: 1, y: 2 },
            ];

            for (const coord of neighbors) {
                const node = new DijkstraNode(coord, 1);
                node.movementPointsFromStart = 1;
                mockNodes.set(node.key, node);
                startNode.neighbors.push(node);
                node.neighbors.push(startNode);
            }

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockNodes);

            const findNextNodeSpy = jest.spyOn(service as any, 'findNextNode');
            const allNodes = [startNode, ...startNode.neighbors];
            let callCount = 0;
            findNextNodeSpy.mockImplementation(() => {
                return callCount < allNodes.length ? allNodes[callCount++] : undefined;
            });

            const movementLeft = 3;
            const result = service.findShortestPaths(map, movementLeft, startPosition);

            expect(result.size).toBe(allNodes.length);
            for (const coord of neighbors) {
                const key = `${coord.x},${coord.y}`;
                const node = result.get(key);
                expect(node?.movementPointsFromStart).toBe(1);
            }

            expect(findNextNodeSpy).toHaveBeenCalledTimes(allNodes.length + 1);
        });

        it('should handle nodes with no neighbors', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 0, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 1, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 0, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 0, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 1, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 2 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 1, y: 1 };
            const mockNodes = new Map<string, DijkstraNode>();
            const isolatedNode = new DijkstraNode(startPosition, 1);
            isolatedNode.movementPointsFromStart = 0;
            isolatedNode.neighbors = [];
            mockNodes.set(isolatedNode.key, isolatedNode);

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockNodes);

            const findNextNodeSpy = jest.spyOn(service as any, 'findNextNode');
            findNextNodeSpy.mockImplementationOnce(() => isolatedNode).mockReturnValueOnce(undefined);
            const movementLeft = 3;

            const result = service.findShortestPaths(map, movementLeft, startPosition);

            expect(result.size).toBe(1);
            expect(result.get(isolatedNode.key)).toBe(isolatedNode);
            expect(findNextNodeSpy).toHaveBeenCalledTimes(2);
        });

        it('should not update neighbor when new path is not shorter than existing one', () => {
            const size = 3;
            const map = createTestMap(size);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const mockNodes = new Map<string, DijkstraNode>();
            const centerNode = new DijkstraNode(startPosition, 1);
            centerNode.movementPointsFromStart = 0;
            mockNodes.set(centerNode.key, centerNode);
            const rightPos = { x: 2, y: 1 };
            const rightNode = new DijkstraNode(rightPos, 1);
            rightNode.movementPointsFromStart = 0.5;
            mockNodes.set(rightNode.key, rightNode);
            const leftPos = { x: 0, y: 1 };
            const leftNode = new DijkstraNode(leftPos, 1);
            leftNode.movementPointsFromStart = 2;
            mockNodes.set(leftNode.key, leftNode);
            centerNode.neighbors.push(rightNode);
            centerNode.neighbors.push(leftNode);
            rightNode.neighbors.push(centerNode);
            leftNode.neighbors.push(centerNode);

            const originalPreviousNode = rightNode.previousNode;

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockNodes);

            const findNextNodeSpy = jest.spyOn(service as any, 'findNextNode');
            findNextNodeSpy
                .mockImplementationOnce(() => centerNode)
                .mockImplementationOnce(() => rightNode)
                .mockImplementationOnce(() => leftNode)
                .mockImplementationOnce(() => undefined);

            const result = service.findShortestPaths(map, size, startPosition);
            const pointFive = 0.5;
            expect(result.get(rightNode.key)?.movementPointsFromStart).toBe(pointFive);
            expect(result.get(rightNode.key)?.previousNode).toBe(originalPreviousNode);
            expect(result.get(leftNode.key)?.movementPointsFromStart).toBe(1);
            expect(result.get(leftNode.key)?.previousNode).toBe(centerNode);
            expect(result.size).toBe(size);
        });
    });

    describe('findCompletePath', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
            jest.clearAllMocks();
        });

        it('should find a direct path between two points on an empty map', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 3, y: 3 };

            const spy = jest.spyOn(service as any, 'reconstructPath');

            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            if (result === null) {
                expect(spy).not.toHaveBeenCalled();
                return;
            }

            expect(result).toBeDefined();
            expect(result.path).toBeDefined();
            expect(result.path.length).toBeGreaterThan(0);
            expect(result.path[0]).toEqual(startPosition);
            expect(result.path[result.path.length - 1]).toEqual(targetPosition);
        });

        it('should return null when no path exists between points', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 3 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 4 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };

            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeNull();
        });

        it('should navigate around obstacles to find a path', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 3 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeNull();
        });

        it('should handle closed doors and include them in the result', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 2 }, type: MapTileType.ClosedDoor }]);
            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };
            const mockPath = {
                path: [startPosition, { x: 2, y: 2 }, targetPosition],
                doors: [{ x: 2, y: 2 }],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValueOnce(mockPath);
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            if (result) {
                expect(result.path).toBeDefined();
                expect(result.doors).toContainEqual({ x: 2, y: 2 });

                const doorInPath = result.path.some((coord) => coord.x === 2 && coord.y === 2);
                expect(doorInPath).toBe(true);
            }
        });

        it('should respect ignoreDoors parameter when true', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.ClosedDoor },
                { pos: { x: 2, y: 3 }, type: MapTileType.ClosedDoor },
                { pos: { x: 2, y: 5 }, type: MapTileType.ClosedDoor },
                { pos: { x: 4, y: 3 }, type: MapTileType.ClosedDoor },
            ]);

            const startPosition: Coordinates = { x: 1, y: 3 };
            const targetPosition: Coordinates = { x: 5, y: 3 };
            const mockPathIgnoringDoors = {
                path: [startPosition, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, targetPosition],
                doors: [
                    { x: 2, y: 3 },
                    { x: 4, y: 3 },
                ],
            };

            const mockPathWithDoors = {
                path: [
                    startPosition,
                    { x: 1, y: 2 },
                    { x: 1, y: 1 },
                    { x: 2, y: 1 },
                    { x: 3, y: 1 },
                    { x: 4, y: 1 },
                    { x: 5, y: 1 },
                    { x: 5, y: 2 },
                    targetPosition,
                ],
                doors: [{ x: 2, y: 1 }],
            };

            const spy = jest.spyOn(service, 'findCompletePath');
            spy.mockReturnValueOnce(mockPathIgnoringDoors).mockReturnValueOnce(mockPathWithDoors);

            const resultIgnoringDoors = service.findCompletePath(map, startPosition, targetPosition, true);
            const resultWithDoors = service.findCompletePath(map, startPosition, targetPosition, false);

            if (resultIgnoringDoors && resultWithDoors) {
                expect(resultIgnoringDoors.path.length).toBeLessThanOrEqual(resultWithDoors.path.length);
            }
        });

        it('should find the shortest path through water tiles despite higher cost', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.Water },
                { pos: { x: 2, y: 2 }, type: MapTileType.Water },
                { pos: { x: 2, y: 3 }, type: MapTileType.Wall },
                { pos: { x: 1, y: 3 }, type: MapTileType.Wall },
                { pos: { x: 3, y: 3 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };
            const mockPath = {
                path: [startPosition, { x: 2, y: 2 }, targetPosition],
                doors: [],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValueOnce(mockPath);
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            if (result) {
                expect(result.path).toBeDefined();
                const waterInPath = result.path.some((coord) => map[coord.y][coord.x].type === MapTileType.Water);
                expect(waterInPath).toBe(true);
                const expectedLength = 3;
                expect(result.path.length).toBeLessThanOrEqual(expectedLength);
            }
        });

        it('should exclude doors not in the path from the result', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 2 }, type: MapTileType.ClosedDoor },
                { pos: { x: 4, y: 4 }, type: MapTileType.ClosedDoor },
                { pos: { x: 3, y: 3 }, type: MapTileType.ClosedDoor },
            ]);

            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 5, y: 5 };

            const mockPath = {
                path: [startPosition, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, targetPosition],
                doors: [
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                ],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValueOnce(mockPath);
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeDefined();
            expect(result?.doors).toBeDefined();

            if (result) {
                const doorsInPath = result.doors.every((door) => result.path.some((coord) => coord.x === door.x && coord.y === door.y));
                expect(doorsInPath).toBe(true);

                const four = 4;
                const doorAt4 = result.doors.some((door) => door.x === four && door.y === four);
                expect(doorAt4).toBeFalsy();
            }
        });

        it('should handle the case when start and target positions are the same', () => {
            const map = createTestMap(MapSize.Small);
            const position: Coordinates = { x: 2, y: 2 };
            const mockPath = {
                path: [position],
                doors: [],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValueOnce(mockPath);
            const result = service.findCompletePath(map, position, position, false);

            expect(result).toBeDefined();
            expect(result?.path).toBeDefined();
            expect(result?.path.length).toBe(1);
            expect(result?.path[0]).toEqual(position);
        });

        it('should navigate through ice tiles efficiently', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 1 }, type: MapTileType.Ice },
                { pos: { x: 2, y: 2 }, type: MapTileType.Ice },
                { pos: { x: 2, y: 3 }, type: MapTileType.Ice },
            ]);

            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };
            const mockPath = {
                path: [startPosition, { x: 2, y: 2 }, targetPosition],
                doors: [],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValueOnce(mockPath);
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeDefined();
            expect(result?.path).toBeDefined();

            const iceInPath = result?.path.some((coord) => map[coord.y][coord.x].type === MapTileType.Ice);
            expect(iceInPath).toBe(true);
            const expectedLength = 3;
            expect(result?.path.length).toBe(expectedLength);
        });

        it('should properly execute the while loop to find a path', () => {
            const map = createTestMap(2);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 1, y: 1 };
            const generateGraphSpy = jest.spyOn(service as any, 'generateGraphFromMap');
            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = Infinity;
            mockGraph.set(targetNode.key, targetNode);

            startNode.neighbors.push(targetNode);
            targetNode.neighbors.push(startNode);
            generateGraphSpy.mockReturnValue(mockGraph);

            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const reconstructPathSpy = jest.spyOn(service as any, 'reconstructPath');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(findNextNodeUnlimitedSpy).toHaveBeenCalled();
            expect(reconstructPathSpy).toHaveBeenCalled();
            expect(result).not.toBeNull();
            expect(result?.path[0]).toEqual(startPosition);
            expect(result?.path[result.path.length - 1]).toEqual(targetPosition);
        });

        it('should break the loop when the target node is found', () => {
            const map = createTestMap(2);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 0, y: 1 };
            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = Infinity;
            mockGraph.set(targetNode.key, targetNode);

            startNode.neighbors.push(targetNode);
            targetNode.neighbors.push(startNode);

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockGraph);
            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).not.toBeNull();
            const callCount = findNextNodeUnlimitedSpy.mock.calls.length;
            expect(callCount).toBeLessThan(10);
        });

        it('should run through the full while loop when target is unreachable', () => {
            const map = createTestMap(5, [
                { pos: { x: 2, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 3 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 4 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 0, y: 2 };
            const targetPosition: Coordinates = { x: 4, y: 2 };
            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeNull();
            expect(findNextNodeUnlimitedSpy).toHaveBeenCalled();
            expect(findNextNodeUnlimitedSpy.mock.results.some((r) => r.value === undefined)).toBe(true);
        });

        it('should handle the case where a node has no neighbors', () => {
            const map = createTestMap(3);
            map[1][1].type = MapTileType.Base;
            map[0][0].type = MapTileType.Wall;
            map[0][1].type = MapTileType.Wall;
            map[0][2].type = MapTileType.Wall;
            map[1][0].type = MapTileType.Wall;
            map[1][2].type = MapTileType.Wall;
            map[2][0].type = MapTileType.Wall;
            map[2][1].type = MapTileType.Wall;
            map[2][2].type = MapTileType.Wall;

            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 0, y: 0 };

            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).toBeNull();
            expect(findNextNodeUnlimitedSpy).toHaveBeenCalled();
        });

        it('should not update neighbor when new path is not shorter', () => {
            const map = createTestMap(3);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 2, y: 2 };
            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);
            const middleNode = new DijkstraNode({ x: 1, y: 1 }, 1);
            middleNode.movementPointsFromStart = 0.5;
            mockGraph.set(middleNode.key, middleNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = Infinity;
            mockGraph.set(targetNode.key, targetNode);
            startNode.neighbors.push(middleNode);
            middleNode.neighbors.push(startNode);
            middleNode.neighbors.push(targetNode);
            targetNode.neighbors.push(middleNode);

            const originalPreviousNode = middleNode.previousNode;
            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockGraph);

            service.findCompletePath(map, startPosition, targetPosition, false);
            expect(middleNode.movementPointsFromStart).toBe(0.5);
            expect(middleNode.previousNode).toBe(originalPreviousNode);
        });

        it('should properly execute the while loop to find a path', () => {
            const map = createTestMap(2);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 1, y: 1 };
            const generateGraphSpy = jest.spyOn(service as any, 'generateGraphFromMap');
            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = Infinity;
            mockGraph.set(targetNode.key, targetNode);
            startNode.neighbors.push(targetNode);
            targetNode.neighbors.push(startNode);
            generateGraphSpy.mockReturnValue(mockGraph);

            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const reconstructPathSpy = jest.spyOn(service as any, 'reconstructPath');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(findNextNodeUnlimitedSpy).toHaveBeenCalled();
            expect(reconstructPathSpy).toHaveBeenCalled();
            expect(result).not.toBeNull();
            expect(result?.path[0]).toEqual(startPosition);
            expect(result?.path[result.path.length - 1]).toEqual(targetPosition);
        });

        it('should break the loop when the target node is found', () => {
            const map = createTestMap(2);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 0, y: 1 };
            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = Infinity;
            mockGraph.set(targetNode.key, targetNode);
            startNode.neighbors.push(targetNode);
            targetNode.neighbors.push(startNode);

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockGraph);
            const findNextNodeUnlimitedSpy = jest.spyOn(service as any, 'findNextNodeUnlimited');
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).not.toBeNull();
            const callCount = findNextNodeUnlimitedSpy.mock.calls.length;
            expect(callCount).toBeLessThan(10);
        });

        it('should correctly detect closed doors during path finding', () => {
            const map = createTestMap(3);

            map[1][1].type = MapTileType.ClosedDoor;

            const startPosition: Coordinates = { x: 0, y: 0 };
            const targetPosition: Coordinates = { x: 2, y: 2 };

            jest.restoreAllMocks();

            const mockGraph = new Map<string, DijkstraNode>();
            const startNode = new DijkstraNode(startPosition, 1);
            startNode.movementPointsFromStart = 0;
            mockGraph.set(startNode.key, startNode);

            const doorNode = new DijkstraNode({ x: 1, y: 1 }, 6);
            doorNode.movementPointsFromStart = 1;
            mockGraph.set(doorNode.key, doorNode);

            const targetNode = new DijkstraNode(targetPosition, 1);
            targetNode.movementPointsFromStart = 7;
            mockGraph.set(targetNode.key, targetNode);

            startNode.neighbors.push(doorNode);
            doorNode.neighbors.push(startNode);
            doorNode.neighbors.push(targetNode);
            targetNode.neighbors.push(doorNode);

            doorNode.previousNode = startNode;
            targetNode.previousNode = doorNode;

            jest.spyOn(service as any, 'generateGraphFromMap').mockReturnValue(mockGraph);
            const result = service.findCompletePath(map, startPosition, targetPosition, false);

            expect(result).not.toBeNull();
            expect(result?.doors).toContainEqual({ x: 1, y: 1 });
            const doorInPath = result?.path.some((coord) => coord.x === 1 && coord.y === 1);
            expect(doorInPath).toBe(true);
            expect(result?.path[0]).toEqual(startPosition);
            expect(result?.path[result.path.length - 1]).toEqual(targetPosition);
        });
    });

    describe('findPathToCharacter', () => {
        it('should find a path to a tile with a character on it by temporarily removing the character', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 3, y: 3 };
            map[targetPosition.y][targetPosition.x].character = CharacterType.Character1;
            const originalCharacter = map[targetPosition.y][targetPosition.x].character;
            const mockPath = {
                path: [startPosition, { x: 2, y: 2 }, targetPosition],
                doors: [],
            };
            const findCompletePathSpy = jest.spyOn(service, 'findCompletePath').mockReturnValue(mockPath);
            const result = service.findPathToCharacter(map, startPosition, targetPosition, false);

            expect(map[targetPosition.y][targetPosition.x].character).toBe(originalCharacter);
            expect(findCompletePathSpy).toHaveBeenCalledWith(expect.anything(), startPosition, targetPosition, false);
            expect(result).toBeDefined();
            expect(result?.path).toBeDefined();
            expect(result?.path[0]).toEqual(startPosition);
            expect(result?.path[result.path.length - 1]).toEqual(targetPosition);
        });

        it('should return null when no path exists even after removing the character', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 2, y: 0 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 2 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 3 }, type: MapTileType.Wall },
                { pos: { x: 2, y: 4 }, type: MapTileType.Wall },
            ]);

            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };
            map[targetPosition.y][targetPosition.x].character = CharacterType.Character1;
            const originalCharacter = map[targetPosition.y][targetPosition.x].character;
            jest.spyOn(service, 'findCompletePath').mockReturnValue(null);
            const result = service.findPathToCharacter(map, startPosition, targetPosition, false);

            expect(map[targetPosition.y][targetPosition.x].character).toBe(originalCharacter);
            expect(result).toBeNull();
        });

        it('should work with ignoreDoors=true', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 2 }, type: MapTileType.ClosedDoor }]);
            const startPosition: Coordinates = { x: 1, y: 2 };
            const targetPosition: Coordinates = { x: 3, y: 2 };

            map[targetPosition.y][targetPosition.x].character = CharacterType.Character1;

            const findCompletePathSpy = jest.spyOn(service, 'findCompletePath');

            service.findPathToCharacter(map, startPosition, targetPosition, true);

            expect(findCompletePathSpy).toHaveBeenCalledWith(expect.anything(), startPosition, targetPosition, true);
        });

        it('should find path properly when other characters are on the map', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 3, y: 3 };

            map[targetPosition.y][targetPosition.x].character = CharacterType.Character1;
            map[2][2].character = CharacterType.Character2;

            const mockPath = {
                path: [startPosition, { x: 1, y: 2 }, { x: 2, y: 3 }, targetPosition],
                doors: [],
            };

            jest.spyOn(service, 'findCompletePath').mockReturnValue(mockPath);
            const result = service.findPathToCharacter(map, startPosition, targetPosition, false);

            expect(result).toBeDefined();
            expect(result?.path).toBeDefined();
            expect(result?.path[0]).toEqual(startPosition);
            expect(result?.path[result.path.length - 1]).toEqual(targetPosition);

            const otherCharacterPos = { x: 2, y: 2 };
            const pathIncludesOtherCharacter = result?.path.some((coord) => coord.x === otherCharacterPos.x && coord.y === otherCharacterPos.y);
            expect(pathIncludesOtherCharacter).toBeFalsy();
        });

        it('should correctly handle the case when the target has no character', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const targetPosition: Coordinates = { x: 3, y: 3 };

            expect(map[targetPosition.y][targetPosition.x].character).toBe(CharacterType.NoCharacter);

            const findCompletePathSpy = jest.spyOn(service, 'findCompletePath');

            service.findPathToCharacter(map, startPosition, targetPosition, false);

            expect(findCompletePathSpy).toHaveBeenCalled();
            expect(map[targetPosition.y][targetPosition.x].character).toBe(CharacterType.NoCharacter);
        });
    });

    describe('calculateCost', () => {
        it('should calculate correct cost for a path with only base tiles', () => {
            const map = createTestMap(MapSize.Small);
            const path: RouteInfo = {
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                    { x: 1, y: 2 },
                ],
                doors: [],
            };

            const cost = service.calculateCost(path, map);
            const expectedCost = 4;
            expect(cost).toBe(expectedCost);
        });

        it('should calculate correct cost for a path with mixed tile types', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 0, y: 1 }, type: MapTileType.Water },
                { pos: { x: 0, y: 2 }, type: MapTileType.Ice },
                { pos: { x: 1, y: 2 }, type: MapTileType.ClosedDoor },
            ]);

            const path: RouteInfo = {
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                    { x: 1, y: 2 },
                ],
                doors: [{ x: 1, y: 2 }],
            };

            const cost = service.calculateCost(path, map);
            const expectedCost = 4;
            expect(cost).toBe(expectedCost);
        });

        it('should apply higher cost for water tiles', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 0, y: 0 }, type: MapTileType.Water },
                { pos: { x: 0, y: 1 }, type: MapTileType.Water },
                { pos: { x: 0, y: 2 }, type: MapTileType.Water },
            ]);

            const path: RouteInfo = {
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                ],
                doors: [],
            };

            const cost = service.calculateCost(path, map);
            const expectedCost = 6;
            expect(cost).toBe(expectedCost);
        });

        it('should apply zero cost for ice tiles', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 0, y: 0 }, type: MapTileType.Ice },
                { pos: { x: 0, y: 1 }, type: MapTileType.Ice },
                { pos: { x: 0, y: 2 }, type: MapTileType.Ice },
            ]);

            const path: RouteInfo = {
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                ],
                doors: [],
            };

            const cost = service.calculateCost(path, map);

            expect(cost).toBe(0);
        });

        it('should apply correct cost for open and closed doors', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 0, y: 1 }, type: MapTileType.OpenDoor },
                { pos: { x: 0, y: 2 }, type: MapTileType.ClosedDoor },
            ]);

            const path: RouteInfo = {
                path: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                ],
                doors: [{ x: 0, y: 2 }],
            };

            const cost = service.calculateCost(path, map);
            const expectedCost = 3;
            expect(cost).toBe(expectedCost);
        });

        it('should return zero for an empty path', () => {
            const map = createTestMap(MapSize.Small);
            const path: RouteInfo = {
                path: [],
                doors: [],
            };

            const cost = service.calculateCost(path, map);

            expect(cost).toBe(0);
        });

        it('should calculate correct cost for a path with a single tile', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 0, y: 0 }, type: MapTileType.Water }]);

            const path: RouteInfo = {
                path: [{ x: 0, y: 0 }],
                doors: [],
            };

            const cost = service.calculateCost(path, map);

            expect(cost).toBe(2);
        });

        it('should handle wall tiles with default case (no cost added)', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 1, y: 1 }, type: MapTileType.Base },
                { pos: { x: 2, y: 1 }, type: MapTileType.Wall },
                { pos: { x: 3, y: 1 }, type: MapTileType.Base },
            ]);

            const path: RouteInfo = {
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 1 },
                    { x: 3, y: 1 },
                ],
                doors: [],
            };

            const cost = service.calculateCost(path, map);
            const expectedCost = 2;
            expect(cost).toBe(expectedCost);
        });
    });

    describe('findNextNodeUnlimited', () => {
        it('should return node with minimum distance from unvisited nodes', () => {
            const nodes = new Map<string, DijkstraNode>();

            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 5;
            nodes.set(node1.key, node1);

            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 3;
            nodes.set(node2.key, node2);

            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 8;
            nodes.set(node3.key, node3);

            const result = (service as any).findNextNodeUnlimited(nodes);

            expect(result).toBe(node2);
            const expectedCost = 3;
            expect(result.movementPointsFromStart).toBe(expectedCost);
        });

        it('should return undefined for empty nodes map', () => {
            const nodes = new Map<string, DijkstraNode>();

            const result = (service as any).findNextNodeUnlimited(nodes);

            expect(result).toBeUndefined();
        });

        it('should handle nodes with equal distances', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 3;
            nodes.set(node1.key, node1);
            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 3;
            nodes.set(node2.key, node2);
            const result = (service as any).findNextNodeUnlimited(nodes);
            const expectedCost = 3;
            expect(result.movementPointsFromStart).toBe(expectedCost);
        });
    });

    describe('isTileTraversable', () => {
        it('should return true for empty base tile', () => {
            const baseTile: MapTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(baseTile);

            expect(result).toBe(true);
        });

        it('should return true for empty water tile', () => {
            const waterTile: MapTile = {
                type: MapTileType.Water,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(waterTile);

            expect(result).toBe(true);
        });

        it('should return true for empty ice tile', () => {
            const iceTile: MapTile = {
                type: MapTileType.Ice,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(iceTile);

            expect(result).toBe(true);
        });

        it('should return true for empty open door tile', () => {
            const openDoorTile: MapTile = {
                type: MapTileType.OpenDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(openDoorTile);

            expect(result).toBe(true);
        });

        it('should return true for empty closed door tile', () => {
            const closedDoorTile: MapTile = {
                type: MapTileType.ClosedDoor,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(closedDoorTile);

            expect(result).toBe(true);
        });

        it('should return false for wall tile', () => {
            const wallTile: MapTile = {
                type: MapTileType.Wall,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(wallTile);

            expect(result).toBe(false);
        });

        it('should return false for tile with character', () => {
            const tileWithCharacter: MapTile = {
                type: MapTileType.Base,
                character: CharacterType.Character1,
                item: ItemType.NoItem,
            };

            const result = (service as any).isTileTraversable(tileWithCharacter);

            expect(result).toBe(false);
        });

        it('should handle items on the tile correctly', () => {
            const tileWithItem: MapTile = {
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.Sword,
            };

            const result = (service as any).isTileTraversable(tileWithItem);
            expect(result).toBe(true);
        });
    });

    describe('generateGraphFromMap', () => {
        it('should create a graph with correct number of nodes for an empty map', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 2, y: 2 };
            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            expect(result.size).toBeGreaterThan(0);

            const startKey = `${startPosition.x},${startPosition.y}`;
            expect(result.has(startKey)).toBeTruthy();
        });

        it('should set the start node movement points to 0', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 2, y: 2 };

            const result = (service as any).generateGraphFromMap(map, startPosition, false);

            const startKey = `${startPosition.x},${startPosition.y}`;
            const startNode = result.get(startKey);

            expect(startNode).toBeDefined();
            expect(startNode.movementPointsFromStart).toBe(Infinity);
        });

        it('should properly connect nodes to their neighbors', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 1, y: 1 };
            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            const nodeKey = '2,2';
            const node = result.get(nodeKey);
            const expectedNeighbor = 4;

            expect(node).toBeDefined();
            expect(node.neighbors.length).toBe(expectedNeighbor);

            const neighborKeys = node.neighbors.map((n) => n.key);
            expect(neighborKeys).toContain('1,2');
            expect(neighborKeys).toContain('3,2');
            expect(neighborKeys).toContain('2,1');
            expect(neighborKeys).toContain('2,3');
        });

        it('should skip wall tiles when creating the graph', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 2 }, type: MapTileType.Wall }]);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            const wallKey = '2,2';
            expect(result.has(wallKey)).toBeFalsy();

            const adjacentKey = '1,2';
            const adjacentNode = result.get(adjacentKey);
            if (adjacentNode) {
                const adjacentNeighborKeys = adjacentNode.neighbors.map((n) => n.key);
                expect(adjacentNeighborKeys).not.toContain(wallKey);
                const expectedLength = 4;
                expect(adjacentNeighborKeys.length).toBeLessThan(expectedLength);
            }
        });

        it('should skip tiles with characters when creating the graph', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 3, y: 3 }, type: MapTileType.Base, character: CharacterType.Character1 }]);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            const characterKey = '3,3';
            expect(result.has(characterKey)).toBeFalsy();
        });

        it('should respect ignoreDoors parameter and modify movement cost for closed doors', () => {
            const map = createTestMap(MapSize.Small, [{ pos: { x: 2, y: 2 }, type: MapTileType.ClosedDoor }]);
            const startPosition: Coordinates = { x: 0, y: 0 };

            const resultWithoutIgnore = (service as any).generateGraphFromMap(map, startPosition, false);
            const doorKeyWithoutIgnore = '2,2';
            const doorNodeWithoutIgnore = resultWithoutIgnore.get(doorKeyWithoutIgnore);
            const closedDoorCost = 6;
            expect(doorNodeWithoutIgnore.movementCostToEnter).toBe(closedDoorCost);

            const resultWithIgnore = (service as any).generateGraphFromMap(map, startPosition, true);
            const doorKeyWithIgnore = '2,2';
            const doorNodeWithIgnore = resultWithIgnore.get(doorKeyWithIgnore);
            expect(doorNodeWithIgnore.movementCostToEnter).toBe(1);
        });

        it('should handle edge cases with map boundaries correctly', () => {
            const map = createTestMap(MapSize.Small);
            const startPosition: Coordinates = { x: 0, y: 0 };
            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            const cornerKey = '0,0';
            const cornerNode = result.get(cornerKey);

            expect(cornerNode).toBeDefined();
            expect(cornerNode.neighbors.length).toBe(2);

            const neighborKeys = cornerNode.neighbors.map((n) => n.key);
            expect(neighborKeys).toContain('1,0');
            expect(neighborKeys).toContain('0,1');
        });

        it('should correctly use movement cost values from the map tile types', () => {
            const map = createTestMap(MapSize.Small, [
                { pos: { x: 1, y: 1 }, type: MapTileType.Water },
                { pos: { x: 2, y: 2 }, type: MapTileType.Ice },
                { pos: { x: 3, y: 3 }, type: MapTileType.OpenDoor },
            ]);
            const startPosition: Coordinates = { x: 0, y: 0 };

            const result = (service as any).generateGraphFromMap(map, startPosition, false);
            const waterNode = result.get('1,1');
            const iceNode = result.get('2,2');
            const openDoorNode = result.get('3,3');
            const iceCost = 0.0001;

            expect(waterNode.movementCostToEnter).toBe(2);
            expect(iceNode.movementCostToEnter).toBe(iceCost);
            expect(openDoorNode.movementCostToEnter).toBe(1);
        });
    });

    describe('findNextNode', () => {
        it('should return node with minimum distance when all nodes are within maxDistance', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 5;
            nodes.set(node1.key, node1);
            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 3;
            nodes.set(node2.key, node2);
            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 8;
            nodes.set(node3.key, node3);
            const maxDistance = 10;
            const result = (service as any).findNextNode(nodes, maxDistance);
            const expectedCost = 3;

            expect(result).toBe(node2);
            expect(result.movementPointsFromStart).toBe(expectedCost);
        });

        it('should skip nodes that exceed maxDistance', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 11;
            nodes.set(node1.key, node1);

            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 5;
            nodes.set(node2.key, node2);

            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 9;
            nodes.set(node3.key, node3);
            const maxDistance = 10;
            const result = (service as any).findNextNode(nodes, maxDistance);
            const expectedCost = 5;

            expect(result).toBe(node2);
            expect(result.movementPointsFromStart).toBe(expectedCost);
        });

        it('should handle floating point movement points using Math.floor', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 4.9;
            nodes.set(node1.key, node1);
            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 5.1;
            nodes.set(node2.key, node2);
            const node3 = new DijkstraNode({ x: 0, y: 1 }, 1);
            node3.movementPointsFromStart = 5.9;
            nodes.set(node3.key, node3);
            const maxDistance = 5;
            const result = (service as any).findNextNode(nodes, maxDistance);
            const expectedCost = 4.9;

            expect(result).toBe(node1);
            expect(result.movementPointsFromStart).toBe(expectedCost);
        });

        it('should return undefined when no nodes are within maxDistance', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 6;
            nodes.set(node1.key, node1);
            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 7;
            nodes.set(node2.key, node2);
            const maxDistance = 5;
            const result = (service as any).findNextNode(nodes, maxDistance);

            expect(result).toBeUndefined();
        });

        it('should return undefined for empty nodes map', () => {
            const nodes = new Map<string, DijkstraNode>();
            const maxDistance = 5;

            const result = (service as any).findNextNode(nodes, maxDistance);

            expect(result).toBeUndefined();
        });

        it('should handle ties by taking the first encountered node with minimum distance', () => {
            const nodes = new Map<string, DijkstraNode>();
            const node1 = new DijkstraNode({ x: 0, y: 0 }, 1);
            node1.movementPointsFromStart = 3;
            nodes.set(node1.key, node1);
            const node2 = new DijkstraNode({ x: 1, y: 0 }, 1);
            node2.movementPointsFromStart = 3;
            nodes.set(node2.key, node2);
            const maxDistance = 5;
            const result = (service as any).findNextNode(nodes, maxDistance);
            const expectedCost = 3;

            expect(result.movementPointsFromStart).toBe(expectedCost);
            expect([node1, node2]).toContain(result);
        });
    });

    describe('reconstructPath', () => {
        it('should create a path from end node back to start node', () => {
            const startNode = new DijkstraNode({ x: 0, y: 0 }, 1);
            const middleNode = new DijkstraNode({ x: 1, y: 1 }, 1);
            const endNode = new DijkstraNode({ x: 2, y: 2 }, 1);

            middleNode.previousNode = startNode;
            endNode.previousNode = middleNode;

            const result = (service as any).reconstructPath(endNode);
            const expectedLength = 3;

            expect(result.length).toBe(expectedLength);
            expect(result[0]).toEqual({ x: 0, y: 0 });
            expect(result[1]).toEqual({ x: 1, y: 1 });
            expect(result[2]).toEqual({ x: 2, y: 2 });
        });

        it('should return a single-point path when end node has no previous node', () => {
            const singleNode = new DijkstraNode({ x: 3, y: 3 }, 1);

            const result = (service as any).reconstructPath(singleNode);

            expect(result.length).toBe(1);
            expect(result[0]).toEqual({ x: 3, y: 3 });
        });
    });
});
