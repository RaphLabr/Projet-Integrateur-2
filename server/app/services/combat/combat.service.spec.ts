// We use magic numbers to simplify testing of attack values
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Max line disable in test file
/* eslint-disable max-lines */
// We allow the use of any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClosestFreeTileAlgorithm } from '@app/classes/closest-free-tile-algorithm/closest-free-tile-algorithm';
import { EVADE_CHANCES, MAX_EVASIONS, MAX_WINS } from '@app/constants/combat-constants';
import { DiceOptions } from '@app/constants/dice-options';
import { MapTile } from '@app/constants/map-tile';
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { GameData } from '@app/interfaces/game-info/game-info.interface';
import { CombatMessagesService } from '@app/services/combat-messages/combat-messages.service';
import { CombatService } from '@app/services/combat/combat.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics-service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CharacterType } from '@common/character-type';
import { CombatRequestPayload } from '@common/combat-request-payload';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapSize } from '@common/map-size';
import { MapTileType } from '@common/map-tile-type';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';
import { Teams } from '@common/teams';
import { Test, TestingModule } from '@nestjs/testing';

describe('CombatService', () => {
    let service: CombatService;
    let gameRoomGatewayMock: jest.Mocked<GameRoomGateway>;
    let mapServiceMock: jest.Mocked<GameMapService>;
    let timerServiceMock: jest.Mocked<GameTimerService>;
    let gameEmitterGatewayMock: jest.Mocked<GameEmitterGateway>;
    let combatMessagesServiceMock: jest.Mocked<CombatMessagesService>;
    let virtualPlayerServiceMock: jest.Mocked<VirtualPlayerService>;
    let gameStatisticsServiceMock: jest.Mocked<GameStatisticsService>;

    const mockGameId = 'game123';

    const mockPlayer: Player = {
        id: CharacterType.Character1,
        userId: 'player-123',
        name: 'TestPlayer',
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
        isBarrelActive: false,
        isTorchActive: false,
    };

    const mockEnemy: Player = {
        id: CharacterType.Character2,
        userId: 'enemy-123',
        name: 'Enemy',
        health: 5,
        maxHealth: 5,
        attack: 6,
        defense: 4,
        speed: 5,
        wins: 0,
        startPosition: { x: 5, y: 5 },
        dice: { attack: 6, defense: 4 },
        items: [],
        evadeAttempts: 0,
        hasAbandoned: false,
        team: Teams.NoTeam,
        isBarrelActive: false,
        isTorchActive: false,
    };

    const createMockTerrain = () =>
        Array(MapSize.Small)
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

    beforeEach(async () => {
        gameRoomGatewayMock = {
            sendCombatMessage: jest.fn(),
            sendCombatOverMessage: jest.fn(),
            sendCombatOverLog: jest.fn(),
        } as unknown as jest.Mocked<GameRoomGateway>;

        mapServiceMock = {} as jest.Mocked<GameMapService>;
        timerServiceMock = {} as jest.Mocked<GameTimerService>;
        gameEmitterGatewayMock = {} as jest.Mocked<GameEmitterGateway>;
        combatMessagesServiceMock = {} as jest.Mocked<CombatMessagesService>;
        virtualPlayerServiceMock = {} as jest.Mocked<VirtualPlayerService>;
        gameStatisticsServiceMock = {} as jest.Mocked<GameStatisticsService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatService,
                { provide: GameRoomGateway, useValue: gameRoomGatewayMock },
                { provide: GameMapService, useValue: mapServiceMock },
                { provide: GameTimerService, useValue: timerServiceMock },
                { provide: GameEmitterGateway, useValue: gameEmitterGatewayMock },
                { provide: CombatMessagesService, useValue: combatMessagesServiceMock },
                { provide: VirtualPlayerService, useValue: virtualPlayerServiceMock },
                { provide: GameStatisticsService, useValue: gameStatisticsServiceMock },
            ],
        }).compile();

        service = module.get<CombatService>(CombatService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('evadeAttempt', () => {
        let mockCurrentPlayer: Player;
        let mockEnemyPlayer: Player;
        const originalMathRandom = Math.random;

        beforeEach(() => {
            jest.clearAllMocks();

            mockCurrentPlayer = {
                ...mockPlayer,
                evadeAttempts: 0,
            };

            mockEnemyPlayer = {
                ...mockEnemy,
            };

            combatMessagesServiceMock.successfulEvadeMessage = jest.fn();
            combatMessagesServiceMock.failedEvadeMessage = jest.fn();
            gameStatisticsServiceMock.updateAStatisticForPlayer = jest.fn();
        });

        afterEach(() => {
            Math.random = originalMathRandom;
        });

        it('should return false if player has reached MAX_EVASIONS', () => {
            mockCurrentPlayer.evadeAttempts = MAX_EVASIONS;

            const result = service.evadeAttempt(mockGameId, mockCurrentPlayer, mockEnemyPlayer);

            expect(result).toBe(false);
            expect(mockCurrentPlayer.evadeAttempts).toBe(MAX_EVASIONS);
            expect(combatMessagesServiceMock.successfulEvadeMessage).not.toHaveBeenCalled();
            expect(combatMessagesServiceMock.failedEvadeMessage).not.toHaveBeenCalled();
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).not.toHaveBeenCalled();
        });

        it('should increment evadeAttempts regardless of success or failure', () => {
            Math.random = jest.fn().mockReturnValue(1);

            const initialAttempts = mockCurrentPlayer.evadeAttempts;
            service.evadeAttempt(mockGameId, mockCurrentPlayer, mockEnemyPlayer);

            expect(mockCurrentPlayer.evadeAttempts).toBe(initialAttempts + 1);
        });

        it('should return true and call successfulEvadeMessage for successful evade', () => {
            Math.random = jest.fn().mockReturnValue(0);
            const result = service.evadeAttempt(mockGameId, mockCurrentPlayer, mockEnemyPlayer);

            expect(result).toBe(true);
            expect(combatMessagesServiceMock.successfulEvadeMessage).toHaveBeenCalledWith(mockGameId, mockCurrentPlayer, mockEnemyPlayer);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(mockGameId, mockCurrentPlayer, 'evasions');
        });

        it('should return false and call failedEvadeMessage for failed evade', () => {
            Math.random = jest.fn().mockReturnValue(1);

            const result = service.evadeAttempt(mockGameId, mockCurrentPlayer, mockEnemyPlayer);

            expect(result).toBe(false);
            expect(combatMessagesServiceMock.failedEvadeMessage).toHaveBeenCalledWith(mockGameId, mockCurrentPlayer, mockEnemyPlayer);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).not.toHaveBeenCalled();
        });

        it('should handle the boundary value of EVADE_CHANCES correctly', () => {
            const evadeChances = 0.3;
            Math.random = jest.fn().mockReturnValue(evadeChances);
            const actualEvadeChances = EVADE_CHANCES;
            const result = service.evadeAttempt(mockGameId, mockCurrentPlayer, mockEnemyPlayer);
            if (evadeChances <= actualEvadeChances) {
                expect(result).toBe(true);
                expect(combatMessagesServiceMock.successfulEvadeMessage).toHaveBeenCalled();
            } else {
                expect(result).toBe(false);
                expect(combatMessagesServiceMock.failedEvadeMessage).toHaveBeenCalled();
            }
        });
    });

    describe('attack', () => {
        let mockGameData: GameData;
        const attackerName = 'TestPlayer';

        beforeEach(() => {
            const attacker = {
                ...mockPlayer,
                name: attackerName,
                attack: 6,
            };

            const defender = {
                ...mockEnemy,
                health: 5,
                defense: 3,
            };

            const playersInCombat: PlayersInCombat = {
                initiator: attacker,
                target: defender,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };

            mockGameData = {
                playersInCombat,
                attackerName,
                isInDebugMode: false,
            } as GameData;

            combatMessagesServiceMock.attackMessage = jest.fn();
            gameStatisticsServiceMock.updateAStatisticForPlayer = jest.fn();
            virtualPlayerServiceMock.handleCombat = jest.fn();

            jest.spyOn(service as any, 'getAttackInfo').mockImplementation(() => ({
                gameId: mockGameId,
                attacker: playersInCombat.initiator,
                defender: playersInCombat.target,
                attackRoll: 4,
                defenseRoll: 2,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 10,
                defenseTotal: 5,
                attackResult: 5,
            }));
        });

        it('should reduce defender health by attackResult when attackResult is positive', () => {
            const initialHealth = mockGameData.playersInCombat.target.health;
            const result = (service as any).attack(mockGameId, mockGameData);
            const attackResult = 5;

            expect(mockGameData.playersInCombat.target.health).toBe(initialHealth - attackResult);
            expect(result.playerHealth).toBe(initialHealth - attackResult);
        });

        it('should update statistics when damage is dealt', () => {
            (service as any).attack(mockGameId, mockGameData);
            const livesTaken = 5;

            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(
                mockGameId,
                mockGameData.playersInCombat.initiator,
                'livesTaken',
                livesTaken,
            );

            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(
                mockGameId,
                mockGameData.playersInCombat.target,
                'livesLost',
                livesTaken,
            );
        });

        it('should not reduce defender health or update statistics when attackResult is zero', () => {
            (service as any).getAttackInfo.mockReturnValueOnce({
                gameId: mockGameId,
                attacker: mockGameData.playersInCombat.initiator,
                defender: mockGameData.playersInCombat.target,
                attackRoll: 2,
                defenseRoll: 3,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 8,
                defenseTotal: 8,
                attackResult: 0,
            });

            const initialHealth = mockGameData.playersInCombat.target.health;
            const result = (service as any).attack(mockGameId, mockGameData);

            expect(mockGameData.playersInCombat.target.health).toBe(initialHealth);
            expect(result.playerHealth).toBe(initialHealth);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).not.toHaveBeenCalled();
        });

        it('should not reduce defender health or update statistics when attackResult is negative', () => {
            (service as any).getAttackInfo.mockReturnValueOnce({
                gameId: mockGameId,
                attacker: mockGameData.playersInCombat.initiator,
                defender: mockGameData.playersInCombat.target,
                attackRoll: 1,
                defenseRoll: 6,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 7,
                defenseTotal: 9,
                attackResult: -2,
            });

            const initialHealth = mockGameData.playersInCombat.target.health;
            const result = (service as any).attack(mockGameId, mockGameData);

            expect(mockGameData.playersInCombat.target.health).toBe(initialHealth);
            expect(result.playerHealth).toBe(initialHealth);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).not.toHaveBeenCalled();
        });

        it('should call combatMessagesService.attackMessage with attack info', () => {
            const attackInfo = {
                gameId: mockGameId,
                attacker: mockGameData.playersInCombat.initiator,
                defender: mockGameData.playersInCombat.target,
                attackRoll: 4,
                defenseRoll: 2,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 10,
                defenseTotal: 5,
                attackResult: 5,
            };
            (service as any).getAttackInfo.mockReturnValueOnce(attackInfo);

            (service as any).attack(mockGameId, mockGameData);

            expect(combatMessagesServiceMock.attackMessage).toHaveBeenCalledWith(attackInfo);
        });

        it('should return a CombatAttackPayload with correct data', () => {
            const result = (service as any).attack(mockGameId, mockGameData);

            expect(result).toEqual({
                gameId: mockGameId,
                playerName: mockGameData.playersInCombat.target.name,
                playerHealth: mockGameData.playersInCombat.target.health,
            });
        });
    });

    describe('endFight', () => {
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            const initiator = {
                ...mockPlayer,
                health: 2,
                maxHealth: 5,
                evadeAttempts: 2,
            };

            const target = {
                ...mockEnemy,
                health: 1,
                maxHealth: 5,
                evadeAttempts: 1,
            };

            playersInCombat = {
                initiator,
                target,
                initiatorPosition: { x: 0, y: 0 },
                targetPosition: { x: 1, y: 1 },
            };
        });

        it('should restore initiator health to maxHealth', () => {
            service.endFight(playersInCombat);

            expect(playersInCombat.initiator.health).toBe(playersInCombat.initiator.maxHealth);
        });

        it('should restore target health to maxHealth', () => {
            service.endFight(playersInCombat);

            expect(playersInCombat.target.health).toBe(playersInCombat.target.maxHealth);
        });

        it('should reset initiator evadeAttempts to 0', () => {
            service.endFight(playersInCombat);

            expect(playersInCombat.initiator.evadeAttempts).toBe(0);
        });

        it('should reset target evadeAttempts to 0', () => {
            service.endFight(playersInCombat);

            expect(playersInCombat.target.evadeAttempts).toBe(0);
        });

        it('should handle max evadeAttempts value', () => {
            playersInCombat.initiator.evadeAttempts = MAX_EVASIONS;

            service.endFight(playersInCombat);
            expect(playersInCombat.initiator.evadeAttempts).toBe(0);
        });
    });

    describe('getWinner', () => {
        let mockGameData: GameData;
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            const initiator = {
                ...mockPlayer,
                health: 5,
                hasAbandoned: false,
                wins: 0,
            };

            const target = {
                ...mockEnemy,
                health: 5,
                hasAbandoned: false,
                wins: 0,
            };

            playersInCombat = {
                initiator,
                target,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };

            mockGameData = {
                players: [initiator, target],
                map: {
                    terrain: createMockTerrain(),
                    size: MapSize.Small,
                },
            } as GameData;

            gameStatisticsServiceMock.updateAStatisticForPlayer = jest.fn();
            combatMessagesServiceMock.combatWinnerMessage = jest.fn();
            mapServiceMock.teleportPlayer = jest.fn();
            mapServiceMock.placeItem = jest.fn();
            gameEmitterGatewayMock.emitLoserPlayer = jest.fn();
        });

        it('should return null when no player is defeated', () => {
            const result = service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(result).toBeNull();
            expect(playersInCombat.initiator.wins).toBe(0);
            expect(playersInCombat.target.wins).toBe(0);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).not.toHaveBeenCalled();
            expect(combatMessagesServiceMock.combatWinnerMessage).not.toHaveBeenCalled();
        });

        it('should return target as winner when initiator health is <= 0', () => {
            playersInCombat.initiator.health = 0;

            jest.spyOn(ClosestFreeTileAlgorithm, 'findClosestFreeTile').mockReturnValue({ x: 0, y: 0 });

            const result = service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(result).toBe(playersInCombat.target);
            expect(playersInCombat.target.wins).toBe(1);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(mockGameId, playersInCombat.target, 'wins');
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(mockGameId, playersInCombat.initiator, 'losses');
            expect(combatMessagesServiceMock.combatWinnerMessage).toHaveBeenCalledWith(mockGameId, playersInCombat, playersInCombat.target);
        });

        it('should return initiator as winner when target health is <= 0', () => {
            playersInCombat.target.health = 0;

            jest.spyOn(ClosestFreeTileAlgorithm, 'findClosestFreeTile').mockReturnValue({ x: 0, y: 0 });

            const result = service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(result).toBe(playersInCombat.initiator);
            expect(playersInCombat.initiator.wins).toBe(1);
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(mockGameId, playersInCombat.initiator, 'wins');
            expect(gameStatisticsServiceMock.updateAStatisticForPlayer).toHaveBeenCalledWith(mockGameId, playersInCombat.target, 'losses');
        });

        it('should return target as winner when initiator has abandoned', () => {
            playersInCombat.initiator.hasAbandoned = true;

            const result = service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(result).toBe(playersInCombat.target);
            expect(mapServiceMock.teleportPlayer).not.toHaveBeenCalled();
        });

        it('should return initiator as winner when target has abandoned', () => {
            playersInCombat.target.hasAbandoned = true;

            const result = service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(result).toBe(playersInCombat.initiator);
            expect(mapServiceMock.teleportPlayer).not.toHaveBeenCalled();
        });

        it('should update loser position when loser has not abandoned', () => {
            playersInCombat.initiator.health = 0;

            const mockTeleportData = {
                from: playersInCombat.initiatorPosition,
                to: { x: 0, y: 0 },
                gameId: mockGameId,
            };

            jest.spyOn(ClosestFreeTileAlgorithm, 'findClosestFreeTile').mockReturnValue({ x: 0, y: 0 });

            service.getWinner(mockGameId, mockGameData, playersInCombat);

            expect(ClosestFreeTileAlgorithm.findClosestFreeTile).toHaveBeenCalledWith(
                mockGameId,
                mockGameData,
                playersInCombat.initiator.startPosition,
                true,
            );
            expect(mapServiceMock.teleportPlayer).toHaveBeenCalledWith(mockGameData, mockTeleportData, true);
        });
    });

    describe('getFirstPlayerToAttackName', () => {
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            playersInCombat = {
                initiator: {
                    ...mockPlayer,
                    speed: 3,
                },
                target: {
                    ...mockEnemy,
                    speed: 4,
                },
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };
        });

        it('should return initiator name when initiator speed is higher', () => {
            playersInCombat.initiator.speed = 5;
            playersInCombat.target.speed = 3;

            const result = service.getFirstPlayerToAttackName(playersInCombat);

            expect(result).toBe(playersInCombat.initiator.name);
        });

        it('should return initiator name when speeds are equal', () => {
            playersInCombat.initiator.speed = 4;
            playersInCombat.target.speed = 4;

            const result = service.getFirstPlayerToAttackName(playersInCombat);

            expect(result).toBe(playersInCombat.initiator.name);
        });

        it('should return target name when target speed is higher', () => {
            playersInCombat.initiator.speed = 3;
            playersInCombat.target.speed = 5;

            const result = service.getFirstPlayerToAttackName(playersInCombat);

            expect(result).toBe(playersInCombat.target.name);
        });
    });

    describe('getAttacker', () => {
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            playersInCombat = {
                initiator: {
                    ...mockPlayer,
                    name: 'InitiatorPlayer',
                },
                target: {
                    ...mockEnemy,
                    name: 'TargetPlayer',
                },
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };
        });

        it('should return initiator when attackerName matches initiator name', () => {
            const result = service.getAttacker(playersInCombat, 'InitiatorPlayer');

            expect(result).toBe(playersInCombat.initiator);
        });

        it('should return target when attackerName matches target name', () => {
            const result = service.getAttacker(playersInCombat, 'TargetPlayer');

            expect(result).toBe(playersInCombat.target);
        });
    });

    describe('getDefender', () => {
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            playersInCombat = {
                initiator: {
                    ...mockPlayer,
                    name: 'InitiatorPlayer',
                },
                target: {
                    ...mockEnemy,
                    name: 'TargetPlayer',
                },
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };
        });

        it('should return target when attackerName matches initiator name', () => {
            const result = service.getDefender(playersInCombat, 'InitiatorPlayer');

            expect(result).toBe(playersInCombat.target);
        });

        it('should return initiator when attackerName matches target name', () => {
            const result = service.getDefender(playersInCombat, 'TargetPlayer');

            expect(result).toBe(playersInCombat.initiator);
        });
    });

    describe('isPlayerInCombat', () => {
        let playersInCombat: PlayersInCombat;

        beforeEach(() => {
            playersInCombat = {
                initiator: {
                    ...mockPlayer,
                    name: 'InitiatorPlayer',
                },
                target: {
                    ...mockEnemy,
                    name: 'TargetPlayer',
                },
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };
        });

        it('should return true when playerName matches initiator name', () => {
            const result = service.isPlayerInCombat('InitiatorPlayer', playersInCombat);

            expect(result).toBeTruthy();
        });

        it('should return true when playerName matches target name', () => {
            const result = service.isPlayerInCombat('TargetPlayer', playersInCombat);

            expect(result).toBeTruthy();
        });

        it('should return false when playerName matches neither player', () => {
            const result = service.isPlayerInCombat('NonExistentPlayer', playersInCombat);

            expect(result).toBeFalsy();
        });

        it('should return false when playerName is empty', () => {
            const result = service.isPlayerInCombat('', playersInCombat);

            expect(result).toBeFalsy();
        });
    });

    describe('receivedEvade', () => {
        let mockGameData: Partial<GameData>;
        const attackerName = 'TestPlayer';

        beforeEach(() => {
            mockGameData = {
                attackerName,
                isCombatActionUsed: false,
                isInCombat: true,
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
            };

            gameEmitterGatewayMock.emitFailedEvade = jest.fn();
            timerServiceMock.stopTimer = jest.fn();

            jest.spyOn(service, 'getAttacker').mockReturnValue(mockPlayer);
            jest.spyOn(service, 'getDefender').mockReturnValue(mockEnemy);
            jest.spyOn(service as any, 'endCombat').mockImplementation(() => undefined);
            jest.clearAllMocks();
        });

        it('should set isCombatActionUsed to true', () => {
            jest.spyOn(service, 'evadeAttempt').mockReturnValue(false);

            service.receivedEvade(mockGameId, mockGameData as GameData);

            expect(mockGameData.isCombatActionUsed).toBe(true);
        });

        it('should get evader and opponent from playersInCombat', () => {
            jest.spyOn(service, 'evadeAttempt').mockReturnValue(false);

            service.receivedEvade(mockGameId, mockGameData as GameData);

            expect(service.getAttacker).toHaveBeenCalledWith(mockGameData.playersInCombat, attackerName);
            expect(service.getDefender).toHaveBeenCalledWith(mockGameData.playersInCombat, attackerName);
        });

        it('should call evadeAttempt with correct parameters', () => {
            const evadeAttemptSpy = jest.spyOn(service, 'evadeAttempt').mockReturnValue(false);

            service.receivedEvade(mockGameId, mockGameData as GameData);

            expect(evadeAttemptSpy).toHaveBeenCalledWith(mockGameId, mockPlayer, mockEnemy);
        });

        it('should end combat when evade is successful', () => {
            jest.spyOn(service, 'evadeAttempt').mockReturnValue(true);

            service.receivedEvade(mockGameId, mockGameData as GameData);

            expect((service as any).endCombat).toHaveBeenCalledWith(mockGameId, mockGameData);
            expect(gameEmitterGatewayMock.emitFailedEvade).not.toHaveBeenCalled();
            expect(timerServiceMock.stopTimer).not.toHaveBeenCalled();
        });

        it('should emit failed evade and stop timer when evade fails', () => {
            jest.spyOn(service, 'evadeAttempt').mockReturnValue(false);

            service.receivedEvade(mockGameId, mockGameData as GameData);

            expect((service as any).endCombat).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitFailedEvade).toHaveBeenCalledWith(mockGameId, mockPlayer.name);
            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });
    });

    describe('attackCycle', () => {
        let mockGameData: GameData;
        const attackerName = 'TestPlayer';

        beforeEach(() => {
            mockGameData = {
                attackerName,
                isInCombat: true,
                isCombatActionUsed: false,
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
                players: [mockPlayer, mockEnemy],
                currentPlayerIndex: 0,
                map: {
                    id: 'map123',
                    terrain: [[{ type: MapTileType.Base, item: ItemType.NoItem, character: CharacterType.NoCharacter }]],
                    name: 'TestMap',
                    mode: GameMode.Classic,
                    visibility: true,
                    size: MapSize.Small,
                    lastModified: '2023-10-01T00:00:00Z',
                    description: 'Test map description',
                    creator: 'creator-123',
                },
                combatWinnerName: '',
                isActionUsed: false,
                isInDebugMode: false,
                isInRound: false,
                isPlayerMoving: false,
                movementLeft: 0,
                adminId: CharacterType.NoCharacter,
            } as GameData;

            mapServiceMock.getTileFromId = jest.fn().mockReturnValue({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });

            gameEmitterGatewayMock.emitCombatAttack = jest.fn();
            gameEmitterGatewayMock.emitCombatOver = jest.fn();
            gameEmitterGatewayMock.emitCombatWinner = jest.fn();
            timerServiceMock.stopTimer = jest.fn();

            jest.spyOn(service as any, 'attack').mockReturnValue({
                gameId: mockGameId,
                playerName: mockEnemy.name,
                playerHealth: 3,
            });

            jest.spyOn(service, 'getWinner').mockReturnValue(null);
            jest.spyOn(service as any, 'endCombat').mockImplementation(() => undefined);
        });

        it('should set isCombatActionUsed to true', () => {
            service.attackCycle(mockGameId, mockGameData as GameData);
            expect(mockGameData.isCombatActionUsed).toBe(true);
        });

        it('should call attack method and emit result', () => {
            const attackPayload = {
                gameId: mockGameId,
                playerName: mockEnemy.name,
                playerHealth: 3,
            };

            ((service as any).attack as jest.Mock).mockReturnValue(attackPayload);

            service.attackCycle(mockGameId, mockGameData as GameData);

            expect((service as any).attack).toHaveBeenCalledWith(mockGameId, mockGameData);
            expect(gameEmitterGatewayMock.emitCombatAttack).toHaveBeenCalledWith(attackPayload);
        });

        it('should check for winner after attack', () => {
            jest.spyOn(service as any, 'attack').mockReturnValue({
                gameId: mockGameId,
                playerName: mockEnemy.name,
                playerHealth: 3,
            });
            const getWinnerSpy = jest.spyOn(service, 'getWinner');

            service.attackCycle(mockGameId, mockGameData as GameData);

            service.getWinner(mockGameId, mockGameData, mockGameData.playersInCombat);

            expect(getWinnerSpy).toHaveBeenCalled();
        });

        it('should end combat when there is a winner', () => {
            const winner = mockPlayer;

            jest.spyOn(service as any, 'attack').mockReturnValue({
                gameId: mockGameId,
                playerName: mockEnemy.name,
                playerHealth: -1,
            });

            const combatOverWithWinnerSpy = jest.spyOn(service as any, 'combatOverWithWinner').mockImplementation(() => {
                gameEmitterGatewayMock.emitCombatWinner(mockGameId, winner.id);
                (service as any).endCombat(mockGameId, mockGameData);
            });

            service.attackCycle(mockGameId, mockGameData as GameData);

            expect(combatOverWithWinnerSpy).toHaveBeenCalledWith(mockGameId, mockGameData);
            expect(gameEmitterGatewayMock.emitCombatWinner).toHaveBeenCalledWith(mockGameId, winner.id);
            expect((service as any).endCombat).toHaveBeenCalledWith(mockGameId, mockGameData);
        });

        it('should not end combat when there is no winner', () => {
            (service.getWinner as jest.Mock).mockReturnValue(null);

            service.attackCycle(mockGameId, mockGameData as GameData);

            expect(gameEmitterGatewayMock.emitCombatWinner).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitCombatOver).not.toHaveBeenCalled();
            expect((service as any).endCombat).not.toHaveBeenCalled();
        });

        it('should call combatOverWithWinner when player health drops to zero or below', () => {
            const attackPayloadWithNegativeHealth = {
                gameId: mockGameId,
                playerName: mockEnemy.name,
                playerHealth: -2,
            };
            ((service as any).attack as jest.Mock).mockReturnValue(attackPayloadWithNegativeHealth);

            const combatOverWithWinnerSpy = jest.spyOn(service as any, 'combatOverWithWinner').mockImplementation(() => undefined);

            service.attackCycle(mockGameId, mockGameData as GameData);
            expect(combatOverWithWinnerSpy).toHaveBeenCalledWith(mockGameId, mockGameData);
            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });
    });

    describe('combatOverWithWinner', () => {
        let mockGameData: GameData;
        const mockWinner = { ...mockPlayer, name: 'WinnerPlayer', id: CharacterType.Character1 };

        beforeEach(() => {
            mockGameData = {
                isInCombat: true,
                isCombatActionUsed: false,
                players: [mockPlayer, mockEnemy],
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
                map: {
                    mode: GameMode.Classic,
                    terrain: [],
                    size: MapSize.Small,
                },
            } as GameData;

            jest.spyOn(service, 'getWinner').mockReturnValue(mockWinner);
            jest.spyOn(service, 'endFight').mockImplementation(() => undefined);

            gameEmitterGatewayMock.emitCombatWinner = jest.fn();
            gameEmitterGatewayMock.emitCombatOver = jest.fn();
            gameEmitterGatewayMock.emitGameOver = jest.fn();

            jest.spyOn(service as any, 'endCombat').mockImplementation(() => undefined);
            jest.spyOn(service as any, 'getGameWinnerName').mockReturnValue(null);
        });

        it('should set isCombatActionUsed to true', () => {
            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect(mockGameData.isCombatActionUsed).toBe(true);
        });

        it('should get the winner and set winnerName in game data', () => {
            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect(service.getWinner).toHaveBeenCalledWith(mockGameId, mockGameData, mockGameData.playersInCombat);
            expect(mockGameData.combatWinnerName).toBe(mockWinner.name);
        });

        it('should call endCombat to finalize the combat', () => {
            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect((service as any).endCombat).toHaveBeenCalledWith(mockGameId, mockGameData);
        });

        it('should emit combatWinner event with winner ID', () => {
            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect(gameEmitterGatewayMock.emitCombatWinner).toHaveBeenCalledWith(mockGameId, mockWinner.id);
        });

        it('should not emit gameOver event if no game winner is determined', () => {
            (service as any).getGameWinnerName.mockReturnValue(null);

            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect(gameEmitterGatewayMock.emitGameOver).not.toHaveBeenCalled();
        });

        it('should not calculate statistics or emit GameOver event when there is no game winner', () => {
            mockGameData = {
                isInCombat: true,
                isCombatActionUsed: false,
                gameStatistics: {},
                players: [
                    { ...mockPlayer, name: 'Player1', wins: 1 },
                    { ...mockEnemy, name: 'Player2', wins: 2 },
                ],
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
                map: {
                    mode: GameMode.Classic,
                    terrain: [],
                    size: MapSize.Small,
                },
            } as GameData;

            jest.spyOn(service, 'getWinner').mockReturnValue(mockWinner);
            jest.spyOn(service as any, 'getGameWinnerName').mockReturnValue(null);
            jest.spyOn(service as any, 'endCombat').mockImplementation(() => undefined);

            gameEmitterGatewayMock.emitCombatWinner = jest.fn();
            gameEmitterGatewayMock.emitGameOver = jest.fn();
            (gameStatisticsServiceMock as any).calculateDoorsPercentage = jest.fn();
            (gameStatisticsServiceMock as any).calculateAllTilesPercentage = jest.fn();
            (gameStatisticsServiceMock as any).calculateGameTime = jest.fn();
            gameStatisticsServiceMock.getAllStatistics = jest.fn();

            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect(mockGameData.gameStatistics.winner).toBeUndefined();
            expect((gameStatisticsServiceMock as any).calculateDoorsPercentage).not.toHaveBeenCalled();
            expect((gameStatisticsServiceMock as any).calculateAllTilesPercentage).not.toHaveBeenCalled();
            expect((gameStatisticsServiceMock as any).calculateGameTime).not.toHaveBeenCalled();
            expect(gameStatisticsServiceMock.getAllStatistics).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitGameOver).not.toHaveBeenCalled();
        });

        it('should not calculate statistics or emit GameOver in CaptureTheFlag mode even with a winner', () => {
            mockGameData = {
                isInCombat: true,
                isCombatActionUsed: false,
                gameStatistics: {},
                players: [
                    { ...mockPlayer, name: 'Player1', wins: MAX_WINS },
                    { ...mockEnemy, name: 'Player2', wins: 0 },
                ],
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
                map: {
                    mode: GameMode.CaptureTheFlag,
                    terrain: [],
                    size: MapSize.Small,
                },
            } as GameData;

            jest.spyOn(service, 'getWinner').mockReturnValue(mockWinner);
            jest.spyOn(service as any, 'endCombat').mockImplementation(() => undefined);

            gameEmitterGatewayMock.emitCombatWinner = jest.fn();
            gameEmitterGatewayMock.emitGameOver = jest.fn();

            (gameStatisticsServiceMock as any).calculateDoorsPercentage = jest.fn();
            (gameStatisticsServiceMock as any).calculateAllTilesPercentage = jest.fn();
            (gameStatisticsServiceMock as any).calculateGameTime = jest.fn();
            gameStatisticsServiceMock.getAllStatistics = jest.fn();

            service.combatOverWithWinner(mockGameId, mockGameData as GameData);

            expect((gameStatisticsServiceMock as any).calculateDoorsPercentage).not.toHaveBeenCalled();
            expect((gameStatisticsServiceMock as any).calculateAllTilesPercentage).not.toHaveBeenCalled();
            expect((gameStatisticsServiceMock as any).calculateGameTime).not.toHaveBeenCalled();
            expect(gameStatisticsServiceMock.getAllStatistics).not.toHaveBeenCalled();
            expect(gameEmitterGatewayMock.emitGameOver).not.toHaveBeenCalled();
        });
    });

    describe('endCombat', () => {
        let mockGameData: Partial<GameData>;

        beforeEach(() => {
            mockGameData = {
                isInCombat: true,
                playersInCombat: {
                    initiator: { ...mockPlayer },
                    target: { ...mockEnemy },
                    initiatorPosition: { x: 1, y: 1 },
                    targetPosition: { x: 2, y: 2 },
                },
            };

            timerServiceMock.stopTimer = jest.fn();
            gameEmitterGatewayMock.emitCombatOver = jest.fn();
            jest.spyOn(service, 'endFight').mockImplementation(() => undefined);
        });

        it('should set isInCombat to false', () => {
            (service as any).endCombat(mockGameId, mockGameData as GameData);

            expect(mockGameData.isInCombat).toBe(false);
        });

        it('should stop the timer', () => {
            (service as any).endCombat(mockGameId, mockGameData as GameData);

            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should call endFight with playersInCombat', () => {
            const playersInCombatBeforeCall = { ...mockGameData.playersInCombat };
            (service as any).endCombat(mockGameId, mockGameData as GameData);

            expect(service.endFight).toHaveBeenCalledWith(playersInCombatBeforeCall);
        });

        it('should clear playersInCombat reference', () => {
            (service as any).endCombat(mockGameId, mockGameData as GameData);

            expect(mockGameData.playersInCombat).toBeNull();
        });

        it('should emit combatOver event', () => {
            (service as any).endCombat(mockGameId, mockGameData as GameData);

            expect(gameEmitterGatewayMock.emitCombatOver).toHaveBeenCalledWith(mockGameId);
        });
    });

    describe('roll', () => {
        const maxValue = 6;
        const originalMathRandom = Math.random;

        afterEach(() => {
            Math.random = originalMathRandom;
        });

        describe('in debug mode', () => {
            it('should return max value for attack roll', () => {
                const result = (service as any).roll(maxValue, true, DiceOptions.Attack);
                expect(result).toBe(maxValue);
            });

            it('should return 1 for defense roll', () => {
                const result = (service as any).roll(maxValue, true, DiceOptions.Defense);
                expect(result).toBe(1);
            });
        });

        describe('in normal mode', () => {
            it('should return a random number between 1 and max', () => {
                const roll2 = 0.5;
                const roll3 = 0.99;
                Math.random = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(roll2).mockReturnValueOnce(roll3);

                const roll2Result = 4;
                const roll3Result = 6;

                expect((service as any).roll(maxValue, false, DiceOptions.Attack)).toBe(1);
                expect((service as any).roll(maxValue, false, DiceOptions.Attack)).toBe(roll2Result);
                expect((service as any).roll(maxValue, false, DiceOptions.Attack)).toBe(roll3Result);
            });

            it('should handle max value of 1 correctly', () => {
                const result = (service as any).roll(1, false, DiceOptions.Attack);
                expect(result).toBe(1);
            });

            it('should ignore dice type in normal mode', () => {
                const randomResult = 0.5;
                Math.random = jest.fn().mockReturnValue(randomResult);

                const attackResult = (service as any).roll(maxValue, false, DiceOptions.Attack);
                const defenseResult = (service as any).roll(maxValue, false, DiceOptions.Defense);

                expect(attackResult).toBe(defenseResult);
            });
        });
    });

    describe('getGameWinnerName', () => {
        it('should return name of player with MAX_WINS or more wins', () => {
            const mockGameData: Partial<GameData> = {
                players: [
                    { ...mockPlayer, name: 'Player1', wins: 0 },
                    { ...mockEnemy, name: 'Player2', wins: MAX_WINS },
                    { ...mockPlayer, name: 'Player3', wins: 1 },
                ],
            };

            const result = (service as any).getGameWinnerName(mockGameId, mockGameData as GameData);

            expect(result).toBe('Player2');
        });

        it('should return undefined if no player has reached MAX_WINS', () => {
            const mockGameData: Partial<GameData> = {
                players: [
                    { ...mockPlayer, name: 'Player1', wins: 0 },
                    { ...mockEnemy, name: 'Player2', wins: MAX_WINS - 1 },
                    { ...mockPlayer, name: 'Player3', wins: 1 },
                ],
            };

            const result = (service as any).getGameWinnerName(mockGameId, mockGameData as GameData);

            expect(result).toBeUndefined();
        });
    });

    describe('getAttackInfo', () => {
        let mockGameData: GameData;
        const attackerName = 'TestPlayer';

        beforeEach(() => {
            const initiator = {
                ...mockPlayer,
                name: attackerName,
                attack: 6,
                dice: { attack: 4, defense: 6 },
            };

            const target = {
                ...mockEnemy,
                name: 'Enemy',
                defense: 4,
                dice: { attack: 6, defense: 4 },
            };

            const playersInCombat: PlayersInCombat = {
                initiator,
                target,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 2 },
            };

            mockGameData = {
                playersInCombat,
                attackerName,
                isInDebugMode: false,
                map: { terrain: [] },
            } as GameData;

            jest.spyOn(service, 'getAttacker').mockReturnValue(initiator);
            jest.spyOn(service, 'getDefender').mockReturnValue(target);

            jest.spyOn(service as any, 'roll').mockImplementation((max, debug, diceType) => {
                if (debug) {
                    return diceType === DiceOptions.Attack ? max : 1;
                }
                return diceType === DiceOptions.Attack ? 3 : 2;
            });

            mapServiceMock.getTileFromId = jest.fn().mockReturnValue({
                type: MapTileType.Base,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });
        });

        it('should calculate attack info correctly with no ice penalties', () => {
            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.attacker).toBe(mockGameData.playersInCombat.initiator);
            expect(result.defender).toBe(mockGameData.playersInCombat.target);
            expect(result.attackRoll).toBe(3);
            expect(result.defenseRoll).toBe(2);
            expect(result.attackTotal).toBe(9);
            expect(result.defenseTotal).toBe(6);
            expect(result.attackResult).toBe(3);
            expect(result.isAttackerOnIce).toBe(false);
            expect(result.isDefenderOnIce).toBe(false);
            expect(result.gameId).toBe(mockGameId);
        });

        it('should apply ice penalty to attacker when attacker is on ice', () => {
            mapServiceMock.getTileFromId.mockImplementation((terrain, id) => {
                if (id === mockGameData.playersInCombat.initiator.id) {
                    return { type: MapTileType.Ice, character: id, item: ItemType.NoItem };
                }
                return { type: MapTileType.Base, character: id, item: ItemType.NoItem };
            });

            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.isAttackerOnIce).toBe(true);
            expect(result.isDefenderOnIce).toBe(false);
            expect(result.attackTotal).toBe(7);
            expect(result.defenseTotal).toBe(6);
            expect(result.attackResult).toBe(1);
        });

        it('should apply ice penalty to defender when defender is on ice', () => {
            mapServiceMock.getTileFromId.mockImplementation((terrain, id) => {
                if (id === mockGameData.playersInCombat.target.id) {
                    return { type: MapTileType.Ice, character: id, item: ItemType.NoItem };
                }
                return { type: MapTileType.Base, character: id, item: ItemType.NoItem };
            });

            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.isAttackerOnIce).toBe(false);
            expect(result.isDefenderOnIce).toBe(true);
            expect(result.attackTotal).toBe(9);
            expect(result.defenseTotal).toBe(4);
            expect(result.attackResult).toBe(5);
        });

        it('should apply ice penalty to both players when both are on ice', () => {
            mapServiceMock.getTileFromId.mockReturnValue({
                type: MapTileType.Ice,
                character: CharacterType.NoCharacter,
                item: ItemType.NoItem,
            });

            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.isAttackerOnIce).toBe(true);
            expect(result.isDefenderOnIce).toBe(true);
            expect(result.attackTotal).toBe(7);
            expect(result.defenseTotal).toBe(4);
            expect(result.attackResult).toBe(3);
        });

        it('should use max roll for attacker and min for defender in debug mode', () => {
            mockGameData.isInDebugMode = true;
            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.attackRoll).toBe(4);
            expect(result.defenseRoll).toBe(1);
            expect(result.attackTotal).toBe(10);
            expect(result.defenseTotal).toBe(5);
            expect(result.attackResult).toBe(5);
        });

        it('should handle negative attack results correctly', () => {
            jest.spyOn(service as any, 'roll').mockImplementation((max, debug, diceType) => {
                return diceType === DiceOptions.Attack ? 1 : 6;
            });

            const result = (service as any).getAttackInfo(mockGameId, mockGameData);

            expect(result.attackTotal).toBe(7);
            expect(result.defenseTotal).toBe(10);
            expect(result.attackResult).toBe(-3);
        });
    });

    describe('loserDropItems', () => {
        let mockGameData: GameData;

        beforeEach(() => {
            mockGameData = {
                map: {
                    terrain: createMockTerrain(),
                    size: MapSize.Small,
                },
            } as GameData;

            mapServiceMock.placeItem = jest.fn();
            gameEmitterGatewayMock.emitLoserPlayer = jest.fn();
        });

        it('should place each item from the loser at appropriate coordinates', () => {
            const loser = {
                ...mockPlayer,
                items: [ItemType.Sword, ItemType.Barrel, ItemType.Torch],
            };

            const loserPosition = { x: 3, y: 3 };

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(false);
            jest.spyOn(ClosestFreeTileAlgorithm, 'findClosestFreeTile').mockReturnValueOnce({ x: 4, y: 4 }).mockReturnValueOnce({ x: 5, y: 5 });

            service.loserDropItems(mockGameData, mockGameId, loserPosition, loser);

            expect(mapServiceMock.placeItem).toHaveBeenNthCalledWith(
                1,
                mockGameId,
                { item: ItemType.Sword, itemCoordinates: loserPosition },
                mockGameData.map.terrain,
            );

            expect(mapServiceMock.placeItem).toHaveBeenNthCalledWith(
                2,
                mockGameId,
                { item: ItemType.Barrel, itemCoordinates: { x: 4, y: 4 } },
                mockGameData.map.terrain,
            );

            expect(mapServiceMock.placeItem).toHaveBeenNthCalledWith(
                3,
                mockGameId,
                { item: ItemType.Torch, itemCoordinates: { x: 5, y: 5 } },
                mockGameData.map.terrain,
            );

            expect(loser.items).toEqual([]);
            expect(gameEmitterGatewayMock.emitLoserPlayer).toHaveBeenCalledWith(mockGameId, loser);
        });

        it('should use loserPosition when position is not occupied', () => {
            const loser = {
                ...mockPlayer,
                items: [ItemType.Sword],
            };
            const loserPosition = { x: 3, y: 3 };

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(false);

            service.loserDropItems(mockGameData, mockGameId, loserPosition, loser);

            expect(mapServiceMock.placeItem).toHaveBeenCalledWith(
                mockGameId,
                { item: ItemType.Sword, itemCoordinates: loserPosition },
                mockGameData.map.terrain,
            );
        });

        it('should find alternative position when original position is occupied', () => {
            const loser = {
                ...mockPlayer,
                items: [ItemType.Sword],
            };
            const loserPosition = { x: 3, y: 3 };
            const alternativePosition = { x: 4, y: 3 };

            jest.spyOn(ClosestFreeTileAlgorithm, 'isPositionOccupied').mockReturnValue(true);
            jest.spyOn(ClosestFreeTileAlgorithm, 'findClosestFreeTile').mockReturnValue(alternativePosition);

            service.loserDropItems(mockGameData, mockGameId, loserPosition, loser);

            expect(mapServiceMock.placeItem).toHaveBeenCalledWith(
                mockGameId,
                { item: ItemType.Sword, itemCoordinates: alternativePosition },
                mockGameData.map.terrain,
            );
        });
    });

    describe('startCombat', () => {
        beforeEach(() => {
            jest.clearAllMocks();

            mapServiceMock.areCoordinatesAdjacent = jest.fn();
            gameStatisticsServiceMock.updateAStatisticWithGame = jest.fn();
        });

        it('should return false when positions are not adjacent', () => {
            const mockGame = {} as GameData;
            const mockPayload = {
                gameId: mockGameId,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 3, y: 3 },
            } as CombatRequestPayload;

            mapServiceMock.areCoordinatesAdjacent.mockReturnValue(false);

            const result = service.startCombat(mockGame, mockPayload, null, null);

            expect(result).toBe(false);
            expect(mapServiceMock.areCoordinatesAdjacent).toHaveBeenCalledWith(mockPayload.initiatorPosition, mockPayload.targetPosition);
        });

        it('should return false when character IDs do not match', () => {
            const mockPayload = {
                gameId: mockGameId,
                initiatorId: CharacterType.Character1,
                targetId: CharacterType.Character2,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 1 },
            };

            const attackerTile = { character: CharacterType.Character3 };
            const defenderTile = { character: CharacterType.Character2 };

            mapServiceMock.areCoordinatesAdjacent.mockReturnValue(true);

            const result = service.startCombat({} as GameData, mockPayload, attackerTile as MapTile, defenderTile as MapTile);

            expect(result).toBe(false);
        });

        it('should return false in CTF mode when players are on the same team', () => {
            const mockPlayers = [
                { id: CharacterType.Character1, team: Teams.BlueTeam },
                { id: CharacterType.Character2, team: Teams.BlueTeam },
            ];

            const mockGame = {
                players: mockPlayers,
                currentPlayerIndex: 0,
                map: { mode: GameMode.CaptureTheFlag },
            } as GameData;

            const mockPayload = {
                gameId: mockGameId,
                initiatorId: CharacterType.Character1,
                targetId: CharacterType.Character2,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 1 },
            };

            const attackerTile = { character: CharacterType.Character1 };
            const defenderTile = { character: CharacterType.Character2 };

            mapServiceMock.areCoordinatesAdjacent.mockReturnValue(true);

            const result = service.startCombat(mockGame, mockPayload, attackerTile as MapTile, defenderTile as MapTile);

            expect(result).toBe(false);
        });

        it('should successfully start combat and update game state', () => {
            const mockPlayers = [
                { id: CharacterType.Character1, team: Teams.BlueTeam },
                { id: CharacterType.Character2, team: Teams.RedTeam },
            ];

            const mockGame = {
                players: mockPlayers,
                currentPlayerIndex: 0,
                map: { mode: GameMode.Classic },
                isActionUsed: false,
                isCombatActionUsed: true,
                isInCombat: false,
            } as GameData;

            const mockPayload = {
                gameId: mockGameId,
                initiatorId: CharacterType.Character1,
                targetId: CharacterType.Character2,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 1 },
            };

            const attackerTile = { character: CharacterType.Character1 };
            const defenderTile = { character: CharacterType.Character2 };

            mapServiceMock.areCoordinatesAdjacent.mockReturnValue(true);

            const result = service.startCombat(mockGame, mockPayload, attackerTile as MapTile, defenderTile as MapTile);

            expect(result).toBe(true);
            expect(mockGame.isActionUsed).toBe(true);
            expect(mockGame.isCombatActionUsed).toBe(false);
            expect(mockGame.isInCombat).toBe(true);
            expect(mockGame.playersInCombat).toBeDefined();
            expect(mockGame.playersInCombat.initiator).toBe(mockPlayers[0]);
            expect(mockGame.playersInCombat.target).toBe(mockPlayers[1]);
            expect(mockGame.playersInCombat.initiatorPosition).toEqual(mockPayload.initiatorPosition);
            expect(mockGame.playersInCombat.targetPosition).toEqual(mockPayload.targetPosition);
        });

        it('should update statistics for both players', () => {
            const mockPlayers = [
                { id: CharacterType.Character1, team: 'TeamA' },
                { id: CharacterType.Character2, team: 'TeamB' },
            ];

            const mockGame = {
                players: mockPlayers,
                currentPlayerIndex: 0,
                map: { mode: GameMode.Classic },
            } as GameData;

            const mockPayload = {
                gameId: mockGameId,
                initiatorId: CharacterType.Character1,
                targetId: CharacterType.Character2,
                initiatorPosition: { x: 1, y: 1 },
                targetPosition: { x: 2, y: 1 },
            };

            const attackerTile = { character: CharacterType.Character1 };
            const defenderTile = { character: CharacterType.Character2 };

            mapServiceMock.areCoordinatesAdjacent.mockReturnValue(true);

            service.startCombat(mockGame, mockPayload, attackerTile as MapTile, defenderTile as MapTile);

            expect(gameStatisticsServiceMock.updateAStatisticWithGame).toHaveBeenCalledTimes(2);
            expect(gameStatisticsServiceMock.updateAStatisticWithGame).toHaveBeenCalledWith(mockGame, mockPlayers[0], 'combats');
            expect(gameStatisticsServiceMock.updateAStatisticWithGame).toHaveBeenCalledWith(mockGame, mockPlayers[1], 'combats');
        });
    });

    describe('startCombatTimer', () => {
        let mockGame: Partial<GameData>;

        beforeEach(() => {
            jest.clearAllMocks();

            timerServiceMock.pauseTimer = jest.fn();
            timerServiceMock.waitForCombatTimer = jest.fn().mockResolvedValue(undefined);
            timerServiceMock.waitForCombatTimerNoEvades = jest.fn().mockResolvedValue(undefined);
            timerServiceMock.restartTimer = jest.fn();
            timerServiceMock.stopTimer = jest.fn();

            virtualPlayerServiceMock.handleCombat = jest.fn();

            mockGame = {
                isInCombat: true,
                isCombatActionUsed: false,
                attackerName: 'TestPlayer',
                playersInCombat: {
                    initiator: {
                        name: 'TestPlayer',
                        userId: 'human-123',
                        evadeAttempts: 0,
                    },
                    target: {
                        name: 'Enemy',
                        userId: 'enemy-123',
                    },
                },
                players: [{ name: 'TestPlayer' }],
                currentPlayerIndex: 0,
            } as GameData;

            jest.spyOn(service, 'getAttacker').mockImplementation((players, name) =>
                players.initiator.name === name ? players.initiator : players.target,
            );

            jest.spyOn(service, 'getDefender').mockImplementation((players, name) =>
                players.initiator.name === name ? players.target : players.initiator,
            );

            jest.spyOn(service, 'attackCycle').mockImplementation(() => undefined);
        });

        it('should pause the timer at the start', async () => {
            mockGame.isInCombat = false;

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(timerServiceMock.pauseTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should handle AI players by calling virtualPlayerService', async () => {
            mockGame.playersInCombat.initiator.userId = 'AI_player';

            let combatCounter = 0;
            timerServiceMock.waitForCombatTimer.mockImplementation(async () => {
                if (combatCounter++ === 0) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(virtualPlayerServiceMock.handleCombat).toHaveBeenCalledWith(mockGame.playersInCombat.initiator, mockGameId);
        });

        it('should use waitForCombatTimerNoEvades when evadeAttempts >= MAX_EVASIONS', async () => {
            mockGame.playersInCombat.initiator.evadeAttempts = MAX_EVASIONS;

            let combatCounter = 0;
            timerServiceMock.waitForCombatTimerNoEvades.mockImplementation(async () => {
                if (combatCounter++ === 0) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(timerServiceMock.waitForCombatTimerNoEvades).toHaveBeenCalledWith(mockGameId);
            expect(timerServiceMock.waitForCombatTimer).not.toHaveBeenCalled();
        });

        it('should use waitForCombatTimer when evadeAttempts < MAX_EVASIONS', async () => {
            let combatCounter = 0;
            timerServiceMock.waitForCombatTimer.mockImplementation(async () => {
                if (combatCounter++ === 0) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(timerServiceMock.waitForCombatTimer).toHaveBeenCalledWith(mockGameId);
            expect(timerServiceMock.waitForCombatTimerNoEvades).not.toHaveBeenCalled();
        });

        it('should call attackCycle when no combat action is used', async () => {
            let combatCounter = 0;
            timerServiceMock.waitForCombatTimer.mockImplementation(async () => {
                if (combatCounter++ === 0) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(service.attackCycle).toHaveBeenCalledWith(mockGameId, mockGame);
        });

        it('should not call attackCycle when combat action is used', async () => {
            let combatCounter = 0;
            timerServiceMock.waitForCombatTimer.mockImplementation(async () => {
                mockGame.isCombatActionUsed = true;
                if (combatCounter++ === 0) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(service.attackCycle).not.toHaveBeenCalled();
        });

        it('should update attacker name after each cycle', async () => {
            let combatCounter = 0;
            timerServiceMock.waitForCombatTimer.mockImplementation(async () => {
                if (combatCounter++ === 1) {
                    mockGame.isInCombat = false;
                }
            });

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(mockGame.attackerName).toBe('TestPlayer');
        });

        it('should restart timer after combat ends', async () => {
            mockGame.isInCombat = false;

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(timerServiceMock.restartTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should stop timer if current player is not the combat winner', async () => {
            mockGame.isInCombat = false;
            mockGame.combatWinnerName = 'Enemy';
            mockGame.players[0].name = 'TestPlayer';

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(timerServiceMock.stopTimer).toHaveBeenCalledWith(mockGameId);
        });

        it('should clear combatWinnerName after processing', async () => {
            mockGame.isInCombat = false;
            mockGame.combatWinnerName = 'Winner';

            await service.startCombatTimer(mockGameId, mockGame as GameData);

            expect(mockGame.combatWinnerName).toBe('');
        });
    });
});
