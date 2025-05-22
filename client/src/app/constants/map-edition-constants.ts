import { Coordinates } from '@common/coordinates';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';

export enum MaxRandomItemsNumber {
    Small = 2,
    Medium = 4,
    Large = 6,
}

export const INVALID_MAP_COORDINATES: Coordinates = { x: -1, y: -1 };
export const ITEM_DESCRIPTIONS: Map<ItemType, string> = new Map<ItemType, string>([
    [ItemType.Barrel, 'Barril, Si le joueur a sous 3hp, il a +1Défense en combat'],
    [ItemType.Potion1, 'Potion défensive, +2Défense et -1Attaque en combat'],
    [ItemType.Potion2, 'Potion offensive, -1Défense et +2Attaque en combat'],
    [ItemType.Skull, "Crâne, L'ennemi du joueur aura toujours  un dé de 1 de défense en combat"],
    [ItemType.Sword, "Épée, Le joueur aura toujours le dé maximum s'il attaque en combat"],
    [ItemType.Torch, 'Torche, Si le joueur a plus que 3hp, il a +1 Attaque en combat'],
    [ItemType.StartPosition, 'Position de départ pour les joueurs'],
    [ItemType.Random, 'Item aléatoire, sélectionnera un item aléatoire à placer lorsque la partie commence'],
    [ItemType.Flag, 'Drapeau à capturer'],
]);
export const FIVE_SECONDS = 5000;

export const TILES: { type: MapTileType; description: string }[] = [
    { type: MapTileType.Base, description: 'Tuile de base, coûte 1 point de mouvement' },
    { type: MapTileType.Ice, description: 'Tuile de glace, coûte 0 points de mouvement' },

    { type: MapTileType.Wall, description: 'Tuile de mur, bloque le passage' },
    { type: MapTileType.Water, description: "Tuile d'eau, coûte 2 points de mouvement" },
];

export const TILE_DESCRIPTIONS_EDITION: { type: MapTileType; description: string }[] = [
    ...TILES.filter((tile) => tile.type !== MapTileType.Base),
    {
        type: MapTileType.ClosedDoor,
        description: 'Tuile de porte, peut être ouverte ou fermée en plaçant une porte sur une porte déjà placée',
    },
];

export const TILE_DESCRIPTIONS_GAME: { type: MapTileType; description: string }[] = [
    ...TILES,
    {
        type: MapTileType.ClosedDoor,
        description: "Porte fermée, bloque le passage, utilisez une action pour l'ouvrir",
    },
    {
        type: MapTileType.OpenDoor,
        description: 'Porte ouverte, coûte 1 point de mouvement, utilisez une action pour la fermer',
    },
];
