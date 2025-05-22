import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { ChatRoomService } from '@app/services/chat-room/chat-room.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { GameService } from '@app/services/game/game.service';
import { CharacterType } from '@common/character-type';
import { GameEvents } from '@common/game-events';
import { PlayerInfo } from '@common/player-info';
import { QuitDataToServer } from '@common/quit-data-server';
import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'game', cors: true })
@Injectable()
export class GameRoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer() server: Server;

    constructor(
        private readonly _logger: Logger,
        private readonly _gameRoomService: GameRoomService,
        private readonly _gameService: GameService,
        private readonly _chatRoomService: ChatRoomService,
    ) {}

    @SubscribeMessage(GameEvents.CreateRoom)
    createRoom(socket: Socket, payload: { gameId: string; player: PlayerInfo; map: string; token?: string }): void {
        const roomName = GameRoomService.getGameRoomName(payload.gameId);

        if (!payload.player || !payload.player.userId) {
            return;
        }

        payload.player.userId = socket.id;

        socket.data.gameId = payload.gameId;
        socket.data.player = payload.player;
        socket.data.player.admin = true;

        socket.join(roomName);
        this._logger.log(`User ${payload.token} created room ${roomName}`);
        this._gameRoomService.addUserToRoom(payload.gameId, payload.player);
        this._gameRoomService.addMap(payload.gameId, payload.map);
        this._chatRoomService.createChatRoom(payload.gameId);

        socket.emit(GameEvents.RoomCreated, { room: roomName });
        socket.emit(GameEvents.PlayerList, this._gameRoomService.getRoomUsers(payload.gameId));
    }

    @SubscribeMessage(GameEvents.JoinRoom)
    joinRoom(socket: Socket, payload: { gameId: string; player: PlayerInfo; token?: string }): void {
        const roomName = GameRoomService.getGameRoomName(payload.gameId);
        const activeRooms = this._gameRoomService.getActiveRooms();

        if (activeRooms.includes(payload.gameId)) {
            socket.join(roomName);
            this._logger.log(`User ${socket.id} joined room ${roomName}`);

            payload.player.name = this._gameRoomService.checkDuplicateName(payload.player.name, payload.gameId);

            socket.emit(GameEvents.ConfirmName, payload.player.name);

            socket.data.gameId = payload.gameId;
            payload.player.userId = socket.id;
            socket.data.player = payload.player;

            this._gameRoomService.addUserToRoom(payload.gameId, payload.player);
            const players = this._gameRoomService.getRoomUsers(payload.gameId);
            this.server.to(roomName).emit(GameEvents.PlayerList, players);
        } else {
            socket.emit(GameEvents.Error, 'Room does not exist.');
        }
    }

    @SubscribeMessage(GameEvents.JoinCreatingRoom)
    joinCreatingRoom(socket: Socket, payload: { gameId: string }): void {
        const roomName = GameRoomService.getCreationRoomName(payload.gameId);
        socket.join(roomName);
        this._logger.log(`Socket ${socket.id} joined creating room ${roomName}`);
        const selectedCharacters = this._gameRoomService.getSelectedCharacters(payload.gameId);
        const players = this._gameRoomService.getPlayersCharacters(payload.gameId);

        this.server.to(roomName).emit(GameEvents.CharacterSelect, selectedCharacters.concat(players));
    }

    @SubscribeMessage(GameEvents.CharacterSelect)
    characterSelect(socket: Socket, payload: { gameId: string; characterId: CharacterType; previousSelected: CharacterType }): void {
        socket.data.selection = payload;
        this._gameRoomService.removeCharacterFromRoom(payload.gameId, payload.characterId, payload.previousSelected);
        const selectedCharacters = this._gameRoomService.getSelectedCharacters(payload.gameId);
        this.server.to(GameRoomService.getCreationRoomName(payload.gameId)).emit(GameEvents.CharacterSelect, selectedCharacters);
    }

    @SubscribeMessage(GameEvents.TogglePublic)
    togglePublic(_: Socket, payload: { gameId: string }): void {
        this._gameRoomService.toggleLockRoom(payload.gameId);
    }

    @SubscribeMessage(GameEvents.MessageSent)
    sendMessage(socket: Socket, payload: { gameId: string; message: string }): void {
        const currentDate = new Date();

        let currentTime = currentDate.toTimeString();

        currentTime = currentTime.split(' ')[0];
        const formattedMessage = `[${currentTime}]-${socket.data.player.name}: ${payload.message}`;

        this._chatRoomService.addMessage(payload.gameId, formattedMessage);
        const chatRoomMessages: string[] = this._chatRoomService.getChatHistory(payload.gameId);

        this.server.to(GameRoomService.getGameRoomName(payload.gameId)).emit(GameEvents.GetChat, chatRoomMessages);
    }

    @SubscribeMessage(GameEvents.GetChat)
    getChatHistory(_: Socket, payload: { gameId: string }): void {
        const chatRoomHistory: string[] = this._chatRoomService.getChatHistory(payload.gameId);
        this.server.to(GameRoomService.getGameRoomName(payload.gameId)).emit(GameEvents.GetChat, chatRoomHistory);
    }

    @SubscribeMessage(GameEvents.StartGame)
    async startGame(socket: Socket, payload: { gameId: string }): Promise<void> {
        const roomName: string = GameRoomService.getGameRoomName(payload.gameId);
        const playerInfos: PlayerInfo[] = this._gameRoomService.getRoomUsers(payload.gameId);
        const gameMapId: string = this._gameRoomService.getRoomMap(payload.gameId);
        const gameInfo: GameData = await this._gameService.createGame(payload.gameId, playerInfos, gameMapId, socket.data.player.id);
        socket.data.isPlaying = true;
        this.server.to(roomName).emit(GameEvents.StartGame, gameInfo);
        this._logger.log(`Game started in room ${roomName}`);
        this._gameService.startGame(payload.gameId);
    }

    @SubscribeMessage(GameEvents.RoomLocked)
    roomLocked(socket: Socket, payload: { gameId: string }): void {
        this.server.to(socket.id).emit(GameEvents.RoomLocked, this._gameRoomService.checkLock(payload.gameId));
    }

    @SubscribeMessage(GameEvents.KickUser)
    kickUser(socket: Socket, payload: { gameId: string; userId: string }): void {
        if (!socket.data?.player?.admin) return;
        if (payload.userId.startsWith('AI')) {
            this._gameRoomService.removeAi(payload.gameId, payload.userId);
        }
        this.server.to(payload.userId).emit(GameEvents.KickUser);
        this.server
            .to(GameRoomService.getGameRoomName(payload.gameId))
            .emit(GameEvents.PlayerList, this._gameRoomService.getRoomUsers(payload.gameId));
        this.server
            .to(GameRoomService.getCreationRoomName(payload.gameId))
            .emit(GameEvents.CharacterSelect, this._gameRoomService.getSelectedCharacters(payload.gameId));
    }

    @SubscribeMessage(GameEvents.PlayerQuit)
    quitGame(socket: Socket, payload: QuitDataToServer): void {
        if (socket.data.isPlaying) {
            this._gameService.quitGame(payload.gameId, payload.playerName, payload.playerPosition);
        }
        this.handleDisconnect(socket);
    }

    @SubscribeMessage(GameEvents.AddAi)
    addAi(socket: Socket, payload: { gameId: string; type: string }) {
        if (!socket.data.player.admin) return;
        const roomName = GameRoomService.getGameRoomName(payload.gameId);
        if (this._gameRoomService.checkLock(payload.gameId)) return;
        this._gameRoomService.addAi(payload.gameId, payload.type);
        const players = this._gameRoomService.getRoomUsers(payload.gameId);
        this.server.to(roomName).emit(GameEvents.PlayerList, players);
        this.server
            .to(GameRoomService.getCreationRoomName(payload.gameId))
            .emit(GameEvents.CharacterSelect, this._gameRoomService.getSelectedCharacters(payload.gameId));
    }

    afterInit() {
        this._logger.log('Gateway game initialized');
    }

    handleConnection(socket: Socket) {
        this._logger.log(`New connection with socket id: ${socket.id}`);
    }

    handleDisconnect(socket: Socket) {
        if (socket.data.player && socket.data.player.admin && !socket.data.isPlaying) {
            this._gameRoomService.removeRoom(socket.data.gameId);
            socket.broadcast.to(GameRoomService.getGameRoomName(socket.data.gameId)).emit(GameEvents.RoomDestroyed);
            this.server.to(GameRoomService.getCreationRoomName(socket.data.gameId)).emit(GameEvents.RoomDestroyed);
            return;
        }

        const room = this._gameRoomService.removeUserFromRoom(socket.id);
        if (room) {
            this.addCharacterToCreationRoom(socket.data.gameId);
            delete socket.data.gameId;
            delete socket.data.player;
            delete socket.data.selection;
        } else {
            if (Object.keys(socket.data).length === 0 || socket.data.selection === undefined) return;
            this._gameRoomService.removeCharacterFromRoom(socket.data.selection.gameId, undefined, socket.data.selection.characterId);
            const selectedCharacters = this._gameRoomService.getSelectedCharacters(socket.data.selection.gameId);
            const players = this._gameRoomService.getPlayersCharacters(socket.data.selection.gameId);
            this.server
                .to(GameRoomService.getCreationRoomName(socket.data.selection.gameId))
                .emit(GameEvents.CharacterSelect, selectedCharacters.concat(players.concat(socket.data.selection.characterId)));
        }
    }

    addCharacterToCreationRoom(gameId: string): void {
        const selectedCharacters = this._gameRoomService.getSelectedCharacters(gameId);
        const players = this._gameRoomService.getPlayersCharacters(gameId);
        this.server.to(GameRoomService.getCreationRoomName(gameId)).emit(GameEvents.CharacterSelect, selectedCharacters.concat(players));
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.PlayerList, this._gameRoomService.getRoomUsers(gameId));
    }

    sendCombatMessage(gameId: string, playerId: string, message: string, color: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.CombatMessage + playerId, { color, message });
    }

    sendCombatOverMessage(gameId: string, playerId: string, message: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.CombatOverMessage + playerId, message);
    }

    sendCombatOverLog(gameId: string, log: string) {
        this.server.to(GameRoomService.getGameRoomName(gameId)).emit(GameEvents.CombatOverLog, log);
    }
}
