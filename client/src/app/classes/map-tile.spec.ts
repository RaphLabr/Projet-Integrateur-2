import { MapTile } from '@app/classes/map-tile';
import { CharacterType } from '@common/character-type';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';

describe('MapTile', () => {
    let tile: MapTile;

    beforeEach(() => {
        tile = new MapTile(MapTileType.Base, ItemType.NoItem);
    });

    it('should create a MapTile with the given type and item', () => {
        const testTile = new MapTile(MapTileType.Water, ItemType.Potion1);
        expect(testTile.type).toBe(MapTileType.Water);
        expect(testTile.item).toBe(ItemType.Potion1);
    });

    it('should initialize with default values if none are provided', () => {
        const defaultTile = new MapTile();
        expect(defaultTile.type).toBe(MapTileType.Base);
        expect(defaultTile.item).toBe(ItemType.NoItem);
        expect(defaultTile.character).toBe(CharacterType.NoCharacter);
        expect(defaultTile.isActive).toBe(false);
        expect(defaultTile.isOnPath).toBe(false);
    });

    describe('toggleDoor', () => {
        it('should change from ClosedDoor to OpenDoor', () => {
            tile.type = MapTileType.ClosedDoor;
            tile.toggleDoor();
            expect(tile.type).toBe(MapTileType.OpenDoor);
        });

        it('should change from OpenDoor to ClosedDoor', () => {
            tile.type = MapTileType.OpenDoor;
            tile.toggleDoor();
            expect(tile.type).toBe(MapTileType.ClosedDoor);
        });

        it('should not change type if the tile is not a door', () => {
            tile.type = MapTileType.Water;
            tile.toggleDoor();
            expect(tile.type).toBe(MapTileType.Water);
        });
    });

    describe('isDoor', () => {
        it('should return true if MapTileType is an OpenDoor', () => {
            tile.type = MapTileType.OpenDoor;
            expect(tile.isDoor()).toBeTruthy();
        });

        it('should return true if MapTileType is a ClosedDoor', () => {
            tile.type = MapTileType.ClosedDoor;
            expect(tile.isDoor()).toBeTruthy();
        });

        it('should return false if the tile is not a door', () => {
            tile.type = MapTileType.Water;
            expect(tile.isDoor()).toBeFalsy();
        });
    });

    describe('isTraversable', () => {
        it('should return true if the tile is not a wall, closed door, or occupied by a character', () => {
            tile.type = MapTileType.Base;
            tile.character = CharacterType.NoCharacter;
            expect(tile.isTraversable()).toBeTruthy();
        });

        it('should return false if the tile is a wall', () => {
            tile.type = MapTileType.Wall;
            expect(tile.isTraversable()).toBeFalsy();
        });

        it('should return false if the tile is a closed door', () => {
            tile.type = MapTileType.ClosedDoor;
            expect(tile.isTraversable()).toBeFalsy();
        });

        it('should return false if the tile is occupied by a character', () => {
            tile.character = CharacterType.Character1;
            expect(tile.isTraversable()).toBeFalsy();
        });

        it('should return true if the tile is an open door', () => {
            tile.type = MapTileType.OpenDoor;
            expect(tile.isTraversable()).toBeTruthy();
        });
    });
});
