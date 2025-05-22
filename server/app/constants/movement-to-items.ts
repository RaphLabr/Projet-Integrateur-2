import { ObjectInfo } from '@app/constants/object-info';
import { GameMap } from '@app/model/database/game-map';
import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';

export interface MovementToItems {
    playerPosition: Coordinates;
    map: GameMap;
    itemTypes: ItemType[];
    movementLeft: number;
    objects?: ObjectInfo[];
}
