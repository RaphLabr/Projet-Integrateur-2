import { Coordinates } from '@common/coordinates';

export interface DoorUpdateRequestPayload {
    gameId: string;
    playerPosition: Coordinates;
    doorPosition: Coordinates;
}
