import { MapModel } from '@app/models/map-model';
import { CharacterType } from '@common/character-type';
import { Player } from '@common/player';

export interface StartGameInfo {
    players: Player[];
    map: MapModel;
    adminId: CharacterType;
}
