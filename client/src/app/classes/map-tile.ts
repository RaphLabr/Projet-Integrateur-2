import { CharacterType } from '@common/character-type';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';

export class MapTile {
    type: MapTileType;
    item: ItemType;
    character: CharacterType;
    isActive: boolean;
    isOnPath: boolean;

    constructor(
        type: MapTileType = MapTileType.Base,
        item: ItemType = ItemType.NoItem,
        character: CharacterType | undefined = CharacterType.NoCharacter,
        isReachable: boolean = false,
        isOnPath: boolean = false,
    ) {
        this.type = type;
        this.item = item;
        this.character = character ?? CharacterType.NoCharacter;
        this.isActive = isReachable;
        this.isOnPath = isOnPath;
    }

    toggleDoor(): void {
        if (this.type === MapTileType.ClosedDoor) {
            this.type = MapTileType.OpenDoor;
        } else if (this.type === MapTileType.OpenDoor) {
            this.type = MapTileType.ClosedDoor;
        }
    }

    isDoor(): boolean {
        return this.type === MapTileType.ClosedDoor || this.type === MapTileType.OpenDoor;
    }

    isTraversable(): boolean {
        return this.type !== MapTileType.Wall && this.type !== MapTileType.ClosedDoor && this.character === CharacterType.NoCharacter;
    }
}
