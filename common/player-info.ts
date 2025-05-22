import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';

export interface PlayerInfo {
    userId: string;
    id: CharacterType;
    name: string;
    bonus: string;
    dice: DiceChoice;
    admin: boolean;
}
