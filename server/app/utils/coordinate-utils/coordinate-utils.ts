import { Coordinates } from '@common/coordinates';

export function areCoordinatesEqual(first: Coordinates, second: Coordinates): boolean {
    return first.x === second.x && first.y === second.y;
}

export function toString(coordinates: Coordinates): string {
    return coordinates.x + ',' + coordinates.y;
}
