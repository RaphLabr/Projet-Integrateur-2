import { Coordinates } from "@common/coordinates";

export interface QuitDataToServer { 
    gameId: string;
    playerName: string;
    playerPosition: Coordinates;
}