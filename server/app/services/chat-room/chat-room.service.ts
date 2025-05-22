import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatRoomService {
    private _chatRooms: Map<string, string[]> = new Map();

    getChatHistory(gameId: string): string[] {
        return this._chatRooms.get(gameId);
    }

    createChatRoom(gameId: string) {
        const newChatRoom: string[] = ['Debut du chat:'];
        this._chatRooms.set(gameId, newChatRoom);
    }

    addMessage(gameId: string, message: string) {
        const previousMessages: string[] = this._chatRooms.get(gameId);
        previousMessages.push(message);
        this._chatRooms.set(gameId, previousMessages);
    }
}
