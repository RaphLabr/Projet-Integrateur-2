import { CharacterType } from '@common/character-type';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';

export interface MapTile {
    type: MapTileType;
    item: ItemType;
    character: CharacterType;
}
