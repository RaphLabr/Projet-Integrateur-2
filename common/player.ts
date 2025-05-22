import { CharacterType } from '@common/character-type';
import { Coordinates } from '@common/coordinates';
import { Dice } from '@common/dice';
import { ItemType } from '@common/item-type';
import { Teams } from './teams';

export interface Player {
    id: CharacterType;
    userId: string;
    name: string;
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
    speed: number;
    wins: number;
    startPosition: Coordinates;
    dice: Dice;
    items: ItemType[];
    evadeAttempts: number;
    hasAbandoned: boolean;
    team: Teams;
    isTorchActive: boolean;
    isBarrelActive: boolean;
}
