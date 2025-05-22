import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { ItemEffects } from './item-effects';

describe('ItemEffects', () => {
    let player: Player;

    beforeEach(() => {
        player = { attack: 5, defense: 5 } as Player;
    });

    it('should apply correct effects when picking up Potion1', () => {
        ItemEffects.handleItemPickUpEffect(player, ItemType.Potion1);
        const expectedAttack = 4;
        const expectedDefense = 7;
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should apply correct effects when picking up Potion2', () => {
        ItemEffects.handleItemPickUpEffect(player, ItemType.Potion2);
        const expectedAttack = 7;
        const expectedDefense = 4;
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should apply correct effects when picking up Torch', () => {
        ItemEffects.handleItemPickUpEffect(player, ItemType.Torch);
        const expectedAttack = 6;
        const expectedDefense = 5;
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should reset effects after combat for Torch', () => {
        const expectedAttack = 6;

        ItemEffects.resetItemEffectsAfterCombat(player, ItemType.Torch);
        expect(player.attack).toBe(expectedAttack);
    });

    it('should reset effects after combat for Barrel', () => {
        const expectedAttack = 4;

        ItemEffects.resetItemEffectsAfterCombat(player, ItemType.Barrel);
        expect(player.defense).toBe(expectedAttack);
    });

    it('should apply correct effects when dropping Potion1', () => {
        const expectedAttack = 6;
        const expectedDefense = 3;
        ItemEffects.handleItemDropEffect(player, ItemType.Potion1);
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should apply correct effects when dropping Potion2', () => {
        const expectedAttack = 3;
        const expectedDefense = 6;
        ItemEffects.handleItemDropEffect(player, ItemType.Potion2);
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should apply correct effects when dropping Torch', () => {
        const expectedAttack = 4;
        const expectedDefense = 5;
        ItemEffects.handleItemDropEffect(player, ItemType.Torch);
        expect(player.attack).toBe(expectedAttack);
        expect(player.defense).toBe(expectedDefense);
    });

    it('should return the correct French name for Flag', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Flag)).toBe('Drapeau');
    });

    it('should return the correct French name for Potion1', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Potion1)).toBe('Potion défensive');
    });

    it('should return the correct French name for Potion2', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Potion2)).toBe('Potion offensive');
    });

    it('should return the correct French name for Skull', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Skull)).toBe('Crâne');
    });

    it('should return the correct French name for Sword', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Sword)).toBe('Épée');
    });

    it('should return the correct French name for Torch', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Torch)).toBe('Torche');
    });

    it('should return the correct French name for Barrel', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.Barrel)).toBe('Barril');
    });

    it('should return the default French name for unknown item', () => {
        expect(ItemEffects.handleFrenchItemName(ItemType.NoItem)).toBe('Item inconnu');
    });
});
