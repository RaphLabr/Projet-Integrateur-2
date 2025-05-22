// We use magic numbers to simplify tests
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ItemEffects } from '@app/classes/item-effects/item-effects';
import { CharacterType } from '@common/character-type';
import { ITEM_THRESHOLD } from '@common/item-threshold';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';

describe('ItemEffects', () => {
    let player: Player;

    beforeEach(() => {
        player = {
            id: CharacterType.Character1,
            userId: 'user1',
            name: 'Test Player',
            health: 100,
            maxHealth: 100,
            attack: 5,
            defense: 5,
            speed: 3,
            wins: 0,
            startPosition: { x: 0, y: 0 },
            dice: { attack: 6, defense: 4 },
            items: [],
            evadeAttempts: 0,
            hasAbandoned: false,
            team: Teams.NoTeam,
            isTorchActive: false,
            isBarrelActive: false,
        } as Player;
    });

    describe('applyItem', () => {
        it('should apply red potion effect', () => {
            jest.spyOn(ItemEffects, 'applyRedPotion');

            ItemEffects.applyItem(player, ItemType.Potion2);

            expect(ItemEffects.applyRedPotion).toHaveBeenCalledWith(player);
            expect(player.attack).toBe(4);
            expect(player.defense).toBe(7);
        });

        it('should apply yellow potion effect', () => {
            jest.spyOn(ItemEffects, 'applyYellowPotion');

            ItemEffects.applyItem(player, ItemType.Potion1);

            expect(ItemEffects.applyYellowPotion).toHaveBeenCalledWith(player);
            expect(player.attack).toBe(7);
            expect(player.defense).toBe(4);
        });

        it('should apply torch effect', () => {
            jest.spyOn(ItemEffects, 'applyTorch');

            ItemEffects.applyItem(player, ItemType.Torch);

            expect(ItemEffects.applyTorch).toHaveBeenCalledWith(player);
        });

        it('should do nothing for other item types', () => {
            const originalAttack = player.attack;
            const originalDefense = player.defense;

            ItemEffects.applyItem(player, ItemType.NoItem);

            expect(player.attack).toBe(originalAttack);
            expect(player.defense).toBe(originalDefense);
        });
    });

    describe('removeItem', () => {
        it('should remove red potion effect', () => {
            jest.spyOn(ItemEffects, 'removeRedPotion');

            ItemEffects.removeItem(player, ItemType.Potion2);

            expect(ItemEffects.removeRedPotion).toHaveBeenCalledWith(player);
            expect(player.attack).toBe(6);
            expect(player.defense).toBe(3);
        });

        it('should remove yellow potion effect', () => {
            jest.spyOn(ItemEffects, 'removeYellowPotion');

            ItemEffects.removeItem(player, ItemType.Potion1);

            expect(ItemEffects.removeYellowPotion).toHaveBeenCalledWith(player);
            expect(player.attack).toBe(3);
            expect(player.defense).toBe(6);
        });

        it('should remove torch effect', () => {
            jest.spyOn(ItemEffects, 'removeTorch');

            ItemEffects.removeItem(player, ItemType.Torch);

            expect(ItemEffects.removeTorch).toHaveBeenCalledWith(player);
        });

        it('should do nothing for other item types', () => {
            const originalAttack = player.attack;
            const originalDefense = player.defense;

            ItemEffects.removeItem(player, ItemType.NoItem);

            expect(player.attack).toBe(originalAttack);
            expect(player.defense).toBe(originalDefense);
        });
    });

    describe('updateCombatItemEffects', () => {
        it('should apply barrel effect when player has barrel', () => {
            player.items = [ItemType.Barrel];
            player.health = ITEM_THRESHOLD;
            jest.spyOn(ItemEffects, 'applyBarrel');

            ItemEffects.updateCombatItemEffects(player);

            expect(ItemEffects.applyBarrel).toHaveBeenCalledWith(player);
        });

        it('should remove torch effect when player has torch', () => {
            player.items = [ItemType.Torch];
            player.isTorchActive = true;
            player.health = ITEM_THRESHOLD;
            jest.spyOn(ItemEffects, 'removeTorch');

            ItemEffects.updateCombatItemEffects(player);

            expect(ItemEffects.removeTorch).toHaveBeenCalledWith(player);
        });

        it('should process multiple items', () => {
            player.items = [ItemType.Barrel, ItemType.Torch];
            player.health = ITEM_THRESHOLD;
            player.isTorchActive = true;
            jest.spyOn(ItemEffects, 'applyBarrel');
            jest.spyOn(ItemEffects, 'removeTorch');

            ItemEffects.updateCombatItemEffects(player);

            expect(ItemEffects.applyBarrel).toHaveBeenCalledWith(player);
            expect(ItemEffects.removeTorch).toHaveBeenCalledWith(player);
        });

        it('should do nothing for other item types', () => {
            player.items = [ItemType.Potion1, ItemType.Potion2];
            const originalAttack = player.attack;
            const originalDefense = player.defense;

            ItemEffects.updateCombatItemEffects(player);

            expect(player.attack).toBe(originalAttack);
            expect(player.defense).toBe(originalDefense);
        });
    });

    describe('updateEndCombatItemEffects', () => {
        it('should remove barrel effect when player has barrel', () => {
            player.items = [ItemType.Barrel];
            player.health = ITEM_THRESHOLD + 1;
            player.isBarrelActive = true;
            jest.spyOn(ItemEffects, 'removeBarrel');

            ItemEffects.updateEndCombatItemEffects(player);

            expect(ItemEffects.removeBarrel).toHaveBeenCalledWith(player);
        });

        it('should apply torch effect when player has torch', () => {
            player.items = [ItemType.Torch];
            player.health = ITEM_THRESHOLD + 1;
            jest.spyOn(ItemEffects, 'applyTorch');

            ItemEffects.updateEndCombatItemEffects(player);

            expect(ItemEffects.applyTorch).toHaveBeenCalledWith(player);
        });

        it('should process multiple items', () => {
            player.items = [ItemType.Barrel, ItemType.Torch];
            player.health = ITEM_THRESHOLD + 1;
            player.isBarrelActive = true;
            jest.spyOn(ItemEffects, 'removeBarrel');
            jest.spyOn(ItemEffects, 'applyTorch');

            ItemEffects.updateEndCombatItemEffects(player);

            expect(ItemEffects.removeBarrel).toHaveBeenCalledWith(player);
            expect(ItemEffects.applyTorch).toHaveBeenCalledWith(player);
        });

        it('should do nothing for other item types', () => {
            player.items = [ItemType.Potion1, ItemType.Potion2];
            const originalAttack = player.attack;
            const originalDefense = player.defense;

            ItemEffects.updateEndCombatItemEffects(player);

            expect(player.attack).toBe(originalAttack);
            expect(player.defense).toBe(originalDefense);
        });
    });

    describe('applyTorch', () => {
        it('should increase attack and set flag when health > threshold and torch not active', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isTorchActive = false;

            ItemEffects.applyTorch(player);

            expect(player.attack).toBe(6);
            expect(player.isTorchActive).toBe(true);
        });

        it('should not change stats when health <= threshold', () => {
            player.health = ITEM_THRESHOLD;
            player.isTorchActive = false;

            ItemEffects.applyTorch(player);

            expect(player.attack).toBe(5);
            expect(player.isTorchActive).toBe(false);
        });

        it('should not change stats when torch already active', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isTorchActive = true;

            ItemEffects.applyTorch(player);

            expect(player.attack).toBe(5);
        });
    });

    describe('removeTorch', () => {
        it('should decrease attack and clear flag when health <= threshold and torch is active', () => {
            player.health = ITEM_THRESHOLD;
            player.isTorchActive = true;
            player.attack = 6;

            ItemEffects.removeTorch(player);

            expect(player.attack).toBe(5);
            expect(player.isTorchActive).toBe(false);
        });

        it('should not change stats when health > threshold', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isTorchActive = true;
            player.attack = 6;

            ItemEffects.removeTorch(player);

            expect(player.attack).toBe(6);
            expect(player.isTorchActive).toBe(true);
        });

        it('should not change stats when torch already inactive', () => {
            player.health = ITEM_THRESHOLD;
            player.isTorchActive = false;

            ItemEffects.removeTorch(player);

            expect(player.attack).toBe(5);
            expect(player.isTorchActive).toBe(false);
        });
    });

    describe('applyBarrel', () => {
        it('should increase defense and set flag when health <= threshold and barrel not active', () => {
            player.health = ITEM_THRESHOLD;
            player.isBarrelActive = false;

            ItemEffects.applyBarrel(player);

            expect(player.defense).toBe(6);
            expect(player.isBarrelActive).toBe(true);
        });

        it('should not change stats when health > threshold', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isBarrelActive = false;

            ItemEffects.applyBarrel(player);

            expect(player.defense).toBe(5);
            expect(player.isBarrelActive).toBe(false);
        });

        it('should not change stats when barrel already active', () => {
            player.health = ITEM_THRESHOLD;
            player.isBarrelActive = true;

            ItemEffects.applyBarrel(player);

            expect(player.defense).toBe(5);
        });
    });

    describe('removeBarrel', () => {
        it('should decrease defense and clear flag when health > threshold and barrel is active', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isBarrelActive = true;
            player.defense = 6;

            ItemEffects.removeBarrel(player);

            expect(player.defense).toBe(5);
            expect(player.isBarrelActive).toBe(false);
        });

        it('should not change stats when health <= threshold', () => {
            player.health = ITEM_THRESHOLD;
            player.isBarrelActive = true;
            player.defense = 6;

            ItemEffects.removeBarrel(player);

            expect(player.defense).toBe(6);
            expect(player.isBarrelActive).toBe(true);
        });

        it('should not change stats when barrel already inactive', () => {
            player.health = ITEM_THRESHOLD + 1;
            player.isBarrelActive = false;

            ItemEffects.removeBarrel(player);

            expect(player.defense).toBe(5);
            expect(player.isBarrelActive).toBe(false);
        });
    });

    describe('applyRedPotion', () => {
        it('should decrease attack and increase defense', () => {
            ItemEffects.applyRedPotion(player);

            expect(player.attack).toBe(4);
            expect(player.defense).toBe(7);
        });
    });

    describe('applyYellowPotion', () => {
        it('should increase attack and decrease defense', () => {
            ItemEffects.applyYellowPotion(player);

            expect(player.attack).toBe(7);
            expect(player.defense).toBe(4);
        });
    });

    describe('removeRedPotion', () => {
        it('should increase attack and decrease defense', () => {
            ItemEffects.removeRedPotion(player);

            expect(player.attack).toBe(6);
            expect(player.defense).toBe(3);
        });
    });

    describe('removeYellowPotion', () => {
        it('should decrease attack and increase defense', () => {
            ItemEffects.removeYellowPotion(player);

            expect(player.attack).toBe(3);
            expect(player.defense).toBe(6);
        });
    });
});
