import { Coordinates } from '@common/coordinates';
export interface ItemInfo {
    coordinates: Coordinates;
    distance: number;
    reachable: boolean;
}
