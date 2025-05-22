import { GameMap } from '@app/model/database/game-map';
import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { GameStatistics } from '@common/game-statistics';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';

export interface GameData {
    players: Player[];
    map: GameMap;
    isInDebugMode: boolean;
    isInRound: boolean;
    isInCombat: boolean;
    movementLeft: number;
    adminId: CharacterType;
    currentPlayerIndex: number;
    playersInCombat: PlayersInCombat | null;
    isCombatActionUsed: boolean;
    isPlayerMoving: boolean;
    isActionUsed: boolean;
    attackerName: string;
    gameStatistics: GameStatistics;
    isDroppingItem: boolean;
    currentPlayerPosition: Coordinates;
    combatWinnerName: string;
    isOver: boolean;
}
