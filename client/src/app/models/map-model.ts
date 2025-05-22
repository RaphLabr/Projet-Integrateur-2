import { MapTile } from '@app/classes/map-tile';
import { GameMode } from '@common/game-mode';
import { MapSize } from '@common/map-size';

export interface MapModel {
    id: string;
    name: string;
    mode: GameMode;
    visibility: boolean;
    lastModified: string;
    size: MapSize;
    creator: string;
    terrain: MapTile[][];
    description: string;
}
