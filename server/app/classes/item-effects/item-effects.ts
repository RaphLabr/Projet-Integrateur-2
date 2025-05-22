import { ITEM_THRESHOLD } from '@common/item-threshold';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';

export class ItemEffects {
    static applyItem(player: Player, item: ItemType): void {
        switch (item) {
            case ItemType.Potion2:
                this.applyRedPotion(player);
                break;
            case ItemType.Potion1:
                this.applyYellowPotion(player);
                break;
            case ItemType.Torch:
                this.applyTorch(player);
                break;
        }
    }

    static removeItem(player: Player, item: ItemType): void {
        switch (item) {
            case ItemType.Potion2:
                this.removeRedPotion(player);
                break;
            case ItemType.Potion1:
                this.removeYellowPotion(player);
                break;
            case ItemType.Torch:
                this.removeTorch(player);
                break;
        }
    }

    static updateCombatItemEffects(player: Player) {
        for (const item of player.items) {
            switch (item) {
                case ItemType.Barrel:
                    this.applyBarrel(player);
                    break;
                case ItemType.Torch:
                    this.removeTorch(player);
                    break;
            }
        }
    }

    static updateEndCombatItemEffects(player: Player) {
        for (const item of player.items) {
            switch (item) {
                case ItemType.Barrel:
                    this.removeBarrel(player);
                    break;
                case ItemType.Torch:
                    this.applyTorch(player);
                    break;
            }
        }
    }

    static applyTorch(player: Player): void {
        if (player.health > ITEM_THRESHOLD && !player.isTorchActive) {
            player.attack++;
            player.isTorchActive = true;
        }
    }

    static removeTorch(player: Player): void {
        if (player.health <= ITEM_THRESHOLD && player.isTorchActive) {
            player.attack--;
            player.isTorchActive = false;
        }
    }

    static applyBarrel(player: Player): void {
        if (player.health <= ITEM_THRESHOLD && !player.isBarrelActive) {
            player.defense++;
            player.isBarrelActive = true;
        }
    }

    static removeBarrel(player: Player): void {
        if (player.health > ITEM_THRESHOLD && player.isBarrelActive) {
            player.defense--;
            player.isBarrelActive = false;
        }
    }

    static applyRedPotion(player: Player): void {
        player.attack--;
        player.defense += 2;
    }

    static applyYellowPotion(player: Player): void {
        player.attack += 2;
        player.defense--;
    }

    static removeRedPotion(player: Player): void {
        player.attack++;
        player.defense -= 2;
    }

    static removeYellowPotion(player: Player): void {
        player.attack -= 2;
        player.defense++;
    }
}
