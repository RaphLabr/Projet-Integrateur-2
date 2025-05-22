import { MapTile } from '@app/classes/map-tile';
import { CharacterType } from '@common/character-type';
import { GameMode } from '@common/game-mode';
import { MapSize } from '@common/map-size';
import { Player } from '@common/player';

export interface SessionStorageGameData {
    gameName: string;
    players: Player[];
    clientId: CharacterType;
    mapTerrain: MapTile[][];
    mapSize: MapSize;
    adminId: CharacterType;
    mode: GameMode;
}
