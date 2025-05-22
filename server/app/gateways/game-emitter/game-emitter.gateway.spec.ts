import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { CharacterType } from '@common/character-type';
import { ClientStatistics } from '@common/client-game-statistics';
import { CombatAttackPayload } from '@common/combat-attack-payload';
import { DoorUpdateData } from '@common/door-update-data';
import { GameEvents } from '@common/game-events';
import { GlobalStatistics } from '@common/global-statistics';
import { ItemDropDataToClient } from '@common/item-drop-data-client';
import { ItemLog } from '@common/item-log';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { MovementDataToClient } from '@common/movement-data-client';
import { QuitDataToClient } from '@common/quit-data-client';
import { StartCombatPayload } from '@common/start-combat-payload';
import { Teams } from '@common/teams';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';

describe('GameEmitterGateway', () => {
    let gateway: GameEmitterGateway;
    let serverMock: {
        to: jest.Mock;
    };

    const testGameId = 'game123';
    const testRoomName = 'room_game123';

    const emitMock = jest.fn();

    beforeEach(async () => {
        serverMock = {
            to: jest.fn().mockReturnValue({ emit: emitMock }),
        };

        jest.spyOn(GameRoomService, 'getGameRoomName').mockReturnValue(testRoomName);

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameEmitterGateway],
        }).compile();

        gateway = module.get<GameEmitterGateway>(GameEmitterGateway);
        gateway.server = serverMock as unknown as Server;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('should emit StartNotification with nextActivePlayerName', () => {
        const playerName = 'TestPlayer';

        gateway.emitStartNotification(testGameId, playerName);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.StartNotification, playerName);
    });

    it('should emit StartRound', () => {
        gateway.emitStartRound(testGameId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.StartRound);
    });

    it('should emit TimerUpdate with new timer value', () => {
        const timerValue = 30;

        gateway.emitTimerUpdate(testGameId, timerValue);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.TimerUpdate, timerValue);
    });

    it('should emit EndOfMovement', () => {
        gateway.emitEndOfMovement(testGameId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.EndOfMovement);
    });

    it('should emit MovePlayer with movement data', () => {
        const movement: MovementDataToClient = {
            to: { x: 1, y: 1 },
            from: { x: 0, y: 0 },
            cost: 1,
        };

        gateway.emitMovePlayer(testGameId, movement);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.MovePlayer, movement);
    });

    it('should emit StartCombat with combat payload', () => {
        const payload: StartCombatPayload = {
            playersInCombat: {
                initiator: {
                    id: CharacterType.Character1,
                    name: 'Attacker',
                    userId: 'user1',
                    health: 5,
                    maxHealth: 5,
                    attack: 4,
                    defense: 6,
                    speed: 2,
                    wins: 0,
                    startPosition: { x: 1, y: 1 },
                    dice: { attack: 4, defense: 6 },
                    items: [],
                    evadeAttempts: 0,
                    hasAbandoned: false,
                    team: Teams.NoTeam,
                    isTorchActive: false,
                    isBarrelActive: false,
                },
                target: {
                    id: CharacterType.Character2,
                    name: 'Defender',
                    userId: 'user2',
                    health: 3,
                    maxHealth: 3,
                    attack: 5,
                    defense: 2,
                    speed: 3,
                    wins: 0,
                    startPosition: { x: 2, y: 2 },
                    dice: { attack: 6, defense: 4 },
                    items: [],
                    evadeAttempts: 0,
                    hasAbandoned: false,
                    team: Teams.NoTeam,
                    isTorchActive: false,
                    isBarrelActive: false,
                },
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            },
            startingPlayerName: 'Attacker',
        };

        gateway.emitStartCombat(testGameId, payload);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.StartCombat, payload);
    });

    it('should emit CombatWinner with winner ID', () => {
        const winnerId = CharacterType.Character1;

        gateway.emitCombatWinner(testGameId, winnerId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.CombatWinner, winnerId);
    });

    it('should emit CombatAttack with attack payload', () => {
        const payload: CombatAttackPayload = {
            gameId: testGameId,
            playerName: 'Attacker',
            playerHealth: 3,
        };

        gateway.emitCombatAttack(payload);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.CombatAttack, payload);
    });

    it('should emit CombatOver', () => {
        gateway.emitCombatOver(testGameId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.CombatOver);
    });

    it('should emit FailedEvade with player name', () => {
        const playerName = 'TestPlayer';

        gateway.emitFailedEvade(testGameId, playerName);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.FailedEvade, playerName);
    });

    it('should emit ToggleDebug with debug state', () => {
        const debugState = true;

        gateway.emitToggleDebug(testGameId, debugState);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.ToggleDebug, debugState);
    });

    it('should emit PlayerQuit with quit data', () => {
        const quitData: QuitDataToClient = {
            playerName: 'Quitter',
            playerPosition: { x: 1, y: 1 },
            playerStartPosition: { x: 0, y: 0 },
        };

        gateway.emitPlayerQuit(testGameId, quitData);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.PlayerQuit, quitData);
    });

    it('should emit GameOverEarly', () => {
        gateway.emitGameOverEarly(testGameId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.RoomDestroyed);
    });

    it('should emit KickLastPlayer', () => {
        gateway.emitKickLastPlayer(testGameId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.KickUser);
    });

    it('should emit GameOver with client statistics', () => {
        const clientStatistics: ClientStatistics = {
            playerStatistics: [],
            globalStatistics: {} as GlobalStatistics,
            winner: 'Blue Team',
        };

        gateway.emitGameOver(testGameId, clientStatistics);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.GameOver, clientStatistics);
    });

    it('should emit DoorUpdate with door update data', () => {
        const player = {
            id: CharacterType.Character1,
            name: 'TestPlayer',
            userId: 'user123',
            health: 5,
            maxHealth: 5,
            attack: 4,
            defense: 6,
            speed: 3,
            wins: 0,
            startPosition: { x: 0, y: 0 },
            dice: { attack: 4, defense: 6 },
            items: [],
            evadeAttempts: 0,
            hasAbandoned: false,
            team: Teams.NoTeam,
            isTorchActive: false,
            isBarrelActive: false,
        };

        const doorUpdateData: DoorUpdateData = {
            doorCoordinates: { x: 3, y: 4 },
            newDoorType: MapTileType.OpenDoor,
            player,
        };

        gateway.emitDoorUpdate(testGameId, doorUpdateData);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.UpdateDoor, doorUpdateData);
    });

    it('should emit ItemPickUp with item and player ID', () => {
        const itemType = ItemType.Sword;
        const playerId = 'player123';

        gateway.emitItemPickUp(testGameId, itemType, playerId);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.ItemPickUp + playerId, itemType);
    });

    it('should emit ItemPickUpLog with item log data', () => {
        const itemLog: ItemLog = {
            id: CharacterType.Character1,
            playerName: 'TestPlayer',
            item: ItemType.Sword,
        };

        gateway.emitItemPickUpLog(testGameId, itemLog);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.ItemPickUpLog, itemLog);
    });

    it('should emit ItemDrop with item drop data', () => {
        const itemDropData: ItemDropDataToClient = {
            item: ItemType.Torch,
            itemCoordinates: { x: 5, y: 6 },
        };

        gateway.emitItemDrop(testGameId, itemDropData);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.ItemDrop, itemDropData);
    });

    it('should emit LoserPlayer with player ID in the event name', () => {
        const loserPlayer = {
            id: CharacterType.Character3,
            name: 'LoserPlayer',
            userId: 'user789',
            health: 0,
            maxHealth: 5,
            attack: 3,
            defense: 4,
            speed: 2,
            wins: 0,
            startPosition: { x: 2, y: 3 },
            dice: { attack: 5, defense: 3 },
            items: [],
            evadeAttempts: 0,
            hasAbandoned: false,
            team: Teams.NoTeam,
            isTorchActive: false,
            isBarrelActive: false,
        };

        gateway.emitLoserPlayer(testGameId, loserPlayer);

        expect(GameRoomService.getGameRoomName).toHaveBeenCalledWith(testGameId);
        expect(serverMock.to).toHaveBeenCalledWith(testRoomName);
        expect(emitMock).toHaveBeenCalledWith(GameEvents.LoserPlayer + loserPlayer.id);
    });
});
