import { CharacterType } from '@common/character-type';

export const CHARACTERS: CharacterType[] = Object.values(CharacterType).filter((character) => {
    return character !== CharacterType.NoCharacter;
});
