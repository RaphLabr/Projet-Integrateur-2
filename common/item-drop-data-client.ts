import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';

export interface ItemDropDataToClient {
    item: ItemType;
    itemCoordinates: Coordinates;
}