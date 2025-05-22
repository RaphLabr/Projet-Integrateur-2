import { Coordinates } from '@common/coordinates';

export interface MovementDataToClient {
    to: Coordinates;
    from: Coordinates;
    cost: number;
}