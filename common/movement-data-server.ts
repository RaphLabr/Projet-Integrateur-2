import { Coordinates } from '@common/coordinates';

export interface MovementDataToServer {
    gameId: string;
    path: Coordinates[];
}