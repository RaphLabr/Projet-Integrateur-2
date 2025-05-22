// Need magic number
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Max line disable in test file
/* eslint-disable max-lines */
// We use any to access private methods and properties
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MAX_EVASIONS } from '@app/constants/combat-constants';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { GameMap } from '@app/model/database/game-map';
import { CombatService } from '@app/services/combat/combat.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameObjectGeneratorService } from '@app/services/game-object-generator/game-object-generator.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { Coordinates } from '@common/coordinates';
import { DiceChoice } from '@common/dice-choice';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { PlayerInfo } from '@common/player-info';
import { Teams } from '@common/teams';
import { TeleportData } from '@common/teleport-data';

describe('GameService', () => {
    let service: GameService;
    let combatServiceMock: jest.Mocked<CombatService>;
    let gameEmitterGatewayMock: jest.Mocked<GameEmitterGateway>;
    let timerServiceMock: jest.Mocked<GameTimerService>;
    let gameMapServiceMock: jest.Mocked<GameMapService>;
    let gameStatisticsServiceMock: jest.Mocked<GameStatisticsService>;
    let virtualPlayerServiceMock: jest.Mocked<VirtualPlayerService>;
    let gameObjectGeneratorServiceMock: jest.Mocked<GameObjectGeneratorService>;

    const mockGameId = 'test-game-id';

    beforeEach(async () => {
        combatServiceMock = {
            startCombat: jest.fn(),
            getAttacker: jest.fn(),
            combatOverWithWinner: jest.fn(),
            loserDropItems: jest.fn(),
        } as unknown as jest.Mocked<CombatService>;

        gameEmitterGatewayMock = {
            emitStartNotification: jest.fn(),
            emitStartRound: jest.fn(),
            emitToggleDebug: jest.fn(),
        } as unknown as jest.Mocked<GameEmitterGateway>;

        timerServiceMock = {
            waitForNotificationTimer: jest.fn(),
            waitForRoundTimer: jest.fn(),
            stopTimer: jest.fn(),
            forceStopTimer: jest.fn(),
            enableTimerStop: jest.fn(),
            deleteTimer: jest.fn(),
        } as unknown as jest.Mocked<GameTimerService>;

        gameMapServiceMock = {
            movePlayer: jest.fn(),
            removeCharacterFromTile: jest.fn(),
            teleportPlayer: jest.fn(),
            movePlayerOnPath: jest.fn(),
            placeItem: jest.fn(),
        } as unknown as jest.Mocked<GameMapService>;

        gameStatisticsServiceMock = {
            updateGameStatistics: jest.fn(),
        } as unknown as jest.Mocked<GameStatisticsService>;

        virtualPlayerServiceMock = {
            createVirtualPlayer: jest.fn(),
            removeVirtualPlayer: jest.fn(),
        } as unknown as jest.Mocked<VirtualPlayerService>;

        gameObjectGeneratorServiceMock = {
            generateGameObject: jest.fn(),
            initializeGame: jest.fn(),
        } as unknown as jest.Mocked<GameObjectGeneratorService>;

        service = new GameService(
            gameEmitterGatewayMock,
            combatServiceMock,
            timerServiceMock,
            gameMapServiceMock,
            gameStatisticsServiceMock,
            virtualPlayerServiceMock,
            gameObjectGeneratorServiceMock,
        );
    });

    describe('getPlayersById', () => {
        it('should return players array when game exists', () => {
            const mockPlayers = [
                { name: 'Player1', id: CharacterType.Character1 },
                { name: 'Player2', id: CharacterType.Character2 },
            ];

            const mockGame = { players: mockPlayers } as unknown as GameData;
            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getPlayersById(mockGameId);

            expect(result).toEqual(mockPlayers);
        });
    });

    describe('isGameInRound', () => {
        it('should return true when game exists and is in round', () => {
            const mockGame = { isInRound: true } as any;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);
            const result = service.isGameInRound(mockGameId);
            expect(result).toBe(true);
            jest.restoreAllMocks();
        });

        it('should return false when game exists but is not in round', () => {
            const mockGame = { isInRound: false } as any;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);
            const result = service.isGameInRound(mockGameId);
            expect(result).toBe(false);
        });

        it('should return false when game does not exist', () => {
            jest.spyOn(Map.prototype, 'get').mockReturnValue(undefined);
            const result = service.isGameInRound(mockGameId);
            expect(result).toBeFalsy();
        });
    });

    describe('endRound', () => {
        it('should stop timer when game is in round and player is active player', async () => {
            const activePlayerName = 'ActivePlayer';
            const mockGame = {
                isInRound: true,
                players: [{ name: activePlayerName }],
                currentPlayerIndex: 0,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            jest.spyOn(service, 'getActivePlayerName').mockReturnValue(activePlayerName);

            await service.endRound(mockGameId, activePlayerName);
            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should not stop timer when game is not in round', async () => {
            const activePlayerName = 'ActivePlayer';
            const mockGame = {
                isInRound: false,
                players: [{ name: activePlayerName }],
                currentPlayerIndex: 0,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            jest.spyOn(service, 'getActivePlayerName').mockReturnValue(activePlayerName);

            await service.endRound(mockGameId, activePlayerName);
            expect(timerServiceMock.stopTimer).not.toHaveBeenCalled();
        });

        it('should not stop timer when player is not the active player', async () => {
            const activePlayerName = 'ActivePlayer';
            const differentPlayerName = 'DifferentPlayer';
            const mockGame = {
                isInRound: true,
                players: [{ name: activePlayerName }, { name: differentPlayerName }],
                currentPlayerIndex: 0,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            jest.spyOn(service, 'getActivePlayerName').mockReturnValue(activePlayerName);

            await service.endRound(mockGameId, differentPlayerName);
            expect(timerServiceMock.stopTimer).not.toHaveBeenCalled();
        });
    });

    describe('getActivePlayerName', () => {
        it('should return name of player at currentPlayerIndex', () => {
            const mockPlayers = [{ name: 'Player1' }, { name: 'Player2', currentPlayer: true }, { name: 'Player3' }];
            const mockGame = {
                players: mockPlayers,
                currentPlayerIndex: 1,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            const result = service.getActivePlayerName(mockGameId);
            expect(result).toBe('Player2');
        });
    });

    describe('quitGame', () => {
        let mockGame: Partial<GameData>;
        const playerName = 'TestPlayer';
        const playerPosition: Coordinates = { x: 3, y: 4 };
        const startPosition: Coordinates = { x: 0, y: 0 };

        beforeEach(() => {
            mockGame = {
                players: [
                    {
                        id: CharacterType.Character1,
                        userId: 'user1',
                        name: playerName,
                        health: 5,
                        maxHealth: 5,
                        speed: 6,
                        attack: 6,
                        defense: 5,
                        dice: { attack: 6, defense: 4 },
                        items: [],
                        evadeAttempts: 0,
                        hasAbandoned: false,
                        startPosition,
                        wins: 0,
                        team: Teams.NoTeam,
                        isTorchActive: false,
                        isBarrelActive: false,
                    },
                    {
                        id: CharacterType.Character2,
                        userId: 'user2',
                        name: 'OtherPlayer',
                        health: 4,
                        maxHealth: 4,
                        speed: 6,
                        attack: 4,
                        defense: 6,
                        dice: { attack: 4, defense: 6 },
                        items: [],
                        evadeAttempts: 0,
                        hasAbandoned: false,
                        startPosition: { x: 1, y: 1 },
                        wins: 0,
                        team: Teams.NoTeam,
                        isTorchActive: false,
                        isBarrelActive: false,
                    },
                ],
                map: {
                    id: 'mock-map-id',
                    name: 'Mock Map',
                    mode: GameMode.Classic,
                    visibility: true,
                    size: MapSize.Small,
                    terrain: Array(MapSize.Small)
                        .fill(null)
                        .map(() =>
                            Array(MapSize.Small)
                                .fill(null)
                                .map(() => ({
                                    type: MapTileType.Base,
                                    character: CharacterType.NoCharacter,
                                    item: ItemType.NoItem,
                                })),
                        ),
                    lastModified: new Date().toISOString(),
                    creator: 'TestUser',
                    description: 'Mock description',
                },
                isInCombat: false,
                isInRound: false,
                currentPlayerIndex: 0,
            };

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame as GameData);
            jest.spyOn(service as any, 'isLastPlayer').mockReturnValue(false);

            combatServiceMock.isPlayerInCombat = jest.fn().mockReturnValue(false);
            gameEmitterGatewayMock.emitPlayerQuit = jest.fn();
            gameEmitterGatewayMock.emitKickLastPlayer = jest.fn();
        });

        it('should mark player as abandoned', () => {
            service.quitGame(mockGameId, playerName, playerPosition);
            expect(mockGame.players[0].hasAbandoned).toBe(true);
        });

        it('should return early if player is not found', () => {
            const result = service.quitGame(mockGameId, 'NonExistentPlayer', playerPosition);

            expect(result).toBeUndefined();
            expect(gameMapServiceMock.removeCharacterFromTile).not.toHaveBeenCalled();
        });

        it('should handle player in combat', () => {
            mockGame.isInCombat = true;
            combatServiceMock.isPlayerInCombat = jest.fn().mockReturnValue(true);

            service.quitGame(mockGameId, playerName, playerPosition);
            expect(combatServiceMock.combatOverWithWinner).toHaveBeenCalledWith(mockGameId, mockGame);
            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should remove character from map tile', () => {
            service.quitGame(mockGameId, playerName, playerPosition);
            expect(gameMapServiceMock.removeCharacterFromTile).toHaveBeenCalledWith(mockGame.map.terrain, playerPosition);
        });

        it('should clear the player start position', () => {
            jest.spyOn(service as any, 'clearStartPosition');
            service.quitGame(mockGameId, playerName, playerPosition);
            expect((service as any).clearStartPosition).toHaveBeenCalledWith(mockGame.map, mockGame.players[0].startPosition);
        });

        it('should emit player quit event', () => {
            service.quitGame(mockGameId, playerName, playerPosition);
            expect(gameEmitterGatewayMock.emitPlayerQuit).toHaveBeenCalledWith(mockGameId, {
                playerName,
                playerPosition,
                playerStartPosition: startPosition,
            });
        });

        it('should mark game as over if no active players remain', () => {
            mockGame.players[1].hasAbandoned = true;

            service.quitGame(mockGameId, playerName, playerPosition);

            expect(mockGame.isOver).toBe(true);
        });

        it('should handle active player quitting during a round', () => {
            mockGame.isInRound = true;
            mockGame.currentPlayerIndex = 0;
            service.quitGame(mockGameId, playerName, playerPosition);
            expect(timerServiceMock.forceStopTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should emit kick last player event if only one player remains', () => {
            (service as any).isLastPlayer.mockReturnValue(true);
            service.quitGame(mockGameId, playerName, playerPosition);
            expect(gameEmitterGatewayMock.emitKickLastPlayer).toHaveBeenCalledWith(mockGameId);
        });

        it('should return the updated game', () => {
            const result = service.quitGame(mockGameId, playerName, playerPosition);
            expect(result).toBe(mockGame);
        });

        it('should return undefined when game does not exist', () => {
            jest.spyOn(service, 'getGame').mockReturnValue(undefined);

            const result = service.quitGame('nonexistent-game-id', 'TestPlayer', { x: 0, y: 0 });

            expect(result).toBeUndefined();
            expect(gameMapServiceMock.removeCharacterFromTile).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitPlayerQuit).not.toHaveBeenCalled();
        });
    });

    describe('toggleDebug', () => {
        it('should toggle debug mode from false to true', () => {
            const mockGame = { isInDebugMode: false } as GameData;
            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            service.toggleDebug(mockGameId);
            expect(mockGame.isInDebugMode).toBe(true);
            expect(gameEmitterGatewayMock.emitToggleDebug).toHaveBeenCalledWith(mockGameId, true);
        });

        it('should toggle debug mode from true to false', () => {
            const mockGame = { isInDebugMode: true } as GameData;
            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            service.toggleDebug(mockGameId);
            expect(mockGame.isInDebugMode).toBe(false);
            expect(gameEmitterGatewayMock.emitToggleDebug).toHaveBeenCalledWith(mockGameId, false);
        });

        it('should return early when game does not exist', () => {
            jest.spyOn(service, 'getGame').mockReturnValue(undefined);

            service.toggleDebug('nonexistent-game-id');

            expect(gameEmitterGatewayMock.emitToggleDebug).not.toHaveBeenCalled();
        });
    });

    describe('getRemainingEvadeAttempts', () => {
        it('should return MAX_EVASIONS minus evader evadeAttempts', () => {
            const attackerName = 'TestAttacker';
            const mockEvader = { name: attackerName, evadeAttempts: 1 } as any;

            const mockGame = {
                attackerName,
                playersInCombat: { initiator: mockEvader },
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            combatServiceMock.getAttacker.mockReturnValue(mockEvader);

            const result = service.getRemainingEvadeAttempts(mockGameId);

            expect(combatServiceMock.getAttacker).toHaveBeenCalledWith(mockGame.playersInCombat, attackerName);
            expect(result).toBe(MAX_EVASIONS - mockEvader.evadeAttempts);
        });
    });

    describe('getGame', () => {
        it('should return game data when game exists', () => {
            const mockGame = { players: [{ name: 'Player1' }] } as GameData;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);

            const result = service.getGame(mockGameId);
            expect(result).toBe(mockGame);
            jest.restoreAllMocks();
        });
    });

    describe('teleportPlayer', () => {
        const mockTeleportData: TeleportData = {
            gameId: mockGameId,
            from: { x: 1, y: 1 },
            to: { x: 2, y: 2 },
        };

        it('should call gameMapService.teleportPlayer when game exists and is in debug mode', () => {
            const mockGame = { isInDebugMode: true } as GameData;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);

            service.teleportPlayer(mockTeleportData);
            expect(gameMapServiceMock.teleportPlayer).toHaveBeenCalledWith(mockGame, mockTeleportData, false);
            jest.restoreAllMocks();
        });

        it('should not call gameMapService.teleportPlayer when game exists but is not in debug mode', () => {
            const mockGame = { isInDebugMode: false } as GameData;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);

            service.teleportPlayer(mockTeleportData);
            expect(gameMapServiceMock.teleportPlayer).not.toHaveBeenCalled();
            jest.restoreAllMocks();
        });
    });

    describe('setAttackerName', () => {
        it('should set attackerName in the game data', () => {
            const playerName = 'TestAttacker';
            const mockGame = { attackerName: '' } as GameData;
            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            service.setAttackerName(mockGameId, playerName);
            expect(mockGame.attackerName).toBe(playerName);
        });
    });

    describe('getTile', () => {
        it('should return the tile at the specified coordinates', () => {
            const mockGameMap = new GameMap();
            mockGameMap.size = MapSize.Small;
            mockGameMap.terrain = Array(MapSize.Small)
                .fill(null)
                .map(() =>
                    Array(MapSize.Small)
                        .fill(null)
                        .map(() => ({
                            type: MapTileType.Base,
                            character: CharacterType.NoCharacter,
                            item: ItemType.NoItem,
                        })),
                );

            const specialTile = {
                type: MapTileType.Water,
                character: CharacterType.Character1,
                item: ItemType.Skull,
            };
            mockGameMap.terrain[1][2] = specialTile;

            const result = (service as any).getTile({ y: 1, x: 2 }, mockGameMap);
            expect(result).toBe(specialTile);
            expect(result.type).toBe(MapTileType.Water);
            expect(result.character).toBe(CharacterType.Character1);
            expect(result.item).toBe(ItemType.Skull);
        });
    });

    describe('isLastPlayer', () => {
        it('should return true when only one human player remains', () => {
            const mockGame = {
                players: [
                    { userId: 'human1', hasAbandoned: false },
                    { userId: 'human2', hasAbandoned: true },
                    { userId: 'AI_player1', hasAbandoned: true },
                ],
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = (service as any).isLastPlayer(mockGameId);
            expect(result).toBe(true);
        });

        it('should return false when multiple human players remain', () => {
            const mockGame = {
                players: [
                    { userId: 'human1', hasAbandoned: false },
                    { userId: 'human2', hasAbandoned: false },
                    { userId: 'AI_player1', hasAbandoned: false },
                ],
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = (service as any).isLastPlayer(mockGameId);
            expect(result).toBe(false);
        });

        it('should return true when no human players remain', () => {
            const mockGame = {
                players: [
                    { userId: 'human1', hasAbandoned: true },
                    { userId: 'AI_player1', hasAbandoned: false },
                    { userId: 'AI_player2', hasAbandoned: false },
                ],
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = (service as any).isLastPlayer(mockGameId);
            expect(result).toBe(true);
        });
    });

    describe('startNotificationPeriod', () => {
        let mockGame: GameData;

        beforeEach(() => {
            mockGame = {
                players: [
                    { name: 'Player1', hasAbandoned: false },
                    { name: 'Player2', hasAbandoned: false },
                    { name: 'Player3', hasAbandoned: true },
                ],
                currentPlayerIndex: 0,
                isActionUsed: true,
                isInRound: true,
                gameStatistics: { winnerName: '' },
            } as unknown as GameData;

            gameStatisticsServiceMock.newRound = jest.fn();
            gameEmitterGatewayMock.emitStartNotification = jest.fn();
        });

        it('should reset game state and increment to next active player', () => {
            (service as any).startNotificationPeriod(mockGameId, mockGame);

            expect(gameStatisticsServiceMock.newRound).toHaveBeenCalledWith(mockGameId);
            expect(mockGame.isActionUsed).toBe(false);
            expect(mockGame.isInRound).toBe(false);
            expect(mockGame.currentPlayerIndex).toBe(1);
            expect(gameEmitterGatewayMock.emitStartNotification).toHaveBeenCalledWith(mockGameId, mockGame.players[1].name);
        });

        it('should wrap around to beginning of player list when at end', () => {
            mockGame.currentPlayerIndex = 1;

            (service as any).startNotificationPeriod(mockGameId, mockGame);

            expect(mockGame.currentPlayerIndex).toBe(0);
            expect(gameEmitterGatewayMock.emitStartNotification).toHaveBeenCalledWith(mockGameId, mockGame.players[0].name);
        });

        it('should keep same player if all others have abandoned', () => {
            mockGame.players[1].hasAbandoned = true;
            mockGame.currentPlayerIndex = 0;

            (service as any).startNotificationPeriod(mockGameId, mockGame);

            expect(mockGame.currentPlayerIndex).toBe(0);
            expect(gameEmitterGatewayMock.emitStartNotification).toHaveBeenCalledWith(mockGameId, mockGame.players[0].name);
        });
    });

    describe('startRoundPeriod', () => {
        let mockGame: GameData;

        beforeEach(() => {
            mockGame = {
                players: [
                    {
                        name: 'Human Player',
                        userId: 'human1',
                        speed: 5,
                        id: CharacterType.Character1,
                    },
                    {
                        name: 'AI Player',
                        userId: 'AI_defensive',
                        speed: 3,
                        id: CharacterType.Character2,
                    },
                ],
                currentPlayerIndex: 0,
                isInRound: false,
                movementLeft: 0,
            } as GameData;

            gameEmitterGatewayMock.emitStartRound = jest.fn();
            virtualPlayerServiceMock.handleAiTurn = jest.fn();
        });

        it('should start round for human player correctly', () => {
            (service as any).startRoundPeriod(mockGameId, mockGame);

            expect(gameEmitterGatewayMock.emitStartRound).toHaveBeenCalledWith(mockGameId);
            expect(mockGame.isInRound).toBe(true);
            expect(mockGame.movementLeft).toBe(mockGame.players[0].speed);
            expect(virtualPlayerServiceMock.handleAiTurn).not.toHaveBeenCalled();
        });

        it('should trigger AI turn when current player is AI', () => {
            mockGame.currentPlayerIndex = 1;

            (service as any).startRoundPeriod(mockGameId, mockGame);

            expect(gameEmitterGatewayMock.emitStartRound).toHaveBeenCalledWith(mockGameId);
            expect(mockGame.isInRound).toBe(true);
            expect(mockGame.movementLeft).toBe(mockGame.players[1].speed);
            expect(virtualPlayerServiceMock.handleAiTurn).toHaveBeenCalledWith(mockGameId, mockGame.players[1].id, mockGame.players[1].userId);
        });

        it('should set correct movement based on current player speed', () => {
            mockGame.players[0].speed = 8;

            (service as any).startRoundPeriod(mockGameId, mockGame);

            expect(mockGame.movementLeft).toBe(8);
        });
    });

    describe('createGame', () => {
        const mockPlayerInfos: PlayerInfo[] = [
            {
                userId: 'user1',
                id: CharacterType.Character1,
                name: 'Player 1',
                bonus: 'vie',
                dice: DiceChoice.FourDefence,
                admin: true,
            },
        ];
        const mockMapId = 'test-map-id';
        const mockAdminId = CharacterType.Character1;
        const mockGameData = { players: [], map: {} } as GameData;

        beforeEach(() => {
            jest.clearAllMocks();
            gameObjectGeneratorServiceMock.initializeGame.mockResolvedValue(mockGameData);
        });

        it('should initialize a game with the provided parameters', async () => {
            const result = await service.createGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);

            expect(gameObjectGeneratorServiceMock.initializeGame).toHaveBeenCalledWith(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);
            expect(result).toBe(mockGameData);
        });

        it('should store the created game in the games map', async () => {
            const setSpy = jest.spyOn(Map.prototype, 'set');

            await service.createGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId);

            expect(setSpy).toHaveBeenCalledWith(mockGameId, mockGameData);
        });

        it('should handle errors from game generator service', async () => {
            const errorMessage = 'Failed to initialize game';
            gameObjectGeneratorServiceMock.initializeGame.mockRejectedValue(new Error(errorMessage));

            await expect(service.createGame(mockGameId, mockPlayerInfos, mockMapId, mockAdminId)).rejects.toThrow(errorMessage);
        });
    });

    describe('startCombat', () => {
        const mockPayload: CombatRequestPayload = {
            gameId: mockGameId,
            initiatorId: CharacterType.Character1,
            targetId: CharacterType.Character2,
            initiatorPosition: { x: 1, y: 1 },
            targetPosition: { x: 2, y: 2 },
        };
        const mockGame = {
            isActionUsed: false,
            map: {
                terrain: [
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                ],
            },
        } as GameData;
        const mockAttackerTile = { type: MapTileType.Base } as MapTile;
        const mockDefenderTile = { type: MapTileType.Base } as MapTile;

        beforeEach(() => {
            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);
            jest.spyOn(service as any, 'getTile')
                .mockReturnValueOnce(mockAttackerTile)
                .mockReturnValueOnce(mockDefenderTile);
            combatServiceMock.startCombat.mockReturnValue(true);
        });

        it('should return false when action is already used', () => {
            const gameWithUsedAction = { ...mockGame, isActionUsed: true };
            jest.spyOn(service, 'getGame').mockReturnValue(gameWithUsedAction);

            const result = service.startCombat(mockPayload);

            expect(result).toBe(false);
            expect(combatServiceMock.startCombat).not.toHaveBeenCalled();
        });

        it('should get tiles for initiator and target positions', () => {
            service.startCombat(mockPayload);

            expect((service as any).getTile).toHaveBeenCalledWith(mockPayload.initiatorPosition, mockGame.map);
            expect((service as any).getTile).toHaveBeenCalledWith(mockPayload.targetPosition, mockGame.map);
        });

        it('should call combatService.startCombat with correct parameters', () => {
            service.startCombat(mockPayload);

            expect(combatServiceMock.startCombat).toHaveBeenCalledWith(mockGame, mockPayload, mockAttackerTile, mockDefenderTile);
        });

        it('should return the result from combatService.startCombat', () => {
            combatServiceMock.startCombat.mockReturnValue(true);
            const result = service.startCombat(mockPayload);
            expect(result).toBe(true);

            combatServiceMock.startCombat.mockReturnValue(false);
            const result2 = service.startCombat(mockPayload);
            expect(result2).toBe(false);
        });
    });

    describe('movePlayer', () => {
        const mockPath: Coordinates[] = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ];

        const mockGame = {
            map: {
                terrain: [
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                    [{ type: MapTileType.Base }, { type: MapTileType.Base }, { type: MapTileType.Base }],
                ],
            },
        } as GameData;

        beforeEach(() => {
            jest.clearAllMocks();

            (service as any)._games = new Map();

            (service as any)._games.set(mockGameId, mockGame);
        });

        it('should call movePlayerOnPath with correct parameters when game exists', async () => {
            const getSpy = jest.spyOn(Map.prototype, 'get');

            await service.movePlayer(mockGameId, mockPath);

            expect(getSpy).toHaveBeenCalledWith(mockGameId);
            expect(gameMapServiceMock.movePlayerOnPath).toHaveBeenCalledWith(mockGame, mockGameId, mockPath);
        });

        it('should not call movePlayerOnPath when game does not exist', async () => {
            (service as any)._games.delete(mockGameId);

            await service.movePlayer(mockGameId, mockPath);

            expect(gameMapServiceMock.movePlayerOnPath).not.toHaveBeenCalled();
        });

        it('should handle errors from gameMapService', async () => {
            const error = new Error('Failed to move player');

            gameMapServiceMock.movePlayerOnPath.mockImplementation(async () => {
                return Promise.reject(error);
            });

            let caughtError;
            try {
                await service.movePlayer(mockGameId, mockPath);
            } catch (e) {
                caughtError = e;
            }

            expect(caughtError).toBe(error);
            expect(gameMapServiceMock.movePlayerOnPath).toHaveBeenCalled();
        });
    });

    describe('getGameWinnerName', () => {
        it('should return name of player with MAX_WINS when present', () => {
            const mockGame = {
                players: [
                    { name: 'Player1', wins: 1 },
                    { name: 'Player2', wins: 3 },
                    { name: 'Player3', wins: 2 },
                ],
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getGameWinnerName(mockGameId);
            expect(result).toBe('Player2');
        });

        it('should return undefined when no player has MAX_WINS', () => {
            const mockGame = {
                players: [
                    { name: 'Player1', wins: 1 },
                    { name: 'Player2', wins: 2 },
                    { name: 'Player3', wins: 0 },
                ],
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getGameWinnerName(mockGameId);
            expect(result).toBeUndefined();
        });
    });

    describe('dropItem', () => {
        const mockItemData = {
            gameId: mockGameId,
            itemIndex: 1,
            itemPosition: { x: 3, y: 3 },
        };

        it('should drop the correct item from player inventory', () => {
            const mockItems = [ItemType.Potion2, ItemType.Potion1, ItemType.Barrel];
            const mockGame = {
                players: [{ items: [...mockItems] }],
                currentPlayerIndex: 0,
                map: { terrain: [] },
                isDroppingItem: true,
            } as unknown as GameData;

            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);

            service.dropItem(mockItemData);

            expect(mockGame.players[0].items.length).toBe(2);
            expect(mockGame.players[0].items).not.toContain(ItemType.Potion1);
            expect(mockGame.isDroppingItem).toBe(false);

            expect(gameMapServiceMock.placeItem).toHaveBeenCalledWith(
                mockGameId,
                { item: ItemType.Potion1, itemCoordinates: mockItemData.itemPosition },
                mockGame.map.terrain,
            );
            expect(timerServiceMock.enableTimerStop).toHaveBeenCalledWith(mockGameId);
        });

        it('should do nothing when game does not exist', () => {
            jest.spyOn(Map.prototype, 'get').mockReturnValue(undefined);

            service.dropItem(mockItemData);

            expect(gameMapServiceMock.placeItem).not.toHaveBeenCalled();
            expect(timerServiceMock.enableTimerStop).not.toHaveBeenCalled();
        });
    });

    describe('getPlayerPosition', () => {
        const characterId = CharacterType.Character1;

        it('should return correct position when player is on the map', () => {
            const expectedPosition = { y: 1, x: 2 };
            const mockMap = {
                terrain: [
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }, { character: characterId }],
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                ],
            };

            const mockGame = {
                players: [{ id: characterId, name: 'TestPlayer' }],
                map: mockMap,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getPlayerPosition(mockGameId, characterId);

            expect(result).toEqual(expectedPosition);
        });

        it('should return {y: -1, x: -1} when player is not found on the map', () => {
            const mockMap = {
                terrain: [
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                ],
            };

            const mockGame = {
                players: [{ id: characterId, name: 'TestPlayer' }],
                map: mockMap,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getPlayerPosition(mockGameId, characterId);

            expect(result).toEqual({ y: -1, x: -1 });
        });

        it('should return {y: -1, x: -1} when player with characterId does not exist', () => {
            const mockMap = {
                terrain: [
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                    [{ character: CharacterType.NoCharacter }, { character: CharacterType.NoCharacter }],
                ],
            };

            const mockGame = {
                players: [{ id: CharacterType.Character2, name: 'OtherPlayer' }],
                map: mockMap,
            } as GameData;

            jest.spyOn(service, 'getGame').mockReturnValue(mockGame);

            const result = service.getPlayerPosition(mockGameId, characterId);

            expect(result).toEqual({ y: -1, x: -1 });
        });
    });

    describe('checkForRoundEnd', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'forceEndRound').mockImplementation(() => undefined);
        });

        it('should call forceEndRound when gameMapService indicates round should end', () => {
            const mockGame = { players: [], map: {} } as GameData;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);
            gameMapServiceMock.shouldRoundEnd = jest.fn().mockReturnValue(true);

            service.checkForRoundEnd(mockGameId);

            expect(gameMapServiceMock.shouldRoundEnd).toHaveBeenCalledWith(mockGame);
            expect((service as any).forceEndRound).toHaveBeenCalledWith(mockGameId);
        });

        it('should not call forceEndRound when gameMapService indicates round should not end', () => {
            const mockGame = { players: [], map: {} } as GameData;
            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame);
            gameMapServiceMock.shouldRoundEnd = jest.fn().mockReturnValue(false);

            service.checkForRoundEnd(mockGameId);

            expect(gameMapServiceMock.shouldRoundEnd).toHaveBeenCalledWith(mockGame);
            expect((service as any).forceEndRound).not.toHaveBeenCalled();
        });
    });

    describe('startGame', () => {
        let mockGame: Partial<GameData>;

        beforeEach(() => {
            jest.clearAllMocks();

            mockGame = {
                isOver: false,
                players: [{ name: 'Player1' }],
                currentPlayerIndex: 0,
            } as GameData;

            jest.spyOn(Map.prototype, 'get').mockReturnValue(mockGame as GameData);
            jest.spyOn(service as any, 'startNotificationPeriod').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'startRoundPeriod').mockImplementation(() => undefined);
        });

        it('should run the game loop until game.isOver becomes true', async () => {
            let roundCount = 0;
            timerServiceMock.waitForRoundTimer.mockImplementation(async () => {
                if (++roundCount >= 2) {
                    mockGame.isOver = true;
                }
            });

            await service.startGame(mockGameId);

            expect(service['startNotificationPeriod']).toHaveBeenCalledTimes(2);
            expect(service['startRoundPeriod']).toHaveBeenCalledTimes(2);
            expect(timerServiceMock.waitForNotificationTimer).toHaveBeenCalledTimes(2);
            expect(timerServiceMock.waitForRoundTimer).toHaveBeenCalledTimes(2);
            expect(timerServiceMock.forceStopTimer).toHaveBeenCalledWith(mockGameId);
            expect(timerServiceMock.deleteTimer).toHaveBeenCalledWith(mockGameId);
            expect(mockGame.isOver).toBe(false);
        });

        it('should end the game if game.isOver becomes true during notification period', async () => {
            timerServiceMock.waitForNotificationTimer.mockImplementation(async () => {
                mockGame.isOver = true;
            });

            await service.startGame(mockGameId);

            expect(service['startNotificationPeriod']).toHaveBeenCalledTimes(1);
            expect(service['startRoundPeriod']).not.toHaveBeenCalled();
            expect(timerServiceMock.waitForNotificationTimer).toHaveBeenCalledTimes(1);
            expect(timerServiceMock.waitForRoundTimer).not.toHaveBeenCalled();
            expect(timerServiceMock.forceStopTimer).toHaveBeenCalledWith(mockGameId);
            expect(timerServiceMock.deleteTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should properly clean up timers when the game ends', async () => {
            mockGame.isOver = true;

            await service.startGame(mockGameId);

            expect(service['startNotificationPeriod']).not.toHaveBeenCalled();
            expect(service['startRoundPeriod']).not.toHaveBeenCalled();

            expect(timerServiceMock.forceStopTimer).toHaveBeenCalledWith(mockGameId);
            expect(timerServiceMock.deleteTimer).toHaveBeenCalledWith(mockGameId);
        });
    });
});
