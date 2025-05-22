// We use any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CombatService } from '@app/services/combat/combat.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { DoorUpdateData } from '@common/door-update-data';
import { DoorUpdateRequestPayload } from '@common/door-update-request-payload';
import { ItemDropDataToServer } from '@common/item-drop-data-server';
import { MapTileType } from '@common/map-tile-type';
import { MovementDataToServer } from '@common/movement-data-server';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';
import { Teams } from '@common/teams';
import { TeleportData } from '@common/teleport-data';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';

describe('GameReceiverGateway', () => {
    let gateway: GameReceiverGateway;
    let gameServiceMock: jest.Mocked<GameService>;
    let gameEmitterGatewayMock: jest.Mocked<GameEmitterGateway>;
    let combatServiceMock: jest.Mocked<CombatService>;
    let mapServiceMock: jest.Mocked<GameMapService>;
    let virtualPlayerServiceMock: jest.Mocked<VirtualPlayerService>;

    const mockGameId = 'game123';
    const mockPlayerName = 'TestPlayer';

    const mockSocket = {
        data: {
            player: {
                name: mockPlayerName,
                admin: true,
            },
        },
    } as unknown as Socket;

    const nonAdminSocket = {
        data: {
            player: {
                name: 'NonAdmin',
                admin: false,
            },
        },
    } as unknown as Socket;

    const mockPlayer1: Player = {
        id: CharacterType.Character1,
        userId: 'player1',
        name: 'Player1',
        health: 5,
        maxHealth: 5,
        attack: 6,
        defense: 4,
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

    const mockPlayer2: Player = {
        id: CharacterType.Character2,
        userId: 'player2',
        name: 'Player2',
        health: 5,
        maxHealth: 5,
        attack: 4,
        defense: 6,
        speed: 4,
        wins: 0,
        startPosition: { x: 5, y: 5 },
        dice: { attack: 4, defense: 6 },
        items: [],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.NoTeam,
        isTorchActive: false,
        isBarrelActive: false,
    };

    const mockPlayersInCombat: PlayersInCombat = {
        initiator: mockPlayer1,
        target: mockPlayer2,
        initiatorPosition: { x: 0, y: 0 },
        targetPosition: { x: 5, y: 5 },
    };

    const mockGameData: Partial<GameData> = {
        playersInCombat: mockPlayersInCombat,
    };

    beforeEach(async () => {
        gameServiceMock = {
            toggleDebug: jest.fn(),
            endRound: jest.fn(),
            movePlayer: jest.fn(),
            startCombat: jest.fn(),
            getGame: jest.fn().mockReturnValue(mockGameData),
            setAttackerName: jest.fn(),
            teleportPlayer: jest.fn(),
            checkForRoundEnd: jest.fn(),
            dropItem: jest.fn(),
        } as unknown as jest.Mocked<GameService>;

        gameEmitterGatewayMock = {
            emitStartCombat: jest.fn(),
            emitDoorUpdate: jest.fn(),
        } as unknown as jest.Mocked<GameEmitterGateway>;

        combatServiceMock = {
            getFirstPlayerToAttackName: jest.fn().mockReturnValue('Player1'),
            startCombatTimer: jest.fn(),
            attackCycle: jest.fn(),
            receivedEvade: jest.fn(),
        } as unknown as jest.Mocked<CombatService>;

        mapServiceMock = {
            isDoorUpdateAllowed: jest.fn().mockReturnValue(true),
            updateDoor: jest.fn(),
        } as unknown as jest.Mocked<GameMapService>;

        virtualPlayerServiceMock = {
            handleCombat: jest.fn(),
            isAiPlayer: jest.fn(),
        } as unknown as jest.Mocked<VirtualPlayerService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameReceiverGateway,
                { provide: GameService, useValue: gameServiceMock },
                { provide: GameEmitterGateway, useValue: gameEmitterGatewayMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: GameMapService, useValue: mapServiceMock },
                { provide: VirtualPlayerService, useValue: virtualPlayerServiceMock },
            ],
        }).compile();

        gateway = module.get<GameReceiverGateway>(GameReceiverGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('toggleDebug', () => {
        it('should call gameService.toggleDebug with gameId when user is admin', () => {
            gateway.toggleDebug(mockSocket, mockGameId);
            expect(gameServiceMock.toggleDebug).toHaveBeenCalledWith(mockGameId);
        });

        it('should not call gameService.toggleDebug when user is not admin', () => {
            gateway.toggleDebug(nonAdminSocket, mockGameId);
            expect(gameServiceMock.toggleDebug).not.toHaveBeenCalled();
        });

        it('should not call gameService.toggleDebug when socket.data.player is undefined', () => {
            const socketWithoutPlayer = {
                data: {},
            } as unknown as Socket;

            gateway.toggleDebug(socketWithoutPlayer, mockGameId);
            expect(gameServiceMock.toggleDebug).not.toHaveBeenCalled();
        });
    });

    describe('endRound', () => {
        it('should call gameService.endRound with gameId and player name', () => {
            gateway.endRound(mockSocket, mockGameId);
            expect(gameServiceMock.endRound).toHaveBeenCalledWith(mockGameId, mockPlayerName);
        });
    });

    describe('movePlayer', () => {
        it('should call gameService.movePlayer with gameId and path', () => {
            const movementData: MovementDataToServer = {
                gameId: mockGameId,
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                ],
            };

            gateway.movePlayer(mockSocket, movementData);

            expect(gameServiceMock.movePlayer).toHaveBeenCalledWith(mockGameId, movementData.path);
        });
    });

    describe('combatRequest', () => {
        it('should start combat when gameService.startCombat returns true', () => {
            const combatPayload: CombatRequestPayload = {
                gameId: mockGameId,
                initiatorId: mockPlayer1.id,
                targetId: mockPlayer2.id,
                initiatorPosition: mockPlayer1.startPosition,
                targetPosition: mockPlayer2.startPosition,
            };

            gameServiceMock.startCombat.mockReturnValue(true);

            gateway.combatRequest(mockSocket, combatPayload);

            expect(gameServiceMock.startCombat).toHaveBeenCalledWith(combatPayload);
            expect(gameServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(combatServiceMock.getFirstPlayerToAttackName).toHaveBeenCalledWith(mockPlayersInCombat);
            expect(gameServiceMock.setAttackerName).toHaveBeenCalledWith(mockGameId, 'Player1');
            expect(gameEmitterGatewayMock.emitStartCombat).toHaveBeenCalled();
            expect(combatServiceMock.startCombatTimer).toHaveBeenCalled();
        });

        it('should not start combat when gameService.startCombat returns false', () => {
            const combatPayload: CombatRequestPayload = {
                gameId: mockGameId,
                initiatorId: mockPlayer1.id,
                targetId: mockPlayer2.id,
                initiatorPosition: mockPlayer1.startPosition,
                targetPosition: mockPlayer2.startPosition,
            };

            gameServiceMock.startCombat.mockReturnValue(false);

            gateway.combatRequest(mockSocket, combatPayload);

            expect(gameServiceMock.startCombat).toHaveBeenCalledWith(combatPayload);
            expect(combatServiceMock.getFirstPlayerToAttackName).not.toHaveBeenCalled();
            expect(gameServiceMock.setAttackerName).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitStartCombat).not.toHaveBeenCalled();
            expect(combatServiceMock.startCombatTimer).not.toHaveBeenCalled();
        });
    });

    describe('combatAttack', () => {
        it('should call combatService.attackCycle with gameId and game data', () => {
            gateway.combatAttack(mockSocket, mockGameId);

            expect(gameServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(combatServiceMock.attackCycle).toHaveBeenCalledWith(mockGameId, mockGameData);
        });
    });

    describe('combatEvade', () => {
        it('should call combatService.receivedEvade with gameId and game data', () => {
            gateway.combatEvade(mockSocket, mockGameId);

            expect(gameServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(combatServiceMock.receivedEvade).toHaveBeenCalledWith(mockGameId, mockGameData);
        });
    });

    describe('teleportPlayer', () => {
        it('should call gameService.teleportPlayer with teleport data', () => {
            const teleportData: TeleportData = {
                from: { x: 1, y: 1 },
                to: { x: 2, y: 2 },
                gameId: mockGameId,
            };

            gateway.teleportPlayer(mockSocket, teleportData);

            expect(gameServiceMock.teleportPlayer).toHaveBeenCalledWith(teleportData);
        });
    });

    describe('updateDoor', () => {
        it('should not update door when update is not allowed', () => {
            const doorPosition: Coordinates = { x: 5, y: 5 };
            const doorPayload: DoorUpdateRequestPayload = {
                gameId: mockGameId,
                playerPosition: { x: 1, y: 1 },
                doorPosition,
            };

            mapServiceMock.isDoorUpdateAllowed.mockReturnValue(false);

            gateway.updateDoor(mockSocket, doorPayload);

            expect(gameServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mapServiceMock.isDoorUpdateAllowed).toHaveBeenCalledWith(doorPayload, mockGameData);
            expect(mapServiceMock.updateDoor).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitDoorUpdate).not.toHaveBeenCalled();
        });

        it('should update door and emit when update is allowed', () => {
            const doorPosition: Coordinates = { x: 5, y: 5 };
            const playerPosition: Coordinates = { x: 4, y: 5 };
            const doorPayload: DoorUpdateRequestPayload = {
                gameId: mockGameId,
                playerPosition,
                doorPosition,
            };

            const updatedDoorData = {
                doorCoordinates: doorPosition,
                newDoorType: MapTileType.OpenDoor,
                player: mockPlayer1,
            } as DoorUpdateData;

            mapServiceMock.isDoorUpdateAllowed.mockReturnValue(true);
            mapServiceMock.updateDoor.mockReturnValue(updatedDoorData);
            gateway.updateDoor(mockSocket, doorPayload);

            expect(gameServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mapServiceMock.isDoorUpdateAllowed).toHaveBeenCalledWith(doorPayload, mockGameData);
            expect(mockGameData.currentPlayerPosition).toEqual(playerPosition);
            expect(mapServiceMock.updateDoor).toHaveBeenCalledWith(doorPosition, mockGameData);
            expect(gameEmitterGatewayMock.emitDoorUpdate).toHaveBeenCalledWith(mockGameId, updatedDoorData);
            expect(gameServiceMock.checkForRoundEnd).toHaveBeenCalledWith(mockGameId);
        });
    });

    describe('dropItem', () => {
        it('should call gameService.dropItem and check for round end', () => {
            const dropItemPayload: ItemDropDataToServer = {
                gameId: mockGameId,
                itemIndex: 0,
                itemPosition: { x: 1, y: 1 },
            };

            gateway.dropItem(mockSocket, dropItemPayload);

            expect(gameServiceMock.dropItem).toHaveBeenCalledWith(dropItemPayload);
            expect(gameServiceMock.checkForRoundEnd).toHaveBeenCalledWith(mockGameId);
        });
    });
});
