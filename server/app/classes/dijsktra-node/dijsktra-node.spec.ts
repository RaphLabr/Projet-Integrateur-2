import { DijkstraNode } from '@app/classes/dijsktra-node/dijsktra-node';
import { Coordinates } from '@common/coordinates';

describe('DijkstraNode', () => {
    let node: DijkstraNode;
    const coordinates: Coordinates = { x: 2, y: 3 };
    const movementCostToEnter = 5;

    beforeEach(() => {
        node = new DijkstraNode(coordinates, movementCostToEnter);
    });

    it('should be created', () => {
        expect(node).toBeTruthy();
    });

    it('should initialize with the correct coordinates', () => {
        expect(node.coordinates).toEqual(coordinates);
        expect(node.x).toBe(coordinates.x);
        expect(node.y).toBe(coordinates.y);
    });

    it('should initialize with the correct movementCostToEnter', () => {
        expect(node.movementCostToEnter).toBe(movementCostToEnter);
    });

    it('should compute the correct key', () => {
        expect(node.key).toBe('2,3');
    });

    it('should compute the correct keyOfNodeToRight', () => {
        expect(node.keyOfNodeToRight).toBe('3,3');
    });

    it('should compute the correct keyOfNodeUnder', () => {
        expect(node.keyOfNodeUnder).toBe('2,4');
    });

    it('should initialize neighbors as an empty array', () => {
        expect(node.neighbors).toEqual([]);
    });

    it('should initialize movementPointsFromStart as Infinity', () => {
        expect(node.movementPointsFromStart).toBe(Infinity);
    });

    it('should initialize previousNode as undefined', () => {
        expect(node.previousNode).toBeUndefined();
    });

    describe('when coordinates are at the edge of the grid', () => {
        let edgeNode: DijkstraNode;
        const edgeCoordinates: Coordinates = { x: 0, y: 0 };

        beforeEach(() => {
            edgeNode = new DijkstraNode(edgeCoordinates, movementCostToEnter);
        });

        it('should return the correct coordinates for edge node', () => {
            const result = edgeNode.coordinates;
            expect(result).toEqual(edgeCoordinates);
        });

        it('should return the correct x-coordinate for edge node', () => {
            const result = edgeNode.x;
            expect(result).toBe(edgeCoordinates.x);
        });

        it('should return the correct y-coordinate for edge node', () => {
            const result = edgeNode.y;
            expect(result).toBe(edgeCoordinates.y);
        });
    });
});
