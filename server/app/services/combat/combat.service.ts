import { ClosestFreeTileAlgorithm } from '@app/classes/closest-free-tile-algorithm/closest-free-tile-algorithm';
import { ItemEffects } from '@app/classes/item-effects/item-effects';
import { EVADE_CHANCES, ICE_PENALTY, MAX_EVASIONS, MAX_WINS } from '@app/constants/combat-constants';
import { DiceOptions } from '@app/constants/dice-options';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { AttackMessageInfo } from '@app/interfaces/attack-message-info/attack-message.interface-info';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CombatMessagesService } from '@app/services/combat-messages/combat-messages.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { areCoordinatesEqual } from '@app/utils/coordinate-utils/coordinate-utils';
import { CombatAttackPayload } from '@common/combat-attack-payload';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';
import { TeleportData } from '@common/teleport-data';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CombatService {
    // eslint-disable-next-line max-params
    constructor(
        private readonly _combatMessagesService: CombatMessagesService,
        private _virtualPlayerService: VirtualPlayerService,
        private readonly _mapService: GameMapService,
        private readonly _timerService: GameTimerService,
        private readonly _gameEmitterGateway: GameEmitterGateway,
        private readonly _gameStatisticsService: GameStatisticsService,
    ) {}

    evadeAttempt(gameId: string, currentPlayer: Player, enemyPlayer: Player): boolean {
        if (currentPlayer.evadeAttempts >= MAX_EVASIONS) {
            return false;
        }

        currentPlayer.evadeAttempts++;
        const attempt = Math.random();
        if (attempt <= EVADE_CHANCES) {
            this._combatMessagesService.successfulEvadeMessage(gameId, currentPlayer, enemyPlayer);
            this._gameStatisticsService.updateAStatisticForPlayer(gameId, currentPlayer, 'evasions');
            return true;
        } else {
            this._combatMessagesService.failedEvadeMessage(gameId, currentPlayer, enemyPlayer);
            return false;
        }
    }

    endFight(playersInCombat: PlayersInCombat): void {
        playersInCombat.initiator.health = playersInCombat.initiator.maxHealth;
        playersInCombat.target.health = playersInCombat.target.maxHealth;
        playersInCombat.initiator.evadeAttempts = 0;
        playersInCombat.target.evadeAttempts = 0;
    }

    getWinner(gameId: string, game: GameData, playersInCombat: PlayersInCombat): Player {
        const isInitiatorDefeated = playersInCombat.initiator.health <= 0 || playersInCombat.initiator.hasAbandoned;
        const isTargetDefeated = playersInCombat.target.health <= 0 || playersInCombat.target.hasAbandoned;

        if (!isInitiatorDefeated && !isTargetDefeated) {
            return null;
        }

        const loser = isInitiatorDefeated ? playersInCombat.initiator : playersInCombat.target;
        const winner = isInitiatorDefeated ? playersInCombat.target : playersInCombat.initiator;
        const loserPosition = isInitiatorDefeated ? playersInCombat.initiatorPosition : playersInCombat.targetPosition;

        if (!loser.hasAbandoned) {
            this.updatePlayerPosition(gameId, game, loser, loserPosition);
            this.loserDropItems(game, gameId, loserPosition, loser);
        }

        winner.wins += 1;

        this._gameStatisticsService.updateAStatisticForPlayer(gameId, winner, 'wins');
        this._gameStatisticsService.updateAStatisticForPlayer(gameId, loser, 'losses');
        this._combatMessagesService.combatWinnerMessage(gameId, playersInCombat, winner);

        return winner;
    }

    loserDropItems(game: GameData, gameId: string, loserPosition: Coordinates, loser: Player) {
        const firstCoordinateOccupied = ClosestFreeTileAlgorithm.isPositionOccupied(loserPosition, game.map.terrain, false);

        const firstCoordinate = !firstCoordinateOccupied
            ? loserPosition
            : ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, loserPosition, false);
        loser.items.forEach((item, index) => {
            const coordinate = index === 0 ? firstCoordinate : ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, loserPosition, false);

            this._mapService.placeItem(gameId, { item, itemCoordinates: coordinate }, game.map.terrain);
        });
        loser.items = [];
        this._gameEmitterGateway.emitLoserPlayer(gameId, loser);
    }

    getFirstPlayerToAttackName(playersInCombat: PlayersInCombat): string {
        if (playersInCombat.initiator.speed >= playersInCombat.target.speed) {
            return playersInCombat.initiator.name;
        } else {
            return playersInCombat.target.name;
        }
    }

    getAttacker(playersInCombat: PlayersInCombat, attackerName: string): Player {
        return playersInCombat.initiator.name === attackerName ? playersInCombat.initiator : playersInCombat.target;
    }

    getDefender(playersInCombat: PlayersInCombat, attackerName: string): Player {
        return playersInCombat.initiator.name === attackerName ? playersInCombat.target : playersInCombat.initiator;
    }

    isPlayerInCombat(playerName: string, playersInCombat: PlayersInCombat): boolean {
        return playersInCombat.initiator.name === playerName || playersInCombat.target.name === playerName;
    }

    startCombat(game: GameData, payload: CombatRequestPayload, attackerTile: MapTile, defenderTile: MapTile): boolean {
        if (!this._mapService.areCoordinatesAdjacent(payload.initiatorPosition, payload.targetPosition)) {
            return false;
        }

        let playersInCombat: PlayersInCombat;

        if (attackerTile.character === payload.initiatorId && defenderTile.character === payload.targetId) {
            playersInCombat = {
                initiator: game.players[game.currentPlayerIndex],
                target: game.players.find((player) => player.id === defenderTile.character),
                initiatorPosition: payload.initiatorPosition,
                targetPosition: payload.targetPosition,
            };
            this._gameStatisticsService.updateAStatisticWithGame(game, game.players[game.currentPlayerIndex], 'combats');
            this._gameStatisticsService.updateAStatisticWithGame(
                game,
                game.players.find((player) => player.id === defenderTile.character),
                'combats',
            );
            if (game.map.mode === GameMode.CaptureTheFlag && playersInCombat.initiator.team === playersInCombat.target.team) return false;
        } else return false;

        game.isActionUsed = true;
        game.isCombatActionUsed = false;
        game.playersInCombat = playersInCombat;
        game.isInCombat = true;

        return true;
    }

    receivedEvade(gameId: string, game: GameData): void {
        game.isCombatActionUsed = true;
        const evader: Player = this.getAttacker(game.playersInCombat, game.attackerName);
        const opponent: Player = this.getDefender(game.playersInCombat, game.attackerName);

        const evadeResult: boolean = this.evadeAttempt(gameId, evader, opponent);

        if (evadeResult) {
            this.endCombat(gameId, game);
        } else {
            this._gameEmitterGateway.emitFailedEvade(gameId, evader.name);
            this._timerService.stopTimer(gameId);
        }
    }

    async startCombatTimer(gameId: string, game: GameData): Promise<void> {
        this._timerService.pauseTimer(gameId);
        while (game.isInCombat) {
            game.isCombatActionUsed = false;
            const attacker: Player = this.getAttacker(game.playersInCombat, game.attackerName);
            if (attacker.userId.startsWith('AI')) {
                this._virtualPlayerService.handleCombat(attacker, gameId);
            }
            if (attacker.evadeAttempts >= MAX_EVASIONS) {
                await this._timerService.waitForCombatTimerNoEvades(gameId);
            } else {
                await this._timerService.waitForCombatTimer(gameId);
            }
            if (!game.isCombatActionUsed) {
                this.attackCycle(gameId, game);
            }
            if (game.playersInCombat) game.attackerName = this.getDefender(game.playersInCombat, game.attackerName).name;
        }
        this._timerService.restartTimer(gameId);
        const currentPlayer: Player = game.players[game.currentPlayerIndex];
        if (!game.combatWinnerName) return;
        if (currentPlayer.name !== game.combatWinnerName) {
            this._timerService.stopTimer(gameId);
        }
        game.combatWinnerName = '';
    }

    attackCycle(gameId: string, game: GameData): void {
        const combatInfo = this.getAttackInfo(gameId, game);
        ItemEffects.updateCombatItemEffects(combatInfo.defender);
        ItemEffects.updateCombatItemEffects(combatInfo.attacker);
        game.isCombatActionUsed = true;
        const combatAttackPayload: CombatAttackPayload = this.attack(gameId, game);
        this._gameEmitterGateway.emitCombatAttack(combatAttackPayload);
        if (combatAttackPayload.playerHealth <= 0) {
            ItemEffects.updateEndCombatItemEffects(combatInfo.defender);
            ItemEffects.updateEndCombatItemEffects(combatInfo.attacker);
            this.combatOverWithWinner(gameId, game);
        }
        this._timerService.stopTimer(gameId);
    }

    combatOverWithWinner(gameId: string, game: GameData): void {
        game.isCombatActionUsed = true;
        const winner: Player = this.getWinner(gameId, game, game.playersInCombat);
        game.combatWinnerName = winner.name;

        this.endCombat(gameId, game);
        this._gameEmitterGateway.emitCombatWinner(gameId, winner.id);
        const gameWinnerName: string = this.getGameWinnerName(gameId, game);
        if (game.map.mode === GameMode.Classic && gameWinnerName) {
            game.isOver = true;
            this._gameEmitterGateway.emitGameOver(gameId, this._gameStatisticsService.getAllStatistics(game, gameWinnerName));
        }
        return;
    }

    private endCombat(gameId: string, game: GameData): void {
        game.isInCombat = false;
        this._timerService.stopTimer(gameId);
        this.endFight(game.playersInCombat);
        game.playersInCombat = null;
        this._gameEmitterGateway.emitCombatOver(gameId);
    }

    private roll(max: number, debugState: boolean, diceType: DiceOptions): number {
        if (debugState) {
            return diceType === DiceOptions.Attack ? max : 1;
        } else {
            return Math.floor(Math.random() * max + 1);
        }
    }

    private getGameWinnerName(gameId: string, game: GameData): string {
        const winnerWith3Wins = game.players.find((player) => player.wins >= MAX_WINS);
        if (winnerWith3Wins) {
            return winnerWith3Wins.name;
        }
    }

    private updatePlayerPosition(gameId: string, game: GameData, player: Player, playerPosition: Coordinates): void {
        if (areCoordinatesEqual(playerPosition, player.startPosition)) return;
        const coordinate = ClosestFreeTileAlgorithm.findClosestFreeTile(gameId, game, player.startPosition, true);
        const teleportData: TeleportData = {
            from: playerPosition,
            to: coordinate,
            gameId,
        };
        if (teleportData) {
            this._mapService.teleportPlayer(game, teleportData, true);
        }
    }

    private attack(gameId: string, game: GameData): CombatAttackPayload {
        const attackInfo: AttackMessageInfo = this.getAttackInfo(gameId, game);
        if (attackInfo.attackResult > 0) {
            attackInfo.defender.health -= attackInfo.attackResult;

            this._gameStatisticsService.updateAStatisticForPlayer(gameId, attackInfo.attacker, 'livesTaken', attackInfo.attackResult);
            this._gameStatisticsService.updateAStatisticForPlayer(gameId, attackInfo.defender, 'livesLost', attackInfo.attackResult);
        }
        this._combatMessagesService.attackMessage(attackInfo);

        const combatAttackPayload: CombatAttackPayload = {
            gameId,
            playerName: attackInfo.defender.name,
            playerHealth: attackInfo.defender.health,
        };

        return combatAttackPayload;
    }

    private getAttackInfo(gameId: string, game: GameData): AttackMessageInfo {
        const attacker: Player = this.getAttacker(game.playersInCombat, game.attackerName);
        const defender: Player = this.getDefender(game.playersInCombat, game.attackerName);

        let attackRoll: number = this.roll(attacker.dice.attack, game.isInDebugMode, DiceOptions.Attack);
        let defenseRoll: number = this.roll(defender.dice.defense, game.isInDebugMode, DiceOptions.Defense);

        if (attacker.items.includes(ItemType.Sword)) attackRoll = attacker.dice.attack;
        if (attacker.items.includes(ItemType.Skull)) defenseRoll = 1;
        let attackTotal: number = attackRoll + attacker.attack;
        let defenseTotal: number = defenseRoll + defender.defense;

        const attackerTile: MapTile = this._mapService.getTileFromId(game.map.terrain, attacker.id);
        const defenderTile: MapTile = this._mapService.getTileFromId(game.map.terrain, defender.id);

        if (attackerTile.type === MapTileType.Ice) {
            attackTotal -= ICE_PENALTY;
        }

        if (defenderTile.type === MapTileType.Ice) {
            defenseTotal -= ICE_PENALTY;
        }

        const attackResult: number = attackTotal - defenseTotal;

        return {
            gameId,
            attacker,
            defender,
            attackRoll,
            defenseRoll,
            isAttackerOnIce: attackerTile.type === MapTileType.Ice,
            isDefenderOnIce: defenderTile.type === MapTileType.Ice,
            attackTotal,
            defenseTotal,
            attackResult,
        };
    }
}
