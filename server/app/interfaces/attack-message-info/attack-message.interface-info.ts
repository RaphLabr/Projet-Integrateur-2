import { Player } from '@common/player';

export interface AttackMessageInfo {
    gameId: string;
    attacker: Player;
    defender: Player;
    attackRoll: number;
    defenseRoll: number;
    isAttackerOnIce: boolean;
    isDefenderOnIce: boolean;
    attackTotal: number;
    defenseTotal: number;
    attackResult: number;
}
