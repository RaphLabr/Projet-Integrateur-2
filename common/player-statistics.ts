export interface PlayerStatistics {
    name: string;
    wins: number;
    losses: number;
    combats: number;
    evasions: number;
    livesLost: number;
    livesTaken: number;
    itemsPicked: number;
    terrainPercentage: string;
    tilesTraversed: Set<string>;
    flagsPicked: number;
}
