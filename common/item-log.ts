import { CharacterType } from './character-type';
import { ItemType } from './item-type';

export interface ItemLog {
    id: CharacterType;
    playerName: string;
    item: ItemType;
}
