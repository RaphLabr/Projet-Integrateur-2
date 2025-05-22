import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { AttackMessageInfo } from '@app/interfaces/attack-message-info/attack-message.interface-info';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CombatMessagesService {
    constructor(private readonly _gameRoomGateway: GameRoomGateway) {}

    successfulEvadeMessage(gameId: string, currentPlayer: Player, enemyPlayer: Player) {
        const currentPlayerMessage = `Évasion Réussiée. Bravo ${currentPlayer.name}!`;
        const enemyPlayerMessage = `${currentPlayer.name} a réussi à s'échapper. Dommage ${enemyPlayer.name} ...`;
        this._gameRoomGateway.sendCombatOverMessage(gameId, currentPlayer.id, currentPlayerMessage);
        this._gameRoomGateway.sendCombatOverMessage(gameId, enemyPlayer.id, enemyPlayerMessage);
    }

    failedEvadeMessage(gameId: string, currentPlayer: Player, enemyPlayer: Player) {
        const currentPlayerMessage = `Tentative d'évasion échouée. Meilleure chance la prochaine fois ${currentPlayer.name}!`;
        const enemyPlayerMessage = `${currentPlayer.name} a échoué à s'évader du combat!`;

        this._gameRoomGateway.sendCombatMessage(gameId, currentPlayer.id, currentPlayerMessage, 'green');
        this._gameRoomGateway.sendCombatMessage(gameId, enemyPlayer.id, enemyPlayerMessage, 'red');
    }

    attackMessage(attackMessageInfo: AttackMessageInfo) {
        const generalMessage =
            `${attackMessageInfo.attacker.name} attaque et roule ${attackMessageInfo.attackRoll}!<br>` +
            `${attackMessageInfo.defender.name} défend et roule ${attackMessageInfo.defenseRoll}!<br>`;
        let attackerMessage: string =
            generalMessage + `Calcul combat -- ATK: ${attackMessageInfo.attackTotal} <= DEF: ${attackMessageInfo.defenseTotal}<br>`;
        let defenderMessage: string =
            generalMessage + `Calcul combat -- DEF: ${attackMessageInfo.defenseTotal} => ATK: ${attackMessageInfo.attackTotal}<br>`;

        if (attackMessageInfo.isAttackerOnIce) {
            attackerMessage += `${attackMessageInfo.attacker.name} est sur la glace, il roule 2 de moins!<br>`;
        }
        if (attackMessageInfo.isDefenderOnIce) {
            defenderMessage += `${attackMessageInfo.defender.name} est sur la glace, il roule 2 de moins!<br>`;
        }

        if (attackMessageInfo.attackResult > 0) {
            attackerMessage +=
                `Vous infligez ${attackMessageInfo.attackResult} dégats à ${attackMessageInfo.defender.name}<br>` +
                `Il lui reste ${attackMessageInfo.defender.health} vie.`;
            defenderMessage +=
                `Vous recevez ${attackMessageInfo.attackResult} dégats de ${attackMessageInfo.attacker.name}<br>` +
                `Il vous reste ${attackMessageInfo.defender.health} vie.`;
        } else {
            attackerMessage += 'Votre attaque a échoué!';
            defenderMessage += "Vous avez défendu l'attaque!";
        }

        this._gameRoomGateway.sendCombatMessage(attackMessageInfo.gameId, attackMessageInfo.attacker.id, attackerMessage, 'green');
        this._gameRoomGateway.sendCombatMessage(attackMessageInfo.gameId, attackMessageInfo.defender.id, defenderMessage, 'red');
    }

    combatWinnerMessage(gameId: string, playersInCombat: PlayersInCombat, winner: Player) {
        let initiatorMessage;
        let targetMessage;
        if (playersInCombat.initiator === winner) {
            initiatorMessage = `Vous avez gagné le combat contre ${playersInCombat.target.name}!`;
            targetMessage = `${playersInCombat.initiator.name} a gagné le combat!`;
            const winningLog = `${playersInCombat.initiator.name} a gagné le combat contre ${playersInCombat.target.name}`;
            this._gameRoomGateway.sendCombatOverLog(gameId, winningLog);
        } else {
            initiatorMessage = `${playersInCombat.target.name} a gagné le combat!`;
            targetMessage = `Vous avez gagné le combat contre ${playersInCombat.initiator.name}!`;
            const losingLog = `${playersInCombat.target.name} a gagné le combat contre ${playersInCombat.initiator.name}`;
            this._gameRoomGateway.sendCombatOverLog(gameId, losingLog);
        }

        this._gameRoomGateway.sendCombatOverMessage(gameId, playersInCombat.initiator.id, initiatorMessage);
        this._gameRoomGateway.sendCombatOverMessage(gameId, playersInCombat.target.id, targetMessage);
    }
}
