export interface GlobalStatistics {
    gameTime: string;
    rounds: number;
    totalTerrainPercentage: string;
    doorsToggledPercentage: string;
    playersWithFlag: number;
    totalTilesTraversed: Set<string>;
    doorsToggled: Set<string>;
    playerNamesWithFlag: Set<string>;
}
