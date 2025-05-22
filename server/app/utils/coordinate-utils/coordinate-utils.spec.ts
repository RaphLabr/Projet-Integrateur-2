import { areCoordinatesEqual } from '@app/utils/coordinate-utils/coordinate-utils';
import { Coordinates } from '@common/coordinates';

describe('Coordinate Utilities', () => {
    describe('areCoordinatesEqual', () => {
        it('should return true when coordinates are equal', () => {
            const coord1: Coordinates = { x: 5, y: 10 };
            const coord2: Coordinates = { x: 5, y: 10 };
            expect(areCoordinatesEqual(coord1, coord2)).toBe(true);
        });

        it('should return false when x coordinates differ', () => {
            const coord1: Coordinates = { x: 5, y: 10 };
            const coord2: Coordinates = { x: 6, y: 10 };
            expect(areCoordinatesEqual(coord1, coord2)).toBe(false);
        });

        it('should return false when y coordinates differ', () => {
            const coord1: Coordinates = { x: 5, y: 10 };
            const coord2: Coordinates = { x: 5, y: 11 };
            expect(areCoordinatesEqual(coord1, coord2)).toBe(false);
        });

        it('should return false when both coordinates differ', () => {
            const coord1: Coordinates = { x: 5, y: 10 };
            const coord2: Coordinates = { x: 6, y: 11 };
            expect(areCoordinatesEqual(coord1, coord2)).toBe(false);
        });
    });
});
