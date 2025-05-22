// Disable naming convention for indexes
/* eslint-disable @typescript-eslint/naming-convention */
// Max line disable in test file
/* eslint-disable max-lines */
// Disabling magic numbers to allow for easier testing and readability
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Disable any to access private parameters and functions
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AiPlayer } from '@app/constants/ai-player';
import { AiType } from '@app/constants/ai-type';
import { MovementToItems } from '@app/constants/movement-to-items';
import { ObjectInfo } from '@app/constants/object-info';
import { PlayerPathParams } from '@app/constants/player-path-params';
import { RandomTimeOptions } from '@app/constants/time-options';
import { GameReceiverGateway } from '@app/gateways/game-receiver/game-receiver.gateway';
import { AggressivePlayerService } from '@app/services/aggressive-player/aggressive-player.service';
import { CombatService } from '@app/services/combat/combat.service';
import { DefensivePlayerService } from '@app/services/defensive-player/defensive-player.service';
import { DijkstraService } from '@app/services/dijkstra/dijkstra.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { GameService } from '@app/services/game/game.service';
import { VirtualPlayerMovementService } from '@app/services/virtual-player-movement/virtual-player-movement.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import * as sleepModule from '@app/utils/sleep/sleep';
import { CharacterType } from '@common/character-type';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { Player } from '@common/player';
import { Teams } from '@common/teams';
import { Test, TestingModule } from '@nestjs/testing';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;

    const mockCombatService = {
        attackCycle: jest.fn(),
        evadeAttempt: jest.fn(),
    };

    const mockGameService = {
        getGame: jest.fn(),
        dropItem: jest.fn(),
        getPlayerPosition: jest.fn(),
        movePlayer: jest.fn(),
        endRound: jest.fn(),
        getActivePlayerName: jest.fn(),
    };

    const mockDijkstraService = {
        findCompletePath: jest.fn(),
        findPathToCharacter: jest.fn(),
        calculateCost: jest.fn(),
    };

    const mockTimerService = {
        getTimerState: jest.fn(),
    };

    const mockAggressivePlayerService = {
        moveTowardEnemies: jest.fn(),
    };

    const mockDefensivePlayerService = {
        avoidEnemies: jest.fn(),
    };

    const mockGameReceiverGateway = {
        combatRequest: jest.fn(),
    };

    const mockVirtualPlayerMovementService = {
        moveThroughDoors: jest.fn(),
        forceMoveStart: jest.fn(),
    };

    const mockGameId = 'game-123';

    const mockAiPlayer: Player = {
        id: CharacterType.Character1,
        userId: 'ai-defensive',
        name: 'Defensive AI',
        health: 6,
        maxHealth: 6,
        attack: 6,
        defense: 4,
        speed: 6,
        wins: 0,
        startPosition: { x: 0, y: 0 },
        dice: { attack: 6, defense: 4 },
        items: [ItemType.Potion2],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.NoTeam,
        isTorchActive: false,
        isBarrelActive: false,
    };

    const mockHumanPlayer: Player = {
        id: CharacterType.Character2,
        userId: 'human-player',
        name: 'Human Player',
        health: 6,
        maxHealth: 6,
        attack: 6,
        defense: 4,
        speed: 6,
        wins: 0,
        startPosition: { x: 1, y: 1 },
        dice: { attack: 6, defense: 4 },
        items: [ItemType.Potion1],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.NoTeam,
        isTorchActive: true,
        isBarrelActive: false,
    };

    let statistics: any;
    const mockMapInfo = {
        gameId: mockGameId,
        game: {
            map: {
                id: 'map-123',
                name: 'Test Map',
                mode: GameMode.Classic,
                visibility: true,
                lastModified: '2023-10-01',
                description: 'A test map',
                size: 20,
                creator: 'creator-id',
                terrain: [],
            },
            players: [mockAiPlayer, mockHumanPlayer],
            isInDebugMode: false,
            isInRound: true,
            isInCombat: false,
            movementLeft: 6,
            adminId: CharacterType.Character1,
            currentPlayerIndex: 0,
            playersInCombat: {
                initiator: null,
                target: null,
                initiatorPosition: null,
                targetPosition: null,
            },
            isCombatActionUsed: false,
            isPlayerMoving: false,
            isActionUsed: false,
            attackerName: '',
            gameStatistics: statistics,
            isDroppingItem: false,
            currentPlayerPosition: { x: 0, y: 0 },
            combatWinnerName: '',
            isOver: false,
        },
    };
    const ctfMapInfo = mockMapInfo;
    ctfMapInfo.game.map.mode = GameMode.CaptureTheFlag;

    const mockAi: AiPlayer = {
        gameInfo: mockMapInfo,
        player: mockAiPlayer,
        enemies: [mockHumanPlayer],
        items: [ItemType.Potion2],
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                { provide: CombatService, useValue: mockCombatService },
                { provide: GameService, useValue: mockGameService },
                { provide: GameTimerService, useValue: mockTimerService },
                { provide: GameReceiverGateway, useValue: mockGameReceiverGateway },
                { provide: DijkstraService, useValue: mockDijkstraService },
                { provide: AggressivePlayerService, useValue: mockAggressivePlayerService },
                { provide: DefensivePlayerService, useValue: mockDefensivePlayerService },
                { provide: VirtualPlayerMovementService, useValue: mockVirtualPlayerMovementService },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleAiTurn', () => {
        const mockPlayerId = 'player-456';

        beforeEach(() => {
            jest.spyOn(service as any, 'executeAiMove').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'getAiTypeFromPlayer').mockReturnValue(AiType.Aggressive);
        });

        it('should call executeAiMove with correct parameters when game and player exist', async () => {
            const mockGame = {
                players: [{ id: mockPlayerId, name: 'AI Player', userId: 'ai-aggressive' }],
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleAiTurn(mockGameId, mockPlayerId, 'ai-aggressive');

            expect(mockGameService.getGame).toHaveBeenCalledWith(mockGameId);
            expect(service['getAiTypeFromPlayer']).toHaveBeenCalledWith('ai-aggressive');
            expect(service['executeAiMove']).toHaveBeenCalledWith({ gameId: mockGameId, game: mockGame }, mockGame.players[0], AiType.Aggressive);
        });

        it('should not call executeAiMove when game is not found', async () => {
            mockGameService.getGame.mockReturnValue(null);

            await service.handleAiTurn(mockGameId, mockPlayerId, 'ai-aggressive');

            expect(mockGameService.getGame).toHaveBeenCalledWith(mockGameId);
            expect(service['executeAiMove']).not.toHaveBeenCalled();
        });

        it('should not call executeAiMove when player is not found', async () => {
            const mockGame = {
                players: [{ id: 'different-player', name: 'Different Player' }],
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleAiTurn(mockGameId, mockPlayerId, 'ai-aggressive');

            expect(mockGameService.getGame).toHaveBeenCalledWith(mockGameId);
            expect(service['executeAiMove']).not.toHaveBeenCalled();
        });

        it('should handle errors without crashing', async () => {
            const mockGame = {
                players: [{ id: mockPlayerId, name: 'AI Player', userId: 'ai-aggressive' }],
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            jest.spyOn(service as any, 'executeAiMove').mockRejectedValue(new Error('Test error'));

            await expect(service.handleAiTurn(mockGameId, mockPlayerId, 'ai-aggressive')).resolves.not.toThrow();
        });
    });

    describe('randomTime', () => {
        it('should return a value within the expected range', async () => {
            const base = 100;
            const extra = 50;

            const result = await service.randomTime(base, extra);

            expect(result).toBeGreaterThanOrEqual(extra);
            expect(result).toBeLessThan(base + extra);
        });

        it('should return consistent value when Math.random is mocked', async () => {
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0.5);

            const base = 100;
            const extra = 50;

            const result = await service.randomTime(base, extra);

            expect(result).toBe(100);

            Math.random = originalRandom;
        });
    });
    describe('handleCombat', () => {
        beforeEach(() => {
            jest.spyOn(service, 'randomTime').mockResolvedValue(10);
            jest.spyOn(service as any, 'getAiTypeFromPlayer').mockResolvedValue(AiType.Defensive);
        });

        it('should not proceed if game is not in combat', async () => {
            const mockGame = { isInCombat: false, isInRound: true };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(mockAiPlayer, mockGameId);
            expect(mockCombatService.attackCycle).not.toHaveBeenCalled();
        });

        it('should not proceed if game is not in round', async () => {
            const mockGame = { isInCombat: true, isInRound: false };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(mockAiPlayer, mockGameId);

            expect(mockCombatService.attackCycle).not.toHaveBeenCalled();
        });

        it('should call attackCycle when game is in combat and in round', async () => {
            const mockGame = {
                isInCombat: true,
                isInRound: true,
                playersInCombat: {
                    initiator: { id: 'enemy-id' },
                    target: { id: 'player-123' },
                },
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(mockAiPlayer, mockGameId);
            expect(mockCombatService.attackCycle).toHaveBeenCalledWith(mockGameId, mockGame);
        });

        it('should attempt to evade when player is defensive with evade attempts < 2', async () => {
            const defensivePlayer = { ...mockAiPlayer, evadeAttempts: 1 };
            const mockGame = {
                isInCombat: true,
                isInRound: true,
                playersInCombat: {
                    initiator: { id: 'enemy-id' },
                    target: { id: 'player-123' },
                },
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(defensivePlayer, mockGameId);
            expect(mockCombatService.evadeAttempt).toHaveBeenCalledWith(mockGameId, defensivePlayer, mockGame.playersInCombat.initiator);
        });

        it('should not attempt to evade when player is aggressive', async () => {
            jest.spyOn(service as any, 'getAiTypeFromPlayer').mockResolvedValue(AiType.Aggressive);
            const mockGame = {
                isInCombat: true,
                isInRound: true,
                playersInCombat: {
                    initiator: { id: 'enemy-id' },
                    target: { id: 'player-123' },
                },
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(mockAiPlayer, mockGameId);
            expect(mockCombatService.evadeAttempt).not.toHaveBeenCalled();
        });

        it('should not attempt to evade when playersInCombat is undefined', async () => {
            const mockGame = {
                isInCombat: true,
                isInRound: true,
                playersInCombat: undefined,
            };
            mockGameService.getGame.mockReturnValue(mockGame);

            await service.handleCombat(mockAiPlayer, mockGameId);
            expect(mockCombatService.evadeAttempt).not.toHaveBeenCalled();
        });
    });

    describe('getClosestObjects', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'findClosestObjects').mockImplementation((info: MovementToItems, players: Player[]) => [
                `Mock result for ${info.playerPosition.x},${info.playerPosition.y} with ${players.length} players`,
            ]);
        });

        it('should forward parameters to findClosestObjects and return its result', async () => {
            const mockMovementInfo: MovementToItems = {
                playerPosition: { x: 5, y: 10 },
                map: { size: 20, terrain: [] } as any,
                itemTypes: [ItemType.Potion1],
                movementLeft: 5,
            };
            const mockPlayers: Player[] = [mockAiPlayer];

            const result = await service.getClosestObjects(mockMovementInfo, mockPlayers);

            expect(service['findClosestObjects']).toHaveBeenCalledWith(mockMovementInfo, mockPlayers);
            expect(result).toEqual(['Mock result for 5,10 with 1 players']);
        });

        it('should use empty array as default for players parameter', async () => {
            const mockMovementInfo: MovementToItems = {
                playerPosition: { x: 3, y: 7 },
                map: { size: 20, terrain: [] } as any,
                itemTypes: [],
                movementLeft: 3,
            };

            await service.getClosestObjects(mockMovementInfo);
            expect(service['findClosestObjects']).toHaveBeenCalledWith(mockMovementInfo, []);
        });

        it('should return empty array when findClosestObjects returns empty', async () => {
            jest.spyOn(service as any, 'findClosestObjects').mockReturnValue([]);
            const mockMovementInfo: MovementToItems = {
                playerPosition: { x: 1, y: 1 },
                map: { size: 20, terrain: [] } as any,
                itemTypes: [],
                movementLeft: 0,
            };

            const result = await service.getClosestObjects(mockMovementInfo);
            expect(result).toEqual([]);
        });
    });

    describe('getRouteDoors', () => {
        const mockPosition = { x: 5, y: 5 };
        const mockTargetPosition = { x: 10, y: 10 };

        beforeEach(() => {
            mockVirtualPlayerMovementService.moveThroughDoors.mockReset();
        });

        it('should delegate to virtualPlayerMovementService.moveThroughDoors with correct parameters', async () => {
            const mockRouteInfo = {
                path: [
                    { x: 5, y: 6 },
                    { x: 6, y: 6 },
                ],
                doors: [],
                totalCost: 2,
            };
            mockVirtualPlayerMovementService.moveThroughDoors.mockResolvedValue(mockRouteInfo);

            const result = await service.getRouteDoors(mockAi, mockPosition, mockTargetPosition);

            expect(mockVirtualPlayerMovementService.moveThroughDoors).toHaveBeenCalledWith(mockAi, mockPosition, mockTargetPosition);
            expect(result).toBe(mockRouteInfo);
        });

        it('should return null when moveThroughDoors returns null', async () => {
            mockVirtualPlayerMovementService.moveThroughDoors.mockResolvedValue(null);

            const result = await service.getRouteDoors(mockAi, mockPosition, mockTargetPosition);

            expect(result).toBeNull();
        });

        it('should return empty route when moveThroughDoors returns empty path', async () => {
            const emptyRoute = { path: [], doors: [], totalCost: 0 };
            mockVirtualPlayerMovementService.moveThroughDoors.mockResolvedValue(emptyRoute);

            const result = await service.getRouteDoors(mockAi, mockPosition, mockTargetPosition);

            expect(result).toEqual(emptyRoute);
        });
    });

    describe('checkMaxItem', () => {
        beforeEach(() => {
            jest.spyOn(service, 'randomTime').mockResolvedValue(10);
            jest.spyOn(service as any, 'assignItemPriorities').mockReturnValue({ 0: 1, 1: 2, 2: 0 });
            jest.spyOn(service as any, 'findItemToDrop').mockReturnValue(1);
            jest.spyOn(service as any, 'dropAiItem').mockResolvedValue(undefined);
        });

        it('should not process items if AI has 2 or fewer items', async () => {
            const aiWithFewItems = { ...mockAiPlayer, items: [ItemType.Potion1, ItemType.Potion2] };

            await service.checkMaxItem(mockGameId, aiWithFewItems);

            expect(service['assignItemPriorities']).not.toHaveBeenCalled();
            expect(service['findItemToDrop']).not.toHaveBeenCalled();
            expect(service['dropAiItem']).not.toHaveBeenCalled();
        });

        it('should call helper methods when AI has more than 2 items', async () => {
            const aiWithManyItems = {
                ...mockAiPlayer,
                items: [ItemType.Potion1, ItemType.Potion2, ItemType.Flag, ItemType.Barrel],
            };

            await service.checkMaxItem(mockGameId, aiWithManyItems);

            expect(service['assignItemPriorities']).toHaveBeenCalledWith(aiWithManyItems);
            expect(service['findItemToDrop']).toHaveBeenCalledWith({ 0: 1, 1: 2, 2: 0 });
            expect(service['dropAiItem']).toHaveBeenCalledWith(mockGameId, aiWithManyItems, 1);
        });

        it('should wait for random time before processing', async () => {
            const aiWithManyItems = {
                ...mockAiPlayer,
                items: [ItemType.Potion1, ItemType.Potion2, ItemType.Barrel],
            };

            const sleepSpy = jest.spyOn(global, 'setTimeout');

            await service.checkMaxItem(mockGameId, aiWithManyItems);
            expect(service.randomTime).toHaveBeenCalledWith(RandomTimeOptions.MediumRandomTime, RandomTimeOptions.SmallRandomTime);
            expect(sleepSpy).toHaveBeenCalled();
        });

        it('should respect assigned item priorities when dropping items', async () => {
            const aiWithManyItems = {
                ...mockAiPlayer,
                items: [ItemType.Potion1, ItemType.Barrel, ItemType.Flag],
            };

            jest.spyOn(service as any, 'assignItemPriorities').mockRestore();
            jest.spyOn(service as any, 'findItemToDrop').mockRestore();

            jest.spyOn(service as any, 'getItemPriority').mockImplementation((item) => {
                if (item === ItemType.Flag) return 0;
                if (item === ItemType.Potion1) return 1;
                return 2;
            });

            await service.checkMaxItem(mockGameId, aiWithManyItems);
            expect(service['dropAiItem']).toHaveBeenCalledWith(mockGameId, aiWithManyItems, 1);
        });
    });

    describe('initiateCombat', () => {
        const mockAiPosition = { x: 5, y: 5 };
        const mockEnemyPosition = { x: 6, y: 5 };

        beforeEach(() => {
            jest.spyOn(service, 'randomTime').mockResolvedValue(10);
            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return mockAiPosition;
                return mockEnemyPosition;
            });
        });

        it('should call combatRequest when AI is the active player', async () => {
            mockGameService.getActivePlayerName.mockReturnValue(mockAiPlayer.name);

            await service.initiateCombat(mockAi, mockHumanPlayer);

            expect(mockGameService.getActivePlayerName).toHaveBeenCalledWith(mockGameId);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockAiPlayer.id);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockHumanPlayer.id);
            expect(service.randomTime).toHaveBeenCalledWith(RandomTimeOptions.MediumRandomTime, RandomTimeOptions.SmallRandomTime);

            expect(mockGameReceiverGateway.combatRequest).toHaveBeenCalledWith(null, {
                gameId: mockGameId,
                initiatorId: mockAiPlayer.id,
                targetId: mockHumanPlayer.id,
                initiatorPosition: mockAiPosition,
                targetPosition: mockEnemyPosition,
            });
        });

        it('should not call combatRequest when AI is not the active player', async () => {
            mockGameService.getActivePlayerName.mockReturnValue('Different Player');

            await service.initiateCombat(mockAi, mockHumanPlayer);

            expect(mockGameService.getActivePlayerName).toHaveBeenCalledWith(mockGameId);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockAiPlayer.id);
            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockHumanPlayer.id);

            expect(mockGameReceiverGateway.combatRequest).not.toHaveBeenCalled();
            expect(service.randomTime).not.toHaveBeenCalled();
        });

        it('should construct payload with correct positions', async () => {
            const customAiPosition = { x: 2, y: 3 };
            const customEnemyPosition = { x: 2, y: 4 };

            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return customAiPosition;
                return customEnemyPosition;
            });

            mockGameService.getActivePlayerName.mockReturnValue(mockAiPlayer.name);

            await service.initiateCombat(mockAi, mockHumanPlayer);

            expect(mockGameReceiverGateway.combatRequest).toHaveBeenCalledWith(
                null,
                expect.objectContaining({
                    initiatorPosition: customAiPosition,
                    targetPosition: customEnemyPosition,
                }),
            );
        });
    });

    describe('assignItemPriorities', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'getAiTypeFromPlayer').mockReturnValue(AiType.Aggressive);
            jest.spyOn(service as any, 'getItemPriority').mockImplementation((item, aiType) => {
                if (item === ItemType.Flag) return 0;
                if (aiType === AiType.Aggressive && item === ItemType.Sword) return 1;
                if (aiType === AiType.Defensive && item === ItemType.Barrel) return 1;
                return 2;
            });
        });

        it('should return empty object when player has no items', () => {
            const aiWithNoItems = { ...mockAiPlayer, items: [] };

            const result = service['assignItemPriorities'](aiWithNoItems);

            expect(result).toEqual({});
            expect(service['getAiTypeFromPlayer']).toHaveBeenCalledWith(aiWithNoItems.userId);
            expect(service['getItemPriority']).not.toHaveBeenCalled();
        });

        it('should assign priorities to all items based on AI type', () => {
            const aiWithItems = {
                ...mockAiPlayer,
                userId: 'ai-aggressive',
                items: [ItemType.Flag, ItemType.Sword, ItemType.Potion1],
            };

            const result = service['assignItemPriorities'](aiWithItems);

            expect(result).toEqual({
                0: 0,
                1: 1,
                2: 2,
            });
            expect(service['getAiTypeFromPlayer']).toHaveBeenCalledWith('ai-aggressive');
            expect(service['getItemPriority']).toHaveBeenCalledTimes(3);
        });

        it('should use different priorities for defensive AI', () => {
            jest.spyOn(service as any, 'getAiTypeFromPlayer').mockReturnValue(AiType.Defensive);

            const aiWithItems = {
                ...mockAiPlayer,
                userId: 'ai-defensive',
                items: [ItemType.Potion1, ItemType.Barrel, ItemType.Flag],
            };

            const result = service['assignItemPriorities'](aiWithItems);
            expect(result).toEqual({
                0: 2,
                1: 1,
                2: 0,
            });
            expect(service['getAiTypeFromPlayer']).toHaveBeenCalledWith('ai-defensive');
        });

        it('should handle duplicate items', () => {
            const aiWithDuplicates = {
                ...mockAiPlayer,
                items: [ItemType.Potion1, ItemType.Potion1, ItemType.Potion1],
            };

            const result = service['assignItemPriorities'](aiWithDuplicates);
            expect(result).toEqual({
                0: 2,
                1: 2,
                2: 2,
            });
            expect(service['getItemPriority']).toHaveBeenCalledTimes(3);
        });
    });

    describe('getItemPriority', () => {
        it('should return priority 0 for flag regardless of AI type', () => {
            let priority = service['getItemPriority'](ItemType.Flag, AiType.Aggressive);
            expect(priority).toBe(0);

            priority = service['getItemPriority'](ItemType.Flag, AiType.Defensive);
            expect(priority).toBe(0);
        });

        it('should return priority 1 for defensive items when AI is defensive', () => {
            let priority = service['getItemPriority'](ItemType.Barrel, AiType.Defensive);
            expect(priority).toBe(1);

            priority = service['getItemPriority'](ItemType.Potion1, AiType.Defensive);
            expect(priority).toBe(1);
        });

        it('should return priority 1 for aggressive items when AI is aggressive', () => {
            let priority = service['getItemPriority'](ItemType.Torch, AiType.Aggressive);
            expect(priority).toBe(1);

            priority = service['getItemPriority'](ItemType.Potion2, AiType.Aggressive);
            expect(priority).toBe(1);

            priority = service['getItemPriority'](ItemType.Sword, AiType.Aggressive);
            expect(priority).toBe(1);

            priority = service['getItemPriority'](ItemType.Skull, AiType.Aggressive);
            expect(priority).toBe(1);
        });

        it('should return priority 2 for non-preferred items for defensive AI', () => {
            let priority = service['getItemPriority'](ItemType.Torch, AiType.Defensive);
            expect(priority).toBe(2);

            priority = service['getItemPriority'](ItemType.Potion2, AiType.Defensive);
            expect(priority).toBe(2);

            priority = service['getItemPriority'](ItemType.Sword, AiType.Defensive);
            expect(priority).toBe(2);
        });

        it('should return priority 2 for non-preferred items for aggressive AI', () => {
            let priority = service['getItemPriority'](ItemType.Barrel, AiType.Aggressive);
            expect(priority).toBe(2);

            priority = service['getItemPriority'](ItemType.Potion1, AiType.Aggressive);
            expect(priority).toBe(2);
        });

        it('should return priority 2 for unknown items', () => {
            const priority = service['getItemPriority'](ItemType.Barrel, AiType.Aggressive);
            expect(priority).toBe(2);
        });
    });

    describe('dropAiItem', () => {
        const mockPosition = { x: 7, y: 9 };
        const itemIndex = 1;

        beforeEach(() => {
            mockGameService.getPlayerPosition.mockReturnValue(mockPosition);
            mockGameService.dropItem.mockClear();
        });

        it('should get player position and call dropItem with correct parameters', async () => {
            await service['dropAiItem'](mockGameId, mockAiPlayer, itemIndex);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockAiPlayer.id);
            expect(mockGameService.dropItem).toHaveBeenCalledWith({
                gameId: mockGameId,
                itemIndex,
                itemPosition: mockPosition,
            });
        });

        it('should pass the exact position returned from getPlayerPosition', async () => {
            const specialPosition = { x: 16, y: 18 };
            mockGameService.getPlayerPosition.mockReturnValue(specialPosition);

            await service['dropAiItem'](mockGameId, mockAiPlayer, itemIndex);

            expect(mockGameService.dropItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemPosition: specialPosition,
                }),
            );
        });
    });

    describe('executeAiMove', () => {
        beforeEach(() => {
            jest.spyOn(service, 'randomTime').mockResolvedValue(10);
            jest.spyOn(service as any, 'filterEnemies').mockReturnValue([mockHumanPlayer]);
            jest.spyOn(service as any, 'getItemListsByGameMode').mockReturnValue({
                gameDefensiveItems: [ItemType.Barrel, ItemType.Potion1],
                gameAggressiveItems: [ItemType.Sword, ItemType.Torch],
            });
            jest.spyOn(service as any, 'handleFlagCarrier').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'executeAggressiveAiBehavior').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'executeDefensiveAiBehavior').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'endRound').mockResolvedValue(undefined);
        });

        it('should execute aggressive behavior for aggressive AI type', async () => {
            mockMapInfo.game.map.mode = GameMode.Classic;
            await service['executeAiMove'](mockMapInfo, mockAiPlayer, AiType.Aggressive);

            expect(service.randomTime).toHaveBeenCalledWith(RandomTimeOptions.LongRandomTime, RandomTimeOptions.MediumRandomTime);
            expect(service['filterEnemies']).toHaveBeenCalledWith(mockMapInfo, mockAiPlayer);
            expect(service['getItemListsByGameMode']).toHaveBeenCalledWith(GameMode.Classic);
            expect(service['executeAggressiveAiBehavior']).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameInfo: mockMapInfo,
                    player: mockAiPlayer,
                    enemies: [mockHumanPlayer],
                    items: [ItemType.Sword, ItemType.Torch],
                }),
            );
            expect(service['endRound']).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should execute defensive behavior for defensive AI type', async () => {
            await service['executeAiMove'](mockMapInfo, mockAiPlayer, AiType.Defensive);

            expect(service['executeDefensiveAiBehavior']).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameInfo: mockMapInfo,
                    player: mockAiPlayer,
                    enemies: [mockHumanPlayer],
                    items: [ItemType.Barrel, ItemType.Potion1],
                }),
            );
            expect(service['endRound']).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should handle flag carriers in CTF mode', async () => {
            const flagCarrier = {
                ...mockAiPlayer,
                items: [ItemType.Flag, ItemType.Potion1],
            };
            ctfMapInfo.game.map.mode = GameMode.CaptureTheFlag;

            await service['executeAiMove'](ctfMapInfo, flagCarrier, AiType.Defensive);

            expect(service['handleFlagCarrier']).toHaveBeenCalledWith(
                expect.objectContaining({
                    gameInfo: ctfMapInfo,
                    player: flagCarrier,
                    enemies: [mockHumanPlayer],
                    items: [ItemType.Sword, ItemType.Torch],
                }),
            );
            expect(service['executeDefensiveAiBehavior']).not.toHaveBeenCalled();
            expect(service['executeAggressiveAiBehavior']).not.toHaveBeenCalled();
            expect(service['endRound']).not.toHaveBeenCalled();
        });

        it('should not use flag carrier handling for regular players in CTF mode', async () => {
            const regularPlayer = {
                ...mockAiPlayer,
                items: [ItemType.Potion1],
            };
            ctfMapInfo.game.map.mode = GameMode.CaptureTheFlag;

            await service['executeAiMove'](ctfMapInfo, regularPlayer, AiType.Defensive);

            expect(service['handleFlagCarrier']).not.toHaveBeenCalled();
            expect(service['executeDefensiveAiBehavior']).toHaveBeenCalled();
            expect(service['endRound']).toHaveBeenCalled();
        });

        it('should pass correct enemy list to AI behavior methods', async () => {
            const customEnemies = [{ id: 'custom-enemy', name: 'Enemy Custom' }];
            jest.spyOn(service as any, 'filterEnemies').mockReturnValue(customEnemies);

            await service['executeAiMove'](mockMapInfo, mockAiPlayer, AiType.Aggressive);

            expect(service['executeAggressiveAiBehavior']).toHaveBeenCalledWith(
                expect.objectContaining({
                    enemies: customEnemies,
                }),
            );
        });
    });

    describe('filterEnemies', () => {
        const teamAPlayer = {
            ...mockAiPlayer,
            id: CharacterType.Character1,
            team: Teams.BlueTeam,
        };

        const teamAPlayer2 = {
            ...mockHumanPlayer,
            id: CharacterType.Character2,
            team: Teams.BlueTeam,
        };

        const teamBPlayer = {
            ...mockAiPlayer,
            id: CharacterType.Character3,
            team: Teams.RedTeam,
        };

        const teamBPlayer2 = {
            ...mockHumanPlayer,
            id: CharacterType.Character4,
            team: Teams.RedTeam,
        };

        it('should exclude the player themselves in Classic mode', () => {
            mockMapInfo.game.map.mode = GameMode.Classic;
            const result = service['filterEnemies'](mockMapInfo, mockAiPlayer);

            expect(result).toHaveLength(1);
            expect(result).toContain(mockHumanPlayer);
            expect(result).not.toContain(teamAPlayer);
        });

        it('should return only opposing team players in CTF mode', () => {
            const ctfMapInfoPlayers = ctfMapInfo;
            ctfMapInfoPlayers.game.map.mode = GameMode.CaptureTheFlag;
            ctfMapInfoPlayers.game.players = [teamAPlayer, teamAPlayer2, teamBPlayer, teamBPlayer2];

            const result = service['filterEnemies'](ctfMapInfoPlayers, teamAPlayer);

            expect(result).toHaveLength(2);
            expect(result).toContain(teamBPlayer);
            expect(result).toContain(teamBPlayer2);
            expect(result).not.toContain(teamAPlayer);
            expect(result).not.toContain(teamAPlayer2);
        });
    });

    describe('getItemListsByGameMode', () => {
        it('should return original item lists for Classic mode', () => {
            const result = service['getItemListsByGameMode'](GameMode.Classic);

            expect(result.gameDefensiveItems).not.toContain(ItemType.Flag);
            expect(result.gameAggressiveItems).not.toContain(ItemType.Flag);

            expect(result.gameDefensiveItems).toEqual(service['_defensiveItems']);
            expect(result.gameAggressiveItems).toEqual(service['_aggressiveItems']);
        });

        it('should add Flag to both item lists for CaptureTheFlag mode', () => {
            const result = service['getItemListsByGameMode'](GameMode.CaptureTheFlag);

            expect(result.gameDefensiveItems).toContain(ItemType.Flag);
            expect(result.gameAggressiveItems).toContain(ItemType.Flag);

            service['_defensiveItems'].forEach((item) => {
                expect(result.gameDefensiveItems).toContain(item);
            });

            service['_aggressiveItems'].forEach((item) => {
                expect(result.gameAggressiveItems).toContain(item);
            });
        });

        it('should return new arrays without modifying the original arrays', () => {
            const originalDefensiveItems = [...service['_defensiveItems']];
            const originalAggressiveItems = [...service['_aggressiveItems']];

            service['getItemListsByGameMode'](GameMode.CaptureTheFlag);

            expect(service['_defensiveItems']).toEqual(originalDefensiveItems);
            expect(service['_aggressiveItems']).toEqual(originalAggressiveItems);
            expect(service['_defensiveItems']).not.toContain(ItemType.Flag);
            expect(service['_aggressiveItems']).not.toContain(ItemType.Flag);
        });

        it('should handle other game modes the same as Classic mode', () => {
            const customGameMode = 'CustomMode' as GameMode;
            const result = service['getItemListsByGameMode'](customGameMode);

            expect(result.gameDefensiveItems).toEqual(service['_defensiveItems']);
            expect(result.gameAggressiveItems).toEqual(service['_aggressiveItems']);
            expect(result.gameDefensiveItems).not.toContain(ItemType.Flag);
            expect(result.gameAggressiveItems).not.toContain(ItemType.Flag);
        });
    });

    describe('handleFlagCarrier', () => {
        const mockPosition = { x: 5, y: 5 };
        const mockStartPosition = { x: 0, y: 0 };
        const mockRouteInfo = {
            path: [
                { x: 4, y: 5 },
                { x: 3, y: 5 },
                { x: 2, y: 5 },
            ],
            doors: [],
            totalCost: 3,
        };

        beforeEach(() => {
            mockGameService.getPlayerPosition.mockReturnValue(mockPosition);
            jest.spyOn(service as any, 'endRound').mockResolvedValue(undefined);
        });

        it('should attempt to return to start position when carrying flag', async () => {
            mockVirtualPlayerMovementService.moveThroughDoors.mockResolvedValue(mockRouteInfo);

            await service['handleFlagCarrier'](mockAi);

            expect(mockGameService.getPlayerPosition).toHaveBeenCalledWith(mockGameId, mockAiPlayer.id);
            expect(mockVirtualPlayerMovementService.moveThroughDoors).toHaveBeenCalledWith(mockAi, mockPosition, mockStartPosition);
            expect(mockGameService.movePlayer).toHaveBeenCalledWith(mockGameId, [...mockRouteInfo.path]);
            expect(mockVirtualPlayerMovementService.forceMoveStart).toHaveBeenCalledWith(mockAi);
            expect(service['endRound']).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should not call movePlayer if no route is found', async () => {
            mockVirtualPlayerMovementService.moveThroughDoors.mockResolvedValue(null);

            await service['handleFlagCarrier'](mockAi);

            expect(mockGameService.movePlayer).not.toHaveBeenCalled();
            expect(mockVirtualPlayerMovementService.forceMoveStart).toHaveBeenCalledWith(mockAi);
            expect(service['endRound']).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });
    });

    describe('executeAggressiveAiBehavior', () => {
        beforeEach(() => {
            mockAggressivePlayerService.moveTowardEnemies.mockResolvedValue(undefined);
            jest.spyOn(service as any, 'checkNearby').mockResolvedValue(undefined);
            jest.spyOn(service as any, 'endRound').mockResolvedValue(undefined);

            mockGameService.getGame.mockReturnValue({ isActionUsed: false });
            mockGameService.getActivePlayerName.mockReturnValue(mockAiPlayer.name);
        });

        it('should call moveTowardEnemies and endRound at minimum', async () => {
            await service['executeAggressiveAiBehavior'](mockAi);

            expect(mockAggressivePlayerService.moveTowardEnemies).toHaveBeenCalledWith(mockAi);
            expect(service['endRound']).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should call checkNearby when action not used and AI is active player', async () => {
            await service['executeAggressiveAiBehavior'](mockAi);

            expect(mockGameService.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mockGameService.getActivePlayerName).toHaveBeenCalledWith(mockGameId);
            expect(service['checkNearby']).toHaveBeenCalledWith(mockAi);
        });

        it('should not call checkNearby when action is already used', async () => {
            mockGameService.getGame.mockReturnValue({ isActionUsed: true });

            await service['executeAggressiveAiBehavior'](mockAi);

            expect(mockGameService.getActivePlayerName).not.toHaveBeenCalled();
            expect(service['checkNearby']).not.toHaveBeenCalled();
        });

        it('should not call checkNearby when AI is no longer active player', async () => {
            mockGameService.getActivePlayerName.mockReturnValue('Some Other Player');

            await service['executeAggressiveAiBehavior'](mockAi);

            expect(service['checkNearby']).not.toHaveBeenCalled();
        });

        it('should maintain proper execution order with awaited async calls', async () => {
            const executionOrder: string[] = [];
            mockAggressivePlayerService.moveTowardEnemies.mockImplementation(async () => {
                executionOrder.push('moveTowardEnemies');
            });
            jest.spyOn(service as any, 'checkNearby').mockImplementation(async () => {
                executionOrder.push('checkNearby');
            });
            jest.spyOn(service as any, 'endRound').mockImplementation(async () => {
                executionOrder.push('endRound');
            });

            await service['executeAggressiveAiBehavior'](mockAi);

            expect(executionOrder).toEqual(['moveTowardEnemies', 'checkNearby', 'endRound']);
        });
    });

    describe('executeDefensiveAiBehavior', () => {
        beforeEach(() => {
            mockDefensivePlayerService.avoidEnemies.mockReset();
            mockDefensivePlayerService.avoidEnemies.mockResolvedValue(undefined);
        });

        it('should call avoidEnemies with the correct AI player', async () => {
            await service['executeDefensiveAiBehavior'](mockAi);
            expect(mockDefensivePlayerService.avoidEnemies).toHaveBeenCalledWith(mockAi);
        });

        it('should properly await the avoidEnemies method completion', async () => {
            const executionOrder: string[] = [];
            mockDefensivePlayerService.avoidEnemies.mockImplementation(async () => {
                executionOrder.push('avoidEnemies');
            });

            await service['executeDefensiveAiBehavior'](mockAi);
            expect(executionOrder).toEqual(['avoidEnemies']);
        });
    });

    describe('endRound', () => {
        beforeEach(() => {
            jest.spyOn(sleepModule, 'sleep').mockResolvedValue(undefined);

            mockTimerService.getTimerState.mockReset();
            mockGameService.endRound.mockReset();
        });

        it('should call gameService.endRound with correct parameters when timer is ready', async () => {
            mockTimerService.getTimerState.mockReturnValue(true);

            await service['endRound'](mockGameId, mockAiPlayer.name);

            expect(sleepModule.sleep).toHaveBeenCalledWith(RandomTimeOptions.DefaultTime);
            expect(mockTimerService.getTimerState).toHaveBeenCalledWith(mockGameId);
            expect(mockGameService.endRound).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should wait until timerService.getTimerState returns true', async () => {
            mockTimerService.getTimerState.mockReturnValueOnce(false).mockReturnValueOnce(true);

            await service['endRound'](mockGameId, mockAiPlayer.name);

            expect(mockTimerService.getTimerState).toHaveBeenCalledTimes(2);
            expect(sleepModule.sleep).toHaveBeenCalledTimes(2);
            expect(mockGameService.endRound).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });

        it('should handle multiple waits before timer is ready', async () => {
            mockTimerService.getTimerState.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true);

            await service['endRound'](mockGameId, mockAiPlayer.name);

            expect(mockTimerService.getTimerState).toHaveBeenCalledTimes(4);
            expect(sleepModule.sleep).toHaveBeenCalledTimes(4);
            expect(mockGameService.endRound).toHaveBeenCalledWith(mockGameId, mockAiPlayer.name);
        });
    });

    describe('findClosestObjects', () => {
        const mockMovementInfo: MovementToItems = {
            playerPosition: { x: 5, y: 5 },
            map: { size: 10, terrain: [] } as any,
            itemTypes: [ItemType.Potion1, ItemType.Sword],
            movementLeft: 6,
            objects: [],
        };

        const mockObjects = [
            { coordinates: { x: 6, y: 5 }, distance: 2, type: 'item' },
            { coordinates: { x: 4, y: 5 }, distance: 1, type: 'item' },
        ];

        const sortedObjects = [
            { coordinates: { x: 4, y: 5 }, distance: 1, type: 'item' },
            { coordinates: { x: 6, y: 5 }, distance: 2, type: 'item' },
        ];

        beforeEach(() => {
            jest.spyOn(service as any, 'scanMapForObjects').mockReturnValue(mockObjects);
            jest.spyOn(service as any, 'sortObjectsByDistance').mockReturnValue(sortedObjects);
        });

        it('should call scanMapForObjects with correct parameters', () => {
            const players = [mockAiPlayer, mockHumanPlayer];

            const result = service['findClosestObjects'](mockMovementInfo, players);

            expect(service['scanMapForObjects']).toHaveBeenCalledWith(mockMovementInfo, players);
            expect(result).toBe(sortedObjects);
        });

        it('should use empty array as default for players parameter', () => {
            service['findClosestObjects'](mockMovementInfo);
            expect(service['scanMapForObjects']).toHaveBeenCalledWith(mockMovementInfo, []);
        });

        it('should pass the objects from scanMapForObjects to sortObjectsByDistance', () => {
            service['findClosestObjects'](mockMovementInfo, []);
            expect(service['sortObjectsByDistance']).toHaveBeenCalledWith(mockObjects);
        });
    });

    describe('scanMapForObjects', () => {
        const smallMapMovementInfo: MovementToItems = {
            playerPosition: { x: 1, y: 1 },
            map: { size: 3, terrain: [] } as any,
            itemTypes: [ItemType.Potion1],
            movementLeft: 5,
            objects: [],
        };

        const mockPlayers = [mockAiPlayer, mockHumanPlayer];

        beforeEach(() => {
            jest.spyOn(service as any, 'processTile').mockImplementation((info: any, players, coords) => {
                info.objects.push({
                    coordinates: coords,
                    distance: 1,
                    type: 'test',
                });
            });
        });

        it('should process all tiles except player position', () => {
            const processTileSpy = jest.spyOn(service as any, 'processTile');

            const result = service['scanMapForObjects'](smallMapMovementInfo, mockPlayers);

            expect(processTileSpy).toHaveBeenCalledTimes(8);
            expect(result.length).toBe(8);

            const playerPosInResults = result.some((obj) => obj.coordinates.x === 1 && obj.coordinates.y === 1);
            expect(playerPosInResults).toBe(false);
        });

        it('should pass the correct parameters to processTile', () => {
            const processTileSpy = jest.spyOn(service as any, 'processTile');

            service['scanMapForObjects'](smallMapMovementInfo, mockPlayers);

            expect(processTileSpy.mock.calls[0][0]).toBe(smallMapMovementInfo);
            expect(processTileSpy.mock.calls[0][1]).toBe(mockPlayers);
            expect(processTileSpy.mock.calls[0][2]).toEqual({ x: 0, y: 0 });
        });

        it('should update movementInfo.objects with results from processTile', () => {
            const result = service['scanMapForObjects'](smallMapMovementInfo, mockPlayers);

            expect(result.length).toBe(8);

            result.forEach((obj) => {
                expect(obj).toHaveProperty('coordinates');
                expect(obj).toHaveProperty('distance', 1);
                expect(obj).toHaveProperty('type', 'test');
            });
        });
    });

    describe('processTile', () => {
        const mockCoordinates = { x: 3, y: 4 };
        let mockMovementInfo: MovementToItems;

        const mockItemDistance = { distance: 2, accessible: true };
        const mockPlayerDistance = { distance: 3, accessible: true };

        const mockItemObjectInfo = { type: 'item', coordinates: mockCoordinates, item: ItemType.Potion1 };
        const mockPlayerObjectInfo = { type: 'player', coordinates: mockCoordinates, character: CharacterType.Character1 };

        beforeEach(() => {
            mockMovementInfo = {
                playerPosition: { x: 5, y: 5 },
                map: {
                    size: 10,
                    terrain: [
                        [],
                        [],
                        [],
                        [],
                        [
                            {},
                            {},
                            {},
                            {
                                item: ItemType.Potion1,
                                character: CharacterType.Character1,
                            },
                        ],
                    ],
                } as any,
                itemTypes: [ItemType.Potion1],
                movementLeft: 6,
                objects: [],
            };

            jest.spyOn(service as any, 'checkItem')
                .mockReset()
                .mockReturnValue(null);
            jest.spyOn(service as any, 'checkPlayer')
                .mockReset()
                .mockReturnValue(null);
            jest.spyOn(service as any, 'createItemObjectInfo')
                .mockReset()
                .mockReturnValue(mockItemObjectInfo);
            jest.spyOn(service as any, 'createPlayerObjectInfo')
                .mockReset()
                .mockReturnValue(mockPlayerObjectInfo);
        });

        it('should not modify objects array when neither item nor player is found', () => {
            service['processTile'](mockMovementInfo, [mockAiPlayer], mockCoordinates);

            expect(mockMovementInfo.objects).toEqual([]);
            expect(service['checkItem']).toHaveBeenCalledWith(mockMovementInfo, mockCoordinates);
            expect(service['checkPlayer']).toHaveBeenCalledWith(
                expect.objectContaining({
                    playerPosition: mockMovementInfo.playerPosition,
                    coordinates: mockCoordinates,
                }),
            );
        });

        it('should add item object when item is found', () => {
            (service['checkItem'] as jest.Mock).mockReturnValue(mockItemDistance);

            service['processTile'](mockMovementInfo, [mockAiPlayer], mockCoordinates);

            expect(service['createItemObjectInfo']).toHaveBeenCalledWith(
                mockCoordinates,
                mockItemDistance,
                mockMovementInfo.map.terrain[mockCoordinates.y][mockCoordinates.x].item,
            );
            expect(mockMovementInfo.objects).toEqual([mockItemObjectInfo]);
        });

        it('should add player object when player is found', () => {
            (service['checkPlayer'] as jest.Mock).mockReturnValue(mockPlayerDistance);

            service['processTile'](mockMovementInfo, [mockAiPlayer], mockCoordinates);

            expect(service['createPlayerObjectInfo']).toHaveBeenCalledWith(
                mockCoordinates,
                mockPlayerDistance,
                mockMovementInfo.map.terrain[mockCoordinates.y][mockCoordinates.x].character,
            );
            expect(mockMovementInfo.objects).toEqual([mockPlayerObjectInfo]);
        });

        it('should add both objects when both item and player are found', () => {
            (service['checkItem'] as jest.Mock).mockReturnValue(mockItemDistance);
            (service['checkPlayer'] as jest.Mock).mockReturnValue(mockPlayerDistance);

            service['processTile'](mockMovementInfo, [mockAiPlayer], mockCoordinates);

            expect(mockMovementInfo.objects).toEqual([mockItemObjectInfo, mockPlayerObjectInfo]);
        });

        it('should pass the right parameters to checkPlayer', () => {
            service['processTile'](mockMovementInfo, [mockAiPlayer], mockCoordinates);

            expect(service['checkPlayer']).toHaveBeenCalledWith({
                playerPosition: mockMovementInfo.playerPosition,
                map: mockMovementInfo.map,
                players: [mockAiPlayer],
                movementLeft: mockMovementInfo.movementLeft,
                coordinates: mockCoordinates,
            });
        });
    });

    describe('createItemObjectInfo', () => {
        const mockCoordinates = { x: 3, y: 4 };
        const mockDistanceInfo = {
            distance: 2,
            reachable: true,
        };
        const mockItemType = ItemType.Potion1;

        it('should create an object with the correct shape and properties', () => {
            const result = service['createItemObjectInfo'](mockCoordinates, mockDistanceInfo, mockItemType);

            expect(result).toEqual({
                coordinates: mockCoordinates,
                distance: mockDistanceInfo.distance,
                reachable: mockDistanceInfo.reachable,
                type: 'item',
                itemType: mockItemType,
            });
        });

        it('should preserve the exact input values in the result', () => {
            const customCoords = { x: 7, y: 9 };
            const customDistance = { distance: 5, reachable: false };

            const result = service['createItemObjectInfo'](customCoords, customDistance, ItemType.Sword);

            expect(result.coordinates).toBe(customCoords);
            expect(result.distance).toBe(customDistance.distance);
            expect(result.reachable).toBe(customDistance.reachable);
            expect(result.itemType).toBe(ItemType.Sword);
        });

        it('should always set type to "item"', () => {
            const result = service['createItemObjectInfo'](mockCoordinates, mockDistanceInfo, mockItemType);
            expect(result.type).toBe('item');
        });
    });

    describe('createPlayerObjectInfo', () => {
        const mockCoordinates = { x: 3, y: 4 };
        const mockDistanceInfo = {
            distance: 2,
            reachable: true,
        };
        const mockPlayerId = CharacterType.Character1;

        it('should create an object with the correct shape and properties', () => {
            const result = service['createPlayerObjectInfo'](mockCoordinates, mockDistanceInfo, mockPlayerId);

            expect(result).toEqual({
                coordinates: mockCoordinates,
                distance: mockDistanceInfo.distance,
                reachable: mockDistanceInfo.reachable,
                type: 'player',
                playerId: mockPlayerId,
            });
        });

        it('should preserve the exact input values in the result', () => {
            const customCoords = { x: 7, y: 9 };
            const customDistance = { distance: 5, reachable: false };
            const customPlayerId = CharacterType.Character2;

            const result = service['createPlayerObjectInfo'](customCoords, customDistance, customPlayerId);

            expect(result.coordinates).toBe(customCoords);
            expect(result.distance).toBe(customDistance.distance);
            expect(result.reachable).toBe(customDistance.reachable);
            expect(result.playerId).toBe(customPlayerId);
        });

        it('should always set type to "player"', () => {
            const result = service['createPlayerObjectInfo'](mockCoordinates, mockDistanceInfo, mockPlayerId);
            expect(result.type).toBe('player');
        });
    });

    describe('sortObjectsByDistance', () => {
        it('should sort objects by distance in ascending order', () => {
            const mockObjects: ObjectInfo[] = [
                { coordinates: { x: 1, y: 1 }, distance: 5, reachable: true, type: 'item', itemType: ItemType.Potion1 },
                { coordinates: { x: 2, y: 2 }, distance: 2, reachable: true, type: 'item', itemType: ItemType.Barrel },
                { coordinates: { x: 3, y: 3 }, distance: 8, reachable: false, type: 'player', playerId: 'player-1' },
                { coordinates: { x: 4, y: 4 }, distance: 1, reachable: true, type: 'item', itemType: ItemType.Sword },
            ];

            const result = service['sortObjectsByDistance'](mockObjects);

            expect(result[0].distance).toBe(1);
            expect(result[1].distance).toBe(2);
            expect(result[2].distance).toBe(5);
            expect(result[3].distance).toBe(8);

            expect(result[0].coordinates).toEqual({ x: 4, y: 4 });
            expect(result[0].type).toBe('item');
            expect(result[3].type).toBe('player');
        });

        it('should return empty array when given empty array', () => {
            const result = service['sortObjectsByDistance']([]);
            expect(result).toEqual([]);
        });

        it('should maintain order for objects with equal distances', () => {
            const mockObjects: ObjectInfo[] = [
                { coordinates: { x: 1, y: 1 }, distance: 3, reachable: true, type: 'item', itemType: ItemType.Potion1 },
                { coordinates: { x: 2, y: 2 }, distance: 3, reachable: false, type: 'player', playerId: 'player-1' },
            ];

            const result = service['sortObjectsByDistance'](mockObjects);

            expect(result[0].type).toBe('item');
            expect(result[1].type).toBe('player');
        });
    });

    describe('checkItem', () => {
        const mockCoordinates = { x: 3, y: 4 };
        let mockMovementInfo: MovementToItems;
        const mockCompletePath = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 4 },
        ];

        beforeEach(() => {
            mockMovementInfo = {
                playerPosition: { x: 1, y: 1 },
                map: {
                    terrain: [[], [], [], [], [null, null, null, { item: ItemType.Potion1 }]],
                } as any,
                itemTypes: [ItemType.Potion1, ItemType.Sword],
                movementLeft: 5,
            };

            mockDijkstraService.findCompletePath.mockReset();
            mockDijkstraService.calculateCost.mockReset();

            mockDijkstraService.findCompletePath.mockReturnValue(mockCompletePath);
            mockDijkstraService.calculateCost.mockReturnValue(3);
        });

        it('should return distance info when item is found and path exists', () => {
            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(mockDijkstraService.findCompletePath).toHaveBeenCalledWith(
                mockMovementInfo.map.terrain,
                mockMovementInfo.playerPosition,
                mockCoordinates,
                false,
            );
            expect(mockDijkstraService.calculateCost).toHaveBeenCalledWith(mockCompletePath, mockMovementInfo.map.terrain);

            expect(result).toEqual({
                distance: 3,
                reachable: true,
            });
        });

        it('should mark item as not reachable when distance exceeds movement left', () => {
            mockDijkstraService.calculateCost.mockReturnValue(8);
            mockMovementInfo.movementLeft = 6;

            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(result).toEqual({
                distance: 8,
                reachable: false,
            });
        });

        it('should return undefined when no path exists to item', () => {
            mockDijkstraService.findCompletePath.mockReturnValue(null);

            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(result).toBeUndefined();
        });

        it('should return undefined when item type is not in itemTypes', () => {
            mockMovementInfo.map.terrain[4][3].item = ItemType.Barrel;

            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(mockDijkstraService.findCompletePath).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when itemTypes is empty', () => {
            mockMovementInfo.itemTypes = [];

            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(mockDijkstraService.findCompletePath).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when no item exists at coordinates', () => {
            mockMovementInfo.map.terrain[4][3].item = undefined;

            const result = service['checkItem'](mockMovementInfo, mockCoordinates);

            expect(mockDijkstraService.findCompletePath).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });
    });

    describe('checkPlayer', () => {
        const mockCoordinates = { x: 3, y: 4 };
        const mockCompletePath = [
            { x: 3, y: 4 },
            { x: 2, y: 4 },
            { x: 1, y: 4 },
        ];
        let mockParams: PlayerPathParams;

        beforeEach(() => {
            mockParams = {
                playerPosition: { x: 1, y: 4 },
                map: {
                    terrain: [[], [], [], [], [null, null, null, { character: CharacterType.Character1 }]],
                } as any,
                players: [{ id: CharacterType.Character1, name: 'Test Player' }] as Player[],
                movementLeft: 5,
                coordinates: mockCoordinates,
            };

            mockDijkstraService.findPathToCharacter.mockReset();
            mockDijkstraService.calculateCost.mockReset();

            mockDijkstraService.findPathToCharacter.mockReturnValue(mockCompletePath);
            mockDijkstraService.calculateCost.mockReturnValue(3);
        });

        it('should return distance info when player is found and path exists', () => {
            const result = service['checkPlayer'](mockParams);

            expect(mockDijkstraService.findPathToCharacter).toHaveBeenCalledWith(
                mockParams.map.terrain,
                mockCoordinates,
                mockParams.playerPosition,
                false,
            );
            expect(mockDijkstraService.calculateCost).toHaveBeenCalledWith(mockCompletePath, mockParams.map.terrain);

            expect(result).toEqual({
                distance: 3,
                reachable: true,
            });
        });

        it('should mark player as not reachable when distance exceeds movement left', () => {
            mockDijkstraService.calculateCost.mockReturnValue(8);
            mockParams.movementLeft = 6;

            const result = service['checkPlayer'](mockParams);

            expect(result).toEqual({
                distance: 8,
                reachable: false,
            });
        });

        it('should return undefined when no path exists to player', () => {
            mockDijkstraService.findPathToCharacter.mockReturnValue(null);

            const result = service['checkPlayer'](mockParams);

            expect(result).toBeUndefined();
        });

        it('should return undefined when character does not match any player', () => {
            mockParams.players = [{ id: CharacterType.Character2, name: 'Different Player' }] as Player[];

            const result = service['checkPlayer'](mockParams);

            expect(mockDijkstraService.findPathToCharacter).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when players array is empty', () => {
            mockParams.players = [];

            const result = service['checkPlayer'](mockParams);

            expect(mockDijkstraService.findPathToCharacter).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when no character exists at coordinates', () => {
            mockParams.map.terrain[4][3].character = CharacterType.NoCharacter;

            const result = service['checkPlayer'](mockParams);

            expect(mockDijkstraService.findPathToCharacter).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });
    });

    describe('checkNearby', () => {
        const mockAiPosition = { x: 5, y: 5 };

        beforeEach(() => {
            mockGameService.getPlayerPosition.mockReset();
            jest.spyOn(service, 'initiateCombat').mockResolvedValue(undefined);
        });

        it('should return false when there are no adjacent enemies', async () => {
            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return mockAiPosition;
                return { x: 7, y: 7 };
            });

            const result = await service['checkNearby'](mockAi);

            expect(result).toBe(false);
            expect(service.initiateCombat).not.toHaveBeenCalled();
        });

        it('should return true and initiate combat when there is an adjacent enemy', async () => {
            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return mockAiPosition;
                return { x: 5, y: 6 };
            });

            const result = await service['checkNearby'](mockAi);

            expect(result).toBe(true);
            expect(service.initiateCombat).toHaveBeenCalledWith(mockAi, mockHumanPlayer);
        });

        it('should pick the first adjacent enemy when multiple are available', async () => {
            const secondEnemy = { ...mockHumanPlayer, id: CharacterType.Character3 };
            const aiWithMultipleEnemies = {
                ...mockAi,
                enemies: [mockHumanPlayer, secondEnemy],
            };

            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return mockAiPosition;
                if (playerId === mockHumanPlayer.id) return { x: 6, y: 5 };
                if (playerId === secondEnemy.id) return { x: 5, y: 4 };
                return { x: 0, y: 0 };
            });

            const result = await service['checkNearby'](aiWithMultipleEnemies);

            expect(result).toBe(true);
            expect(service.initiateCombat).toHaveBeenCalledWith(aiWithMultipleEnemies, mockHumanPlayer);
            expect(service.initiateCombat).toHaveBeenCalledTimes(1);
        });

        it('should correctly calculate Manhattan distance for adjacency', async () => {
            mockGameService.getPlayerPosition.mockImplementation((gameId, playerId) => {
                if (playerId === mockAiPlayer.id) return mockAiPosition;
                return { x: 6, y: 6 };
            });

            const result = await service['checkNearby'](mockAi);
            expect(result).toBe(false);
            expect(service.initiateCombat).not.toHaveBeenCalled();
        });
    });
});
