import { GlobalStatistics } from '@common/global-statistics';
import { PlayerStatistics } from '@common/player-statistics';
export interface GameStatistics {
    winner: string;
    playerStatistics: Map<string, PlayerStatistics>;
    globalStatistics: GlobalStatistics;
    startTime: Date;
}
