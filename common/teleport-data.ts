import { Coordinates } from '@common/coordinates';

export interface TeleportData {
    from: Coordinates;
    to: Coordinates;
    gameId: string;
}