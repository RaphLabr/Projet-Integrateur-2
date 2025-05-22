import { Coordinates } from '@common/coordinates';

export interface QuitDataToClient {
    playerName: string;
    playerPosition: Coordinates;
    playerStartPosition: Coordinates;
}
