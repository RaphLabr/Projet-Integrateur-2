import { Coordinates } from '@common/coordinates';
import { Player } from '@common/player';

export interface PlayersInCombat {
    initiator: Player;
    target: Player;
    initiatorPosition: Coordinates,
    targetPosition: Coordinates,
}
