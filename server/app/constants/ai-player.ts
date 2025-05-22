import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { MapInfo } from './map-info';

export interface AiPlayer {
    gameInfo: MapInfo;
    player: Player;
    enemies: Player[];
    items: ItemType[];
}
