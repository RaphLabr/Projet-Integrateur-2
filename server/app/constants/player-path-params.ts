import { GameMap } from '@app/model/database/game-map';
import { Coordinates } from '@common/coordinates';
import { Player } from '@common/player';

export interface PlayerPathParams {
    playerPosition: Coordinates;
    map: GameMap;
    players: Player[];
    movementLeft: number;
    coordinates: Coordinates;
}
