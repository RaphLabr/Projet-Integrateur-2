import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomService } from './chat-room.service';

describe('ChatRoomService', () => {
    let service: ChatRoomService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatRoomService],
        }).compile();

        service = module.get<ChatRoomService>(ChatRoomService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createChatRoom', () => {
        it('should create a new chat room with initial message', () => {
            const gameId = 'game-123';

            service.createChatRoom(gameId);

            const chatHistory = service.getChatHistory(gameId);
            expect(chatHistory).toEqual(['Debut du chat:']);
        });

        it('should overwrite existing chat room if it exists', () => {
            const gameId = 'game-123';
            service.createChatRoom(gameId);
            service.addMessage(gameId, 'Test message');

            service.createChatRoom(gameId);

            const chatHistory = service.getChatHistory(gameId);
            expect(chatHistory).toEqual(['Debut du chat:']);
        });
    });

    describe('getChatHistory', () => {
        it('should return undefined for non-existent chat room', () => {
            const gameId = 'non-existent-game';

            const result = service.getChatHistory(gameId);

            expect(result).toBeUndefined();
        });

        it('should return chat history for existing chat room', () => {
            const gameId = 'game-123';
            service.createChatRoom(gameId);

            const result = service.getChatHistory(gameId);

            expect(result).toEqual(['Debut du chat:']);
        });
    });

    describe('addMessage', () => {
        it('should add message to existing chat history', () => {
            const gameId = 'game-123';
            const message = 'Hello, world!';
            service.createChatRoom(gameId);

            service.addMessage(gameId, message);

            const chatHistory = service.getChatHistory(gameId);
            expect(chatHistory).toEqual(['Debut du chat:', 'Hello, world!']);
        });

        it('should add multiple messages in sequence', () => {
            const gameId = 'game-123';
            service.createChatRoom(gameId);

            service.addMessage(gameId, 'Message 1');
            service.addMessage(gameId, 'Message 2');
            service.addMessage(gameId, 'Message 3');

            const chatHistory = service.getChatHistory(gameId);
            expect(chatHistory).toEqual(['Debut du chat:', 'Message 1', 'Message 2', 'Message 3']);
        });

        it('should throw error when adding to non-existent chat room', () => {
            const gameId = 'non-existent-game';
            const message = 'Hello, world!';

            expect(() => {
                service.addMessage(gameId, message);
            }).toThrow();
        });
    });
});
