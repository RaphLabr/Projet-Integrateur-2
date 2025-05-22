// Max line disable for test file
/* eslint-disable max-lines */
// We use any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import * as sleepModule from '@app/utils/sleep/sleep';
import { COMBAT_DURATION, COMBAT_DURATION_NO_EVADES, NOTIFICATION_DURATION_S, PLAY_PHASE_DURATION } from '@common/timer-constants';
import { Test, TestingModule } from '@nestjs/testing';
import { GameTimerService } from './game-timer.service';

describe('GameTimerService', () => {
    let service: GameTimerService;
    let gameEmitterGatewayMock: jest.Mocked<GameEmitterGateway>;
    const testGameId = 'test-game-id';
    let sleepSpy: jest.SpyInstance;

    beforeEach(async () => {
        sleepSpy = jest.spyOn(sleepModule, 'sleep').mockResolvedValue(undefined);
        gameEmitterGatewayMock = {
            emitTimerUpdate: jest.fn(),
        } as any as jest.Mocked<GameEmitterGateway>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameTimerService, { provide: GameEmitterGateway, useValue: gameEmitterGatewayMock }],
        }).compile();

        service = module.get<GameTimerService>(GameTimerService);

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('waitForNotificationTimer', () => {
        it('should initialize a timer with NOTIFICATION_DURATION_S', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const initializeEmptyTimerSpy = jest.spyOn(service as any, 'initializeEmptyTimer');
            const promise = service.waitForNotificationTimer(testGameId);

            expect(initializeEmptyTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: NOTIFICATION_DURATION_S }));

            await promise;
        });

        it('should set up a timer and emit updates', async () => {
            jest.spyOn(service as any, 'createTimerPromise').mockRestore();
            const promise = service.waitForNotificationTimer(testGameId);

            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenCalledWith(testGameId, NOTIFICATION_DURATION_S);

            const oneSecondInMs = 1000;
            jest.advanceTimersByTime(oneSecondInMs);

            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenCalledWith(testGameId, NOTIFICATION_DURATION_S - 1);
            (service as any).timers.get(testGameId).endTimer();
            await promise;
        });
    });

    describe('waitForRoundTimer', () => {
        it('should initialize a timer with PLAY_PHASE_DURATION', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const initializeEmptyTimerSpy = jest.spyOn(service as any, 'initializeEmptyTimer');
            const promise = service.waitForRoundTimer(testGameId);

            expect(initializeEmptyTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: PLAY_PHASE_DURATION }));
            await promise;
        });

        it('should reuse existing timer if one exists', async () => {
            jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            await service.waitForRoundTimer(testGameId);

            jest.clearAllMocks();
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const initializeEmptyTimerSpy = jest.spyOn(service as any, 'initializeEmptyTimer');
            const promise = service.waitForRoundTimer(testGameId);

            expect(initializeEmptyTimerSpy).not.toHaveBeenCalled();
            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: PLAY_PHASE_DURATION }));
            await promise;
        });
    });

    describe('waitForCombatTimer', () => {
        it('should initialize a timer with COMBAT_DURATION', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const promise = service.waitForCombatTimer(testGameId);

            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: COMBAT_DURATION }));
            await promise;
        });
    });

    describe('waitForCombatTimerNoEvades', () => {
        it('should initialize a timer with COMBAT_DURATION_NO_EVADES', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const promise = service.waitForCombatTimerNoEvades(testGameId);

            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: COMBAT_DURATION_NO_EVADES }));
            await promise;
        });
    });

    describe('restartTimer', () => {
        it('should not do anything if timer does not exist', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            await service.restartTimer('nonexistent-game');

            expect(createTimerPromiseSpy).not.toHaveBeenCalled();
        });

        it('should restart a paused timer from its paused time', async () => {
            jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            await service.waitForRoundTimer(testGameId);

            const timerData = (service as any).timers.get(testGameId);
            timerData.timeAtPause = 15;
            jest.clearAllMocks();
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);

            await service.restartTimer(testGameId);

            const expectedTimerValue = 16;
            expect(timerData.isRestarted).toBe(true);
            expect(timerData.timer).toBe(expectedTimerValue);
            expect(createTimerPromiseSpy).toHaveBeenCalledWith(
                testGameId,
                expect.objectContaining({
                    timer: 16,
                    isRestarted: true,
                }),
            );
        });
    });

    describe('stopTimer', () => {
        it('should stop the timer when isStopEnabled is true', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = true;

            jest.spyOn(global, 'clearInterval');
            service.stopTimer(testGameId);

            expect(clearInterval).toHaveBeenCalledWith(timerData.interval);
            expect(internalStopTimerSpy).toHaveBeenCalledWith(timerData);
            await promise;
        });

        it('should not stop the timer when isStopEnabled is false', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = false;
            jest.spyOn(global, 'clearInterval');
            service.stopTimer(testGameId);

            expect(clearInterval).not.toHaveBeenCalled();
            expect(internalStopTimerSpy).not.toHaveBeenCalled();
            timerData.endTimer();
            await promise;
        });
    });

    describe('forceStopTimer', () => {
        it('should stop the timer regardless of isStopEnabled value', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = false;

            jest.spyOn(global, 'clearInterval');
            service.forceStopTimer(testGameId);
            expect(clearInterval).toHaveBeenCalledWith(timerData.interval);
            expect(internalStopTimerSpy).toHaveBeenCalledWith(timerData);
            await promise;
        });
    });

    describe('pauseTimer', () => {
        it('should pause the timer and save current time', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.timer = 3;
            jest.spyOn(global, 'clearInterval');

            service.pauseTimer(testGameId);

            const expectedTimerValue = 3;
            expect(clearInterval).toHaveBeenCalledWith(timerData.interval);
            expect(timerData.timeAtPause).toBe(expectedTimerValue);
            expect(timerData.isRestarted).toBe(false);
            timerData.endTimer();

            await promise;
        });

        it('should save endTimer to endPausedTimer on first pause', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.timeAtPause = 0;
            const originalEndTimer = timerData.endTimer;
            service.pauseTimer(testGameId);
            timerData.endTimer();

            expect(timerData.endPausedTimer).toBe(originalEndTimer);
            await promise;
        });

        it('should not update endPausedTimer on subsequent pauses', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.timeAtPause = 10;
            const mockEndPausedTimer = jest.fn();
            timerData.endPausedTimer = mockEndPausedTimer;
            service.pauseTimer(testGameId);
            timerData.endTimer();

            expect(timerData.endPausedTimer).toBe(mockEndPausedTimer);
            await promise;
        });
    });

    describe('deleteTimer', () => {
        it('should call internalStopTimer and remove the timer from the map', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);

            expect((service as any).timers.has(testGameId)).toBe(true);
            service.deleteTimer(testGameId);
            expect(internalStopTimerSpy).toHaveBeenCalled();
            expect((service as any).timers.has(testGameId)).toBe(false);

            return promise;
        });
    });

    describe('disableTimerStop', () => {
        it('should set isStopEnabled to false', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = true;
            service.disableTimerStop(testGameId);

            expect(timerData.isStopEnabled).toBe(false);
            timerData.endTimer();
            await promise;
        });
    });

    describe('enableTimerStop', () => {
        it('should set isStopEnabled to true', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = false;
            timerData.hasReached0 = false;

            service.enableTimerStop(testGameId);
            expect(timerData.isStopEnabled).toBe(true);

            timerData.endTimer();
            await promise;
        });

        it('should call internalStopTimer if hasReached0 is true', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);
            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = false;
            timerData.hasReached0 = true;

            service.enableTimerStop(testGameId);
            expect(timerData.isStopEnabled).toBe(true);
            expect(timerData.hasReached0).toBe(false);
            expect(internalStopTimerSpy).toHaveBeenCalledWith(timerData);

            await promise;
        });
    });

    describe('waitForTimer', () => {
        it('should initialize a new timer if one does not exist', async () => {
            const initializeEmptyTimerSpy = jest.spyOn(service as any, 'initializeEmptyTimer');
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const timerMax = 30;
            const result = (service as any).waitForTimer('new-game-id', timerMax);

            expect(initializeEmptyTimerSpy).toHaveBeenCalledWith('new-game-id');
            expect(createTimerPromiseSpy).toHaveBeenCalledWith('new-game-id', expect.objectContaining({ timer: 30 }));
            await result;
        });

        it('should reuse an existing timer', async () => {
            jest.spyOn(service as any, 'initializeEmptyTimer');
            jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);
            const firstTimerTime = 10;
            const secondTimerTime = 20;
            await (service as any).waitForTimer(testGameId, firstTimerTime);

            jest.clearAllMocks();
            const initializeEmptyTimerSpy = jest.spyOn(service as any, 'initializeEmptyTimer');
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(undefined);

            const result = (service as any).waitForTimer(testGameId, secondTimerTime);
            expect(initializeEmptyTimerSpy).not.toHaveBeenCalled();
            expect(createTimerPromiseSpy).toHaveBeenCalledWith(testGameId, expect.objectContaining({ timer: 20 }));

            await result;
        });

        it('should return the promise from createTimerPromise', async () => {
            const mockPromiseResult = 'test-result';
            jest.spyOn(service as any, 'createTimerPromise').mockResolvedValue(mockPromiseResult);

            const timerMax = 10;
            const result = await (service as any).waitForTimer(testGameId, timerMax);
            expect(result).toBe(mockPromiseResult);
        });
    });

    describe('createTimerPromise', () => {
        it('should emit initial timer update and decrement timer immediately', async () => {
            const initialTimerValue = 10;
            const timerData = {
                timer: initialTimerValue,
                interval: null as unknown as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            (service as any).createTimerPromise(testGameId, timerData);
            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenCalledWith(testGameId, initialTimerValue);
            expect(timerData.timer).toBe(initialTimerValue - 1);
        });

        it('should set up endTimer to resolve the Promise', async () => {
            const timerData = {
                timer: 5,
                interval: null as unknown as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            const promise = (service as any).createTimerPromise(testGameId, timerData);
            timerData.endTimer();

            await expect(promise).resolves.toBeUndefined();
        });

        it('should set up an interval that emits timer updates and decrements timer', async () => {
            const timerData = {
                timer: 5,
                interval: null as unknown as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            const promise = (service as any).createTimerPromise(testGameId, timerData);
            const oneSecondInMs = 1000;
            jest.clearAllMocks();
            jest.advanceTimersByTime(oneSecondInMs);

            const firstTimerTime = 4;
            const secondTimerTime = 3;
            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenCalledWith(testGameId, firstTimerTime);
            expect(timerData.timer).toBe(secondTimerTime);

            timerData.endTimer();
            await promise;
        });

        it('should clear interval and call internalStopTimer when timer reaches zero and isStopEnabled is true', async () => {
            const timerData = {
                timer: 1,
                interval: null as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');

            const promise = (service as any).createTimerPromise(testGameId, timerData);
            const oneSecondInMs = 1000;
            jest.advanceTimersByTime(oneSecondInMs);

            expect(timerData.timer).toBe(-1);
            expect(sleepSpy).toHaveBeenCalledWith(oneSecondInMs);
            await sleepSpy.mock.results[0].value;

            expect(internalStopTimerSpy).toHaveBeenCalledWith(timerData);
            await promise;
        });

        it('should set hasReached0 flag when timer reaches zero and isStopEnabled is false', async () => {
            const timerData = {
                timer: 1,
                interval: null as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: false,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            const internalStopTimerSpy = jest.spyOn(service as any, 'internalStopTimer');
            const oneSecondInMs = 1000;
            const promise = (service as any).createTimerPromise(testGameId, timerData);
            jest.advanceTimersByTime(oneSecondInMs);

            expect(timerData.timer).toBe(-1);
            expect(sleepSpy).toHaveBeenCalledWith(oneSecondInMs);
            await sleepSpy.mock.results[0].value;
            expect(internalStopTimerSpy).not.toHaveBeenCalled();
            expect(timerData.hasReached0).toBe(true);

            timerData.endTimer();
            await promise;
        });

        it('should properly handle multiple intervals', async () => {
            const timerData = {
                timer: 3,
                interval: null as NodeJS.Timeout,
                timeAtPause: 0,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            };

            const promise = (service as any).createTimerPromise(testGameId, timerData);
            const oneSecondInMs = 1000;
            jest.clearAllMocks();
            jest.advanceTimersByTime(oneSecondInMs);
            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenLastCalledWith(testGameId, 2);
            expect(timerData.timer).toBe(1);

            jest.advanceTimersByTime(oneSecondInMs);
            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenLastCalledWith(testGameId, 1);
            expect(timerData.timer).toBe(0);

            jest.advanceTimersByTime(oneSecondInMs);
            expect(gameEmitterGatewayMock.emitTimerUpdate).toHaveBeenLastCalledWith(testGameId, 0);
            expect(timerData.timer).toBe(-1);

            await sleepSpy.mock.results[0].value;
            await promise;
        });
    });

    describe('internalStopTimer', () => {
        it('should call endTimer to resolve the promise', () => {
            const endTimerMock = jest.fn();
            const timerData = {
                timer: 5,
                timeAtPause: 0,
                interval: null as NodeJS.Timeout,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: endTimerMock,
                endPausedTimer: jest.fn(),
            };

            (service as any).internalStopTimer(timerData);
            expect(endTimerMock).toHaveBeenCalled();
        });

        it('should not call endPausedTimer if timer was not restarted', () => {
            const endPausedTimerMock = jest.fn();
            const timerData = {
                timer: 5,
                timeAtPause: 10,
                interval: null as NodeJS.Timeout,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: jest.fn(),
                endPausedTimer: endPausedTimerMock,
            };

            const expectedTimerAtPause = 10;
            (service as any).internalStopTimer(timerData);
            expect(endPausedTimerMock).not.toHaveBeenCalled();
            expect(timerData.timeAtPause).toBe(expectedTimerAtPause);
        });

        it('should call endPausedTimer and reset state if timer was restarted', () => {
            const endPausedTimerMock = jest.fn();
            const timerData = {
                timer: 5,
                timeAtPause: 10,
                interval: null as NodeJS.Timeout,
                isRestarted: true,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: jest.fn(),
                endPausedTimer: endPausedTimerMock,
            };

            (service as any).internalStopTimer(timerData);
            expect(endPausedTimerMock).toHaveBeenCalled();
            expect(timerData.timeAtPause).toBe(0);
            expect(timerData.isRestarted).toBe(false);
        });
    });

    describe('initializeEmptyTimer', () => {
        it('should create a new timer entry in the timers map', () => {
            const newGameId = 'new-test-game';

            expect((service as any).timers.has(newGameId)).toBe(false);
            (service as any).initializeEmptyTimer(newGameId);
            expect((service as any).timers.has(newGameId)).toBe(true);
        });

        it('should initialize the timer with default values', () => {
            const newGameId = 'default-values-test';
            (service as any).initializeEmptyTimer(newGameId);
            const timerData = (service as any).timers.get(newGameId);

            expect(timerData).toEqual({
                timer: 0,
                timeAtPause: 0,
                interval: null as NodeJS.Timeout,
                isInStartOfNotification: false,
                isRestarted: false,
                isStopEnabled: true,
                hasReached0: false,
                endTimer: expect.any(Function),
                endPausedTimer: expect.any(Function),
            });
        });

        it('should overwrite existing timer if one exists with the same ID', () => {
            const existingGameId = 'existing-game';
            (service as any).timers.set(existingGameId, {
                timer: 42,
                timeAtPause: 10,
                interval: {} as NodeJS.Timeout,
                isRestarted: true,
                isStopEnabled: false,
                hasReached0: true,
                endTimer: () => undefined,
                endPausedTimer: () => undefined,
            });

            (service as any).initializeEmptyTimer(existingGameId);
            const timerData = (service as any).timers.get(existingGameId);

            expect(timerData.timer).toBe(0);
            expect(timerData.timeAtPause).toBe(0);
            expect(timerData.interval).toBeNull();
            expect(timerData.isRestarted).toBe(false);
            expect(timerData.isStopEnabled).toBe(true);
            expect(timerData.hasReached0).toBe(false);
        });
        describe('getTimerState', () => {
            it('should return the isStopEnabled state of the timer', async () => {
                const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
                const promise = service.waitForRoundTimer(testGameId);
                createTimerPromiseSpy.mockResolvedValue(undefined);

                const timerData = (service as any).timers.get(testGameId);
                timerData.isStopEnabled = true;
                expect(service.getTimerState(testGameId)).toBe(true);

                timerData.isStopEnabled = false;
                expect(service.getTimerState(testGameId)).toBe(false);

                timerData.endTimer();
                await promise;
            });

            it('should handle undefined timer data', () => {
                const nonExistentGameId = 'non-existent-game';
                expect(service.getTimerState(nonExistentGameId)).toBe(false);
            });
        });

        it('should set up endTimer and endPausedTimer as undefined functions', () => {
            const newGameId = 'function-test';
            (service as any).initializeEmptyTimer(newGameId);
            const timerData = (service as any).timers.get(newGameId);

            expect(() => timerData.endTimer()).not.toThrow();
            expect(() => timerData.endPausedTimer()).not.toThrow();
            expect(timerData.endTimer()).toBeUndefined();
            expect(timerData.endPausedTimer()).toBeUndefined();
        });
    });

    describe('getTimerState', () => {
        it('should return the isStopEnabled state of the timer', async () => {
            const createTimerPromiseSpy = jest.spyOn(service as any, 'createTimerPromise');
            const promise = service.waitForRoundTimer(testGameId);
            createTimerPromiseSpy.mockResolvedValue(undefined);

            const timerData = (service as any).timers.get(testGameId);
            timerData.isStopEnabled = true;
            expect(service.getTimerState(testGameId)).toBe(true);

            timerData.isStopEnabled = false;
            expect(service.getTimerState(testGameId)).toBe(false);

            timerData.endTimer();
            await promise;
        });

        it('should handle undefined timer data', () => {
            const nonExistentGameId = 'non-existent-game';
            expect(service.getTimerState(nonExistentGameId)).toBe(false);
        });
    });
});
