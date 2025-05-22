import { CharacterType } from '@common/character-type';

export interface CombatInfo {
    attackerId: CharacterType;
    defenderId: CharacterType;
    result: boolean;
    attackRoll: number;
    defenseRoll: number;
}
