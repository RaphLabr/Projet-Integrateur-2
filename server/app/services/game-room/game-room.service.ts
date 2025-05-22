import { LIST_CHARACTERS } from '@app/constants/character-constants';
import { names } from '@common/ai-names';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { PlayerInfo } from '@common/player-info';
import { Injectable } from '@nestjs/common';

interface RoomData {
    users: PlayerInfo[];
    map: string;
    locked: boolean;
    availableCharacters: CharacterType[];
}

@Injectable()
export class GameRoomService {
    private _rooms: Map<string, RoomData> = new Map<string, RoomData>();
    private _socketTokens: Map<string, string> = new Map<string, string>();
    private readonly _randomTreshold = 0.5;

    static getGameRoomName(gameId: string): string {
        return 'game-' + gameId;
    }

    static getCreationRoomName(gameId: string): string {
        return 'creating-' + gameId;
    }

    addRoom(room: string): boolean {
        if (this._rooms.has(room)) {
            return false;
        }
        this._rooms.set(room, { users: [], map: '', locked: false, availableCharacters: LIST_CHARACTERS });
        return true;
    }

    addMap(room: string, map: string): void {
        if (!this._rooms.has(room)) {
            return;
        }
        this._rooms.get(room).map = map;
    }

    checkRoomExists(room: string): boolean {
        return this._rooms.has(room);
    }

    removeRoom(room: string): void {
        this._rooms.delete(room);
    }

    toggleLockRoom(room: string): boolean {
        if (!this._rooms.has(room)) return false;
        const roomData = this._rooms.get(room);
        roomData.locked = !roomData.locked;

        return roomData.locked;
    }

    getActiveRooms(): string[] {
        return Array.from(this._rooms.keys());
    }

    checkDuplicateName(baseName: string, room: string): string {
        if (!this._rooms.has(room)) return baseName;

        const roomData = this._rooms.get(room);
        const existingNames = roomData.users.map((user) => user.name);

        let newName = baseName;
        let counter = 2;

        while (existingNames.includes(newName)) {
            newName = `${baseName}-${counter}`;
            counter++;
        }

        return newName;
    }

    checkLock(room: string): boolean {
        if (!this._rooms.has(room)) return false;
        return this._rooms.get(room).locked;
    }

    addUserToRoom(room: string, user: PlayerInfo): boolean {
        if (!this._rooms.has(room)) {
            this.addRoom(room);
        }

        const roomData = this._rooms.get(room);
        if (roomData.locked) {
            return false;
        }

        if (!roomData.users.find((u) => u.userId === user.userId)) {
            roomData.users.push(user);
            roomData.availableCharacters = roomData.availableCharacters.filter((id) => id !== user.id);
        }
        return true;
    }

    removeUserFromRoom(userId: string): string | undefined {
        const room = this.findRoomByUser(userId);
        if (!room) return undefined;
        const roomData = this._rooms.get(room);
        const userRemoved = roomData.users.find((user) => user.userId === userId);
        if (userRemoved) {
            roomData.availableCharacters.push(userRemoved.id);
        }
        roomData.users = roomData.users.filter((user) => user.userId !== userId);
        this.checkRoomEmpty(room);
        this.removeSocketToken(userId);
        return room;
    }

    getRoomUsers(room: string): PlayerInfo[] {
        if (!this._rooms.has(room)) return [];
        const roomData = this._rooms.get(room);
        return roomData.users;
    }

    getPlayersCharacters(room: string): CharacterType[] {
        if (!this._rooms.has(room)) return [];
        const roomData = this._rooms.get(room);
        return roomData.users.map((user) => user.id);
    }

    getRoomMap(room: string): string {
        if (!this._rooms.has(room)) return '';
        const roomData = this._rooms.get(room);
        return roomData.map;
    }

    linkSocketToToken(socketId: string, token: string): void {
        this._socketTokens.set(socketId, token);
    }

    getTokenForSocket(socketId: string): string | undefined {
        return this._socketTokens.get(socketId);
    }

    removeSocketToken(socketId: string): void {
        this._socketTokens.delete(socketId);
    }

    removeCharacterFromRoom(room: string, characterId: CharacterType, previousSelected: CharacterType): void {
        if (!this._rooms.has(room)) return;
        const roomData = this._rooms.get(room);
        if (previousSelected) roomData.availableCharacters.push(previousSelected);
        roomData.availableCharacters = roomData.availableCharacters.filter((id) => id !== characterId);
    }

    getSelectedCharacters(room: string): CharacterType[] {
        if (!this._rooms.has(room)) return [];
        const roomData = this._rooms.get(room);
        return LIST_CHARACTERS.filter((id) => !roomData.availableCharacters.includes(id));
    }

    addAi(room: string, type: string): void {
        if (!this._rooms.has(room)) return;
        const roomData = this._rooms.get(room);
        const aiId = this.checkDuplicateName('AI-' + type, room);
        const randomName = this.checkDuplicateName(names[Math.floor(Math.random() * names.length)], room);
        const randomDice = Math.random() < this._randomTreshold ? DiceChoice.FourDefence : DiceChoice.SixDefence;
        const randomBonus = Math.random() < this._randomTreshold ? 'vie' : 'rapidite';
        let availableCharacters = roomData.availableCharacters;
        if (availableCharacters.length === 0) return;
        availableCharacters = availableCharacters.filter((characterId) => characterId !== CharacterType.NoCharacter);
        const randomCharacterIndex = Math.floor(Math.random() * availableCharacters.length);
        const id = availableCharacters[randomCharacterIndex];
        roomData.users.push({ userId: aiId, id, name: randomName, bonus: randomBonus, dice: randomDice, admin: false });
        this.removeCharacterFromRoom(room, id, undefined);
    }

    removeAi(room: string, userId: string): void {
        const roomData = this._rooms.get(room);
        if (!roomData) return;

        const aiIndex = roomData.users.findIndex((user) => user.userId === userId);
        if (aiIndex === -1) return;

        const ai = roomData.users[aiIndex];
        roomData.availableCharacters.push(ai.id);
        roomData.users.splice(aiIndex, 1);
        this.checkRoomEmpty(room);
    }

    private findRoomByUser(userId: string): string | undefined {
        for (const [roomKey, roomData] of this._rooms.entries()) {
            if (roomData.users.some((user) => user.userId === userId)) {
                return roomKey;
            }
        }
        return undefined;
    }

    private checkRoomEmpty(room: string): void {
        if (!this._rooms.has(room)) return;
        const roomData = this._rooms.get(room);
        if (roomData.users.length === 0) {
            this.removeRoom(room);
        }
    }
}
