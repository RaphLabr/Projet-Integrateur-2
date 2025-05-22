import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';

export interface ObjectInfo {
    coordinates: Coordinates;
    distance: number;
    reachable: boolean;
    type: 'item' | 'player';
    itemType?: ItemType;
    playerId?: string;
}
