import { CharacterType } from '@common/character-type';

export interface User {
    name: string;
    character: CharacterType;
    id: string;
}
