import { Injectable } from '@angular/core';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { GameEvents } from '@common/game-events';
import { ItemDropDataToServer } from '@common/item-drop-data-server';
import { MovementDataToServer } from '@common/movement-data-server';
import { QuitDataToServer } from '@common/quit-data-server';
import { TeleportData } from '@common/teleport-data';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;
    private ioFunction = io;

    isSocketAlive() {
        return !!this.socket && this.socket.connected;
    }

    connect(gameId: string) {
        const token = sessionStorage.getItem('roomToken');
        this.socket = this.ioFunction(`${environment.serverUrl}/game`, {
            transports: ['websocket'],
            upgrade: false,
            auth: { token, gameId },
        });
    }

    disconnect() {
        this.socket.disconnect();
    }

    on<T>(event: string, action: (data: T) => void): void {
        if (!this.socket) {
            throw new Error('Socket is not initialized. Call connect() first.');
        }
        this.socket.on(event, action);
    }

    emitMovement(movementData: MovementDataToServer) {
        this.socket.emit(GameEvents.MovePlayer, movementData);
    }

    emitToggleDebug(gameId: string) {
        this.socket.emit(GameEvents.ToggleDebug, gameId);
    }

    emitPlayerTeleport(teleportData: TeleportData) {
        this.socket.emit(GameEvents.TeleportPlayer, teleportData);
    }

    emitPlayerQuit(quitData: QuitDataToServer) {
        this.socket.emit(GameEvents.PlayerQuit, quitData);
    }

    emitDoorUpdate(doorUpdateRequestPayload: DoorUpdateRequestPayload) {
        this.socket.emit(GameEvents.UpdateDoor, doorUpdateRequestPayload);
    }

    emitItemDrop(itemDropPayload: ItemDropDataToServer) {
        this.socket.emit(GameEvents.ItemDrop, itemDropPayload);
    }
}
