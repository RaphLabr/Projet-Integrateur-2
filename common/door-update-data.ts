import { Coordinates } from '@common/coordinates';
import { MapTileType } from '@common/map-tile-type';
import { Player } from './player';

export interface DoorUpdateData {
    newDoorType: MapTileType.OpenDoor | MapTileType.ClosedDoor;
    doorCoordinates: Coordinates;
    player: Player;
}
