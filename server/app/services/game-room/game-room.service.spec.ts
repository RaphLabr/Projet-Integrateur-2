// Max line disable for test file
/* eslint-disable max-lines */
// Disabled lint to allow for the use of `as any` to access private methods for testing
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { PlayerInfo } from '@common/player-info';
import { Test, TestingModule } from '@nestjs/testing';
import { GameRoomService } from './game-room.service';

describe('GameRoomService', () => {
    let service: GameRoomService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GameRoomService],
        }).compile();

        service = module.get<GameRoomService>(GameRoomService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('addRoom', () => {
        it('should add a new room', () => {
            const room = 'room1';
            expect(service.addRoom(room)).toBe(true);
            expect(service.checkRoomExists(room)).toBe(true);
        });

        it('should not add a room that already exists', () => {
            const room = 'room1';
            service.addRoom(room);
            expect(service.addRoom(room)).toBe(false);
        });
    });

    describe('removeRoom', () => {
        it('should remove an existing room', () => {
            const room = 'room1';
            service.addRoom(room);
            service.removeRoom(room);
            expect(service.checkRoomExists(room)).toBe(false);
        });
    });

    describe('toggleLockRoom', () => {
        it('should toggle the lock state of a room', () => {
            const room = 'room1';
            service.addRoom(room);
            expect(service.toggleLockRoom(room)).toBe(true);
            expect(service.checkLock(room)).toBe(true);
            expect(service.toggleLockRoom(room)).toBe(false);
            expect(service.checkLock(room)).toBe(false);
        });

        it('should return false for a non-existent room', () => {
            const room = 'room1';
            expect(service.toggleLockRoom(room)).toBe(false);
        });
    });

    describe('checkDuplicateName', () => {
        it('should return the base name if the room does not exist', () => {
            const room = 'nonexistent-room';
            const baseName = 'seb';
            const uniqueName = service.checkDuplicateName(baseName, room);
            expect(uniqueName).toBe(baseName);
        });
        it('should return a unique name if the base name already exists', () => {
            const room = 'room1';
            service.addRoom(room);
            const player1: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            const player2: PlayerInfo = {
                userId: '2',
                id: CharacterType.Character2,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player1);
            const uniqueName = service.checkDuplicateName(player2.name, room);
            expect(uniqueName).toBe('seb-2');
        });

        it('should reuse a name if it becomes available', () => {
            const room = 'room1';
            service.addRoom(room);
            const player1: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            const player2: PlayerInfo = {
                userId: '2',
                id: CharacterType.Character2,
                name: 'seb-2',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player1);
            service.addUserToRoom(room, player2);
            service.removeUserFromRoom('2');
            const player3: PlayerInfo = {
                userId: '3',
                id: CharacterType.Character3,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            const uniqueName = service.checkDuplicateName(player3.name, room);
            expect(uniqueName).toBe('seb-2');
        });
    });

    describe('addUserToRoom', () => {
        it('should add a user to a room', () => {
            const room = 'room1';
            service.addRoom(room);
            const player: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            expect(service.addUserToRoom(room, player)).toBe(true);
            expect(service.getRoomUsers(room)).toContain(player);
        });

        it('should not add a user to a locked room', () => {
            const room = 'room1';
            service.addRoom(room);
            service.toggleLockRoom(room);
            const player: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            expect(service.addUserToRoom(room, player)).toBe(false);
        });

        it('should create the room if it does not exist and add the user to it', () => {
            const room = 'room1';
            const player: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };

            const result = service.addUserToRoom(room, player);

            expect(service.checkRoomExists(room)).toBe(true);

            expect(result).toBe(true);
            expect(service.getRoomUsers(room)).toContain(player);
        });
    });

    describe('checkLock', () => {
        it('should return false if the room does not exist', () => {
            const room = 'nonexistent-room';
            const isLocked = service.checkLock(room);
            expect(isLocked).toBe(false);
        });
    });

    describe('removeUserFromRoom', () => {
        it('should return undefined if the user is not in any room', () => {
            const userId = 'nonexistent-user';
            const result = service.removeUserFromRoom(userId);
            expect(result).toBeUndefined();
        });
        it('should remove a user from a room', () => {
            const room = 'room1';
            service.addRoom(room);
            const player: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player);
            service.removeUserFromRoom(player.userId);
            expect(service.getRoomUsers(room)).not.toContain(player);
        });

        it('should remove the room if it becomes empty', () => {
            const room = 'room1';
            service.addRoom(room);
            const player: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player);
            service.removeUserFromRoom(player.userId);
            expect(service.checkRoomExists(room)).toBe(false);
        });
    });

    describe('addMap', () => {
        it('should add a map to an existing room', () => {
            const room = 'room1';
            const map = 'map1';
            service.addRoom(room);
            service.addMap(room, map);
            expect(service.getRoomMap(room)).toBe(map);
        });

        it('should do nothing if the room does not exist', () => {
            const room = 'room1';
            const map = 'map1';
            service.addMap(room, map);
            expect(service.getRoomMap(room)).toBe('');
        });
    });

    describe('getPlayersCharacters', () => {
        it('should return the character IDs of players in the room', () => {
            const room = 'room1';
            service.addRoom(room);
            const player1: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            const player2: PlayerInfo = {
                userId: '2',
                id: CharacterType.Character2,
                name: 'alex',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player1);
            service.addUserToRoom(room, player2);
            const characterIds = service.getPlayersCharacters(room);
            expect(characterIds).toEqual(['c1', 'c2']);
        });

        it('should return an empty array if the room does not exist', () => {
            const room = 'room1';
            const characterIds = service.getPlayersCharacters(room);
            expect(characterIds).toEqual([]);
        });
    });

    describe('getRoomMap', () => {
        it('should return the map of the room', () => {
            const room = 'room1';
            const map = 'map1';
            service.addRoom(room);
            service.addMap(room, map);
            const roomMap = service.getRoomMap(room);
            expect(roomMap).toBe(map);
        });

        it('should return an empty string if the room does not exist', () => {
            const room = 'room1';
            const roomMap = service.getRoomMap(room);
            expect(roomMap).toBe('');
        });
    });

    describe('linkSocketToToken', () => {
        it('should link a socket ID to a token', () => {
            const socketId = 'socket1';
            const token = 'token1';
            service.linkSocketToToken(socketId, token);
            const retrievedToken = service.getTokenForSocket(socketId);
            expect(retrievedToken).toBe(token);
        });
    });

    describe('getTokenForSocket', () => {
        it('should return the token for a given socket ID', () => {
            const socketId = 'socket1';
            const token = 'token1';
            service.linkSocketToToken(socketId, token);
            const retrievedToken = service.getTokenForSocket(socketId);
            expect(retrievedToken).toBe(token);
        });

        it('should return undefined if the socket ID does not exist', () => {
            const socketId = 'socket1';
            const retrievedToken = service.getTokenForSocket(socketId);
            expect(retrievedToken).toBeUndefined();
        });
    });

    describe('removeCharacterFromRoom', () => {
        it('should return the character IDs of players in the room', () => {
            const room = 'room1';
            service.addRoom(room);
            const player1: PlayerInfo = {
                userId: '1',
                id: CharacterType.Character1,
                name: 'seb',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            const player2: PlayerInfo = {
                userId: '2',
                id: CharacterType.Character2,
                name: 'alex',
                bonus: '',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player1);
            service.addUserToRoom(room, player2);
            const characterIds = service.getPlayersCharacters(room);
            expect(characterIds).toEqual(['c1', 'c2']);
        });

        it('should do nothing if the room does not exist', () => {
            const room = 'room1';
            const characterId = CharacterType.Character1;
            const previousSelected = CharacterType.Character2;
            service.removeCharacterFromRoom(room, characterId, previousSelected);
            const selectedCharacters = service.getSelectedCharacters(room);
            expect(selectedCharacters).toEqual([]);
        });

        it('should add previousSelected to availableCharacters if previousSelected is true', () => {
            const room = 'room1';
            const characterId = CharacterType.Character1;
            const previousSelected = CharacterType.Character2;

            service.addRoom(room);
            service.removeCharacterFromRoom(room, characterId, previousSelected);

            const roomData = (service as any)._rooms.get(room);
            expect(roomData.availableCharacters).toContain(previousSelected);
        });
    });

    describe('getSelectedCharacters', () => {
        it('should return the selected characters in the room', () => {
            const room = 'room1';
            const characterId = CharacterType.Character1;
            service.addRoom(room);
            service.removeCharacterFromRoom(room, characterId, null);
            const selectedCharacters = service.getSelectedCharacters(room);
            expect(selectedCharacters).toContain(characterId);
        });

        it('should return an empty array if the room does not exist', () => {
            const room = 'room1';
            const selectedCharacters = service.getSelectedCharacters(room);
            expect(selectedCharacters).toEqual([]);
        });
    });

    describe('getActiveRooms', () => {
        it('should return a list of active room names', () => {
            const room1 = 'room1';
            const room2 = 'room2';
            const room3 = 'room3';

            service.addRoom(room1);
            service.addRoom(room2);
            service.addRoom(room3);

            const activeRooms = service.getActiveRooms();
            expect(activeRooms).toEqual([room1, room2, room3]);
        });

        it('should return an empty array if no rooms exist', () => {
            const activeRooms = service.getActiveRooms();
            expect(activeRooms).toEqual([]);
        });
    });

    describe('findRoomByUser', () => {
        it('should return undefined if the user is not in any room', () => {
            const userId = 'nonexistent-user';
            const result = (service as any).findRoomByUser(userId);
            expect(result).toBeUndefined();
        });
    });

    describe('checkRoomEmpty', () => {
        it('should return early if the room does not exist', () => {
            const room = 'nonexistent-room';
            const result = (service as any).checkRoomEmpty(room);
            expect(result).toBeUndefined();
        });
    });

    describe('addAi', () => {
        it('should add an AI to an existing room', () => {
            const room = 'room1';
            const type = 'easy';
            service.addRoom(room);

            const firstRandomValue = 0.3;
            const secondRandomValue = 0.7;
            const thirdRandomValue = 0.2;
            jest.spyOn(Math, 'random')
                .mockReturnValueOnce(firstRandomValue)
                .mockReturnValueOnce(secondRandomValue)
                .mockReturnValueOnce(thirdRandomValue);

            service.addAi(room, type);
            const roomUsers = service.getRoomUsers(room);
            expect(roomUsers.length).toBe(1);
            expect(roomUsers[0].userId).toContain('AI-easy');
            expect(roomUsers[0].dice).toBe(DiceChoice.SixDefence);
            expect(roomUsers[0].bonus).toBe('vie');
            expect(roomUsers[0].admin).toBe(false);

            jest.restoreAllMocks();
        });

        it('should not add an AI if the room does not exist', () => {
            const room = 'nonexistent-room';
            const type = 'easy';
            service.addAi(room, type);

            expect(service.checkRoomExists(room)).toBe(false);
        });

        it('should not add an AI if there are no available characters', () => {
            const room = 'room1';
            const type = 'easy';
            service.addRoom(room);

            const roomData = (service as any)._rooms.get(room);
            roomData.availableCharacters = [];
            service.addAi(room, type);

            const roomUsers = service.getRoomUsers(room);
            expect(roomUsers.length).toBe(0);
        });

        it('should assign a unique ID if AI name already exists', () => {
            const room = 'room1';
            const type = 'easy';
            service.addRoom(room);

            const checkDuplicateSpy = jest.spyOn(service, 'checkDuplicateName').mockReturnValueOnce('AI-easy-1').mockReturnValueOnce('AI-easy-2');

            service.addAi(room, type);
            service.addAi(room, type);

            expect(checkDuplicateSpy).toHaveBeenCalledWith('AI-easy', room);
            const roomUsers = service.getRoomUsers(room);
            expect(roomUsers.length).toBe(2);
            expect(roomUsers[0].userId).not.toBe(roomUsers[1].userId);

            jest.restoreAllMocks();
        });

        it('should filter out NoCharacter type from available characters', () => {
            const room = 'room1';
            const type = 'easy';
            service.addRoom(room);

            const roomData = (service as any)._rooms.get(room);
            roomData.availableCharacters = [CharacterType.NoCharacter, CharacterType.Character1];

            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValueOnce(randomValue).mockReturnValueOnce(randomValue).mockReturnValueOnce(0);

            service.addAi(room, type);
            const roomUsers = service.getRoomUsers(room);
            expect(roomUsers.length).toBe(1);
            expect(roomUsers[0].id).toBe(CharacterType.Character1);
            expect(roomUsers[0].id).not.toBe(CharacterType.NoCharacter);

            jest.restoreAllMocks();
        });

        it('should remove the selected character from available characters', () => {
            const room = 'room1';
            const type = 'easy';
            service.addRoom(room);

            const removeCharSpy = jest.spyOn(service, 'removeCharacterFromRoom');
            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValueOnce(randomValue).mockReturnValueOnce(randomValue).mockReturnValueOnce(0);

            service.addAi(room, type);
            const roomUsers = service.getRoomUsers(room);
            const selectedCharacterId = roomUsers[0].id;
            expect(removeCharSpy).toHaveBeenCalledWith(room, selectedCharacterId, undefined);

            const roomData = (service as any)._rooms.get(room);
            expect(roomData.availableCharacters).not.toContain(selectedCharacterId);

            jest.restoreAllMocks();
        });
    });

    describe('removeAi', () => {
        it('should remove an AI from an existing room', () => {
            const room = 'room1';
            service.addRoom(room);

            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValue(randomValue);
            service.addAi(room, 'easy');
            const aiUserId = service.getRoomUsers(room)[0].userId;
            const aiCharId = service.getRoomUsers(room)[0].id;

            jest.spyOn(service as any, 'checkRoomEmpty').mockImplementation(() => undefined);

            service.removeAi(room, aiUserId);
            const roomUsers = service.getRoomUsers(room);
            expect(roomUsers.length).toBe(0);
            const roomData = (service as any)._rooms.get(room);
            expect(roomData.availableCharacters).toContain(aiCharId);

            jest.restoreAllMocks();
        });

        it('should not do anything if the room does not exist', () => {
            const room = 'nonexistent-room';
            const userId = 'AI-easy';

            expect(() => service.removeAi(room, userId)).not.toThrow();
        });

        it('should not do anything if the AI does not exist in the room', () => {
            const room = 'room1';
            service.addRoom(room);
            const nonExistentUserId = 'nonexistent-ai';

            service.removeAi(room, nonExistentUserId);
            expect(service.checkRoomExists(room)).toBe(true);
        });

        it("should make the AI's character available again", () => {
            const room = 'room1';
            service.addRoom(room);

            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValue(randomValue);
            service.addAi(room, 'easy');
            const aiUserId = service.getRoomUsers(room)[0].userId;
            const aiCharId = service.getRoomUsers(room)[0].id;

            const roomDataBefore = (service as any)._rooms.get(room);
            expect(roomDataBefore.availableCharacters).not.toContain(aiCharId);
            jest.spyOn(service as any, 'checkRoomEmpty').mockImplementation(() => undefined);
            service.removeAi(room, aiUserId);

            const roomDataAfter = (service as any)._rooms.get(room);
            expect(roomDataAfter.availableCharacters).toContain(aiCharId);

            jest.restoreAllMocks();
        });

        it('should remove the room if it becomes empty after removing the AI', () => {
            const room = 'room1';
            service.addRoom(room);

            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValue(randomValue);
            service.addAi(room, 'easy');
            const aiUserId = service.getRoomUsers(room)[0].userId;

            const checkRoomEmptySpy = jest.spyOn(service as any, 'checkRoomEmpty');

            service.removeAi(room, aiUserId);
            expect(checkRoomEmptySpy).toHaveBeenCalledWith(room);
            expect(service.checkRoomExists(room)).toBe(false);

            jest.restoreAllMocks();
        });

        it('should not remove the room if other users remain after removing the AI', () => {
            const room = 'room1';
            service.addRoom(room);

            const randomValue = 0.3;
            jest.spyOn(Math, 'random').mockReturnValue(randomValue);
            service.addAi(room, 'easy');
            const aiUserId = service.getRoomUsers(room)[0].userId;

            const player: PlayerInfo = {
                userId: 'human1',
                id: CharacterType.Character2,
                name: 'Human',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: false,
            };
            service.addUserToRoom(room, player);

            service.removeAi(room, aiUserId);

            expect(service.checkRoomExists(room)).toBe(true);
            expect(service.getRoomUsers(room).length).toBe(1);
            expect(service.getRoomUsers(room)[0].userId).toBe('human1');

            jest.restoreAllMocks();
        });
    });
});
