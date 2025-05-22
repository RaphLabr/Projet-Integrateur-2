import { GameRoomService } from '@app/services/game-room/game-room.service';
import { CharacterType } from '@common/character-type';
import { ClientStatistics } from '@common/client-game-statistics';
import { CombatAttackPayload } from '@common/combat-attack-payload';
import { DoorUpdateData } from '@common/door-update-data';
import { GameEvents } from '@common/game-events';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemLog } from '@common/item-log';
import { ItemType } from '@common/item-type';
import { MovementDataToClient } from '@common/movement-data-client';
import { Player } from '@common/player';
import { QuitDataToClient } from '@common/quit-data-client';
import { StartCombatPayload } from '@common/start-combat-payload';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: 'game', cors: true })
export class GameEmitterGateway {
    @WebSocketServer() server: Server;

    emitStartNotification(gameId: string, nextActivePlayerName: string): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.StartNotification, nextActivePlayerName);
    }

    emitStartRound(gameId: string): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.StartRound);
    }

    emitTimerUpdate(gameId: string, newTimerValue: number): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.TimerUpdate, newTimerValue);
    }

    emitEndOfMovement(gameId: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.EndOfMovement);
    }

    emitMovePlayer(gameId: string, movement: MovementDataToClient): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.MovePlayer, movement);
    }

    emitStartCombat(gameId: string, startCombatPayload: StartCombatPayload): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.StartCombat, startCombatPayload);
    }

    emitCombatWinner(gameId: string, winnerId: CharacterType): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.CombatWinner, winnerId);
    }

    emitCombatAttack(combatAttackPayload: CombatAttackPayload): void {
        this.server.to(GameRoomService.getGameRoomName(combatAttackPayload.gameId)).emit(GameEvents.CombatAttack, combatAttackPayload);
    }

    emitCombatOver(gameId: string): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.CombatOver);
    }

    emitFailedEvade(gameId: string, playerEvadingName: string): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.FailedEvade, playerEvadingName);
    }

    emitGameOver(gameId: string, clientStatistics: ClientStatistics): void {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.GameOver, clientStatistics);
    }

    emitToggleDebug(gameId: string, newDebugState: boolean) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.ToggleDebug, newDebugState);
    }

    emitPlayerQuit(gameId: string, quitData: QuitDataToClient) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.PlayerQuit, quitData);
    }

    emitGameOverEarly(gameId: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.RoomDestroyed);
    }

    emitDoorUpdate(gameId: string, doorUpdateData: DoorUpdateData) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.UpdateDoor, doorUpdateData);
    }

    emitKickLastPlayer(gameId: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.KickUser);
    }

    emitItemPickUp(gameId: string, item: ItemType, playerId: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.ItemPickUp + playerId, item);
    }

    emitItemPickUpLog(gameId: string, itemLog: ItemLog) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.ItemPickUpLog, itemLog);
    }

    emitItemDrop(gameId: string, itemDropData: ItemDropDataToClient) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.ItemDrop, itemDropData);
    }

    emitLoserPlayer(gameId: string, loserPlayer: Player) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.LoserPlayer + loserPlayer.id);
    }
}
