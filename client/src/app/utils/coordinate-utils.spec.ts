import { areCoordinatesEqual, toString } from './coordinate-utils';
import { Coordinates } from '@common/coordinates';

describe('CoordinateUtils', () => {
    describe('areCoordinatesEqual', () => {
        it('should return true if coordinates are equal', () => {
            const first: Coordinates = { x: 5, y: 10 };
            const second: Coordinates = { x: 5, y: 10 };

            expect(areCoordinatesEqual(first, second)).toBeTrue();
        });

        it('should return false if x values are different', () => {
            const first: Coordinates = { x: 5, y: 10 };
            const second: Coordinates = { x: 6, y: 10 };

            expect(areCoordinatesEqual(first, second)).toBeFalse();
        });

        it('should return false if y values are different', () => {
            const first: Coordinates = { x: 5, y: 10 };
            const second: Coordinates = { x: 5, y: 11 };

            expect(areCoordinatesEqual(first, second)).toBeFalse();
        });

        it('should return false if both x and y values are different', () => {
            const first: Coordinates = { x: 5, y: 10 };
            const second: Coordinates = { x: 6, y: 11 };

            expect(areCoordinatesEqual(first, second)).toBeFalse();
        });
    });

    describe('toString', () => {
        it('should return a string representation of the coordinates', () => {
            const coordinates: Coordinates = { x: 5, y: 10 };

            expect(toString(coordinates)).toBe('5,10');
        });

        it('should handle negative coordinates correctly', () => {
            const coordinates: Coordinates = { x: -5, y: -10 };

            expect(toString(coordinates)).toBe('-5,-10');
        });

        it('should handle zero coordinates correctly', () => {
            const coordinates: Coordinates = { x: 0, y: 0 };

            expect(toString(coordinates)).toBe('0,0');
        });
    });
});
