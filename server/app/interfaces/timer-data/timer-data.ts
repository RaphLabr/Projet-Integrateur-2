export interface TimerData {
    timer: number;
    timeAtPause: number;
    interval: NodeJS.Timeout;
    isRestarted: boolean;
    isStopEnabled: boolean;
    hasReached0: boolean;
    isInStartOfNotification: boolean;
    endTimer: () => void;
    endPausedTimer: () => void;
}
