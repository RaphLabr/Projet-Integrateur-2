import { CharacterType } from '@common/character-type';
import { Teams } from '@common/teams';

export interface PlayerDisplayData {
    id: CharacterType;
    name: string;
    wins: number;
    hasAbandoned: boolean;
    isAI: boolean;
    team: Teams;
}
