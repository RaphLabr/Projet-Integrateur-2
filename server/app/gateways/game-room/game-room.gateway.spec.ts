// We need to disable this lint because we need to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
// Gateway has a lot of functions, testing file can be longer.
/* eslint-disable max-lines */
// disabled max line in order to keep all the tests in the same place for one file
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { ChatRoomService } from '@app/services/chat-room/chat-room.service';
import { CombatService } from '@app/services/combat/combat.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { MapService } from '@app/services/map/map.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { GameEvents } from '@common/game-events';
import { PlayerInfo } from '@common/player-info';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SinonStubbedInstance, createStubInstance, match, stub } from 'sinon';
import { BroadcastOperator, Server, Socket } from 'socket.io';
import { GameRoomGateway } from './game-room.gateway';

describe('GameRoomGateway', () => {
    let gateway: GameRoomGateway;
    let logger: SinonStubbedInstance<Logger>;
    let mapServiceStub: SinonStubbedInstance<MapService>;
    let combatServiceStub: SinonStubbedInstance<CombatService>;
    let gameRoomServiceStub: SinonStubbedInstance<GameRoomService>;
    let gameServiceStub: SinonStubbedInstance<GameService>;
    let timerServiceStub: SinonStubbedInstance<GameTimerService>;
    let socket: SinonStubbedInstance<Socket>;
    let server: SinonStubbedInstance<Server>;
    let chatRoomServiceStub: SinonStubbedInstance<ChatRoomService>;

    beforeEach(async () => {
        logger = createStubInstance(Logger);
        mapServiceStub = createStubInstance(MapService);
        combatServiceStub = createStubInstance(CombatService);
        gameRoomServiceStub = createStubInstance(GameRoomService);
        gameServiceStub = createStubInstance(GameService);
        timerServiceStub = createStubInstance(GameTimerService);
        socket = createStubInstance<Socket>(Socket);
        server = createStubInstance<Server>(Server);
        chatRoomServiceStub = createStubInstance(ChatRoomService);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameRoomGateway,
                { provide: MapService, useValue: mapServiceStub },
                { provide: CombatService, useValue: combatServiceStub },
                { provide: Logger, useValue: logger },
                { provide: GameRoomService, useValue: gameRoomServiceStub },
                { provide: GameService, useValue: gameServiceStub },
                { provide: GameTimerService, useValue: timerServiceStub },
                { provide: ChatRoomService, useValue: chatRoomServiceStub },
            ],
        }).compile();

        gateway = module.get<GameRoomGateway>(GameRoomGateway);
        // We want to assign a value to the private field
        // eslint-disable-next-line dot-notation
        gateway['server'] = server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('createRoom', () => {
        it('should create a room and emit events', () => {
            const payload = {
                gameId: '1234',
                player: {
                    userId: '1',
                    id: CharacterType.Character1,
                    name: 'Test Character',
                    bonus: 'Test Bonus',
                    dice: DiceChoice.FourDefence,
                    admin: false,
                } as PlayerInfo,
                map: 'testMap',
                token: 'testToken',
            };
            socket.data = { payload };
            const roomName = `game-${payload.gameId}`;

            gateway.createRoom(socket, payload);

            expect(socket.join.calledOnce).toBeTruthy();
            expect(socket.emit.calledWith(GameEvents.RoomCreated, { room: roomName })).toBeTruthy();
            expect(socket.emit.calledWith(GameEvents.PlayerList, match.any)).toBeTruthy();
            expect(logger.log.calledOnce).toBeTruthy();
            expect(gameRoomServiceStub.addUserToRoom.calledWith(payload.gameId, match.any)).toBeTruthy();
            expect(gameRoomServiceStub.addMap.calledWith(payload.gameId, payload.map)).toBeTruthy();
        });

        it('should return early if player or player.userId is missing', () => {
            const payloadNoPlayer = {
                gameId: '1234',
                map: 'testMap',
                token: 'testToken',
            };

            gateway.createRoom(socket, payloadNoPlayer as any);

            expect(socket.join.called).toBeFalsy();
            expect(socket.emit.called).toBeFalsy();
            expect(gameRoomServiceStub.addUserToRoom.called).toBeFalsy();

            const payloadNoUserId = {
                gameId: '1234',
                player: {
                    id: CharacterType.Character1,
                    name: 'Test Character',
                    bonus: 'Test Bonus',
                    dice: DiceChoice.FourDefence,
                    admin: false,
                } as PlayerInfo,
                map: 'testMap',
                token: 'testToken',
            };

            gateway.createRoom(socket, payloadNoUserId);

            expect(socket.join.called).toBeFalsy();
            expect(socket.emit.called).toBeFalsy();
            expect(gameRoomServiceStub.addUserToRoom.called).toBeFalsy();
        });
    });

    describe('joinRoom', () => {
        it('should join a room and emit events when room exists', () => {
            const payload = {
                gameId: '1234',
                player: {
                    userId: '1',
                    id: CharacterType.Character1,
                    name: 'Test Character',
                    bonus: 'Test Bonus',
                    dice: DiceChoice.FourDefence,
                    admin: false,
                } as PlayerInfo,
                token: 'testToken',
            };
            socket.data = { payload };
            const roomName = `game-${payload.gameId}`;

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gameRoomServiceStub.getActiveRooms.returns([payload.gameId]);
            gameRoomServiceStub.getRoomUsers.returns([payload.player]);
            gameRoomServiceStub.checkDuplicateName.returns(payload.player.name);

            gateway.joinRoom(socket, payload);

            expect(socket.join.calledWith(roomName)).toBeTruthy();
            expect(logger.log.calledOnce).toBeTruthy();
            expect(gameRoomServiceStub.addUserToRoom.calledWith(payload.gameId, match.any)).toBeTruthy();
            expect(server.to.calledWith(roomName)).toBeTruthy();
        });

        it('should emit error when room does not exist', () => {
            const payload = {
                gameId: '1234',
                player: {
                    userId: '1',
                    id: CharacterType.Character1,
                    name: 'Test Character',
                    bonus: 'Test Bonus',
                    dice: DiceChoice.FourDefence,
                    admin: false,
                } as PlayerInfo,
                token: 'testToken',
            };
            socket.data = { payload };

            gameRoomServiceStub.getActiveRooms.returns([]);

            gateway.joinRoom(socket, payload);

            expect(socket.join.called).toBeFalsy();
            expect(socket.emit.calledWith(GameEvents.Error, 'Room does not exist.')).toBeTruthy();
        });
    });

    describe('joinCreatingRoom', () => {
        it('should join a creating room and emit events', () => {
            const payload = {
                gameId: '1234',
            };
            const roomName = `creating-${payload.gameId}`;

            gameRoomServiceStub.getSelectedCharacters.returns([CharacterType.Character1]);
            gameRoomServiceStub.getPlayersCharacters.returns([CharacterType.Character2]);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.joinCreatingRoom(socket, payload);

            expect(socket.join.calledWith(roomName)).toBeTruthy();
            expect(logger.log.calledOnce).toBeTruthy();
            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CharacterSelect, match.any)).toBeTruthy();
        });
    });

    describe('characterSelect', () => {
        it('should handle character selection and emit events', () => {
            const payload = {
                gameId: '1234',
                characterId: CharacterType.Character1,
                previousSelected: CharacterType.Character2,
            };
            socket.data = { payload };
            const roomName = `creating-${payload.gameId}`;

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gameRoomServiceStub.getSelectedCharacters.returns([payload.characterId]);

            gateway.characterSelect(socket, payload);

            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CharacterSelect, [payload.characterId])).toBeTruthy();
            expect(
                gameRoomServiceStub.removeCharacterFromRoom.calledWith(payload.gameId, payload.characterId, payload.previousSelected),
            ).toBeTruthy();
        });
    });

    describe('togglePublic', () => {
        it('should toggle room lock state', () => {
            const payload = {
                gameId: '1234',
            };

            gateway.togglePublic(socket, payload);

            expect(gameRoomServiceStub.toggleLockRoom.calledWith(payload.gameId)).toBeTruthy();
        });
    });

    describe('roomLocked', () => {
        it('should check room lock status and emit event', () => {
            const payload = {
                gameId: '1234',
            };
            socket.data = { payload };

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gameRoomServiceStub.checkLock.returns(true);

            gateway.roomLocked(socket, payload);

            expect(gameRoomServiceStub.checkLock.calledWith(payload.gameId)).toBeTruthy();
            expect(server.to.calledWith(socket.id)).toBeTruthy();
        });
    });

    describe('kickUser', () => {
        it('should not emit kick event if player is not admin', () => {
            const payload = {
                gameId: '1234',
                userId: 'user-to-kick',
            };
            const player = {
                admin: false,
            };
            socket.data = { payload, player };

            gateway.kickUser(socket, payload);

            expect(server.to.called).toBeFalsy();
        });

        it('should emit kick event if player is admin', () => {
            const payload = {
                gameId: '1234',
                userId: 'user-to-kick',
            };
            const player = {
                admin: true,
            };
            socket.data = { payload, player };

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.kickUser(socket, payload);

            expect(server.to.calledWith(payload.userId)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.KickUser)).toBeTruthy();
        });

        it('should return early if socket.data is empty', () => {
            const payload = {
                gameId: '1234',
                userId: 'user-to-kick',
            };
            socket.data = {};

            gateway.kickUser(socket, payload);

            expect(server.to.called).toBeFalsy();
        });

        it('should return early if socket.data.player is undefined', () => {
            const payload = {
                gameId: '1234',
                userId: 'user-to-kick',
            };
            socket.data = { payload };

            gateway.kickUser(socket, payload);

            expect(server.to.called).toBeFalsy();
        });

        it('should remove AI when userId starts with AI', () => {
            const payload = {
                gameId: '1234',
                userId: 'AI_defensive_123',
            };
            const player = {
                admin: true,
            };
            socket.data = { player };

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.kickUser(socket, payload);

            expect(gameRoomServiceStub.removeAi.calledWith(payload.gameId, payload.userId)).toBeTruthy();
            expect(server.to.calledWith(payload.userId)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.KickUser)).toBeTruthy();
            expect(server.to.calledWith(GameRoomService.getGameRoomName(payload.gameId))).toBeTruthy();
            expect(server.to.calledWith(GameRoomService.getCreationRoomName(payload.gameId))).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.PlayerList, match.any)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CharacterSelect, match.any)).toBeTruthy();
        });

        it('should not call removeAi for non-AI users', () => {
            const payload = {
                gameId: '1234',
                userId: 'normal_user_123',
            };
            const player = {
                admin: true,
            };
            socket.data = { player };

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.kickUser(socket, payload);

            expect(gameRoomServiceStub.removeAi.called).toBeFalsy();
            expect(server.to.calledWith(payload.userId)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.KickUser)).toBeTruthy();
        });

        it('should handle all cases where socket.data?.player?.admin is falsy', () => {
            const payload = {
                gameId: '1234',
                userId: 'user-to-kick',
            };

            socket.data = undefined;
            gateway.kickUser(socket, payload);
            expect(server.to.called).toBeFalsy();

            socket.data = {};
            gateway.kickUser(socket, payload);
            expect(server.to.called).toBeFalsy();

            socket.data = { player: { admin: false } };
            gateway.kickUser(socket, payload);
            expect(server.to.called).toBeFalsy();
            server.to.resetHistory();
        });
    });

    describe('afterInit', () => {
        it('should log gateway initialization', () => {
            gateway.afterInit();
            expect(logger.log.calledOnce).toBeTruthy();
        });
    });

    describe('handleConnection', () => {
        it('should log new connections', () => {
            gateway.handleConnection(socket);

            expect(logger.log.calledOnce).toBeTruthy();
        });
    });

    describe('handleDisconnect', () => {
        it('should remove room if admin disconnects', () => {
            const payload = {
                gameId: '1234',
                playerName: 'Player1',
            };

            socket.data = { payload, player: { admin: true } };

            const broadcastToStub = stub();
            stub(socket, 'broadcast').value({
                to: () => ({
                    emit: broadcastToStub,
                }),
            });

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.handleDisconnect(socket);

            expect(gameRoomServiceStub.removeRoom.calledWith('1234'));
        });

        it('should remove user from room if non-admin disconnects', () => {
            const payload = {
                gameId: '1234',
                playerName: 'Player1',
            };
            socket.data = { payload };

            gameRoomServiceStub.removeUserFromRoom.returns('1234');

            const spy = stub(gateway, 'addCharacterToCreationRoom');

            gateway.handleDisconnect(socket);

            expect(gameRoomServiceStub.removeUserFromRoom.calledWith(socket.id)).toBeTruthy();
            expect(spy.calledWith('1234'));

            spy.restore();
        });

        it('should handle character selection removal if user was selecting', () => {
            socket.data = { selection: { gameId: '1234', characterId: CharacterType.Character1 } };

            gameRoomServiceStub.removeUserFromRoom.returns(null);
            gameRoomServiceStub.getSelectedCharacters.returns([CharacterType.Character2]);
            gameRoomServiceStub.getPlayersCharacters.returns([CharacterType.Character3]);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.handleDisconnect(socket);

            expect(gameRoomServiceStub.removeCharacterFromRoom.calledWith('1234', undefined, CharacterType.Character1)).toBeTruthy();
            expect(server.to.calledWith('creating-1234')).toBeTruthy();

            const emitCall = emitStub.getCall(0);
            expect(emitCall).toBeTruthy();
            expect(emitCall.args[0]).toBe(GameEvents.CharacterSelect);

            const emittedCharacters = emitCall.args[1];
            expect(emittedCharacters).toContain(CharacterType.Character2);
            expect(emittedCharacters).toContain(CharacterType.Character3);
            expect(emittedCharacters).toContain(CharacterType.Character1);
        });

        it('should return early if socket.data is empty', () => {
            socket.data = {};

            gameRoomServiceStub.removeCharacterFromRoom.resetHistory();
            gameRoomServiceStub.getSelectedCharacters.resetHistory();
            gameRoomServiceStub.getPlayersCharacters.resetHistory();

            gateway.handleDisconnect(socket);

            expect(gameRoomServiceStub.removeCharacterFromRoom.called).toBeFalsy();
            expect(gameRoomServiceStub.getSelectedCharacters.called).toBeFalsy();
            expect(gameRoomServiceStub.getPlayersCharacters.called).toBeFalsy();
        });

        it('should return early if socket.data.selection is undefined', () => {
            socket.data = {
                gameId: '123',
            };

            gameRoomServiceStub.removeUserFromRoom.returns(null);

            gameRoomServiceStub.removeCharacterFromRoom.resetHistory();
            gameRoomServiceStub.getSelectedCharacters.resetHistory();
            gameRoomServiceStub.getPlayersCharacters.resetHistory();

            gateway.handleDisconnect(socket);

            expect(gameRoomServiceStub.removeCharacterFromRoom.called).toBeFalsy();
            expect(gameRoomServiceStub.getSelectedCharacters.called).toBeFalsy();
            expect(gameRoomServiceStub.getPlayersCharacters.called).toBeFalsy();
        });
    });

    describe('combat messages related methods', () => {
        it('sendCombatMessage should send a combat message', () => {
            const gameId = '1234';
            const playerId = 'player1';
            const message = 'Combat message';
            const color = 'red';
            const roomName = `game-${gameId}`;

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.sendCombatMessage(gameId, playerId, message, color);

            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CombatMessage + playerId, { color, message })).toBeTruthy();
        });

        it('sendCombatOverMessage should send a combat over message', () => {
            const gameId = '1234';
            const playerId = 'player1';
            const message = 'Combat over message';
            const roomName = `game-${gameId}`;

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.sendCombatOverMessage(gameId, playerId, message);

            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CombatOverMessage + playerId, message)).toBeTruthy();
        });
    });

    describe('addCharacterToCreationRoom', () => {
        it('should emit character selection and player list events', () => {
            const gameId = '1234';
            const creatingRoomName = `creating-${gameId}`;
            const defaultRoomName = `game-${gameId}`;
            const selectedCharacters = [CharacterType.Character1];
            const playersCharacters = [CharacterType.Character2];
            const roomUsers = [{ userId: '1', name: 'Test Character' } as PlayerInfo];

            gameRoomServiceStub.getSelectedCharacters.returns(selectedCharacters);
            gameRoomServiceStub.getPlayersCharacters.returns(playersCharacters);
            gameRoomServiceStub.getRoomUsers.returns(roomUsers);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.addCharacterToCreationRoom(gameId);

            expect(gameRoomServiceStub.getSelectedCharacters.calledWith(gameId)).toBeTruthy();
            expect(gameRoomServiceStub.getPlayersCharacters.calledWith(gameId)).toBeTruthy();
            expect(server.to.calledWith(creatingRoomName)).toBeTruthy();
            expect(server.to.calledWith(defaultRoomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CharacterSelect, selectedCharacters.concat(playersCharacters))).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.PlayerList, roomUsers)).toBeTruthy();
        });
    });

    describe('sendMessage', () => {
        it('should format, store and broadcast messages', () => {
            const payload = {
                gameId: '1234',
                message: 'Hello everyone!',
            };
            const playerName = 'TestPlayer';
            socket.data = {
                player: { name: playerName },
            };
            const roomName = `game-${payload.gameId}`;
            const mockMessages = ['previous message', 'formatted message'];

            const originalDate = global.Date;
            const mockDate = {
                toTimeString: () => '12:34:56 GMT+0000',
            };
            global.Date = jest.fn(() => mockDate) as any;

            chatRoomServiceStub.getChatHistory.returns(mockMessages);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.sendMessage(socket, payload);

            const expectedFormattedMessage = `[12:34:56]-${playerName}: ${payload.message}`;
            expect(chatRoomServiceStub.addMessage.calledWith(payload.gameId, expectedFormattedMessage)).toBeTruthy();
            expect(chatRoomServiceStub.getChatHistory.calledWith(payload.gameId)).toBeTruthy();
            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.GetChat, mockMessages)).toBeTruthy();

            global.Date = originalDate;
        });
    });

    describe('getChatHistory', () => {
        it('should fetch and broadcast chat history', () => {
            const payload = {
                gameId: '1234',
            };
            const roomName = `game-${payload.gameId}`;
            const mockChatHistory = ['Message 1', 'Message 2', 'Message 3'];

            chatRoomServiceStub.getChatHistory.returns(mockChatHistory);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.getChatHistory(socket, payload);

            expect(chatRoomServiceStub.getChatHistory.calledWith(payload.gameId)).toBeTruthy();
            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.GetChat, mockChatHistory)).toBeTruthy();
        });
    });

    describe('addAi', () => {
        it('should not add AI if player is not admin', () => {
            const payload = {
                gameId: '1234',
                type: 'aggressive',
            };

            socket.data = {
                player: { admin: false },
            };

            gateway.addAi(socket, payload);

            expect(gameRoomServiceStub.addAi.called).toBeFalsy();
            expect(server.to.called).toBeFalsy();
        });

        it('should not add AI if room is locked', () => {
            const payload = {
                gameId: '1234',
                type: 'aggressive',
            };

            socket.data = {
                player: { admin: true },
            };

            gameRoomServiceStub.checkLock.returns(true);

            gateway.addAi(socket, payload);

            expect(gameRoomServiceStub.addAi.called).toBeFalsy();
        });

        it('should add AI and broadcast updates when conditions are met', () => {
            const payload = {
                gameId: '1234',
                type: 'defensive',
            };
            const roomName = `game-${payload.gameId}`;
            const creationRoomName = `creating-${payload.gameId}`;
            const mockPlayers = [{ name: 'Human Player' }, { name: 'AI Player' }] as PlayerInfo[];
            const mockSelectedCharacters = [CharacterType.Character1, CharacterType.Character3];

            socket.data = {
                player: { admin: true },
            };

            gameRoomServiceStub.checkLock.returns(false);
            gameRoomServiceStub.getRoomUsers.returns(mockPlayers);
            gameRoomServiceStub.getSelectedCharacters.returns(mockSelectedCharacters);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.addAi(socket, payload);

            expect(gameRoomServiceStub.addAi.calledWith(payload.gameId, payload.type)).toBeTruthy();
            expect(gameRoomServiceStub.getRoomUsers.calledWith(payload.gameId)).toBeTruthy();
            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(server.to.calledWith(creationRoomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.PlayerList, mockPlayers)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CharacterSelect, mockSelectedCharacters)).toBeTruthy();
        });
    });

    describe('sendCombatOverLog', () => {
        it('should emit combat over log to game room', () => {
            const gameId = '1234';
            const log = 'Player1 defeated Player2 in combat!';
            const roomName = `game-${gameId}`;

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.sendCombatOverLog(gameId, log);

            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.CombatOverLog, log)).toBeTruthy();
        });
    });

    describe('startGame', () => {
        it('should set up and start the game', async () => {
            const payload = {
                gameId: '1234',
            };
            const roomName = `game-${payload.gameId}`;
            const mockPlayerInfos = [
                {
                    userId: 'user1',
                    id: CharacterType.Character1,
                    name: 'Player 1',
                    dice: DiceChoice.FourDefence,
                },
                {
                    userId: 'user2',
                    id: CharacterType.Character2,
                    name: 'Player 2',
                    dice: DiceChoice.FourDefence,
                },
            ] as PlayerInfo[];
            const mockGameMapId = 'map1';
            const mockGameData = {} as GameData;

            socket.data = {
                player: { id: CharacterType.Character1 },
            };

            gameRoomServiceStub.getRoomUsers.returns(mockPlayerInfos);
            gameRoomServiceStub.getRoomMap.returns(mockGameMapId);
            gameServiceStub.createGame.resolves(mockGameData);

            const emitStub = stub();
            server.to.returns({
                emit: emitStub,
            } as unknown as BroadcastOperator<unknown, unknown>);

            await gateway.startGame(socket, payload);

            expect(gameRoomServiceStub.getRoomUsers.calledWith(payload.gameId)).toBeTruthy();
            expect(gameRoomServiceStub.getRoomMap.calledWith(payload.gameId)).toBeTruthy();
            expect(gameServiceStub.createGame.calledWith(payload.gameId, mockPlayerInfos, mockGameMapId, socket.data.player.id)).toBeTruthy();
            expect(socket.data.isPlaying).toBe(true);
            expect(server.to.calledWith(roomName)).toBeTruthy();
            expect(emitStub.calledWith(GameEvents.StartGame, mockGameData)).toBeTruthy();
            expect(gameServiceStub.startGame.calledWith(payload.gameId)).toBeTruthy();
            expect(logger.log.calledWith(`Game started in room ${roomName}`)).toBeTruthy();
        });
    });
});
