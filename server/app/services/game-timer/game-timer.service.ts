import { GameEmitterGateway } from '@app/gateways/game-emitter/game-emitter.gateway';
import { TimerData } from '@app/interfaces/timer-data/timer-data';
import { sleep } from '@app/utils/sleep/sleep';
import { COMBAT_DURATION, COMBAT_DURATION_NO_EVADES, NOTIFICATION_DURATION_S, NUMBER_OF_MS_IN_S, PLAY_PHASE_DURATION } from '@common/timer-constants';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameTimerService {
    private timers: Map<string, TimerData> = new Map();

    constructor(private gameEmitterGateway: GameEmitterGateway) {}

    async waitForNotificationTimer(gameId: string): Promise<void> {
        await this.waitForTimer(gameId, NOTIFICATION_DURATION_S);
    }

    async waitForRoundTimer(gameId: string): Promise<void> {
        await this.waitForTimer(gameId, PLAY_PHASE_DURATION);
    }

    async waitForCombatTimer(gameId: string): Promise<void> {
        await this.waitForTimer(gameId, COMBAT_DURATION);
    }

    async waitForCombatTimerNoEvades(gameId: string): Promise<void> {
        await this.waitForTimer(gameId, COMBAT_DURATION_NO_EVADES);
    }

    async restartTimer(gameId: string): Promise<void> {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            timerData.timer = timerData.timeAtPause + 1;
            timerData.isRestarted = true;
            return this.createTimerPromise(gameId, timerData);
        }
    }

    stopTimer(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData && timerData.isStopEnabled) {
            clearInterval(timerData.interval);
            this.internalStopTimer(timerData);
        }
    }

    forceStopTimer(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            clearInterval(timerData.interval);
            this.internalStopTimer(timerData);
        }
    }

    pauseTimer(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            if (timerData.timeAtPause === 0) {
                timerData.endPausedTimer = timerData.endTimer;
            }
            clearInterval(timerData.interval);
            timerData.timeAtPause = timerData.timer;
            timerData.isRestarted = false;
        }
    }

    deleteTimer(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            this.internalStopTimer(timerData);
            this.timers.delete(gameId);
        }
    }

    disableTimerStop(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            timerData.isStopEnabled = false;
        }
    }

    enableTimerStop(gameId: string): void {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        if (timerData) {
            timerData.isStopEnabled = true;
            if (timerData.hasReached0) {
                timerData.hasReached0 = false;
                this.internalStopTimer(timerData);
            }
        }
    }

    getTimerState(gameId: string): boolean {
        const timerData: TimerData | undefined = this.timers.get(gameId);
        return timerData ? timerData.isStopEnabled : false;
    }

    private async waitForTimer(gameId: string, numberOfSeconds: number): Promise<void> {
        let timerData: TimerData | undefined = this.timers.get(gameId);
        if (!timerData) {
            this.initializeEmptyTimer(gameId);
            timerData = this.timers.get(gameId);
        }
        if (numberOfSeconds === NOTIFICATION_DURATION_S) {
            timerData.isInStartOfNotification = true;
            setTimeout(() => {
                timerData.isInStartOfNotification = false;
            }, NUMBER_OF_MS_IN_S);
        }
        timerData.timer = numberOfSeconds;
        return this.createTimerPromise(gameId, timerData);
    }

    private async createTimerPromise(gameId: string, timerData: TimerData): Promise<void> {
        this.gameEmitterGateway.emitTimerUpdate(gameId, timerData.timer);
        timerData.timer--;
        return new Promise<void>((resolve) => {
            timerData.endTimer = resolve;
            timerData.interval = setInterval(async () => {
                this.gameEmitterGateway.emitTimerUpdate(gameId, timerData.timer);
                timerData.timer--;
                if (timerData.timer < 1) {
                    await this.onTimerReached0(timerData);
                }
            }, NUMBER_OF_MS_IN_S);
        });
    }

    private async onTimerReached0(timerData: TimerData) {
        await sleep(NUMBER_OF_MS_IN_S);
        if (!timerData.isInStartOfNotification) {
            clearInterval(timerData.interval);
            if (timerData.isStopEnabled) {
                this.internalStopTimer(timerData);
            } else {
                timerData.hasReached0 = true;
            }
        }
    }

    private internalStopTimer(timerData: TimerData): void {
        timerData.endTimer();
        if (timerData.isRestarted) {
            timerData.timeAtPause = 0;
            timerData.isRestarted = false;
            timerData.endPausedTimer();
        }
    }

    private initializeEmptyTimer(gameId: string): void {
        this.timers.set(gameId, {
            timer: 0,
            timeAtPause: 0,
            interval: null as NodeJS.Timeout,
            isRestarted: false,
            isStopEnabled: true,
            hasReached0: false,
            isInStartOfNotification: false,
            // this is an empty timer which needs empty functions
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            endTimer: () => {},
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            endPausedTimer: () => {},
        });
    }
}
