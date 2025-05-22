import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ItemEffects } from '@app/classes/item-effects';
import { GameMapService } from '@app/services/game-map-service/game-map.service';
import { GameService } from '@app/services/game-service/game.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { ChatMessage } from '@common/chat-message';
import { CombatAttackPayload } from '@common/combat-attack-payload';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { GameEvents } from '@common/game-events';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';
import { StartCombatPayload } from '@common/start-combat-payload';

import { GENERAL_BUFFER, NOTIFICATION_DURATION_MS } from '@common/timer-constants';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CombatService {
    combatMessages$: Observable<ChatMessage[]>;
    private _enemyPlayer: Player | undefined = undefined;
    private _isClientTurnToAttack: boolean = false;
    private _isClientInCombat: boolean = false;
    private _combatMessagesSubject: BehaviorSubject<ChatMessage[]>;

    constructor(
        private _socketService: SocketClientService,
        private _gameService: GameService,
        private _snackBar: MatSnackBar,
        private _mapService: GameMapService,
    ) {}

    get isClientTurnToAttack(): boolean {
        return this._isClientTurnToAttack;
    }

    get isGameInCombat(): boolean {
        return this._gameService.gameState.isGameInCombat;
    }

    get enemyPlayer(): Player | undefined {
        return this._enemyPlayer;
    }

    get isClientInCombat(): boolean {
        return this._isClientInCombat;
    }

    get combatMessages(): ChatMessage[] {
        return this._combatMessagesSubject.getValue();
    }

    combatAttack(gameId: string): void {
        if (this._isClientTurnToAttack) {
            this._socketService.socket.emit(GameEvents.CombatAttack, gameId);
        }
    }

    combatEvade(gameId: string): void {
        if (this._isClientTurnToAttack && this._gameService.clientPlayer.evadeAttempts < 2) {
            this._socketService.socket.emit(GameEvents.CombatEvade, gameId);
        }
    }

    requestCombat(combatRequestPayload: CombatRequestPayload): void {
        this._socketService.socket.emit(GameEvents.StartCombat, combatRequestPayload);
    }

    combatOver(): void {
        this._gameService.isGameInCombat = false;
        this._enemyPlayer = undefined;
        this._gameService.updateClientHealth(this._gameService.clientPlayer.maxHealth);
        for (const item of this._gameService.clientPlayer.items) {
            ItemEffects.resetItemEffectsAfterCombat(this._gameService.clientPlayer as Player, item);
        }
        this._gameService.updateClientEvadeAttempts(0);
        this._isClientInCombat = false;
        this._isClientTurnToAttack = false;
        this._combatMessagesSubject.next([]);
        setTimeout(() => {
            if (this._gameService.gameState.isClientPlaying) this._mapService.showReachableAndPathTiles();
        }, GENERAL_BUFFER);
    }

    startCombat(startCombatPayload: StartCombatPayload): void {
        this._mapService.hideActiveAndPathTiles();
        this._gameService.isGameInCombat = true;
        this._gameService.isActionUsed = true;
        const playersInCombat = startCombatPayload.playersInCombat;
        this.setPlayersInCombat(playersInCombat);
        this._gameService.addLog(`Début de combat entre ${playersInCombat.initiator.name} et ${playersInCombat.target.name}`);
        this.setPlayerTurn(startCombatPayload.startingPlayerName);
    }

    configureSocketFeatures(): void {
        this._socketService.on(GameEvents.StartCombat, (startCombatPayload: StartCombatPayload) => {
            this.startCombat(startCombatPayload);
        });

        this._socketService.on(GameEvents.CombatAttack, (combatAttackPayload: CombatAttackPayload) => {
            this.receivedAttack(combatAttackPayload);
        });

        this._socketService.on(GameEvents.CombatFailedEvade, (playerEvadingName: string) => {
            this.failedEvade(playerEvadingName);
        });

        this._socketService.on(GameEvents.CombatOver, () => {
            this.combatOver();
        });

        this._socketService.on(GameEvents.CombatOverLog, (log: string) => {
            this._gameService.addLog(log);
        });

        this._socketService.on(GameEvents.CombatWinner, (winnerId: CharacterType) => {
            this._gameService.incrementPlayerWins(winnerId);
        });

        this.listenForCombatMessages();
    }

    private listenForCombatMessages(): void {
        this._combatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
        this.combatMessages$ = this._combatMessagesSubject.asObservable();
        this._socketService.on(GameEvents.CombatMessage + this._gameService.clientPlayer.id, (message: ChatMessage) => {
            const cleanedMessage = message.message.replace(/<br>/g, ' ');
            this._gameService.addLog(cleanedMessage);
            this.addCombatMessage(message);
        });

        this._socketService.on(GameEvents.CombatOverMessage + this._gameService.clientPlayer.id, (message: string) => {
            this.showCombatOverMessage(message);
            this._gameService.addLog(message);
        });
    }

    private receivedAttack(combatAttackPayload: CombatAttackPayload): void {
        if (this._gameService.clientPlayer.name === combatAttackPayload.playerName) {
            this._gameService.updateClientHealth(combatAttackPayload.playerHealth);
        }

        if (this._isClientInCombat) {
            this.switchAttacker();
        }
    }

    private failedEvade(playerName: string): void {
        if (this._gameService.clientPlayer.name === playerName) {
            this._gameService.updateClientEvadeAttempts(this._gameService.clientPlayer.evadeAttempts + 1);
        }

        if (this._isClientInCombat) {
            this.switchAttacker();
        }
    }

    private setPlayersInCombat(playersInCombat: PlayersInCombat): void {
        const clientPlayerName = this._gameService.clientPlayer.name;
        if (clientPlayerName === playersInCombat.initiator.name) {
            this._isClientInCombat = true;
            this._enemyPlayer = playersInCombat.target;
        } else if (clientPlayerName === playersInCombat.target.name) {
            this._isClientInCombat = true;
            this._enemyPlayer = playersInCombat.initiator;
        }
    }

    private setPlayerTurn(playerName: string): void {
        if (this._gameService.clientPlayer.name === playerName) this._isClientTurnToAttack = true;
        return;
    }

    private switchAttacker(): void {
        this._isClientTurnToAttack = !this._isClientTurnToAttack;
    }

    private addCombatMessage(message: ChatMessage): void {
        this._combatMessagesSubject.next([message, ...this._combatMessagesSubject.getValue()]);
    }

    private showCombatOverMessage(message: string): void {
        this._snackBar.open(message, 'Fermer', {
            duration: NOTIFICATION_DURATION_MS,
        });
    }
}
