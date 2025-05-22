import { PlayersInCombat } from '@common/players-in-combat';

export interface StartCombatPayload {
    playersInCombat: PlayersInCombat;
    startingPlayerName: string;
}
