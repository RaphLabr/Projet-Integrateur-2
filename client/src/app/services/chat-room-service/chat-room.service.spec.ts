import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { GameEvents } from '@common/game-events';
import { SERVER_DELAY_BUFFER } from '@common/timer-constants';
import { BehaviorSubject } from 'rxjs';
import { ChatRoomService } from './chat-room.service';

describe('ChatRoomService', () => {
    let service: ChatRoomService;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);
        socketSpy.socket = jasmine.createSpyObj('socket', ['emit']);

        TestBed.configureTestingModule({
            providers: [ChatRoomService, { provide: SocketClientService, useValue: socketSpy }],
        });

        service = TestBed.inject(ChatRoomService);
        socketServiceMock = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize with empty messages array', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)._messagesSubject = new BehaviorSubject<string[]>([]);

        expect(service.messages).toEqual([]);
    });

    it('should send message through socket when message is not empty', () => {
        const roomId = 'room123';
        const message = 'Hello world';

        service.sendMessage(message, roomId);

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.MessageSent, { gameId: roomId, message });
    });

    it('should not send message when trimmed message is empty', () => {
        const roomId = 'room123';
        const emptyMessage = '   ';

        service.sendMessage(emptyMessage, roomId);

        expect(socketServiceMock.socket.emit).not.toHaveBeenCalled();
    });

    it('should request chat history for specified room', () => {
        const roomId = 'room123';

        service.getChatHistory(roomId);

        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.GetChat, { gameId: roomId });
    });

    it('should configure socket listener for chat messages', () => {
        service.configureBaseSocketFeatures();

        expect(socketServiceMock.on).toHaveBeenCalledWith(GameEvents.GetChat, jasmine.any(Function));
    });

    it('should update messages when receiving chat history', fakeAsync(() => {
        const mockMessages = ['message1', 'message2'];
        const gameId = 'testGame';
        let chatHistoryCallback: (data: string[]) => void = () => {
            return;
        };
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameEvents.GetChat) {
                chatHistoryCallback = callback as unknown as (data: string[]) => void;
            }
        });

        service.initialize(gameId);
        expect(socketServiceMock.on).toHaveBeenCalledWith(GameEvents.GetChat, jasmine.any(Function));

        tick(SERVER_DELAY_BUFFER);
        chatHistoryCallback(mockMessages);
        expect(service.messages).toEqual(mockMessages);
        expect(socketServiceMock.socket.emit).toHaveBeenCalledWith(GameEvents.GetChat, { gameId: 'testGame' });
    }));
});
