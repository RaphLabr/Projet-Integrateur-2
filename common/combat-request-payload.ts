import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';

export interface CombatRequestPayload {
    gameId: string;
    initiatorId: CharacterType;
    targetId: CharacterType;
    initiatorPosition: Coordinates;
    targetPosition: Coordinates;
}
