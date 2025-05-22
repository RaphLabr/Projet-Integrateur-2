import { GlobalStatistics } from './global-statistics';
import { PlayerStatistics } from './player-statistics';
export interface ClientStatistics {
    playerStatistics: PlayerStatistics[];
    globalStatistics: GlobalStatistics;
    winner: string;
}
