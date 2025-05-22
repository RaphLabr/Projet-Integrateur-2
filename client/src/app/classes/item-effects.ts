import { ItemType } from '@common/item-type';
import { Player } from '@common/player';

export class ItemEffects {
    static handleItemPickUpEffect(player: Player, item: ItemType): void {
        switch (item) {
            case ItemType.Potion1:
                player.defense += 2;
                player.attack -= 1;
                break;
            case ItemType.Potion2:
                player.defense -= 1;
                player.attack += 2;
                break;
            case ItemType.Torch:
                player.attack += 1;
                break;
        }
    }

    static resetItemEffectsAfterCombat(player: Player, item: ItemType): void {
        switch (item) {
            case ItemType.Torch:
                player.attack++;
                break;
            case ItemType.Barrel:
                player.defense--;
                break;
        }
    }

    static handleItemDropEffect(player: Player, item: ItemType): void {
        switch (item) {
            case ItemType.Potion1:
                player.defense -= 2;
                player.attack += 1;
                break;
            case ItemType.Potion2:
                player.defense += 1;
                player.attack -= 2;
                break;
            case ItemType.Torch:
                player.attack -= 1;
                break;
        }
    }

    static handleFrenchItemName(item: ItemType): string {
        switch (item) {
            case ItemType.Flag:
                return 'Drapeau';
            case ItemType.Potion1:
                return 'Potion défensive';
            case ItemType.Potion2:
                return 'Potion offensive';
            case ItemType.Skull:
                return 'Crâne';
            case ItemType.Sword:
                return 'Épée';
            case ItemType.Torch:
                return 'Torche';
            case ItemType.Barrel:
                return 'Barril';
            default:
                return 'Item inconnu';
        }
    }
}
