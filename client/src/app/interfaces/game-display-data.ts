import { PlayerDisplayData } from '@app/interfaces/player-display-data';
import { CharacterType } from '@common/character-type';

export interface GameDisplayData {
    gameName: string;
    mapSize: string;
    currentPlayerName: string;
    adminCharacterId: CharacterType;
    flagCharacterId: CharacterType;
    numberOfPlayers: number;
    timeLeft: number;
    playerDisplay: PlayerDisplayData[];
    notification: string;
}
