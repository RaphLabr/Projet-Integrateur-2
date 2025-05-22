import { Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { sleep } from '@app/utils/sleep';
import { GameEvents } from '@common/game-events';
import { SERVER_DELAY_BUFFER } from '@common/timer-constants';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ChatRoomService {
    messages$: Observable<string[]>;
    private _messagesSubject: BehaviorSubject<string[]>;

    constructor(public socketService: SocketClientService) {}

    get messages(): string[] {
        return this._messagesSubject.getValue();
    }

    sendMessage(message: string, roomId: string) {
        if (message.trim().length !== 0) this.socketService.socket.emit(GameEvents.MessageSent, { gameId: roomId, message });
    }

    getChatHistory(roomId: string) {
        this.socketService.socket.emit(GameEvents.GetChat, { gameId: roomId });
    }

    async initialize(gameId: string) {
        this.configureBaseSocketFeatures();
        this._messagesSubject = new BehaviorSubject<string[]>([]);
        this.messages$ = this._messagesSubject.asObservable();
        await sleep(SERVER_DELAY_BUFFER);
        this.getChatHistory(gameId);
    }

    configureBaseSocketFeatures() {
        this.socketService.on<string[]>(GameEvents.GetChat, (messages) => {
            this._messagesSubject.next(messages);
        });
    }
}
