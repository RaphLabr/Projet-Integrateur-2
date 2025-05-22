import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CombatService } from '@app/services/combat/combat.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { GameEvents } from '@common/game-events';
import { ItemDropDataToServer } from '@common/item-drop-data-server';
import { MovementDataToServer } from '@common/movement-data-server';
import { PlayersInCombat } from '@common/players-in-combat';
import { StartCombatPayload } from '@common/start-combat-payload';
import { TeleportData } from '@common/teleport-data';
import { Inject, forwardRef } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'game', cors: true })
export class GameReceiverGateway {
    constructor(
        private _gameService: GameService,
        private _gameEmitterGateway: GameEmitterGateway,
        private _combatService: CombatService,
        private _mapService: GameMapService,
        @Inject(forwardRef(() => VirtualPlayerService)) private readonly _virtualPlayerService: VirtualPlayerService,
    ) {}

    @SubscribeMessage(GameEvents.ToggleDebug)
    toggleDebug(socket: Socket, gameId: string): void {
        if (socket.data.player?.admin) {
            this._gameService.toggleDebug(gameId);
        }
    }

    @SubscribeMessage(GameEvents.EndRound)
    endRound(socket: Socket, gameId: string) {
        this._gameService.endRound(gameId, socket.data.player.name);
    }

    @SubscribeMessage(GameEvents.MovePlayer)
    async movePlayer(socket: Socket, payload: MovementDataToServer): Promise<void> {
        await this._gameService.movePlayer(payload.gameId, payload.path);
        this._gameService.checkForRoundEnd(payload.gameId);
    }

    @SubscribeMessage(GameEvents.StartCombat)
    async combatRequest(socket: Socket, payload: CombatRequestPayload): Promise<void> {
        const game: GameData | undefined = this._gameService.getGame(payload.gameId);
        if (game && this._gameService.startCombat(payload)) {
            game.currentPlayerPosition = payload.initiatorPosition;
            const playersInCombat: PlayersInCombat = game.playersInCombat;
            const startCombatPayload: StartCombatPayload = {
                playersInCombat,
                startingPlayerName: this._combatService.getFirstPlayerToAttackName(playersInCombat),
            };
            this._gameService.setAttackerName(payload.gameId, startCombatPayload.startingPlayerName);
            this._gameEmitterGateway.emitStartCombat(payload.gameId, startCombatPayload);
            await this._combatService.startCombatTimer(payload.gameId, this._gameService.getGame(payload.gameId));
        }
        this._gameService.checkForRoundEnd(payload.gameId);
    }

    @SubscribeMessage(GameEvents.CombatAttack)
    combatAttack(socket: Socket, gameId: string): void {
        this._combatService.attackCycle(gameId, this._gameService.getGame(gameId));
    }

    @SubscribeMessage(GameEvents.CombatEvade)
    combatEvade(socket: Socket, gameId: string): void {
        this._combatService.receivedEvade(gameId, this._gameService.getGame(gameId));
    }

    @SubscribeMessage(GameEvents.TeleportPlayer)
    teleportPlayer(socket: Socket, payload: TeleportData) {
        this._gameService.teleportPlayer(payload);
    }

    @SubscribeMessage(GameEvents.UpdateDoor)
    updateDoor(socket: Socket, payload: DoorUpdateRequestPayload) {
        const game: GameData | undefined = this._gameService.getGame(payload.gameId);
        if (game && this._mapService.isDoorUpdateAllowed(payload, game)) {
            game.currentPlayerPosition = payload.playerPosition;
            this._gameEmitterGateway.emitDoorUpdate(payload.gameId, this._mapService.updateDoor(payload.doorPosition, game));
        }
        this._gameService.checkForRoundEnd(payload.gameId);
    }

    @SubscribeMessage(GameEvents.ItemDrop)
    dropItem(socket: Socket, payload: ItemDropDataToServer) {
        this._gameService.dropItem(payload);
        this._gameService.checkForRoundEnd(payload.gameId);
    }
}
